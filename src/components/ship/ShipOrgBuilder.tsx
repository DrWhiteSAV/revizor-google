import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ShipCompanyStructure, ShipModule, DraggingState, DockConnector } from '../../types/shipOrg';
import { defaultShipStructure, getDepartmentDocks, getSubDepartmentDocks, getFlagshipDocks } from '../../data/defaultShipData';
import { ShipFlagshipSVG } from './ShipFlagshipSVG';
import { ShipDepartmentSVG } from './ShipDepartmentSVG';
import { ShipSubDeptSVG } from './ShipSubDeptSVG';
import { shipSound } from '../../utils/shipSound';
import { CompanyHeaderNav } from './CompanyHeaderNav';
import { ZoomIn, ZoomOut, RotateCcw, Plus, Trash2, X, Shield, Cpu, Layers, Compass, Users, Calendar, UserPlus, UserX, UserCheck, Edit2, Sparkles, Bot, Building, Globe, Loader2, ChevronUp, ChevronDown, ArrowUpDown, ArrowRightLeft, FolderSync } from 'lucide-react';
import { AudioField } from '../voice/AudioField';
import { MiniAudioField } from '../voice/MiniAudioField';
import { EmployeeEditModal, EmployeeData } from '../employees/EmployeeEditModal';
import { AiLoadingOverlay } from '../common/AiLoadingOverlay';

interface ShipOrgBuilderProps {
  initialStructure?: ShipCompanyStructure;
  isLightTheme?: boolean;
  activeView?: 'map' | 'employees' | 'schedule';
  onViewChange?: (view: 'map' | 'employees' | 'schedule') => void;
  onSaveStructure?: (structure: ShipCompanyStructure) => void;
}

/**
 * Helper to resolve the root department ID in the organizational hierarchy.
 * - If target is flagship / company root -> returns null
 * - If target is a Department -> returns that Department's ID
 * - If target is a Subdepartment -> traverses up via parentId / dock connections until finding the Department.
 * - For 2nd, 3rd, 4th+ subdepartments connected in a chain, returns the root Department of that entire chain.
 */
export const resolveRootDepartmentId = (
  targetModuleId: string | null | undefined,
  allModules: ShipModule[],
  flagshipId: string = 'flagship-main'
): string | null => {
  if (!targetModuleId || targetModuleId === flagshipId || targetModuleId === 'flagship-main') {
    return null;
  }

  let currId: string | null = targetModuleId;
  const visited = new Set<string>();

  while (currId && !visited.has(currId)) {
    visited.add(currId);
    if (currId === flagshipId || currId === 'flagship-main') {
      return null;
    }
    const mod = allModules.find(m => m.id === currId);
    if (!mod) {
      return currId;
    }
    if (mod.type === 'department') {
      return mod.id;
    }
    // If it's a subdepartment, continue up to its parentId or connected parent dock module
    let nextParent: string | null = mod.parentId || null;
    if (!nextParent || nextParent === currId) {
      const connectedParent = allModules.find(other => 
        other.id !== mod.id && 
        other.docks.some(od => mod.docks.some(md => md.connectedToId === od.id))
      );
      nextParent = connectedParent ? connectedParent.id : null;
    }
    currId = nextParent;
  }

  return targetModuleId;
};

/**
 * Reconnects docks for flagship and modules based on geometric proximity and complementary dock types.
 */
export const reconnectDocksForStructure = (
  flagship: ShipModule,
  modules: ShipModule[]
): { flagship: ShipModule; modules: ShipModule[] } => {
  const updatedFlagship = {
    ...flagship,
    docks: getFlagshipDocks(flagship.x, flagship.y).map(d => ({ ...d, status: 'free' as const, connectedToId: null }))
  };

  let updatedModules: ShipModule[] = modules.map(m => {
    const freshDocks = m.type === 'subdepartment'
      ? getSubDepartmentDocks(m.id, m.x, m.y)
      : getDepartmentDocks(m.id, m.x, m.y);
    return {
      ...m,
      docks: freshDocks.map(d => ({ ...d, status: 'free' as const, connectedToId: null }))
    };
  });

  const allDocks: Array<{ moduleRef: 'flagship' | string; dock: DockConnector }> = [];
  updatedFlagship.docks.forEach(d => allDocks.push({ moduleRef: 'flagship', dock: d }));
  updatedModules.forEach(m => m.docks.forEach(d => allDocks.push({ moduleRef: m.id, dock: d })));

  for (let i = 0; i < allDocks.length; i++) {
    const itemA = allDocks[i];
    if (itemA.dock.status === 'occupied') continue;

    for (let j = i + 1; j < allDocks.length; j++) {
      const itemB = allDocks[j];
      if (itemB.dock.status === 'occupied') continue;
      if (itemA.moduleRef === itemB.moduleRef) continue;

      const isComplementary =
        (itemA.dock.type === 'top' && itemB.dock.type === 'bottom') ||
        (itemA.dock.type === 'bottom' && itemB.dock.type === 'top') ||
        (itemA.dock.type === 'left' && itemB.dock.type === 'right') ||
        (itemA.dock.type === 'right' && itemB.dock.type === 'left');

      if (!isComplementary) continue;

      const dist = Math.hypot(itemA.dock.worldX - itemB.dock.worldX, itemA.dock.worldY - itemB.dock.worldY);
      if (dist < 40) {
        itemA.dock.status = 'occupied';
        itemA.dock.connectedToId = itemB.dock.id;
        itemB.dock.status = 'occupied';
        itemB.dock.connectedToId = itemA.dock.id;
        break;
      }
    }
  }

  return { flagship: updatedFlagship, modules: updatedModules };
};

export const ShipOrgBuilder: React.FC<ShipOrgBuilderProps> = ({
  initialStructure,
  isLightTheme,
  activeView = 'map',
  onViewChange,
  onSaveStructure
}) => {
  // Container & Scroll Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const topScrollRef = useRef<HTMLDivElement>(null);
  const bottomScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingScroll = useRef(false);

  // Main Structure State
  const [structure, setStructure] = useState<ShipCompanyStructure>(() => initialStructure || defaultShipStructure);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>('flagship-main');

  // Employee Edit Modal & Drag-and-Drop Relocation State
  const [selectedEmpForEditModal, setSelectedEmpForEditModal] = useState<EmployeeData | null>(null);
  const [isEmpModalOpen, setIsEmpModalOpen] = useState<boolean>(false);
  const [draggingAstronaut, setDraggingAstronaut] = useState<{ employee: any; sourceModuleId: string; clientX?: number; clientY?: number } | null>(null);
  const [dragOverModuleId, setDragOverModuleId] = useState<string | null>(null);
  const [relocateToast, setRelocateToast] = useState<{ message: string; timestamp: number } | null>(null);

  // Stable Canvas dimensions preventing layout shifts or container twitching
  const CANVAS_WIDTH = 3200;
  const CANVAS_HEIGHT = 2400;
  const CANVAS_ORIGIN_X = 1600;
  const isMobileScreen = typeof window !== 'undefined' && window.innerWidth < 768;
  const CANVAS_ORIGIN_Y = isMobileScreen ? 285 : 330;

  // Edit Department / Subdepartment Modal State
  const [editingModule, setEditingModule] = useState<ShipModule | null>(null);
  const [editModuleName, setEditModuleName] = useState<string>('');
  const [editLeadName, setEditLeadName] = useState<string>('');
  const [editDescription, setEditDescription] = useState<string>('');
  const [editEmployees, setEditEmployees] = useState<Array<{ id: string; name: string; role?: string }>>([]);
  const [newEmpName, setNewEmpName] = useState<string>('');
  const [allCompanyEmployees, setAllCompanyEmployees] = useState<Array<{ id: string; name: string; role?: string; department_id?: string }>>([]);
  const [selectedExistingEmpId, setSelectedExistingEmpId] = useState<string>('');

  const handleOpenEditModal = (m: ShipModule) => {
    shipSound.playClick();
    setEditingModule(m);
    setEditModuleName(m.name);
    setEditLeadName(m.leadName || '');
    setEditDescription(m.description || '');

    // Real employees only (empty on start)
    const initialEmps = (m.employees && m.employees.length > 0)
      ? m.employees
      : [];
    setEditEmployees(initialEmps);
    setNewEmpName('');
  };

  const handleAddEmployee = () => {
    if (!newEmpName.trim()) return;
    shipSound.playClick();
    const newEmp = {
      id: `emp-${Date.now().toString(36)}`,
      name: newEmpName.trim(),
      role: 'Специалист'
    };
    setEditEmployees(prev => [...prev, newEmp]);
    setNewEmpName('');
  };

  const handleRemoveEmployee = (empId: string) => {
    shipSound.playClick();
    setEditEmployees(prev => prev.filter(e => e.id !== empId));
  };

  // Theme state auto-detection
  const [isLight, setIsLight] = useState<boolean>(() => {
    if (typeof isLightTheme === 'boolean') return isLightTheme;
    return document.documentElement.classList.contains('light');
  });

  useEffect(() => {
    if (typeof isLightTheme === 'boolean') {
      setIsLight(isLightTheme);
    } else {
      const observer = new MutationObserver(() => {
        setIsLight(document.documentElement.classList.contains('light'));
      });
      observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
      return () => observer.disconnect();
    }
  }, [isLightTheme]);

  const themeMode = isLight ? 'desktop-light' : 'desktop-dark';

  // Canvas Zoom State - Default 100% (1.0) on PC, 60% (0.60) on Mobile
  const [zoom, setZoom] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      return 0.60;
    }
    return 1.0;
  });

  // Dragging State
  const [dragging, setDragging] = useState<DraggingState | null>(null);

  // Dock Connector Action Modal State
  const [dockModal, setDockModal] = useState<{
    parentModule: ShipModule;
    dock: DockConnector;
    connectedModule: ShipModule | null;
  } | null>(null);

  // Modal Form Inputs
  const [newModuleName, setNewModuleName] = useState<string>('Новый отдел');
  const [newModuleType, setNewModuleType] = useState<'department' | 'subdepartment'>('department');

  // ProTalk AI States for Modals
  const [dockProtalkPrompt, setDockProtalkPrompt] = useState<string>('');
  const [isDockProtalkLoading, setIsDockProtalkLoading] = useState<boolean>(false);

  const [editProtalkPrompt, setEditProtalkPrompt] = useState<string>('');
  const [isEditProtalkLoading, setIsEditProtalkLoading] = useState<boolean>(false);

  const [flagshipProtalkPrompt, setFlagshipProtalkPrompt] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rr_ship_flagship_text') || '';
    }
    return '';
  });
  const [flagshipProtalkAudioUrl, setFlagshipProtalkAudioUrl] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('rr_ship_flagship_audio') || null;
    }
    return null;
  });
  const [isFlagshipProtalkLoading, setIsFlagshipProtalkLoading] = useState<boolean>(false);

  const handleFlagshipPromptChange = (text: string) => {
    setFlagshipProtalkPrompt(text);
    if (typeof window !== 'undefined') {
      localStorage.setItem('rr_ship_flagship_text', text);
    }
  };

  const handleFlagshipAudioChange = (url: string | null) => {
    setFlagshipProtalkAudioUrl(url);
    if (typeof window !== 'undefined') {
      if (url) {
        localStorage.setItem('rr_ship_flagship_audio', url);
      } else {
        localStorage.removeItem('rr_ship_flagship_audio');
      }
    }
  };

  const handleRunDockProTalk = async () => {
    if (!dockProtalkPrompt.trim()) return;
    setIsDockProtalkLoading(true);
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const directorId = currentUser?.id || '91827364501';

      const targetType = dockModal ? getTargetModuleType(dockModal.parentModule, dockModal.dock) : 'department';
      const res = await fetch('/api/protalk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entityType: targetType === 'subdepartment' ? 'subdepartment' : 'dock_new', 
          prompt: dockProtalkPrompt.trim(), 
          companyContext: structure.flagship.name,
          autofillData: dockProtalkPrompt.trim(),
          companyId: structure.flagship.id,
          userId: directorId
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.name) setNewModuleName(json.data.name);
        }
      }
    } catch (e) {
      console.error('Dock ProTalk AI error:', e);
    } finally {
      setIsDockProtalkLoading(false);
    }
  };

  const handleRunEditProTalk = async () => {
    if (!editProtalkPrompt.trim() || !editingModule) return;
    setIsEditProtalkLoading(true);
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const directorId = currentUser?.id || '91827364501';

      const res = await fetch('/api/protalk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entityType: editingModule.type, 
          prompt: editProtalkPrompt.trim(), 
          companyContext: structure.flagship.name,
          autofillData: editProtalkPrompt.trim(),
          dutiesData: editDescription,
          departmentId: editingModule.id,
          companyId: structure.flagship.id,
          userId: directorId
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.name) setEditModuleName(json.data.name);
          if (json.data.managerName || json.data.leadName) setEditLeadName(json.data.managerName || json.data.leadName);
          if (json.data.description) setEditDescription(json.data.description);
          const rawEmps = Array.isArray(json.data.assignedEmployees) && json.data.assignedEmployees.length > 0
            ? json.data.assignedEmployees
            : (Array.isArray(json.data.employees) && json.data.employees.length > 0 ? json.data.employees : []);

          if (rawEmps.length > 0) {
            const matchedList = rawEmps.map((e: any, idx: number) => {
              const rawId = typeof e === 'object' ? (e.employeeId || e.id) : null;
              const rawName = (typeof e === 'string' ? e : (e.employeeName || e.name || '')).trim();
              const real = allCompanyEmployees.find(emp => 
                (rawId && String(emp.id) === String(rawId)) ||
                (rawName && emp.name.toLowerCase() === rawName.toLowerCase()) ||
                (rawName && emp.name.toLowerCase().includes(rawName.toLowerCase())) ||
                (rawName && rawName.toLowerCase().includes(emp.name.toLowerCase()))
              );
              if (real) {
                return {
                  id: String(real.id),
                  name: real.name,
                  role: typeof e === 'object' ? (e.position || e.role || real.position || real.role) : (real.position || real.role)
                };
              }
              return {
                id: rawId ? String(rawId) : `emp-${editingModule.id}-${idx}`,
                name: rawName || 'Сотрудник',
                role: typeof e === 'object' ? (e.position || e.role || 'Специалист') : 'Специалист'
              };
            });
            setEditEmployees(matchedList);
          }
          if (Array.isArray(json.data.subdepartments) && editingModule.type === 'department') {
            const subNames = json.data.subdepartments.map((s: any) => typeof s === 'string' ? s : s?.name).filter(Boolean);
            if (subNames.length > 0) {
              setStructure(prev => {
                const parentDept = prev.modules.find(m => m.id === editingModule.id) || prev.flagship;
                const parentX = parentDept.x;
                const parentY = parentDept.y;
                let nextMods = [...prev.modules];

                subNames.forEach((nameStr: string) => {
                  const cleanName = nameStr.trim();
                  if (!cleanName) return;
                  if (nextMods.some(m => m.parentId === editingModule.id && m.name.toLowerCase() === cleanName.toLowerCase())) return;

                  const existingSubs = nextMods.filter(m => m.parentId === editingModule.id && m.type === 'subdepartment');
                  const subIndex = existingSubs.length;
                  const isLeft = subIndex % 2 === 0;
                  const tier = Math.floor(subIndex / 2) + 1;
                  const horizontalOffset = isLeft ? -(220 + (tier - 1) * 200) : (220 + (tier - 1) * 200);
                  const subX = parentX + horizontalOffset;
                  const subY = parentY;
                  const newSubId = `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

                  const createdSub: ShipModule = {
                    id: newSubId,
                    type: 'subdepartment',
                    name: cleanName,
                    subtitle: 'Рабочая группа',
                    employeeCount: 0,
                    leadName: 'Руководитель группы',
                    status: 'Active',
                    activityScore: 85,
                    systemLoad: 40,
                    x: subX,
                    y: subY,
                    parentId: editingModule.id,
                    attachedDockType: isLeft ? 'left' : 'right',
                    docks: getSubDepartmentDocks(newSubId, subX, subY),
                    description: `Подотдел: ${cleanName}`
                  };
                  nextMods.push(createdSub);
                });

                const updatedStruct = { ...prev, modules: nextMods };
                if (onSaveStructure) onSaveStructure(updatedStruct);
                return updatedStruct;
              });
            }
          }

          // Handle subdepartment target department relocation when editing subdepartment
          if (json.data.targetDepartment && editingModule.type === 'subdepartment') {
            const targetParent = structure.modules.find(m => 
              m.type === 'department' && 
              m.id !== editingModule.parentId &&
              m.name.toLowerCase().includes(json.data.targetDepartment.toLowerCase())
            );
            if (targetParent) {
              handleMoveSubdepartment(editingModule.id, targetParent.id);
            }
          }

          // Handle AI actions
          if (Array.isArray(json.data.actions)) {
            for (const action of json.data.actions) {
              if (action.type === 'move_subdepartment' && action.subdepartmentName) {
                const targetSub = structure.modules.find(m => 
                  m.type === 'subdepartment' && 
                  m.name.toLowerCase().includes(action.subdepartmentName.toLowerCase())
                );
                if (targetSub) {
                  if (action.targetDepartment) {
                    const targetParent = structure.modules.find(m => 
                      m.type === 'department' && 
                      m.name.toLowerCase().includes(action.targetDepartment.toLowerCase())
                    );
                    if (targetParent) {
                      handleMoveSubdepartment(targetSub.id, targetParent.id);
                    }
                  } else if (action.direction === 'up' || action.direction === 'down') {
                    handleMoveSubdepartment(targetSub.id, action.direction);
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Edit ProTalk AI error:', e);
    } finally {
      setIsEditProtalkLoading(false);
    }
  };

  // Helper to add department by name
  const [isSavingCompany, setIsSavingCompany] = useState<boolean>(false);

  // Helper to add department by name (local draft only, synced to DB on company save)
  const addDepartmentByName = (deptName: string) => {
    const trimmed = deptName.trim().slice(0, 20);
    if (!trimmed) return;
    const newId = `mod-dept-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const compId = structure.flagship.id || 'flagship-main';
    
    setStructure(prev => {
      if (prev.modules.some(m => m.name.toLowerCase() === trimmed.toLowerCase())) {
        return prev;
      }

      const existingDepts = prev.modules.filter(m => m.type === 'department');
      const deptIndex = existingDepts.length;

      // Vertical spine: exactly 1 department per row vertically below the flagship (x = 0)
      const newX = 0;
      const newY = 60 + deptIndex * 240;
      const parentId = deptIndex === 0 ? prev.flagship.id : existingDepts[deptIndex - 1].id;

      const newDocks = getDepartmentDocks(newId, newX, newY);

      const createdModule: ShipModule = {
        id: newId,
        type: 'department',
        name: trimmed,
        subtitle: 'Производственный отсек',
        employeeCount: 0,
        leadName: 'Руководитель отдела',
        status: 'Active',
        activityScore: 90,
        systemLoad: 50,
        x: newX,
        y: newY,
        parentId: parentId,
        attachedDockType: 'bottom',
        docks: newDocks,
        description: `Отдел: ${trimmed}`
      };

      const nextStructure = {
        ...prev,
        modules: [...prev.modules, createdModule]
      };
      if (onSaveStructure) onSaveStructure(nextStructure);
      return nextStructure;
    });
  };

  const handleUpdateDepartmentName = (id: string, newName: string) => {
    const cappedName = newName.slice(0, 20);
    setStructure(prev => {
      const nextStruct = {
        ...prev,
        modules: prev.modules.map(m => m.id === id ? { ...m, name: cappedName } : m)
      };
      if (onSaveStructure) onSaveStructure(nextStruct);
      return nextStruct;
    });

    if (structure.hasCompany) {
      fetch(`/api/departments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cappedName })
      }).catch(err => console.error('Failed to update department in PostgreSQL BD ProTalk:', err));
    }
  };

  const handleRemoveDepartment = (id: string) => {
    setStructure(prev => {
      const nextStruct = {
        ...prev,
        modules: prev.modules.filter(m => m.id !== id && m.parentId !== id)
      };
      if (onSaveStructure) onSaveStructure(nextStruct);
      return nextStruct;
    });

    if (structure.hasCompany) {
      fetch(`/api/departments/${id}`, { method: 'DELETE' })
        .catch(err => console.error('Failed to delete department from PostgreSQL BD ProTalk:', err));
    }
  };

  const handleRunFlagshipProTalk = async () => {
    if (!flagshipProtalkPrompt.trim()) return;
    setIsFlagshipProtalkLoading(true);
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const directorId = currentUser?.id || '91827364501';

      const res = await fetch('/api/protalk/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          entityType: 'company', 
          entity_type: 'company',
          prompt: flagshipProtalkPrompt.trim(),
          autofillData: flagshipProtalkPrompt.trim(),
          companyId: structure.flagship.id,
          companyContext: flagshipName || structure.flagship.name,
          userId: directorId
        })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          if (json.data.name) setFlagshipName(json.data.name);
          if (json.data.description || json.data.productDescription) {
            setFlagshipDescription(json.data.description || json.data.productDescription);
          }
          if (json.data.products) {
            setFlagshipProducts(typeof json.data.products === 'string' ? json.data.products : JSON.stringify(json.data.products));
          }
          const rawWebsites = json.data.websites || json.data.website;
          let parsedWebsites: string[] = [];
          if (typeof rawWebsites === 'string') {
            parsedWebsites = rawWebsites.split(',').map((s: string) => s.trim()).filter(Boolean);
          } else if (Array.isArray(rawWebsites)) {
            parsedWebsites = rawWebsites.map((s: any) => String(s).trim()).filter(Boolean);
          }
          if (parsedWebsites.length > 0) {
            setFlagshipWebsites(parsedWebsites);
            setNewWebsiteInput(parsedWebsites[0]);
          }

          // Auto-persist company data to PostgreSQL BD ProTalk
          const compIdToSave = structure.flagship.id && structure.flagship.id !== 'flagship-main'
            ? structure.flagship.id
            : (directorId ? `com-${directorId}` : 'flagship-main');
          fetch('/api/company/my', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: compIdToSave,
              director_id: directorId,
              name: (json.data.name || flagshipName || 'Моя Компания').slice(0, 20),
              description: json.data.description || json.data.productDescription || flagshipDescription,
              products: json.data.products || flagshipProducts,
              websites: parsedWebsites.join(', ') || parsedWebsites,
              product_description: json.data.productDescription || json.data.description || flagshipDescription
            })
          }).catch(e => console.warn('Failed to auto-save flagship company to DB:', e));

          if (json.data.flagshipEmployees && Array.isArray(json.data.flagshipEmployees)) {
            setFlagshipEmployees(json.data.flagshipEmployees.map((e: any, idx: number) => ({
              id: `emp-flagship-${Date.now()}-${idx}`,
              name: typeof e === 'string' ? e : e?.name || 'Сотрудник',
              role: typeof e === 'object' ? e.position || e.role || 'Руководитель' : 'Руководитель'
            })));
          }

          // Atomically build & connect all departments and subdepartments
          setStructure(prev => {
            let updatedModules = [...prev.modules];
            const mappedDepts: { id: string; name: string }[] = [];

            // 1. Process all incoming departments
            if (json.data.departments && Array.isArray(json.data.departments)) {
              json.data.departments.forEach((deptItem: any) => {
                const rawDeptName = typeof deptItem === 'string' ? deptItem : (deptItem?.name || deptItem?.title || deptItem?.department || '');
                const deptName = String(rawDeptName || '').replace(/\[object Object\]/gi, '').trim().slice(0, 20);
                if (!deptName) return;

                let existing = updatedModules.find(m => m.type === 'department' && m.name.toLowerCase() === deptName.toLowerCase());
                if (existing) {
                  mappedDepts.push({ id: existing.id, name: existing.name });
                } else {
                  const currentDeptCount = updatedModules.filter(m => m.type === 'department').length;
                  const newDeptId = `dept-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
                  const newX = 0;
                  const newY = 60 + currentDeptCount * 240;
                  const newDept: ShipModule = {
                    id: newDeptId,
                    type: 'department',
                    name: deptName,
                    subtitle: 'Отдел компании',
                    employeeCount: 0,
                    leadName: (typeof deptItem === 'object' && deptItem?.leadName) ? deptItem.leadName : 'Руководитель отдела',
                    status: 'Active',
                    activityScore: 90,
                    systemLoad: 50,
                    x: newX,
                    y: newY,
                    parentId: prev.flagship.id || 'flagship-main',
                    attachedDockType: 'bottom',
                    docks: getDepartmentDocks(newDeptId, newX, newY),
                    description: `Отдел: ${deptName}`
                  };
                  updatedModules.push(newDept);
                  mappedDepts.push({ id: newDeptId, name: deptName });
                }
              });
            }

            // 2. Process all incoming subdepartments
            if (json.data.subdepartments && Array.isArray(json.data.subdepartments)) {
              json.data.subdepartments.forEach((subItem: any) => {
                const rawSubName = typeof subItem === 'string' ? subItem : (subItem?.name || subItem?.title || subItem?.subdepartment || '');
                const subName = String(rawSubName || '').replace(/\[object Object\]/gi, '').trim().slice(0, 20);
                const rawParent = typeof subItem === 'object' && (subItem?.parentDepartment || subItem?.parent_name || subItem?.parent || subItem?.department) ? (subItem.parentDepartment || subItem.parent_name || subItem.parent || subItem.department) : '';
                const parentDeptName = String(rawParent || '').replace(/\[object Object\]/gi, '').trim();
                if (!subName) return;

                // Find parent department by matching name
                let parentDept = null;
                if (parentDeptName) {
                  parentDept = updatedModules.find(m => 
                    m.type === 'department' && 
                    (m.name.toLowerCase() === parentDeptName.toLowerCase() || 
                     m.name.toLowerCase().includes(parentDeptName.toLowerCase()) ||
                     parentDeptName.toLowerCase().includes(m.name.toLowerCase()))
                  );
                }
                // If parent department was specified by AI but not yet in updatedModules, create it dynamically
                if (!parentDept && parentDeptName) {
                  const currentDeptCount = updatedModules.filter(m => m.type === 'department').length;
                  const newDeptId = `dept-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
                  const newX = 0;
                  const newY = 60 + currentDeptCount * 240;
                  parentDept = {
                    id: newDeptId,
                    type: 'department',
                    name: parentDeptName.slice(0, 20),
                    subtitle: 'Отдел компании',
                    employeeCount: 0,
                    leadName: 'Руководитель отдела',
                    status: 'Active',
                    activityScore: 90,
                    systemLoad: 50,
                    x: newX,
                    y: newY,
                    parentId: prev.flagship.id || 'flagship-main',
                    attachedDockType: 'bottom',
                    docks: getDepartmentDocks(newDeptId, newX, newY),
                    description: `Отдел: ${parentDeptName}`
                  };
                  updatedModules.push(parentDept);
                  mappedDepts.push({ id: newDeptId, name: parentDept.name });
                }
                if (!parentDept && mappedDepts.length > 0) {
                  parentDept = updatedModules.find(m => m.id === mappedDepts[0].id);
                }
                if (!parentDept) {
                  parentDept = updatedModules.find(m => m.type === 'department');
                }

                if (parentDept) {
                  // Check if subdepartment already exists
                  const existingSub = updatedModules.find(m => 
                    m.type === 'subdepartment' && 
                    m.name.toLowerCase() === subName.toLowerCase()
                  );

                  if (existingSub) {
                    // Re-parent existing subdepartment accurately
                    existingSub.parentId = parentDept.id;
                    existingSub.y = parentDept.y;
                    existingSub.docks = getSubDepartmentDocks(existingSub.id, existingSub.x, existingSub.y);
                  } else {
                    const existingSubs = updatedModules.filter(m => m.parentId === parentDept.id && m.type === 'subdepartment');
                    const subIndex = existingSubs.length;
                    const isLeft = subIndex % 2 === 0;
                    const tier = Math.floor(subIndex / 2) + 1;
                    const horizontalOffset = isLeft ? -(220 + (tier - 1) * 200) : (220 + (tier - 1) * 200);
                    const subX = parentDept.x + horizontalOffset;
                    const subY = parentDept.y;
                    const subDeptId = `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;

                    const newSubDept: ShipModule = {
                      id: subDeptId,
                      type: 'subdepartment',
                      name: subName,
                      subtitle: 'Рабочая группа',
                      employeeCount: 0,
                      leadName: (typeof subItem === 'object' && subItem?.leadName) ? subItem.leadName : 'Руководитель группы',
                      status: 'Active',
                      activityScore: 85,
                      systemLoad: 40,
                      x: subX,
                      y: subY,
                      parentId: parentDept.id,
                      attachedDockType: isLeft ? 'left' : 'right',
                      docks: getSubDepartmentDocks(subDeptId, subX, subY),
                      description: `Подотдел: ${subName}`
                    };
                    updatedModules.push(newSubDept);
                  }
                }
              });
            }

            // 3. Process employee distribution to modules
            if (Array.isArray(json.data.assignedEmployees) && json.data.assignedEmployees.length > 0) {
              const assignedIds = new Set<string>();

              json.data.assignedEmployees.forEach((item: any) => {
                const empId = String(item.employeeId || item.id || '');
                const empName = (item.employeeName || item.name || '').trim();
                const targetDeptName = (item.department || item.departmentName || '').trim();
                const targetSubName = (item.subdepartment || item.subdepartmentName || '').trim();

                // Find real employee in allCompanyEmployees
                const matchedEmp = allCompanyEmployees.find(e => 
                  (empId && String(e.id) === empId) ||
                  (empName && e.name.toLowerCase() === empName.toLowerCase()) ||
                  (empName && e.name.toLowerCase().includes(empName.toLowerCase())) ||
                  (empName && empName.toLowerCase().includes(e.name.toLowerCase()))
                );

                if (!matchedEmp) return;
                assignedIds.add(String(matchedEmp.id));

                // Find target module: prefer subdepartment if specified, else department
                let targetMod: ShipModule | undefined;
                if (targetSubName) {
                  targetMod = updatedModules.find(m => 
                    m.type === 'subdepartment' && 
                    (m.name.toLowerCase() === targetSubName.toLowerCase() || 
                     m.name.toLowerCase().includes(targetSubName.toLowerCase()) ||
                     targetSubName.toLowerCase().includes(m.name.toLowerCase()))
                  );
                }
                if (!targetMod && targetDeptName) {
                  targetMod = updatedModules.find(m => 
                    m.type === 'department' && 
                    (m.name.toLowerCase() === targetDeptName.toLowerCase() || 
                     m.name.toLowerCase().includes(targetDeptName.toLowerCase()) ||
                     targetDeptName.toLowerCase().includes(m.name.toLowerCase()))
                  );
                }

                if (targetMod) {
                  const empObj = {
                    id: String(matchedEmp.id),
                    name: matchedEmp.name,
                    role: item.role || matchedEmp.role || 'EMPLOYEE',
                    position: item.position || matchedEmp.position || 'Специалист'
                  };

                  // Remove from any other module first
                  updatedModules.forEach(m => {
                    if (m.employees) {
                      m.employees = m.employees.filter(e => String(e.id) !== String(matchedEmp.id));
                      m.employeeCount = m.employees.length;
                    }
                  });

                  if (!targetMod.employees) targetMod.employees = [];
                  if (!targetMod.employees.some(e => String(e.id) === String(matchedEmp.id))) {
                    targetMod.employees.push(empObj);
                    targetMod.employeeCount = targetMod.employees.length;
                  }

                  if (item.role === 'MANAGER' || item.role === 'DIRECTOR' || item.isLead || 
                      (item.position && (item.position.toLowerCase().includes('руковод') || item.position.toLowerCase().includes('директор')))) {
                    targetMod.leadName = matchedEmp.name;
                  }
                }
              });

              // Flagship employees: remaining unassigned
              setFlagshipEmployees(allCompanyEmployees.filter(e => !assignedIds.has(String(e.id))));
            }

            const newFlagship = {
              ...prev.flagship,
              name: json.data.name || prev.flagship.name,
              description: json.data.description || json.data.productDescription || prev.flagship.description
            };

            const reconnected = reconnectDocksForStructure(newFlagship, updatedModules);
            const nextStruct: ShipCompanyStructure = {
              ...prev,
              companyName: json.data.name || prev.companyName,
              flagship: reconnected.flagship,
              modules: reconnected.modules
            };

            if (onSaveStructure) onSaveStructure(nextStruct);
            return nextStruct;
          });

          // Dispatch real-time events to sync all components
          window.dispatchEvent(new CustomEvent('db-employees-updated'));
          window.dispatchEvent(new CustomEvent('db-departments-updated'));
          window.dispatchEvent(new CustomEvent('db-structure-updated'));
          window.dispatchEvent(new CustomEvent('db-updated'));

          // Handle AI actions (reordering departments or moving subdepartments via voice/text)
          if (Array.isArray(json.data.actions)) {
            for (const action of json.data.actions) {
              if (action.type === 'reorder_department' && action.departmentName) {
                const targetDept = structure.modules.find(m => 
                  m.type === 'department' && 
                  m.name.toLowerCase().includes(action.departmentName.toLowerCase())
                );
                if (targetDept && (action.direction === 'up' || action.direction === 'down')) {
                  handleSwapDepartmentOrder(targetDept.id, action.direction);
                }
              } else if (action.type === 'move_subdepartment' && action.subdepartmentName) {
                const targetSub = structure.modules.find(m => 
                  m.type === 'subdepartment' && 
                  m.name.toLowerCase().includes(action.subdepartmentName.toLowerCase())
                );
                if (targetSub) {
                  if (action.targetDepartment) {
                    const targetParent = structure.modules.find(m => 
                      m.type === 'department' && 
                      m.name.toLowerCase().includes(action.targetDepartment.toLowerCase())
                    );
                    if (targetParent) {
                      handleMoveSubdepartment(targetSub.id, targetParent.id);
                    }
                  } else if (action.direction === 'up' || action.direction === 'down') {
                    handleMoveSubdepartment(targetSub.id, action.direction);
                  }
                }
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Flagship ProTalk AI error:', e);
    } finally {
      setIsFlagshipProtalkLoading(false);
    }
  };

  // Flagship Edit Modal State
  const [isEditingFlagship, setIsEditingFlagship] = useState<boolean>(false);
  const [flagshipName, setFlagshipName] = useState<string>('');
  const [flagshipDescription, setFlagshipDescription] = useState<string>('');
  const [flagshipProducts, setFlagshipProducts] = useState<string>('');
  const [flagshipWebsites, setFlagshipWebsites] = useState<string[]>([]);
  const [newWebsiteInput, setNewWebsiteInput] = useState<string>('');
  const [flagshipEmployees, setFlagshipEmployees] = useState<{ id: string; name: string; role?: string }[]>([]);
  const [selectedFlagshipEmpId, setSelectedFlagshipEmpId] = useState<string>('');
  const [newFlagshipEmpName, setNewFlagshipEmpName] = useState<string>('');
  const [newDeptInputName, setNewDeptInputName] = useState<string>('');
  const [activeSubDeptInputDeptId, setActiveSubDeptInputDeptId] = useState<string | null>(null);
  const [newSubDeptInputName, setNewSubDeptInputName] = useState<string>('');
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [isDeletingCompany, setIsDeletingCompany] = useState<boolean>(false);

  const addSubDepartmentByName = (parentDeptId: string, subDeptName: string) => {
    const trimmed = subDeptName.trim().slice(0, 20);
    if (!trimmed) return;

    setStructure(prev => {
      const parentMod = prev.modules.find(m => m.id === parentDeptId) || prev.flagship;
      const parentX = parentMod.x;
      const parentY = parentMod.y;

      const existingSubs = prev.modules.filter(m => m.parentId === parentDeptId && m.type === 'subdepartment');
      const subIndex = existingSubs.length;

      const isLeft = subIndex % 2 === 0;
      const tier = Math.floor(subIndex / 2) + 1;
      const horizontalOffset = isLeft ? -(220 + (tier - 1) * 200) : (220 + (tier - 1) * 200);

      const subX = parentX + horizontalOffset;
      const subY = parentY;

      const newSubId = `sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
      const newDocks = getSubDepartmentDocks(newSubId, subX, subY);

      const createdSubModule: ShipModule = {
        id: newSubId,
        type: 'subdepartment',
        name: trimmed,
        subtitle: 'Рабочая группа',
        employeeCount: 0,
        leadName: 'Руководитель группы',
        status: 'Active',
        activityScore: 85,
        systemLoad: 40,
        x: subX,
        y: subY,
        parentId: parentDeptId,
        attachedDockType: isLeft ? 'left' : 'right',
        docks: newDocks,
        description: `Подотдел: ${trimmed}`
      };

      const nextStructure = {
        ...prev,
        modules: [...prev.modules, createdSubModule]
      };
      if (onSaveStructure) onSaveStructure(nextStructure);
      return nextStructure;
    });
  };

  // Reorder departments and swap their map coordinates vertically
  const handleSwapDepartmentOrder = (deptId: string, direction: 'up' | 'down') => {
    shipSound.playClick();
    setStructure(prev => {
      const depts = prev.modules.filter(m => m.type === 'department');
      const idx = depts.findIndex(d => d.id === deptId);
      if (idx === -1) return prev;
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= depts.length) return prev;

      const deptA = depts[idx];
      const deptB = depts[targetIdx];

      // Swap positions and coordinates
      const newModules = prev.modules.map(m => {
        if (m.id === deptA.id) {
          const newY = deptB.y;
          const newX = deptB.x;
          return {
            ...m,
            x: newX,
            y: newY,
            docks: getDepartmentDocks(m.id, newX, newY)
          };
        }
        if (m.id === deptB.id) {
          const newY = deptA.y;
          const newX = deptA.x;
          return {
            ...m,
            x: newX,
            y: newY,
            docks: getDepartmentDocks(m.id, newX, newY)
          };
        }
        return m;
      });

      // Update attached subdepartments' Y positions accordingly
      const finalModules = newModules.map(m => {
        if (m.type === 'subdepartment' && m.parentId) {
          const parent = newModules.find(p => p.id === m.parentId);
          if (parent) {
            const isLeft = m.attachedDockType === 'left' || m.x < parent.x;
            const updatedX = m.x;
            const updatedY = parent.y;
            return {
              ...m,
              x: updatedX,
              y: updatedY,
              docks: getSubDepartmentDocks(m.id, updatedX, updatedY)
            };
          }
        }
        return m;
      });

      const nextStruct = { ...prev, modules: finalModules };
      if (onSaveStructure) onSaveStructure(nextStruct);

      // Sync updated coordinates to PostgreSQL BD ProTalk database
      if (prev.hasCompany) {
        fetch(`/api/departments/${deptA.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x: deptB.x, y: deptB.y })
        }).catch(err => console.warn('Failed to sync swapped deptA coordinates:', err));

        fetch(`/api/departments/${deptB.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ x: deptA.x, y: deptA.y })
        }).catch(err => console.warn('Failed to sync swapped deptB coordinates:', err));
      }

      return nextStruct;
    });
  };

  // Move a subdepartment up, down, or to a different target parent department
  const handleMoveSubdepartment = (subId: string, directionOrNewParent: 'up' | 'down' | string) => {
    shipSound.playClick();
    setStructure(prev => {
      const sub = prev.modules.find(m => m.id === subId);
      if (!sub || sub.type !== 'subdepartment') return prev;

      if (directionOrNewParent === 'up' || directionOrNewParent === 'down') {
        // Reorder within current department's subdepartments
        const parentSubs = prev.modules.filter(m => m.parentId === sub.parentId && m.type === 'subdepartment');
        const idx = parentSubs.findIndex(s => s.id === subId);
        if (idx === -1) return prev;
        const targetIdx = directionOrNewParent === 'up' ? idx - 1 : idx + 1;
        if (targetIdx < 0 || targetIdx >= parentSubs.length) return prev;

        const subA = parentSubs[idx];
        const subB = parentSubs[targetIdx];

        // Swap coordinates and attached dock types
        const finalModules = prev.modules.map(m => {
          if (m.id === subA.id) {
            return {
              ...m,
              x: subB.x,
              y: subB.y,
              attachedDockType: subB.attachedDockType,
              docks: getSubDepartmentDocks(m.id, subB.x, subB.y)
            };
          }
          if (m.id === subB.id) {
            return {
              ...m,
              x: subA.x,
              y: subA.y,
              attachedDockType: subA.attachedDockType,
              docks: getSubDepartmentDocks(m.id, subA.x, subA.y)
            };
          }
          return m;
        });

        const nextStruct = { ...prev, modules: finalModules };
        if (onSaveStructure) onSaveStructure(nextStruct);
        return nextStruct;
      } else {
        // Move to a different target department ID
        const targetParentDept = prev.modules.find(m => m.id === directionOrNewParent && m.type === 'department');
        if (!targetParentDept) return prev;

        const existingSubsOnTarget = prev.modules.filter(m => m.parentId === targetParentDept.id && m.type === 'subdepartment' && m.id !== subId);
        const subIndex = existingSubsOnTarget.length;
        const isLeft = subIndex % 2 === 0;
        const tier = Math.floor(subIndex / 2) + 1;
        const horizontalOffset = isLeft ? -(220 + (tier - 1) * 200) : (220 + (tier - 1) * 200);

        const newX = targetParentDept.x + horizontalOffset;
        const newY = targetParentDept.y;

        const finalModules = prev.modules.map(m => {
          if (m.id === subId) {
            return {
              ...m,
              parentId: targetParentDept.id,
              x: newX,
              y: newY,
              attachedDockType: isLeft ? 'left' as const : 'right' as const,
              docks: getSubDepartmentDocks(m.id, newX, newY)
            };
          }
          return m;
        });

        const nextStruct = { ...prev, modules: finalModules };
        if (onSaveStructure) onSaveStructure(nextStruct);

        // Sync parentId & coordinates in PostgreSQL BD ProTalk
        if (prev.hasCompany) {
          fetch(`/api/departments/${subId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              parent_id: targetParentDept.id,
              x: newX,
              y: newY
            })
          }).catch(e => console.warn('Failed to sync moved subdepartment to DB:', e));
        }

        return nextStruct;
      }
    });
  };

  const handleConfirmDeleteCompany = async () => {
    try {
      setIsDeletingCompany(true);
      const res = await fetch('/api/company/my', { method: 'DELETE' });
      if (res.ok) {
        setStructure(prev => {
          const resetStruct = {
            ...prev,
            hasCompany: false,
            companyName: undefined,
            modules: [],
            flagship: {
              ...prev.flagship,
              id: 'flagship-main',
              name: 'Флагманский Мостик',
              description: '',
              employees: [],
              employeeCount: 0
            }
          };
          if (onSaveStructure) onSaveStructure(resetStruct);
          return resetStruct;
        });
        setFlagshipName('');
        setFlagshipDescription('');
        setFlagshipProducts('');
        setFlagshipWebsites([]);
        setFlagshipEmployees([]);
        setIsDeleteConfirmOpen(false);
        setIsEditingFlagship(false);
        shipSound.playClick();
      }
    } catch (e) {
      console.error('Failed to delete company:', e);
    } finally {
      setIsDeletingCompany(false);
    }
  };

  // Fetch company ground truth, departments, and real employees from PostgreSQL BD ProTalk backend
  const loadCompanyStructureFromDb = async () => {
    try {
      const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
      const currentUser = userStr ? JSON.parse(userStr) : null;
      const userId = currentUser?.id || '91827364501';
      const compIdParam = currentUser?.company_id ? `&company_id=${encodeURIComponent(currentUser.company_id)}` : '';
      const dirIdParam = currentUser?.director_id ? `&director_id=${encodeURIComponent(currentUser.director_id)}` : '';

      const companyRes = await fetch(`/api/company/my?user_id=${encodeURIComponent(userId)}${compIdParam}${dirIdParam}`);
      const companyData = await companyRes.json();

      if (companyData?.success && companyData?.company && companyData?.hasCompany) {
        const com = companyData.company;
        let sites: string[] = [];
        if (com.websites) {
          if (typeof com.websites === 'string') {
            sites = com.websites.split(',').map((s: string) => s.trim()).filter(Boolean);
          } else if (Array.isArray(com.websites)) {
            sites = com.websites;
          }
        }
        setFlagshipName(com.name || '');
        const cleanDesc = (com.description === 'Центральный командный мостик оргструктуры компании.' ? '' : (com.description || com.product_description || ''));
        setFlagshipDescription(cleanDesc);
        setFlagshipProducts(com.products || '');
        setFlagshipWebsites(sites);

        // Fetch departments only belonging to this confirmed PostgreSQL BD ProTalk company
        const deptRes = await fetch(`/api/departments?company_id=${com.id}`).then(r => r.json());
        const dbDepts: any[] = deptRes?.success && Array.isArray(deptRes.departments) ? deptRes.departments : [];

        // Fetch all employees for this company
        const empRes = await fetch(`/api/employees?company_id=${com.id}`).then(r => r.json()).catch(() => null);
        let allEmployees: any[] = empRes?.success && Array.isArray(empRes.employees) ? empRes.employees : [];

        // If current user/director is not yet in allEmployees, ensure they are added immediately and seeded to PostgreSQL BD ProTalk
        const curUserKey = String(userId);
        const hasCurrentUser = allEmployees.some(e => String(e.id) === curUserKey);
        if (!hasCurrentUser && currentUser) {
          const isDirector = currentUser.role === 'DIRECTOR';
          const defaultPos = isDirector ? 'Генеральный Директор' : 'Сотрудник отдела';
          const userEmp = {
            id: curUserKey,
            company_id: com.id,
            department_id: null,
            name: currentUser.name || [currentUser.first_name, currentUser.last_name].filter(Boolean).join(' ') || (isDirector ? 'Генеральный Директор' : 'Сотрудник'),
            email: currentUser.email || '',
            phone: currentUser.phone || '',
            role: currentUser.role || (isDirector ? 'DIRECTOR' : 'EMPLOYEE'),
            position: currentUser.position || defaultPos,
            telegram_handle: currentUser.telegramHandle || (currentUser.username ? `@${currentUser.username}` : null),
            telegram_id: currentUser.telegram_id || null,
            status: 'active'
          };
          allEmployees = [userEmp, ...allEmployees];
          fetch('/api/employees', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userEmp)
          }).catch(e => console.warn('Failed to seed user into employees:', e));
        }

        setAllCompanyEmployees(allEmployees);

        const loadedModules: ShipModule[] = dbDepts.map(d => {
          const isSub = d.type === 'subdepartment';
          const mX = d.x !== undefined && d.x !== null ? Number(d.x) : 0;
          const mY = d.y !== undefined && d.y !== null ? Number(d.y) : (isSub ? 60 : 60);
          const docks = isSub ? getSubDepartmentDocks(d.id, mX, mY) : getDepartmentDocks(d.id, mX, mY);

          const deptEmployeeIds = (d.employee_ids || '').split(',').map((s: string) => s.trim()).filter(Boolean);
          const deptEmployees = allEmployees.filter(e => {
            // Priority 1: Check employee's department_id in PostgreSQL BD ProTalk (ground truth)
            if (e.department_id && e.department_id !== 'flagship' && e.department_id !== 'flagship-main') {
              const ids = String(e.department_id).split(',').map(s => s.trim());
              if (ids.includes(String(d.id))) return true;
            }
            // Priority 2: Check if explicitly in this module's employee_ids, but only if not assigned to another specific department/subdepartment
            if (deptEmployeeIds.includes(String(e.id))) {
              if (!e.department_id || e.department_id === 'flagship' || e.department_id === 'flagship-main') return true;
              const ids = String(e.department_id).split(',').map(s => s.trim());
              return ids.includes(String(d.id));
            }
            return false;
          });

          return {
            id: d.id,
            type: (d.type as any) || 'department',
            name: d.name || 'Отдел',
            subtitle: isSub ? 'Рабочая группа' : 'Производственный отсек',
            employeeCount: deptEmployees.length,
            employees: deptEmployees,
            leadName: d.lead_name || (isSub ? 'Руководитель группы' : 'Руководитель отдела'),
            status: 'Active',
            activityScore: isSub ? 85 : 90,
            systemLoad: isSub ? 40 : 50,
            x: mX,
            y: mY,
            parentId: (!d.parent_id || d.parent_id === 'flagship-main') ? com.id : d.parent_id,
            attachedDockType: isSub ? 'left' : 'bottom',
            docks: docks,
            description: d.description || `${isSub ? 'Подотдел' : 'Отдел'}: ${d.name}`
          };
        });

        // Determine who belongs to the flagship: all employees not assigned to any department or subdepartment
        const assignedIds = new Set<string>();
        loadedModules.forEach(mod => {
          (mod.employees || []).forEach(e => assignedIds.add(String(e.id)));
        });

        const flagshipEmps = allEmployees.filter(e => {
          if (assignedIds.has(String(e.id))) return false;
          // If employee is assigned to a department or subdepartment, do not put them on flagship
          if (e.department_id && e.department_id !== 'flagship' && e.department_id !== 'flagship-main') {
            const hasModule = loadedModules.some(m => m.id === e.department_id);
            if (hasModule) return false;
          }
          return true;
        });

        const rawFlagship: ShipModule = {
          id: com.id,
          type: 'flagship',
          name: com.name,
          subtitle: 'Капитанский Мостик Корабля',
          employeeCount: flagshipEmps.length,
          employees: flagshipEmps,
          leadName: 'Генеральный Директор',
          status: 'Active',
          activityScore: 100,
          systemLoad: 0,
          userRole: 'Генеральный Директор / Капитан',
          orgLevel: 1,
          x: 0,
          y: -180,
          parentId: null,
          docks: getFlagshipDocks(0, -180),
          description: cleanDesc
        };

        const reconnected = reconnectDocksForStructure(rawFlagship, loadedModules);

        setStructure({
          hasCompany: true,
          companyName: com.name,
          companyTitle: 'Командный Центр Оргструктуры',
          totalCrew: allEmployees.length,
          shipLevel: 1,
          userRole: 'Генеральный Директор / Капитан',
          status: 'Активный экипаж',
          flagship: reconnected.flagship,
          modules: reconnected.modules
        });
      } else {
        // No company in PostgreSQL BD ProTalk -> Pristine state without ghost/orphan modules
        setStructure({
          hasCompany: false,
          companyName: '',
          companyTitle: 'Командный Центр Оргструктуры',
          totalCrew: 0,
          shipLevel: 1,
          userRole: 'Генеральный Директор / Капитан',
          status: 'Настройка структуры',
          flagship: {
            id: 'flagship-main',
            type: 'flagship',
            name: '',
            subtitle: 'Капитанский Мостик Корабля',
            employeeCount: 0,
            leadName: 'Генеральный Директор',
            status: 'Active',
            activityScore: 100,
            systemLoad: 0,
            userRole: 'Генеральный Директор / Капитан',
            orgLevel: 1,
            x: 0,
            y: -180,
            parentId: null,
            docks: getFlagshipDocks(0, -180),
            description: ''
          },
          modules: []
        });
      }
    } catch (err) {
      console.error('Failed to load company, departments and employees from PostgreSQL BD ProTalk:', err);
    }
  };

  useEffect(() => {
    loadCompanyStructureFromDb();

    const handleDbUpdated = () => {
      loadCompanyStructureFromDb();
    };

    window.addEventListener('db-company-updated', handleDbUpdated);
    window.addEventListener('db-employees-updated', handleDbUpdated);
    window.addEventListener('db-updated', handleDbUpdated);
    return () => {
      window.removeEventListener('db-company-updated', handleDbUpdated);
      window.removeEventListener('db-employees-updated', handleDbUpdated);
      window.removeEventListener('db-updated', handleDbUpdated);
    };
  }, []);

  // Astronaut Click Handler -> Opens unified EmployeeEditModal
  const handleAstronautClick = (employee: any) => {
    shipSound.playClick();
    const comId = (structure.flagship.id && structure.flagship.id !== 'flagship-main') ? structure.flagship.id : 'flagship-main';
    setSelectedEmpForEditModal({
      id: employee.id || `emp-${Date.now().toString(36)}`,
      company_id: comId,
      department_id: employee.department_id || null,
      name: employee.name || '',
      email: employee.email || '',
      phone: employee.phone || '',
      role: employee.role || 'EMPLOYEE',
      position: employee.position || '',
      telegram_handle: employee.telegram_handle || employee.telegramHandle || '',
      telegramHandle: employee.telegram_handle || employee.telegramHandle || '',
      telegram_id: employee.telegram_id || '',
      duties: employee.duties || [],
      protalk_notes: employee.protalk_notes || ''
    });
    setIsEmpModalOpen(true);
  };

  // Astronaut Drag Start Handler
  const handleAstronautDragStart = (e: React.MouseEvent, employee: any, sourceModuleId: string) => {
    e.stopPropagation();
    setDraggingAstronaut({
      employee,
      sourceModuleId,
      clientX: e.clientX,
      clientY: e.clientY
    });
    setDragOverModuleId(null);
    shipSound.playClick();
  };

  // Global mouse tracking during astronaut dragging
  useEffect(() => {
    if (!draggingAstronaut) return;

    const handleGlobalMouseMove = (e: MouseEvent) => {
      setDraggingAstronaut(prev => prev ? {
        ...prev,
        clientX: e.clientX,
        clientY: e.clientY
      } : null);

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !containerRef.current) return;

      const mouseContentX = e.clientX - rect.left + containerRef.current.scrollLeft;
      const mouseContentY = e.clientY - rect.top + containerRef.current.scrollTop;

      const mouseWorldX = (mouseContentX - CANVAS_ORIGIN_X) / zoom;
      const mouseWorldY = (mouseContentY - CANVAS_ORIGIN_Y) / zoom;

      let hovered: string | null = null;
      // Check Flagship bounds
      const flagX = structure.flagship.x;
      const flagY = structure.flagship.y;
      if (Math.abs(mouseWorldX - flagX) < 380 && Math.abs(mouseWorldY - flagY) < 140) {
        hovered = 'flagship';
      } else {
        for (const mod of structure.modules) {
          const isSub = mod.type === 'subdepartment';
          const w = isSub ? 120 : 150;
          const h = isSub ? 70 : 80;
          if (Math.abs(mouseWorldX - mod.x) < w && Math.abs(mouseWorldY - mod.y) < h) {
            hovered = mod.id;
            break;
          }
        }
      }
      setDragOverModuleId(hovered);
    };

    const handleGlobalMouseUp = () => {
      if (draggingAstronaut) {
        if (dragOverModuleId) {
          if (dragOverModuleId === 'flagship') {
            if (draggingAstronaut.sourceModuleId !== 'flagship') {
              handleRelocateEmployee(
                draggingAstronaut.employee, 
                draggingAstronaut.sourceModuleId, 
                'flagship', 
                structure.flagship.name || 'Командный Мостик'
              );
            }
          } else {
            const targetModule = structure.modules.find(m => m.id === dragOverModuleId);
            if (targetModule && targetModule.id !== draggingAstronaut.sourceModuleId) {
              handleRelocateEmployee(
                draggingAstronaut.employee, 
                draggingAstronaut.sourceModuleId, 
                targetModule.id, 
                targetModule.name
              );
            }
          }
        } else {
          // Released on empty space: remove from source department and return to flagship
          if (draggingAstronaut.sourceModuleId && draggingAstronaut.sourceModuleId !== 'flagship') {
            const sourceMod = structure.modules.find(m => m.id === draggingAstronaut.sourceModuleId);
            handleRelocateEmployee(
              draggingAstronaut.employee,
              draggingAstronaut.sourceModuleId,
              null,
              structure.flagship.name || 'Командный Мостик',
              sourceMod?.name || 'отдела'
            );
          }
        }
      }
      setDraggingAstronaut(null);
      setDragOverModuleId(null);
    };

    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMouseMove);
      window.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [draggingAstronaut, dragOverModuleId, structure, zoom]);

  // Relocate Employee between rooms (Flagship or Departments or Empty Space)
  const handleRelocateEmployee = async (
    employee: any, 
    sourceDeptId: string | null, 
    targetDeptId: string | null, 
    targetName: string,
    sourceName?: string
  ) => {
    try {
      const comId = (structure.flagship.id && structure.flagship.id !== 'flagship-main') ? structure.flagship.id : 'flagship-main';
      const empId = String(employee.id);

      const isTargetFlagshipOrEmpty = !targetDeptId || targetDeptId === 'flagship' || targetDeptId === 'flagship-main';
      const nextDeptId = isTargetFlagshipOrEmpty ? null : targetDeptId;

      // 1. Call atomic PostgreSQL BD ProTalk endpoint to relocate employee and sync departments.employee_ids
      await fetch('/api/departments/relocate-employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: empId,
          source_dept_id: sourceDeptId,
          target_dept_id: nextDeptId,
          company_id: comId
        })
      }).catch(err => console.warn('Failed to call /api/departments/relocate-employee:', err));

      // 2. Update employee's department_id in /api/employees
      await fetch(`/api/employees/${empId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...employee,
          department_id: nextDeptId,
          company_id: comId
        })
      }).catch(err => console.warn('Failed to update employee in DB:', err));

      // 3. Update React local state immediately without duplication
      setStructure(prev => {
        const updatedModules = prev.modules.map(mod => {
          let remaining = (mod.employees || []).filter(e => String(e.id) !== empId);
          if (nextDeptId && mod.id === nextDeptId) {
            const updatedEmp = { ...employee, department_id: nextDeptId };
            remaining = [...remaining, updatedEmp];
          }
          return {
            ...mod,
            employees: remaining,
            employeeCount: remaining.length
          };
        });

        let updatedFlagshipEmployees = (prev.flagship.employees || []).filter(e => String(e.id) !== empId);
        if (isTargetFlagshipOrEmpty) {
          const updatedEmp = { ...employee, department_id: null };
          updatedFlagshipEmployees = [...updatedFlagshipEmployees, updatedEmp];
        }

        return {
          ...prev,
          flagship: {
            ...prev.flagship,
            employees: updatedFlagshipEmployees,
            employeeCount: updatedFlagshipEmployees.length
          },
          modules: updatedModules
        };
      });

      // Update allCompanyEmployees array in state
      setAllCompanyEmployees(prev => prev.map(e => String(e.id) === empId ? { ...e, department_id: nextDeptId || undefined } : e));

      if (!targetDeptId) {
        setRelocateToast({
          message: `🚪 Сотрудник ${employee.name || 'Без имени'} удален из «${sourceName || 'отдела'}» и возвращен на мостик!`,
          timestamp: Date.now()
        });
      } else if (targetDeptId === 'flagship') {
        setRelocateToast({
          message: `⚓ Сотрудник ${employee.name || 'Без имени'} перемещен на «${targetName}»!`,
          timestamp: Date.now()
        });
      } else {
        setRelocateToast({
          message: `🎯 Сотрудник ${employee.name || 'Без имени'} перемещен в «${targetName}»!`,
          timestamp: Date.now()
        });
      }

      shipSound.playSuccess();

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('db-employees-updated'));
        window.dispatchEvent(new CustomEvent('db-updated'));
      }
    } catch (err) {
      console.error('Failed to relocate employee:', err);
    }
  };

  const handleOpenFlagshipEditModal = () => {
    const rawDesc = structure.flagship.description || flagshipDescription || '';
    const cleanDesc = rawDesc === 'Центральный командный мостик оргструктуры компании.' ? '' : rawDesc;
    setFlagshipName(structure.hasCompany ? structure.flagship.name : (flagshipName || ''));
    setFlagshipDescription(cleanDesc);
    setFlagshipProducts(flagshipProducts || '');
    setFlagshipWebsites(flagshipWebsites || []);
    setFlagshipEmployees(structure.flagship.employees && structure.flagship.employees.length > 0
      ? structure.flagship.employees
      : []
    );
    setIsEditingFlagship(true);
    shipSound.playClick();
  };

  const handleAddWebsite = () => {
    const trimmed = newWebsiteInput.trim();
    if (!trimmed) return;
    const url = trimmed.startsWith('http://') || trimmed.startsWith('https://') ? trimmed : `https://${trimmed}`;
    if (!flagshipWebsites.includes(url)) {
      setFlagshipWebsites(prev => [...prev, url]);
    }
    setNewWebsiteInput('');
  };

  const handleRemoveWebsite = (siteToRemove: string) => {
    setFlagshipWebsites(prev => prev.filter(s => s !== siteToRemove));
  };

  const handleAddFlagshipEmployee = () => {
    if (!selectedFlagshipEmpId) return;
    const found = allCompanyEmployees.find(e => String(e.id) === String(selectedFlagshipEmpId));
    if (!found) return;
    const alreadyExists = flagshipEmployees.some(fe => String(fe.id) === String(found.id) || fe.name.trim().toLowerCase() === found.name.trim().toLowerCase());
    if (alreadyExists) return;

    const newEmp = {
      id: String(found.id),
      name: found.name,
      role: found.role || found.position || 'Специалист Штаба'
    };
    setFlagshipEmployees(prev => [...prev, newEmp]);
    setSelectedFlagshipEmpId('');
    shipSound.playClick();
  };

  const handleRemoveFlagshipEmployee = (id: string) => {
    setFlagshipEmployees(prev => prev.filter(e => e.id !== id));
  };

  const scrollToModule = (mod: ShipModule) => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const targetX = CANVAS_ORIGIN_X + mod.x * zoom - container.clientWidth / 2;
    const targetY = CANVAS_ORIGIN_Y + mod.y * zoom - container.clientHeight / 2;
    container.scrollTo({
      left: Math.max(0, targetX),
      top: Math.max(0, targetY),
      behavior: 'smooth'
    });
  };

  // Synchronized Horizontal Scrollbars (Top, Canvas, and Dedicated Bottom)
  const syncScrolls = (sourceLeft: number, sourceName: 'top' | 'container' | 'bottom') => {
    if (isSyncingScroll.current) return;
    isSyncingScroll.current = true;

    if (sourceName !== 'container' && containerRef.current) {
      containerRef.current.scrollLeft = sourceLeft;
    }
    if (sourceName !== 'top' && topScrollRef.current) {
      topScrollRef.current.scrollLeft = sourceLeft;
    }
    if (sourceName !== 'bottom' && bottomScrollRef.current) {
      bottomScrollRef.current.scrollLeft = sourceLeft;
    }

    setTimeout(() => {
      isSyncingScroll.current = false;
    }, 20);
  };

  const handleTopScroll = () => {
    if (topScrollRef.current) syncScrolls(topScrollRef.current.scrollLeft, 'top');
  };

  const handleBottomScroll = () => {
    if (bottomScrollRef.current) syncScrolls(bottomScrollRef.current.scrollLeft, 'bottom');
  };

  const handleContainerScroll = () => {
    if (containerRef.current) syncScrolls(containerRef.current.scrollLeft, 'container');
  };

  // Initial auto-scroll to center flagship horizontally at top & auto-set zoom on PC (100%) / Mobile (60%)
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      const targetZoom = isMobile ? 0.60 : 1.0;
      setZoom(targetZoom);

      setTimeout(() => {
        if (containerRef.current) {
          const scrollPos = Math.max(0, (CANVAS_WIDTH - containerRef.current.clientWidth) / 2);
          containerRef.current.scrollLeft = scrollPos;
          containerRef.current.scrollTop = 0;
          if (topScrollRef.current) {
            topScrollRef.current.scrollLeft = scrollPos;
          }
        }
      }, 10);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [CANVAS_WIDTH]);

  // Zoom handlers (5% step)
  const handleZoomIn = () => {
    setZoom(prev => Math.min(Number((prev + 0.05).toFixed(2)), 2.0));
    shipSound.playZoom();
  };

  const handleZoomOut = () => {
    setZoom(prev => Math.max(Number((prev - 0.05).toFixed(2)), 0.35));
    shipSound.playZoom();
  };

  const handleAutoCenter = () => {
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
    setZoom(isMobile ? 0.60 : 1.0);
    setTimeout(() => {
      if (containerRef.current) {
        const scrollPos = Math.max(0, (CANVAS_WIDTH - containerRef.current.clientWidth) / 2);
        containerRef.current.scrollLeft = scrollPos;
        containerRef.current.scrollTop = 0;
        if (topScrollRef.current) {
          topScrollRef.current.scrollLeft = scrollPos;
        }
      }
    }, 10);
    shipSound.playClick();
  };

  // Mouse Move for Module & Astronaut Dragging
  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggingAstronaut) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !containerRef.current) return;

      const mouseContentX = e.clientX - rect.left + containerRef.current.scrollLeft;
      const mouseContentY = e.clientY - rect.top + containerRef.current.scrollTop;

      const mouseWorldX = (mouseContentX - CANVAS_ORIGIN_X) / zoom;
      const mouseWorldY = (mouseContentY - CANVAS_ORIGIN_Y) / zoom;

      let hovered: string | null = null;
      // Check Flagship bounds
      const flagX = structure.flagship.x;
      const flagY = structure.flagship.y;
      if (Math.abs(mouseWorldX - flagX) < 380 && Math.abs(mouseWorldY - flagY) < 140) {
        hovered = 'flagship';
      } else {
        for (const mod of structure.modules) {
          const isSub = mod.type === 'subdepartment';
          const w = isSub ? 120 : 150;
          const h = isSub ? 70 : 80;
          if (Math.abs(mouseWorldX - mod.x) < w && Math.abs(mouseWorldY - mod.y) < h) {
            hovered = mod.id;
            break;
          }
        }
      }
      setDragOverModuleId(hovered);
      return;
    }

    if (dragging) {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect || !containerRef.current) return;

      const mouseContentX = e.clientX - rect.left + containerRef.current.scrollLeft;
      const mouseContentY = e.clientY - rect.top + containerRef.current.scrollTop;

      const mouseWorldX = (mouseContentX - CANVAS_ORIGIN_X) / zoom;
      const mouseWorldY = (mouseContentY - CANVAS_ORIGIN_Y) / zoom;

      const newX = Math.round(mouseWorldX - dragging.offsetX);
      const newY = Math.round(mouseWorldY - dragging.offsetY);

      // Check Magnetic Attraction Radius with all open docks on other modules
      let candidateSnap: DraggingState['snappedDock'] = null;
      const SNAP_RADIUS = 50;

      const currentModule = structure.modules.find(m => m.id === dragging.moduleId);
      if (currentModule) {
        for (const myDock of currentModule.docks) {
          const myWorldX = newX + myDock.localX;
          const myWorldY = newY + myDock.localY;

          // Check against Flagship bottom dock
          const flagshipDock = structure.flagship.docks[0];
          const distToFlagship = Math.hypot(myWorldX - flagshipDock.worldX, myWorldY - flagshipDock.worldY);

          if (myDock.type === 'top' && distToFlagship < SNAP_RADIUS) {
            candidateSnap = {
              sourceDockId: myDock.id,
              targetModuleId: structure.flagship.id,
              targetDockId: flagshipDock.id,
              targetWorldX: flagshipDock.worldX - myDock.localX,
              targetWorldY: flagshipDock.worldY - myDock.localY
            };
            break;
          }

          // Check against all other modules' open docks
          for (const otherModule of structure.modules) {
            if (otherModule.id === dragging.moduleId) continue;

            for (const otherDock of otherModule.docks) {
              if (otherDock.status === 'occupied' && otherDock.connectedToId !== myDock.id) continue;

              const isCompatible =
                (myDock.type === 'top' && otherDock.type === 'bottom') ||
                (myDock.type === 'bottom' && otherDock.type === 'top') ||
                (myDock.type === 'left' && otherDock.type === 'right') ||
                (myDock.type === 'right' && otherDock.type === 'left');

              if (!isCompatible) continue;

              const otherWorldX = otherModule.x + otherDock.localX;
              const otherWorldY = otherModule.y + otherDock.localY;

              const dist = Math.hypot(myWorldX - otherWorldX, myWorldY - otherWorldY);

              if (dist < SNAP_RADIUS) {
                candidateSnap = {
                  sourceDockId: myDock.id,
                  targetModuleId: otherModule.id,
                  targetDockId: otherDock.id,
                  targetWorldX: otherWorldX - myDock.localX,
                  targetWorldY: otherWorldY - myDock.localY
                };
                shipSound.playProximityHum();
                break;
              }
            }
            if (candidateSnap) break;
          }
          if (candidateSnap) break;
        }
      }

      const targetX = candidateSnap ? candidateSnap.targetWorldX : newX;
      const targetY = candidateSnap ? candidateSnap.targetWorldY : newY;

      // Delta for shifting child subdepartments if a department is dragged
      const deltaX = currentModule ? targetX - currentModule.x : 0;
      const deltaY = currentModule ? targetY - currentModule.y : 0;

      setStructure(prev => {
        const isDept = currentModule?.type === 'department';
        const attachedSubIds = new Set<string>();

        if (isDept && currentModule) {
          prev.modules.forEach(m => {
            if (m.type === 'subdepartment' && resolveRootDepartmentId(m.id, prev.modules, prev.flagship.id) === currentModule.id) {
              attachedSubIds.add(m.id);
            }
          });
        }

        return {
          ...prev,
          modules: prev.modules.map(m => {
            if (m.id === dragging.moduleId) {
              return {
                ...m,
                x: targetX,
                y: targetY,
                docks: m.docks.map(d => ({
                  ...d,
                  worldX: targetX + d.localX,
                  worldY: targetY + d.localY,
                  status: candidateSnap && candidateSnap.sourceDockId === d.id ? 'snapping' : d.status
                }))
              };
            }
            if (attachedSubIds.has(m.id) && (deltaX !== 0 || deltaY !== 0)) {
              const newSubX = m.x + deltaX;
              const newSubY = m.y + deltaY;
              return {
                ...m,
                x: newSubX,
                y: newSubY,
                docks: m.docks.map(d => ({
                  ...d,
                  worldX: newSubX + d.localX,
                  worldY: newSubY + d.localY
                }))
              };
            }
            return m;
          })
        };
      });

      setDragging(prev => prev ? { ...prev, snappedDock: candidateSnap } : null);
    }
  };

  // Mouse Up to Lock Connection and persist coordinates and hierarchy in PostgreSQL BD ProTalk
  const handleMouseUp = () => {
    if (draggingAstronaut) {
      if (dragOverModuleId) {
        const targetDeptId = dragOverModuleId === 'flagship' ? null : dragOverModuleId;
        const targetName = dragOverModuleId === 'flagship'
          ? 'Флагман (Штаб)'
          : (structure.modules.find(m => m.id === dragOverModuleId)?.name || 'Отдел');
        handleRelocateEmployee(
          draggingAstronaut.employee,
          draggingAstronaut.sourceModuleId,
          targetDeptId,
          targetName
        );
      } else {
        if (draggingAstronaut.sourceModuleId && draggingAstronaut.sourceModuleId !== 'flagship') {
          const sourceMod = structure.modules.find(m => m.id === draggingAstronaut.sourceModuleId);
          handleRelocateEmployee(
            draggingAstronaut.employee,
            draggingAstronaut.sourceModuleId,
            null,
            structure.flagship.name || 'Командный Мостик',
            sourceMod?.name || 'отдела'
          );
        }
      }
      setDraggingAstronaut(null);
      setDragOverModuleId(null);
    }

    if (dragging) {
      const draggedMod = structure.modules.find(m => m.id === dragging.moduleId);
      if (draggedMod) {
        if (dragging.snappedDock) {
          const { targetModuleId, targetDockId, sourceDockId } = dragging.snappedDock;
          shipSound.playMagneticSnap();

          // Calculate correct hierarchy parent_id
          let finalParentId: string | null = null;
          if (draggedMod.type === 'subdepartment') {
            finalParentId = resolveRootDepartmentId(targetModuleId, structure.modules, structure.flagship.id);
          } else {
            // Dragged is a department
            if (targetModuleId === structure.flagship.id || targetModuleId === 'flagship-main') {
              finalParentId = null;
            } else {
              finalParentId = resolveRootDepartmentId(targetModuleId, structure.modules, structure.flagship.id);
            }
          }

          // Update local state with new parentId and connected docks
          setStructure(prev => {
            const descendantIds = new Set<string>();
            const collectDescendants = (rootId: string) => {
              prev.modules.forEach(m => {
                if (m.parentId === rootId && !descendantIds.has(m.id)) {
                  descendantIds.add(m.id);
                  collectDescendants(m.id);
                }
              });
            };
            collectDescendants(draggedMod.id);

            const updatedModules = prev.modules.map(m => {
              if (m.id === dragging.moduleId) {
                return {
                  ...m,
                  parentId: finalParentId,
                  docks: m.docks.map(d => d.id === sourceDockId ? { ...d, status: 'occupied' as const, connectedToId: targetDockId } : d)
                };
              }
              if (m.id === targetModuleId) {
                return {
                  ...m,
                  docks: m.docks.map(d => d.id === targetDockId ? { ...d, status: 'occupied' as const, connectedToId: sourceDockId } : d)
                };
              }
              if (descendantIds.has(m.id) && draggedMod.type === 'subdepartment') {
                return {
                  ...m,
                  parentId: finalParentId
                };
              }
              return m;
            });

            return { ...prev, modules: updatedModules };
          });

          // Persist dragged module to PostgreSQL BD ProTalk in real time
          fetch(`/api/departments/${draggedMod.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              x: draggedMod.x,
              y: draggedMod.y,
              parent_id: finalParentId
            })
          }).catch(e => console.warn('Failed to update dragged dept coords in PostgreSQL BD ProTalk:', e));

          // Also update all attached child modules in PostgreSQL BD ProTalk
          structure.modules.forEach(m => {
            if (m.id !== draggedMod.id && (draggedMod.type === 'department' ? resolveRootDepartmentId(m.id, structure.modules, structure.flagship.id) === draggedMod.id : m.parentId === draggedMod.id)) {
              fetch(`/api/departments/${m.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  x: m.x,
                  y: m.y,
                  parent_id: draggedMod.type === 'subdepartment' ? finalParentId : m.parentId
                })
              }).catch(e => console.warn('Failed to update child module in PostgreSQL BD ProTalk:', e));
            }
          });

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('db-departments-updated'));
            window.dispatchEvent(new CustomEvent('db-updated'));
          }
        } else {
          // Free movement (no snap) - persist current position to PostgreSQL BD ProTalk
          fetch(`/api/departments/${draggedMod.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              x: draggedMod.x,
              y: draggedMod.y,
              parent_id: draggedMod.parentId
            })
          }).catch(e => console.warn('Failed to update dragged dept coords in PostgreSQL BD ProTalk:', e));

          // If attached child subdepartments moved with department, persist their coordinates too
          if (draggedMod.type === 'department') {
            structure.modules.forEach(m => {
              if (m.id !== draggedMod.id && resolveRootDepartmentId(m.id, structure.modules, structure.flagship.id) === draggedMod.id) {
                fetch(`/api/departments/${m.id}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    x: m.x,
                    y: m.y,
                    parent_id: m.parentId
                  })
                }).catch(e => console.warn('Failed to update child subdepartment coords in PostgreSQL BD ProTalk:', e));
              }
            });
          }

          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('db-departments-updated'));
            window.dispatchEvent(new CustomEvent('db-updated'));
          }
        }
      }

      setDragging(null);
    }
  };

  // Start dragging a module (Flagship remains fixed at top center)
  const handleModuleMouseDown = (m: ShipModule, e: React.MouseEvent) => {
    e.stopPropagation();

    setSelectedModuleId(m.id);
    shipSound.playClick();

    // Prevent dragging Flagship module
    if (m.id === structure.flagship.id) {
      return;
    }

    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !containerRef.current) return;

    const mouseContentX = e.clientX - rect.left + containerRef.current.scrollLeft;
    const mouseContentY = e.clientY - rect.top + containerRef.current.scrollTop;

    const mouseWorldX = (mouseContentX - CANVAS_ORIGIN_X) / zoom;
    const mouseWorldY = (mouseContentY - CANVAS_ORIGIN_Y) / zoom;

    setDragging({
      moduleId: m.id,
      offsetX: mouseWorldX - m.x,
      offsetY: mouseWorldY - m.y,
      snappedDock: null
    });
  };

  // Helper to determine module type allowed at specific dock
  const getTargetModuleType = (module: ShipModule, dock: DockConnector): 'department' | 'subdepartment' => {
    if (module.id === structure.flagship.id) {
      return 'department';
    }
    if (module.type === 'department') {
      if (dock.type === 'bottom') return 'department';
      return 'subdepartment';
    }
    return 'subdepartment';
  };

  // Dock Connector Click Handler: Opens creation or module editor modal
  const handleDockClick = (module: ShipModule, dock: DockConnector) => {
    shipSound.playClick();

    // If dock is occupied, directly open the editor modal for the attached module!
    if (dock.connectedToId) {
      const connectedMod = structure.modules.find(m =>
        m.docks.some(d => d.id === dock.connectedToId)
      );
      if (connectedMod) {
        handleOpenEditModal(connectedMod);
        return;
      }
    }

    // Otherwise, open dock creation modal for free dock
    const targetType = getTargetModuleType(module, dock);
    setNewModuleType(targetType);
    setNewModuleName(targetType === 'department' ? 'Новый отдел' : 'Новый подотдел');

    setDockModal({
      parentModule: module,
      dock,
      connectedModule: null
    });
  };

  // Action: Create and attach a new module at dock
  const handleCreateModuleAtDock = () => {
    if (!dockModal) return;

    const { parentModule, dock } = dockModal;
    const targetType = getTargetModuleType(parentModule, dock);
    const newId = `mod-${Date.now().toString(36)}`;

    // Opposite dock type connecting back to parent dock
    const oppositeType = dock.type === 'bottom' ? 'top' : dock.type === 'top' ? 'bottom' : dock.type === 'left' ? 'right' : 'left';

    // Get relative local dock position for the child module type at origin (0, 0)
    const dummyDocks = targetType === 'department'
      ? getDepartmentDocks(newId, 0, 0)
      : getSubDepartmentDocks(newId, 0, 0);
    const dummyChildDock = dummyDocks.find(d => d.type === oppositeType) || dummyDocks[0];

    // Calculate exact target world coordinates so the child dock lines up seamlessly at dock creation point
    const newX = parentModule.x + dock.localX - dummyChildDock.localX;
    const newY = parentModule.y + dock.localY - dummyChildDock.localY;

    const newDocks = targetType === 'department'
      ? getDepartmentDocks(newId, newX, newY)
      : getSubDepartmentDocks(newId, newX, newY);

    const childTargetDock = newDocks.find(d => d.type === oppositeType) || newDocks[0];

    // Connect dock references
    dock.status = 'occupied';
    dock.connectedToId = childTargetDock.id;

    childTargetDock.status = 'occupied';
    childTargetDock.connectedToId = dock.id;

    const modName = newModuleName || (targetType === 'department' ? 'Новый отдел' : 'Новый подотдел');
    const defaultLead = targetType === 'department' ? 'Руководитель отдела' : 'Руководитель группы';

    // Hierarchy resolution for parentId:
    // If creating a subdepartment, root department is parent
    const rootParentDeptId = resolveRootDepartmentId(parentModule.id, structure.modules, structure.flagship.id);
    const finalParentId = targetType === 'subdepartment'
      ? (rootParentDeptId || (parentModule.type === 'department' ? parentModule.id : null))
      : (parentModule.id === structure.flagship.id || parentModule.id === 'flagship-main' ? null : rootParentDeptId);

    const createdModule: ShipModule = {
      id: newId,
      type: targetType,
      name: modName,
      subtitle: targetType === 'department' ? 'Производственный отсек' : 'Специализированный блок',
      employeeCount: 0,
      leadName: defaultLead,
      status: 'Active',
      activityScore: 90,
      systemLoad: 50,
      x: newX,
      y: newY,
      parentId: finalParentId,
      attachedDockType: dock.type,
      docks: newDocks,
      description: `${targetType === 'department' ? 'Отдел' : 'Подотдел'}: ${modName}`
    };

    // Save to PostgreSQL BD ProTalk
    fetch('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: newId,
        company_id: structure.flagship.id || 'flagship-main',
        name: modName,
        type: targetType,
        lead_name: defaultLead,
        parent_id: finalParentId,
        x: newX,
        y: newY,
        description: `${targetType === 'department' ? 'Отдел' : 'Подотдел'}: ${modName}`
      })
    }).catch(err => console.error('Failed to insert department at dock in PostgreSQL BD ProTalk:', err));

    setStructure(prev => {
      // Update parent module dock status
      let updatedFlagship = prev.flagship;
      if (parentModule.id === prev.flagship.id) {
        updatedFlagship = {
          ...prev.flagship,
          docks: prev.flagship.docks.map(d => d.id === dock.id ? dock : d)
        };
      }

      const updatedModules = prev.modules.map(m => {
        if (m.id === parentModule.id) {
          return {
            ...m,
            docks: m.docks.map(d => d.id === dock.id ? dock : d)
          };
        }
        return m;
      });

      const nextStructure = {
        ...prev,
        flagship: updatedFlagship,
        modules: [...updatedModules, createdModule]
      };

      if (onSaveStructure) onSaveStructure(nextStructure);
      return nextStructure;
    });

    shipSound.playMagneticSnap();
    setDockModal(null);
  };

  // Unrestricted Module Deletion with Automatic Vertical / Horizontal Re-docking and Shifting
  const deleteAndShiftModule = (
    targetModule: ShipModule,
    prevStructure: ShipCompanyStructure
  ): ShipCompanyStructure => {
    const { flagship, modules } = prevStructure;

    // 1. Find parent module/flagship and parent dock
    let parentModule: ShipModule | typeof flagship | null = null;
    let parentDock: DockConnector | null = null;

    // Search in flagship docks
    for (const d of flagship.docks) {
      if (d.connectedToId && targetModule.docks.some(td => td.id === d.connectedToId)) {
        parentModule = flagship;
        parentDock = d;
        break;
      }
    }

    // Search in other modules docks
    if (!parentModule) {
      for (const m of modules) {
        if (m.id === targetModule.id) continue;
        for (const d of m.docks) {
          if (d.connectedToId && targetModule.docks.some(td => td.id === d.connectedToId)) {
            parentModule = m;
            parentDock = d;
            break;
          }
        }
        if (parentModule) break;
      }
    }

    // Fallback parent by parentId
    if (!parentModule && targetModule.parentId) {
      if (targetModule.parentId === flagship.id) {
        parentModule = flagship;
        parentDock = flagship.docks.find(d => d.type === 'bottom') || flagship.docks[0];
      } else {
        parentModule = modules.find(m => m.id === targetModule.parentId) || null;
        if (parentModule) {
          parentDock = parentModule.docks.find(d => d.type === 'bottom') || parentModule.docks[0];
        }
      }
    }

    // Case A: targetModule is a DEPARTMENT (Vertical Column)
    if (targetModule.type === 'department') {
      const bottomDock = targetModule.docks.find(d => d.type === 'bottom');
      const childBelow = modules.find(m =>
        m.id !== targetModule.id &&
        (
          (bottomDock?.connectedToId && m.docks.some(cd => cd.id === bottomDock.connectedToId)) ||
          (m.x === targetModule.x && m.y > targetModule.y && m.type === 'department' && Math.abs(m.y - (targetModule.y + 220)) < 60)
        )
      );

      let nextModules = modules.filter(m => m.id !== targetModule.id);

      if (childBelow && parentModule && parentDock) {
        const deltaY = childBelow.y - targetModule.y;

        const subtreeIds = new Set<string>();
        const collectSubtree = (rootId: string) => {
          subtreeIds.add(rootId);
          nextModules.forEach(m => {
            if (m.parentId === rootId) {
              if (!subtreeIds.has(m.id)) collectSubtree(m.id);
            }
          });
        };
        collectSubtree(childBelow.id);

        nextModules.forEach(m => {
          if (m.x === targetModule.x && m.y >= childBelow.y) {
            subtreeIds.add(m.id);
          }
        });

        nextModules = nextModules.map(m => {
          if (subtreeIds.has(m.id)) {
            const newY = m.y - deltaY;
            const updatedDocks = m.docks.map(d => ({
              ...d,
              worldY: d.worldY - deltaY
            }));

            if (m.id === childBelow.id) {
              const topDock = updatedDocks.find(d => d.type === 'top') || updatedDocks[0];
              if (topDock && parentDock) {
                topDock.status = 'occupied';
                topDock.connectedToId = parentDock.id;
              }
              return {
                ...m,
                y: newY,
                parentId: parentModule.id,
                docks: updatedDocks
              };
            }

            return {
              ...m,
              y: newY,
              docks: updatedDocks
            };
          }
          return m;
        });

        const childTopDock = childBelow.docks.find(d => d.type === 'top') || childBelow.docks[0];
        if (parentModule.id === flagship.id) {
          return {
            ...prevStructure,
            flagship: {
              ...flagship,
              docks: flagship.docks.map(d => d.id === parentDock?.id ? { ...d, status: 'occupied' as const, connectedToId: childTopDock.id } : d)
            },
            modules: nextModules
          };
        } else {
          nextModules = nextModules.map(m => {
            if (m.id === parentModule.id) {
              return {
                ...m,
                docks: m.docks.map(d => d.id === parentDock?.id ? { ...d, status: 'occupied' as const, connectedToId: childTopDock.id } : d)
              };
            }
            return m;
          });
        }
      } else {
        if (parentModule && parentDock) {
          if (parentModule.id === flagship.id) {
            return {
              ...prevStructure,
              flagship: {
                ...flagship,
                docks: flagship.docks.map(d => d.id === parentDock?.id ? { ...d, status: 'free' as const, connectedToId: null } : d)
              },
              modules: nextModules
            };
          } else {
            nextModules = nextModules.map(m => {
              if (m.id === parentModule.id) {
                return {
                  ...m,
                  docks: m.docks.map(d => d.id === parentDock?.id ? { ...d, status: 'free' as const, connectedToId: null } : d)
                };
              }
              return m;
            });
          }
        }
      }

      return {
        ...prevStructure,
        modules: nextModules
      };
    }

    // Case B: targetModule is a SUBDEPARTMENT (Horizontal Row)
    if (targetModule.type === 'subdepartment') {
      const isLeftSide = targetModule.x < (parentModule?.x || 0);
      const outerDockType = isLeftSide ? 'left' : 'right';
      const innerDockType = isLeftSide ? 'right' : 'left';

      const outerDock = targetModule.docks.find(d => d.type === outerDockType);
      const outerSubDept = modules.find(m =>
        m.id !== targetModule.id &&
        outerDock?.connectedToId &&
        m.docks.some(cd => cd.id === outerDock.connectedToId)
      );

      let nextModules = modules.filter(m => m.id !== targetModule.id);

      if (outerSubDept && parentModule && parentDock) {
        const deltaX = isLeftSide ? 200 : -200;

        const chainIds = new Set<string>();
        const collectChain = (rootId: string) => {
          chainIds.add(rootId);
          nextModules.forEach(m => {
            if (m.parentId === rootId) {
              if (!chainIds.has(m.id)) collectChain(m.id);
            }
          });
        };
        collectChain(outerSubDept.id);

        nextModules = nextModules.map(m => {
          if (chainIds.has(m.id)) {
            const newX = m.x + deltaX;
            const updatedDocks = m.docks.map(d => ({
              ...d,
              worldX: d.worldX + deltaX
            }));

            if (m.id === outerSubDept.id) {
              const innerDock = updatedDocks.find(d => d.type === innerDockType) || updatedDocks[0];
              if (innerDock && parentDock) {
                innerDock.status = 'occupied';
                innerDock.connectedToId = parentDock.id;
              }
              return {
                ...m,
                x: newX,
                parentId: parentModule.id,
                docks: updatedDocks
              };
            }

            return {
              ...m,
              x: newX,
              docks: updatedDocks
            };
          }
          return m;
        });

        const outerInnerDock = outerSubDept.docks.find(d => d.type === innerDockType) || outerSubDept.docks[0];
        if (parentModule.id === flagship.id) {
          return {
            ...prevStructure,
            flagship: {
              ...flagship,
              docks: flagship.docks.map(d => d.id === parentDock?.id ? { ...d, status: 'occupied' as const, connectedToId: outerInnerDock.id } : d)
            },
            modules: nextModules
          };
        } else {
          nextModules = nextModules.map(m => {
            if (m.id === parentModule.id) {
              return {
                ...m,
                docks: m.docks.map(d => d.id === parentDock?.id ? { ...d, status: 'occupied' as const, connectedToId: outerInnerDock.id } : d)
              };
            }
            return m;
          });
        }
      } else {
        if (parentModule && parentDock) {
          if (parentModule.id === flagship.id) {
            return {
              ...prevStructure,
              flagship: {
                ...flagship,
                docks: flagship.docks.map(d => d.id === parentDock?.id ? { ...d, status: 'free' as const, connectedToId: null } : d)
              },
              modules: nextModules
            };
          } else {
            nextModules = nextModules.map(m => {
              if (m.id === parentModule.id) {
                return {
                  ...m,
                  docks: m.docks.map(d => d.id === parentDock?.id ? { ...d, status: 'free' as const, connectedToId: null } : d)
                };
              }
              return m;
            });
          }
        }
      }

      return {
        ...prevStructure,
        modules: nextModules
      };
    }

    return {
      ...prevStructure,
      modules: modules.filter(m => m.id !== targetModule.id)
    };
  };

  // Action: Remove connected module with direct automatic shift
  const handleRemoveConnectedModule = () => {
    if (!dockModal || !dockModal.connectedModule) return;

    const moduleToRemove = dockModal.connectedModule;

    // Delete in PostgreSQL BD ProTalk
    fetch(`/api/departments/${moduleToRemove.id}`, { method: 'DELETE' }).catch(err => console.warn('Failed to delete dept in PostgreSQL BD ProTalk:', err));

    setStructure(prev => {
      const nextStructure = deleteAndShiftModule(moduleToRemove, prev);
      if (onSaveStructure) onSaveStructure(nextStructure);

      // Update shifted modules in PostgreSQL BD ProTalk
      nextStructure.modules.forEach(m => {
        const old = prev.modules.find(pm => pm.id === m.id);
        if (old && (old.x !== m.x || old.y !== m.y || old.parentId !== m.parentId)) {
          fetch(`/api/departments/${m.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              x: m.x,
              y: m.y,
              parent_id: m.parentId
            })
          }).catch(e => console.warn('Failed to update shifted module in PostgreSQL BD ProTalk:', e));
        }
      });

      return nextStructure;
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('db-departments-updated'));
      window.dispatchEvent(new CustomEvent('db-updated'));
    }

    shipSound.playClick();
    setDockModal(null);
  };

  // Helper check for modal
  const targetModuleIsDept = dockModal?.connectedModule?.type === 'department';
  const targetDeptHasChildren = targetModuleIsDept && dockModal?.connectedModule
    ? structure.modules.some(m => {
        if (m.id === dockModal.connectedModule?.id) return false;
        if (m.parentId === dockModal.connectedModule?.id) return true;
        const targetDept = dockModal.connectedModule;
        return targetDept ? m.docks.some(childDock =>
          childDock.type === 'top' &&
          childDock.status === 'occupied' &&
          childDock.connectedToId &&
          targetDept.docks.some(parentDock => parentDock.id === childDock.connectedToId)
        ) : false;
      })
    : false;

  return (
    <div className="w-full h-full relative font-sans select-none flex flex-col">
      {/* Synchronized Top Horizontal Scrollbar */}
      <div
        ref={topScrollRef}
        onScroll={handleTopScroll}
        className={`w-full overflow-x-auto overflow-y-hidden h-3 rounded-t-2xl border-b mb-1 scrollbar-thin shrink-0 transition-colors ${
          isLight
            ? 'bg-white/95 border-amber-400/80 scrollbar-thumb-amber-500'
            : 'bg-[#120E08]/90 border-amber-500/30 scrollbar-thumb-amber-500/50 hover:scrollbar-thumb-amber-400'
        }`}
        title="Верхняя горизонтальная прокрутка карты"
      >
        <div style={{ width: `${CANVAS_WIDTH}px`, height: '1px' }} />
      </div>

      {/* Embedded Company Header Navigation Bar right under top scrollbar */}
      <div className="w-full flex justify-center py-1 relative z-30 shrink-0">
        <CompanyHeaderNav
          activeView={activeView}
          onViewChange={onViewChange}
          isLightTheme={isLight}
        />
      </div>

      {/* Scrollable Spacecraft Canvas Container */}
      <div
        ref={containerRef}
        onScroll={handleContainerScroll}
        className="w-full h-[520px] md:h-[750px] relative rounded-b-3xl overflow-auto bg-transparent font-sans select-none scrollbar-thin scrollbar-thumb-amber-500/50"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {/* Canvas World Content (Dynamic width/height matching modules scope) */}
        <div style={{ width: `${CANVAS_WIDTH}px`, height: `${CANVAS_HEIGHT}px` }} className="relative bg-transparent">
          <svg
            className="w-full h-full absolute inset-0 pointer-events-auto"
            viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          >
            <g transform={`translate(${CANVAS_ORIGIN_X}, ${CANVAS_ORIGIN_Y}) scale(${zoom})`}>

              {/* Render Root Flagship Module only if company exists, or Create Company button */}
              {structure.hasCompany ? (
                <ShipFlagshipSVG
                  module={structure.flagship}
                  themeMode={themeMode}
                  isSelected={selectedModuleId === structure.flagship.id}
                  isDropTarget={dragOverModuleId === 'flagship'}
                  zoom={zoom}
                  activeView={activeView}
                  onViewChange={onViewChange}
                  onZoomIn={handleZoomIn}
                  onZoomOut={handleZoomOut}
                  onAutoCenter={handleAutoCenter}
                  onClick={() => {
                    setSelectedModuleId(structure.flagship.id);
                    handleOpenFlagshipEditModal();
                  }}
                  onDockClick={(dock) => handleDockClick(structure.flagship, dock)}
                  onEditFlagship={() => handleOpenFlagshipEditModal()}
                  onAddDepartment={() => handleDockClick(structure.flagship, structure.flagship.docks[0])}
                  onEmployeeClick={(emp) => handleAstronautClick(emp)}
                  onEmployeeDragStart={(e, emp) => handleAstronautDragStart(e, emp, 'flagship')}
                />
              ) : (
                <g
                  transform="translate(0, -190)"
                  className="cursor-pointer group"
                  onClick={() => handleOpenFlagshipEditModal()}
                >
                  <defs>
                    <radialGradient id="flagshipCreateGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#F4EE8E" stopOpacity="0.6" />
                      <stop offset="60%" stopColor="#E7C768" stopOpacity="0.2" />
                      <stop offset="100%" stopColor="#D99E41" stopOpacity="0" />
                    </radialGradient>
                    <linearGradient id="flagshipButtonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FFF8D6" />
                      <stop offset="50%" stopColor="#E7C768" />
                      <stop offset="100%" stopColor="#B38628" />
                    </linearGradient>
                  </defs>

                  {/* Ambient Glow */}
                  <circle r="145" fill="url(#flagshipCreateGlow)" opacity="0.38" />

                  {/* Outer Dashed Border */}
                  <circle
                    r="105"
                    fill={isLight ? 'rgba(255, 251, 245, 0.95)' : 'rgba(26, 15, 2, 0.95)'}
                    stroke={isLight ? '#B45309' : '#F4EE8E'}
                    strokeWidth="2.5"
                    strokeDasharray="8 6"
                    className="transition-all duration-300 group-hover:scale-105"
                  />

                  {/* Inner Golden Button */}
                  <g className="transition-transform duration-300 group-hover:scale-108">
                    <circle
                      r="88"
                      fill="url(#flagshipButtonGrad)"
                      stroke="#E7C768"
                      strokeWidth="2"
                    />
                    <g transform="translate(-15, -46)">
                      <path
                        d="M3 24V3h14v21M10 3v21M3 8h14M3 13h14M3 18h14"
                        stroke="#1A0F02"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </g>
                    <text
                      x="0"
                      y="10"
                      textAnchor="middle"
                      fill="#1A0F02"
                      fontWeight="900"
                      fontSize="20"
                      fontFamily="system-ui, sans-serif"
                    >
                      Создать
                    </text>
                    <text
                      x="0"
                      y="34"
                      textAnchor="middle"
                      fill="#1A0F02"
                      fontWeight="900"
                      fontSize="20"
                      fontFamily="system-ui, sans-serif"
                    >
                      компанию
                    </text>
                  </g>
                </g>
              )}

              {/* Inter-Module Connection Corridors / Energy Conduits */}
              <g id="docking-corridors">
                {structure.modules.map(m => {
                  if (m.type === 'department') {
                    const parent = m.parentId === structure.flagship.id
                      ? structure.flagship
                      : structure.modules.find(p => p.id === m.parentId);

                    const startX = parent ? parent.x : 0;
                    const startY = parent ? (parent.id === structure.flagship.id ? -60 : parent.y + 120) : -60;
                    const endX = m.x;
                    const endY = m.y - 120;

                    return (
                      <g key={`corridor-${m.id}`}>
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke={isLight ? '#D99E41' : '#F4EE8E'}
                          strokeWidth="8"
                          strokeLinecap="round"
                          opacity="0.35"
                        />
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke={isLight ? '#92400E' : '#E7C768'}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeDasharray="6 4"
                        />
                      </g>
                    );
                  } else if (m.type === 'subdepartment') {
                    const parent = structure.modules.find(p => p.id === m.parentId);
                    if (!parent) return null;

                    const isLeft = m.x < parent.x;
                    const startX = isLeft ? parent.x - 120 : parent.x + 120;
                    const startY = parent.y;
                    const endX = isLeft ? m.x + 100 : m.x - 100;
                    const endY = m.y;

                    return (
                      <g key={`corridor-${m.id}`}>
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke={isLight ? '#D99E41' : '#F4EE8E'}
                          strokeWidth="7"
                          strokeLinecap="round"
                          opacity="0.35"
                        />
                        <line
                          x1={startX}
                          y1={startY}
                          x2={endX}
                          y2={endY}
                          stroke={isLight ? '#92400E' : '#E7C768'}
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray="5 3"
                        />
                      </g>
                    );
                  }
                  return null;
                })}
              </g>

              {/* Render Department and Sub-department Modules */}
              {structure.modules.map(m => {
                if (m.type === 'department') {
                  return (
                    <ShipDepartmentSVG
                      key={m.id}
                      module={m}
                      themeMode={themeMode}
                      isSelected={selectedModuleId === m.id}
                      isDragging={dragging?.moduleId === m.id}
                      isDropTarget={dragOverModuleId === m.id}
                      zoom={zoom}
                      onClick={() => setSelectedModuleId(m.id)}
                      onMouseDown={(e) => handleModuleMouseDown(m, e)}
                      onDockClick={(dock) => handleDockClick(m, dock)}
                      onEditDepartment={(m) => handleOpenEditModal(m)}
                      onEmployeeClick={(emp) => handleAstronautClick(emp)}
                      onEmployeeDragStart={(e, emp) => handleAstronautDragStart(e, emp, m.id)}
                    />
                  );
                } else {
                  return (
                    <ShipSubDeptSVG
                      key={m.id}
                      module={m}
                      themeMode={themeMode}
                      isSelected={selectedModuleId === m.id}
                      isDragging={dragging?.moduleId === m.id}
                      isDropTarget={dragOverModuleId === m.id}
                      zoom={zoom}
                      onClick={() => setSelectedModuleId(m.id)}
                      onMouseDown={(e) => handleModuleMouseDown(m, e)}
                      onDockClick={(dock) => handleDockClick(m, dock)}
                      onEditDepartment={(m) => handleOpenEditModal(m)}
                      onEmployeeClick={(emp) => handleAstronautClick(emp)}
                      onEmployeeDragStart={(e, emp) => handleAstronautDragStart(e, emp, m.id)}
                    />
                  );
                }
              })}

            </g>
          </svg>
        </div>
      </div>

      {/* Synchronized Bottom Horizontal Scrollbar */}
      <div
        ref={bottomScrollRef}
        onScroll={handleBottomScroll}
        className={`w-full overflow-x-auto overflow-y-hidden h-4 rounded-b-2xl border-t mt-1 scrollbar-thin shrink-0 transition-colors ${
          isLight
            ? 'bg-white/95 border-amber-400/80 scrollbar-thumb-amber-500'
            : 'bg-[#120E08]/90 border-amber-500/30 scrollbar-thumb-amber-500/50 hover:scrollbar-thumb-amber-400'
        }`}
        title="Нижняя горизонтальная прокрутка карты"
      >
        <div style={{ width: `${CANVAS_WIDTH}px`, height: '1px' }} />
      </div>

      {/* DOCK CONNECTOR INTERACTIVE MODAL FOR CREATION */}
      {dockModal && (
        <div className="fixed inset-x-0 top-16 bottom-20 sm:inset-0 sm:top-14 sm:bottom-16 z-50 flex items-center justify-center p-3 sm:p-4 bg-transparent pointer-events-auto">
          <div className={`w-full max-w-lg max-h-full liquid-glass-modal rounded-3xl border-2 border-amber-400/60 p-4 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden ${
            isLight ? 'text-amber-950' : 'text-amber-100'
          }`}>
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/30 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
                  <Layers size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black">Пристыковать новый</h3>
                  <p className="text-xs text-amber-200/70">
                    Родитель: <span className="text-amber-400 font-bold">{dockModal.parentModule.name}</span>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDockModal(null)}
                className="p-1.5 rounded-xl hover:bg-amber-500/20 text-amber-200/60 hover:text-white cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4 custom-scrollbar scrollbar-thin pr-1 sm:pr-2">
              {/* Entity Type Auto Badge */}
              {newModuleType === 'department' ? (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                  <Shield className="text-amber-400 shrink-0" size={22} />
                  <div>
                    <p className="text-xs font-black text-amber-400 uppercase tracking-wide">Отдел</p>
                    <p className="text-[11px] text-amber-200/70 mt-0.5">Нижний шлюз предназначен для создания Отдела</p>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center gap-3">
                  <Cpu className="text-amber-400 shrink-0" size={22} />
                  <div>
                    <p className="text-xs font-black text-amber-400 uppercase tracking-wide">Подотдел</p>
                    <p className="text-[11px] text-amber-200/70 mt-0.5">Боковой шлюз предназначен для создания Подотдела</p>
                  </div>
                </div>
              )}

              {/* AI Auto-fill Block */}
              {/* AI Auto-fill Prompt Block with AudioField */}
              <div className={`p-3.5 rounded-2xl border backdrop-blur-md space-y-2 ${
                isLight ? 'border-amber-400/80 bg-amber-50/40' : 'border-amber-400/40 bg-white/5'
              }`}>
                <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-wide ${
                  isLight ? 'text-amber-950' : 'text-amber-300'
                }`}>
                  <Sparkles size={15} className="text-amber-500" />
                  <span>Автозаполнение</span>
                </div>
                <AudioField
                  value={dockProtalkPrompt}
                  onChange={setDockProtalkPrompt}
                  placeholder="Надиктуйте или напишите краткие задачи отсека для автозаполнения нейросетью..."
                  isLightTheme={isLight}
                  minHeight="70px"
                />
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleRunDockProTalk}
                    disabled={isDockProtalkLoading}
                    className="px-4 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow"
                  >
                    <Sparkles size={13} />
                    <span>ИИ-Оформление</span>
                  </button>
                </div>
              </div>

              <div>
                <label className={`text-xs font-bold mb-1.5 block ${isLight ? 'text-amber-950' : 'text-amber-200/80'}`}>
                  {newModuleType === 'department' ? 'Название нового отдела' : 'Название нового подотдела'}
                </label>
                <MiniAudioField
                  value={newModuleName}
                  onChange={setNewModuleName}
                  placeholder={newModuleType === 'department' ? 'Например: Финансовый отдел' : 'Например: Группа продаж'}
                  isLightTheme={isLight}
                />

                {/* Preset Chips directly under name input */}
                <div className="mt-2">
                  <p className={`text-[11px] font-bold mb-1.5 ${isLight ? 'text-amber-900/70' : 'text-amber-200/70'}`}>
                    Быстрые пресеты названий:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {(newModuleType === 'department'
                      ? ['Финансовый отдел', 'Отдел продаж', 'HR & Кадры', 'Служба заботы', 'Логистика', 'Юридический отдел']
                      : ['Группа продаж', 'Блок B2B', 'Секция поддержки', 'Отделение IT', 'Аналитический блок']
                    ).map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setNewModuleName(preset)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
                          isLight
                            ? 'bg-amber-100/70 hover:bg-amber-200/70 border-amber-400/80 text-amber-950'
                            : 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-200/90'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-amber-500/30 shrink-0">
              <button
                type="button"
                onClick={() => setDockModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-amber-200/70 hover:bg-amber-500/10 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                type="button"
                onClick={handleCreateModuleAtDock}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 text-xs font-black transition-all flex items-center gap-2 shadow-lg cursor-pointer hover:scale-105 active:scale-95"
              >
                <Plus size={16} />
                <span>{newModuleType === 'department' ? 'Пристыковать отдел' : 'Пристыковать подотдел'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT MODULE (DEPARTMENT / SUBDEPARTMENT) MODAL */}
      {editingModule && (
        <div className="fixed inset-x-0 top-16 bottom-20 sm:inset-0 sm:top-14 sm:bottom-16 z-50 flex items-center justify-center p-3 sm:p-4 bg-transparent pointer-events-auto">
          <div className={`w-full max-w-lg max-h-full liquid-glass-modal rounded-3xl border-2 border-amber-400/60 p-4 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden ${
            isLight ? 'text-amber-950' : 'text-amber-100'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500/20 text-amber-400">
                  <Shield size={22} />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-amber-300">
                    Редактирование {editingModule.type === 'department' ? 'Отдела' : 'Подотдела'}
                  </h3>
                  <p className="text-xs text-amber-200/70">Модуль ID: {editingModule.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingModule(null)}
                className="p-1.5 rounded-xl hover:bg-amber-500/20 text-amber-200/60 hover:text-white cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form Content */}
            <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4 custom-scrollbar scrollbar-thin pr-1 sm:pr-2">
              {/* AI Auto-fill Prompt Block with AudioField */}
              <div className={`p-3.5 rounded-2xl border backdrop-blur-md space-y-2 ${
                isLight ? 'border-amber-400/80 bg-amber-50/40' : 'border-amber-400/40 bg-white/5'
              }`}>
                <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-wide ${
                  isLight ? 'text-amber-950' : 'text-amber-300'
                }`}>
                  <Sparkles size={15} className="text-amber-500" />
                  <span>Автозаполнение</span>
                </div>
                <AudioField
                  value={editProtalkPrompt}
                  onChange={setEditProtalkPrompt}
                  placeholder="Надиктуйте или опишите функции, сотрудников и задачи этого отсека для ИИ..."
                  isLightTheme={isLight}
                  minHeight="70px"
                />
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleRunEditProTalk}
                    disabled={isEditProtalkLoading}
                    className="px-4 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-black text-xs hover:brightness-110 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow"
                  >
                    <Sparkles size={13} />
                    <span>ИИ-Оформление</span>
                  </button>
                </div>
              </div>

              {/* Module Name + Quick Presets directly underneath */}
              <div className="space-y-2">
                <label className={`text-xs font-bold block ${isLight ? 'text-amber-950' : 'text-amber-200/80'}`}>
                  {`Название ${editingModule.type === 'department' ? 'отдела' : 'подотдела'} (до 20 символов)`}
                </label>
                <MiniAudioField
                  value={editModuleName}
                  onChange={(val) => setEditModuleName(val.slice(0, 20))}
                  maxLength={20}
                  placeholder="Название (до 20 символов)..."
                  isLightTheme={isLight}
                />

                {/* Quick Name Presets directly under name input */}
                <div>
                  <p className={`text-[11px] font-bold mb-1.5 ${isLight ? 'text-amber-900/70' : 'text-amber-200/70'}`}>
                    Быстрые пресеты названий:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Отдел Продаж',
                      'Маркетинг & PR',
                      'Юридический Отдел',
                      'Финансы & Учет',
                      'Отдел Кадров',
                      'Логистика & Склад',
                      'R&D Разработка',
                      'Служба Безопасности'
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setEditModuleName(preset)}
                        className={`px-2.5 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${
                          isLight
                            ? 'bg-amber-100/70 hover:bg-amber-200/70 border-amber-400/80 text-amber-950'
                            : 'border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-200'
                        }`}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Leader / Manager Dropdown & Custom Input */}
              <div className="space-y-1.5">
                <label className={`text-xs font-bold block ${isLight ? 'text-amber-950' : 'text-amber-200/80'}`}>
                  Руководитель / Ответственный специалист
                </label>
                <div className="space-y-2">
                  <select
                    value={editLeadName}
                    onChange={(e) => setEditLeadName(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl border text-xs font-bold outline-none transition-all ${
                      isLight
                        ? 'border-amber-400/80 bg-white text-amber-950 focus:border-amber-500'
                        : 'border-amber-500/30 bg-[#1A0F02] text-amber-100 focus:border-amber-400'
                    }`}
                  >
                    <option value={structure.flagship.leadName || 'Генеральный Директор'}>
                      По умолчанию: {structure.flagship.leadName || 'Генеральный Директор'}
                    </option>
                    {allCompanyEmployees.map(emp => (
                      <option key={emp.id} value={emp.name}>
                        {emp.name} {emp.role ? `(${emp.role})` : ''}
                      </option>
                    ))}
                  </select>
                  <MiniAudioField
                    value={editLeadName}
                    onChange={setEditLeadName}
                    placeholder="Или надиктуйте / введите ФИО руководителя вручную..."
                    isLightTheme={isLight}
                  />
                </div>
              </div>

              {/* Employee Management Section */}
              <div className={`p-3.5 rounded-2xl border backdrop-blur-md ${
                isLight ? 'border-amber-400/80 bg-amber-50/40' : 'border-amber-500/30 bg-white/5'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-amber-500" />
                    <span className={`text-sm font-bold ${
                      isLight ? 'text-amber-950' : 'text-amber-300'
                    }`}>
                      Сотрудники ({editEmployees.length})
                    </span>
                  </div>
                </div>

                {/* Dropdown selection from PostgreSQL BD ProTalk employees */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                  <div className="flex-1">
                    <select
                      value={selectedExistingEmpId}
                      onChange={(e) => setSelectedExistingEmpId(e.target.value)}
                      className={`w-full px-3 py-2.5 min-h-[44px] rounded-xl border text-sm font-medium outline-none transition-all ${
                        isLight
                          ? 'border-amber-400/80 bg-white text-amber-950 focus:border-amber-500'
                          : 'border-amber-500/30 bg-[#1A0F02] text-amber-100 focus:border-amber-400'
                      }`}
                    >
                      <option value="">-- Выберите сотрудника из базы данных --</option>
                      {allCompanyEmployees
                        .filter(emp => !editEmployees.some(ee => String(ee.id) === String(emp.id) || ee.name.trim().toLowerCase() === emp.name.trim().toLowerCase()))
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {emp.role ? `(${emp.role})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!selectedExistingEmpId) return;
                      const found = allCompanyEmployees.find(e => String(e.id) === String(selectedExistingEmpId));
                      if (found) {
                        shipSound.playClick();
                        setEditEmployees(prev => [...prev, {
                          id: String(found.id),
                          name: found.name,
                          role: found.role || found.position || 'Специалист'
                        }]);
                        setSelectedExistingEmpId('');
                      }
                    }}
                    disabled={!selectedExistingEmpId}
                    className="px-4 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-bold text-sm shadow transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
                  >
                    <UserPlus size={16} />
                    <span>Внести</span>
                  </button>
                </div>

                {/* List of Current Employees */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-500/30 custom-scrollbar">
                  {editEmployees.length === 0 ? (
                    <p className={`text-sm italic py-2 text-center ${isLight ? 'text-amber-900/60' : 'text-amber-200/50'}`}>
                      Сотрудники не добавлены. Выберите сотрудника из базы данных в списке выше и нажмите «Внести».
                    </p>
                  ) : (
                    editEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-colors ${
                          isLight ? 'border-amber-300/80 bg-white/70' : 'border-amber-500/20 bg-amber-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            isLight ? 'bg-amber-200 text-amber-950' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${isLight ? 'text-amber-950' : 'text-amber-100'}`}>{emp.name}</p>
                            {emp.role && <p className={`text-xs ${isLight ? 'text-amber-900/70' : 'text-amber-200/70'}`}>{emp.role}</p>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmployee(emp.id)}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-amber-500/20 text-amber-600 hover:text-amber-800 transition-colors cursor-pointer"
                          title="Удалить сотрудника из отдела"
                        >
                          <UserX size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Module Description (Uses MiniAudioField for audio task notes) */}
              <MiniAudioField
                value={editDescription}
                onChange={setEditDescription}
                multiline
                rows={2}
                label="Описание и задачи отсека"
                placeholder="Опишите задачи и функционал отсека..."
                isLightTheme={isLight}
              />

              {/* Subdepartments Management in Department Editor Modal */}
              {editingModule.type === 'department' && (
                <div className={`p-3.5 rounded-2xl border backdrop-blur-md space-y-3 ${
                  isLight ? 'border-amber-400/80 bg-amber-50/40' : 'border-amber-500/30 bg-white/5'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers size={17} className="text-amber-500" />
                      <span className={`text-xs font-bold ${isLight ? 'text-amber-950' : 'text-amber-300'}`}>
                        Подотделы этого отдела ({structure.modules.filter(m => m.parentId === editingModule.id && m.type === 'subdepartment').length})
                      </span>
                    </div>
                  </div>

                  {/* Add Subdepartment */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <MiniAudioField
                        value={newSubDeptInputName}
                        onChange={setNewSubDeptInputName}
                        onEnter={() => {
                          if (newSubDeptInputName.trim()) {
                            addSubDepartmentByName(editingModule.id, newSubDeptInputName);
                            setNewSubDeptInputName('');
                          }
                        }}
                        placeholder="Название нового подотдела..."
                        isLightTheme={isLight}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (newSubDeptInputName.trim()) {
                          addSubDepartmentByName(editingModule.id, newSubDeptInputName);
                          setNewSubDeptInputName('');
                        }
                      }}
                      className="px-3.5 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-bold text-xs shadow flex items-center gap-1 shrink-0 cursor-pointer"
                    >
                      <Plus size={15} />
                      <span>Добавить</span>
                    </button>
                  </div>

                  {/* Subdepartments List with Up/Down and Move to other Department */}
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-500/30 custom-scrollbar">
                    {structure.modules.filter(m => m.parentId === editingModule.id && m.type === 'subdepartment').length === 0 ? (
                      <p className={`text-[11px] italic py-2 text-center ${isLight ? 'text-amber-900/60' : 'text-amber-200/50'}`}>
                        Подотделы пока не созданы.
                      </p>
                    ) : (
                      structure.modules.filter(m => m.parentId === editingModule.id && m.type === 'subdepartment').map((sub, sIdx, sArr) => (
                        <div
                          key={sub.id}
                          className={`p-2 sm:p-2.5 rounded-xl border flex items-center justify-between gap-2 text-sm transition-colors min-w-0 overflow-hidden ${
                            isLight 
                              ? 'border-amber-400/60 bg-[#FFFBF5] text-amber-950' 
                              : 'border-amber-400/30 bg-[#1A0F02]/60 text-amber-100 shadow-[0_0_15px_rgba(244,238,142,0.06)]'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                            <input
                              type="text"
                              maxLength={20}
                              value={sub.name}
                              onChange={(e) => handleUpdateDepartmentName(sub.id, e.target.value.slice(0, 20))}
                              className={`flex-1 min-w-0 bg-transparent text-sm font-medium outline-none ${
                                isLight ? 'text-amber-950' : 'text-amber-100'
                              }`}
                            />
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {/* Reorder Up */}
                            <button
                              type="button"
                              onClick={() => handleMoveSubdepartment(sub.id, 'up')}
                              disabled={sIdx === 0}
                              className="p-1 rounded-lg border border-amber-400/30 hover:bg-amber-500/20 disabled:opacity-30 text-amber-500 cursor-pointer"
                              title="Переместить выше"
                            >
                              <ChevronUp size={14} />
                            </button>

                            {/* Reorder Down */}
                            <button
                              type="button"
                              onClick={() => handleMoveSubdepartment(sub.id, 'down')}
                              disabled={sIdx === sArr.length - 1}
                              className="p-1 rounded-lg border border-amber-400/30 hover:bg-amber-500/20 disabled:opacity-30 text-amber-500 cursor-pointer"
                              title="Переместить ниже"
                            >
                              <ChevronDown size={14} />
                            </button>

                            {/* Move to another Department selector */}
                            {structure.modules.filter(m => m.type === 'department' && m.id !== editingModule.id).length > 0 && (
                              <select
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleMoveSubdepartment(sub.id, e.target.value);
                                  }
                                }}
                                defaultValue=""
                                className={`w-28 sm:w-32 max-w-[125px] px-1.5 py-1 rounded-lg border text-xs sm:text-sm font-bold outline-none cursor-pointer truncate ${
                                  isLight
                                    ? 'bg-[#FFFBF5] border-amber-400 text-amber-950 focus:border-amber-600'
                                    : 'bg-[#1A0F02] border-amber-400/50 text-[#F4EE8E] focus:border-[#F4EE8E]'
                                }`}
                                title="Перенести в другой отдел"
                              >
                                <option value="" disabled className={isLight ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#1A0F02] text-[#F4EE8E]'}>➜ Отдел</option>
                                {structure.modules
                                  .filter(m => m.type === 'department' && m.id !== editingModule.id)
                                  .map(otherDept => (
                                    <option 
                                      key={otherDept.id} 
                                      value={otherDept.id}
                                      className={isLight ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#1A0F02] text-[#F4EE8E]'}
                                    >
                                      {otherDept.name.length > 15 ? otherDept.name.slice(0, 15) + '...' : otherDept.name}
                                    </option>
                                  ))}
                              </select>
                            )}

                            {/* Delete Subdepartment */}
                            <button
                              type="button"
                              onClick={() => handleRemoveDepartment(sub.id)}
                              className="p-1 rounded-lg hover:bg-red-500/20 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                              title="Удалить подотдел"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-amber-500/30 shrink-0">
              <button
                type="button"
                onClick={() => {
                  if (editingModule) {
                    const modId = editingModule.id;
                    const updated = deleteAndShiftModule(editingModule, structure);
                    setStructure(updated);
                    if (onSaveStructure) onSaveStructure(updated);
                    fetch(`/api/departments/${modId}`, { method: 'DELETE' })
                      .catch(e => console.warn('Failed to delete department from DB:', e));
                    shipSound.playClick();
                    setEditingModule(null);
                  }
                }}
                className="px-3.5 py-2 rounded-xl bg-red-500/20 hover:bg-red-500 text-red-300 hover:white border border-red-500/30 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Удалить</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingModule(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-amber-200/70 hover:bg-amber-500/10 transition-colors cursor-pointer"
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const newName = (editModuleName || editingModule.name).slice(0, 20);
                    const newLead = editLeadName || editingModule.leadName;
                    const newDesc = editDescription || editingModule.description;

                    setStructure(prev => {
                      const updatedModules = prev.modules.map(m => {
                        if (m.id === editingModule.id) {
                          return {
                            ...m,
                            name: newName,
                            leadName: newLead,
                            employees: editEmployees,
                            employeeCount: editEmployees.length,
                            description: newDesc
                          };
                        }
                        return m;
                      });
                      const nextStruct = { ...prev, modules: updatedModules };
                      if (onSaveStructure) onSaveStructure(nextStruct);
                      return nextStruct;
                    });

                    const empIds = editEmployees.map(e => String(e.id)).join(',');

                    // 1. Update department details and employee_ids in PostgreSQL BD ProTalk
                    await fetch(`/api/departments/${editingModule.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        name: newName,
                        lead_name: newLead,
                        description: newDesc,
                        employee_ids: empIds
                      })
                    }).catch(e => console.warn('Failed to update department in DB:', e));

                    // 2. Persist employee assignments in PostgreSQL BD ProTalk
                    // For employees who were removed from this department, unlink them
                    const prevDeptEmployees = editingModule.employees || [];
                    const removedEmps = prevDeptEmployees.filter(pe => !editEmployees.some(ee => String(ee.id) === String(pe.id)));
                    for (const rem of removedEmps) {
                      await fetch('/api/departments/relocate-employee', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          employee_id: String(rem.id),
                          source_dept_id: editingModule.id,
                          target_dept_id: null,
                          company_id: structure.flagship.id
                        })
                      }).catch(e => console.warn(`Failed to unlink removed employee ${rem.id}:`, e));
                    }

                    // For employees currently in editEmployees, ensure department_id = editingModule.id
                    for (const emp of editEmployees) {
                      await fetch(`/api/employees/${emp.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          department_id: editingModule.id
                        })
                      }).catch(e => console.warn(`Failed to sync employee ${emp.id} to department in DB:`, e));
                    }

                    // Update allCompanyEmployees in memory
                    setAllCompanyEmployees(prev => prev.map(e => {
                      if (editEmployees.some(ee => String(ee.id) === String(e.id))) {
                        return { ...e, department_id: editingModule.id };
                      }
                      if (removedEmps.some(re => String(re.id) === String(e.id))) {
                        return { ...e, department_id: undefined };
                      }
                      return e;
                    }));

                    shipSound.playClick();
                    setEditingModule(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-slate-950 font-black text-xs shadow-lg cursor-pointer transition-all active:scale-95"
                >
                  Сохранить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EDIT/CREATE FLAGSHIP / COMPANY MODAL */}
      {isEditingFlagship && (
        <div className="fixed inset-x-0 top-16 bottom-20 sm:inset-0 sm:top-14 sm:bottom-16 z-50 flex items-center justify-center p-3 sm:p-4 bg-transparent pointer-events-auto">
          <div className={`w-full max-w-2xl max-h-full liquid-glass-modal rounded-3xl border-2 border-amber-400/60 p-4 sm:p-6 shadow-2xl flex flex-col relative overflow-hidden ${
            isLight ? 'text-amber-950' : 'text-amber-100'
          }`}>
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-amber-500/30 shrink-0">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-2xl ${isLight ? 'bg-amber-200/70 text-amber-950' : 'bg-amber-500/20 text-amber-400'}`}>
                  <Building size={22} />
                </div>
                <div>
                  <h3 className={`text-base sm:text-lg font-black ${isLight ? 'text-amber-950' : 'text-amber-300'}`}>
                    Редактор Компании
                  </h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingFlagship(false)}
                className={`p-1.5 rounded-xl transition-colors cursor-pointer ${
                  isLight ? 'hover:bg-amber-200/50 text-amber-950' : 'hover:bg-amber-500/20 text-amber-200/60 hover:text-white'
                }`}
              >
                <X size={20} />
              </button>
            </div>

            {/* Content Body with scrollbar */}
            <div className="flex-1 min-h-0 overflow-y-auto py-4 space-y-4 custom-scrollbar scrollbar-thin pr-1 sm:pr-2">
              {/* ProTalk AI Prompt Block with AudioField */}
              <div className={`p-3.5 rounded-2xl border backdrop-blur-md space-y-2.5 ${
                isLight ? 'border-amber-400/80 bg-amber-50/40' : 'border-amber-400/40 bg-white/5'
              }`}>
                <div className={`flex items-center gap-2 font-black text-xs uppercase tracking-wide ${
                  isLight ? 'text-amber-950' : 'text-amber-300'
                }`}>
                  <Sparkles size={15} className="text-amber-500" />
                  <span>Автозаполнение</span>
                </div>
                
                <AudioField
                  value={flagshipProtalkPrompt}
                  onChange={handleFlagshipPromptChange}
                  audioUrl={flagshipProtalkAudioUrl}
                  onAudioChange={handleFlagshipAudioChange}
                  storageKey="rr_ship_flagship"
                  isLightTheme={isLight}
                  placeholder="Опишите вид деятельности компании, ключевые продукты или структуру отделов для автоматического оформления нейросетью..."
                />

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleRunFlagshipProTalk}
                    disabled={isFlagshipProtalkLoading}
                    className="px-4 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-xs hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shadow"
                  >
                    <Sparkles size={14} />
                    <span>ИИ-Оформление</span>
                  </button>
                </div>
              </div>

              {/* Company Name */}
              <MiniAudioField
                value={flagshipName}
                onChange={(val) => setFlagshipName(val.slice(0, 20))}
                maxLength={20}
                multiline
                rows={1}
                label="Название компании (до 20 символов)"
                placeholder="Название вашей компании (до 20 символов)..."
                isLightTheme={isLight}
              />

              {/* Company Description */}
              <MiniAudioField
                value={flagshipDescription}
                onChange={setFlagshipDescription}
                multiline
                rows={3}
                label="Описание компании"
                placeholder="Кратко опишите сферу деятельности, миссию и ключевые цели компании (например: Разработка программного обеспечения для автоматизации и оптимизации бизнес-процессов)..."
                isLightTheme={isLight}
              />

              {/* Company Main Products */}
              <MiniAudioField
                value={flagshipProducts}
                onChange={setFlagshipProducts}
                multiline
                rows={2}
                label="Основные продукты"
                placeholder="Перечислите ключевые товары, сервисы или услуги компании..."
                isLightTheme={isLight}
              />

              {/* Company Websites (Mobile-friendly: label "Сайты" with "+" on right) */}
              <div className={`p-3.5 rounded-2xl border backdrop-blur-md space-y-2.5 ${
                isLight ? 'border-amber-400/80 bg-amber-50/40' : 'border-amber-500/30 bg-white/5'
              }`}>
                <div className="flex items-center justify-between">
                  <label className={`text-xs font-bold ${isLight ? 'text-amber-950' : 'text-amber-200/80'}`}>
                    Сайты
                  </label>
                  <button
                    type="button"
                    onClick={handleAddWebsite}
                    className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-black text-sm shadow flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                    title="Добавить сайт"
                  >
                    <Plus size={16} />
                  </button>
                </div>
                
                <MiniAudioField
                  value={newWebsiteInput}
                  onChange={setNewWebsiteInput}
                  onEnter={handleAddWebsite}
                  placeholder="https://example.com"
                  isLightTheme={isLight}
                />

                {flagshipWebsites.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {flagshipWebsites.map((site, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold ${
                          isLight
                            ? 'bg-amber-100/70 border-amber-400 text-amber-950'
                            : 'bg-amber-500/10 border-amber-500/30 text-[#F4EE8E]'
                        }`}
                      >
                        <Globe size={13} className="text-amber-500 shrink-0" />
                        <span className="max-w-[220px] truncate">{site}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveWebsite(site)}
                          className="p-1 hover:bg-amber-500/20 rounded-lg text-amber-600 hover:text-amber-800 cursor-pointer ml-1"
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Employees Section (Always rendered, no caps, font >= 14px, PostgreSQL BD ProTalk select dropdown) */}
              <div className={`p-3.5 rounded-2xl border backdrop-blur-md ${
                isLight ? 'border-amber-400/80 bg-amber-50/40' : 'border-amber-500/30 bg-white/5'
              }`}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Users size={18} className="text-amber-500" />
                    <span className={`text-sm font-bold ${
                      isLight ? 'text-amber-950' : 'text-amber-300'
                    }`}>
                      Добавить сотрудников ({flagshipEmployees.length})
                    </span>
                  </div>
                </div>

                {/* Select dropdown from PostgreSQL BD ProTalk employees */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 mb-3">
                  <div className="flex-1">
                    <select
                      value={selectedFlagshipEmpId}
                      onChange={(e) => setSelectedFlagshipEmpId(e.target.value)}
                      className={`w-full px-3 py-2.5 min-h-[44px] rounded-xl border text-sm font-medium outline-none transition-all ${
                        isLight
                          ? 'border-amber-400/80 bg-white text-amber-950 focus:border-amber-500'
                          : 'border-amber-500/30 bg-[#1A0F02] text-amber-100 focus:border-amber-400'
                      }`}
                    >
                      <option value="">-- Выберите сотрудника из базы данных --</option>
                      {allCompanyEmployees
                        .filter(emp => !flagshipEmployees.some(fe => String(fe.id) === String(emp.id) || fe.name.trim().toLowerCase() === emp.name.trim().toLowerCase()))
                        .map(emp => (
                          <option key={emp.id} value={emp.id}>
                            {emp.name} {emp.role ? `(${emp.role})` : ''}
                          </option>
                        ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddFlagshipEmployee}
                    disabled={!selectedFlagshipEmpId}
                    className="px-4 py-2 min-h-[44px] rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-bold text-sm shadow transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-40"
                  >
                    <UserPlus size={16} />
                    <span>Добавить</span>
                  </button>
                </div>

                {/* Employee List */}
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-500/30 custom-scrollbar">
                  {flagshipEmployees.length === 0 ? (
                    <p className={`text-sm italic py-2 text-center ${isLight ? 'text-amber-900/60' : 'text-amber-200/50'}`}>
                      Сотрудники пока не добавлены на флагманский мостик. Выберите сотрудника из списка выше и нажмите «Добавить».
                    </p>
                  ) : (
                    flagshipEmployees.map((emp) => (
                      <div
                        key={emp.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl border transition-colors ${
                          isLight
                            ? 'border-amber-300/80 bg-white/70'
                            : 'border-amber-500/20 bg-amber-500/5'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                            isLight ? 'bg-amber-200 text-amber-950' : 'bg-amber-500/20 text-amber-400'
                          }`}>
                            {emp.name ? emp.name.charAt(0).toUpperCase() : '?'}
                          </div>
                          <div>
                            <p className={`text-sm font-bold ${isLight ? 'text-amber-950' : 'text-amber-100'}`}>{emp.name}</p>
                            {emp.role && <p className={`text-xs ${isLight ? 'text-amber-900/70' : 'text-amber-200/70'}`}>{emp.role}</p>}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveFlagshipEmployee(emp.id)}
                          className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-amber-500/20 text-amber-600 hover:text-amber-800 transition-colors cursor-pointer"
                          title="Удалить из мостика"
                        >
                          <UserX size={16} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Company Departments & Sub-departments Section */}
              <div className={`p-3.5 rounded-2xl border backdrop-blur-md space-y-3 ${
                isLight ? 'border-amber-400/80 bg-amber-50/40' : 'border-amber-500/30 bg-white/5'
              }`}>
                {/* Header with Title "Отделы" (no caps) and "+" button on the right */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shield size={18} className="text-amber-500" />
                    <span className={`text-xs font-bold ${
                      isLight ? 'text-amber-950' : 'text-amber-300'
                    }`}>
                      Отделы ({structure.modules.filter(m => m.type === 'department').length})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (newDeptInputName.trim()) {
                        addDepartmentByName(newDeptInputName);
                        setNewDeptInputName('');
                      }
                    }}
                    className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-black text-sm shadow flex items-center justify-center cursor-pointer transition-all active:scale-95 shrink-0"
                    title="Добавить отдел"
                  >
                    <Plus size={16} />
                  </button>
                </div>

                {/* Add New Department Field */}
                <MiniAudioField
                  value={newDeptInputName}
                  onChange={(val) => setNewDeptInputName(val.slice(0, 20))}
                  maxLength={20}
                  onEnter={() => {
                    if (newDeptInputName.trim()) {
                      addDepartmentByName(newDeptInputName);
                      setNewDeptInputName('');
                    }
                  }}
                  placeholder="Название нового отдела (до 20 символов)..."
                  isLightTheme={isLight}
                />

                {/* Departments List with Sub-departments Management */}
                {structure.modules.filter(m => m.type === 'department').length === 0 ? (
                  <p className={`text-xs italic text-center py-4 ${isLight ? 'text-amber-900/60' : 'text-amber-200/50'}`}>
                    Отделы еще не добавлены. Введите название отдела выше или используйте автозаполнение через ИИ.
                  </p>
                ) : (
                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-amber-500/30 custom-scrollbar">
                    {structure.modules.filter(m => m.type === 'department').map((mod, idx) => {
                      const subDepts = structure.modules.filter(m => m.parentId === mod.id && m.type === 'subdepartment');
                      const isAddingSub = activeSubDeptInputDeptId === mod.id;

                      return (
                        <div
                          key={mod.id}
                          className={`p-3 rounded-2xl border space-y-2.5 transition-all ${
                            isLight
                              ? 'border-amber-400/50 bg-white/70 hover:border-amber-400'
                              : 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40'
                          }`}
                        >
                          {/* Department Main Row */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {/* Up / Down Swap Buttons for Department */}
                              <div className="flex flex-col gap-0.5 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => handleSwapDepartmentOrder(mod.id, 'up')}
                                  disabled={idx === 0}
                                  className="p-0.5 rounded hover:bg-amber-500/20 disabled:opacity-20 text-amber-500 cursor-pointer"
                                  title="Поменять местами с верхним отделом на карте"
                                >
                                  <ChevronUp size={13} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSwapDepartmentOrder(mod.id, 'down')}
                                  disabled={idx === structure.modules.filter(m => m.type === 'department').length - 1}
                                  className="p-0.5 rounded hover:bg-amber-500/20 disabled:opacity-20 text-amber-500 cursor-pointer"
                                  title="Поменять местами с нижним отделом на карте"
                                >
                                  <ChevronDown size={13} />
                                </button>
                              </div>

                              <div className={`w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                                isLight ? 'bg-amber-200 text-amber-950' : 'bg-amber-500/20 text-amber-400'
                              }`}>
                                {idx + 1}
                              </div>
                              <input
                                type="text"
                                maxLength={20}
                                value={mod.name}
                                onChange={(e) => handleUpdateDepartmentName(mod.id, e.target.value.slice(0, 20))}
                                className={`flex-1 px-3 py-1.5 rounded-xl border text-sm font-bold outline-none bg-transparent transition-all ${
                                  isLight
                                    ? 'border-amber-300/80 text-amber-950 focus:border-amber-500'
                                    : 'border-amber-500/30 text-amber-100 focus:border-amber-400'
                                }`}
                              />
                            </div>

                            <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                              {/* Add Subdepartment Toggle Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (isAddingSub) {
                                    setActiveSubDeptInputDeptId(null);
                                    setNewSubDeptInputName('');
                                  } else {
                                    setActiveSubDeptInputDeptId(mod.id);
                                    setNewSubDeptInputName('');
                                  }
                                }}
                                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border ${
                                  isAddingSub
                                    ? 'bg-amber-500 text-amber-950 border-amber-600'
                                    : isLight
                                      ? 'bg-amber-100 border-amber-300 text-amber-950 hover:bg-amber-200'
                                      : 'bg-white/5 border-amber-500/30 text-amber-300 hover:bg-white/10'
                                }`}
                                title="Добавить подотдел"
                              >
                                <Plus size={13} />
                                <span>Подотдел</span>
                              </button>

                              {/* View on Map (Only shown when company/department already exists in DB) */}
                              {structure.hasCompany && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsEditingFlagship(false);
                                    setSelectedModuleId(mod.id);
                                    scrollToModule(mod);
                                  }}
                                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                                    isLight
                                      ? 'bg-amber-200/60 hover:bg-amber-200 text-amber-950'
                                      : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300'
                                  }`}
                                  title="Перейти к отделу на карте"
                                >
                                  <Compass size={13} />
                                  <span>На карте</span>
                                </button>
                              )}

                              {/* Edit Module */}
                              <button
                                type="button"
                                onClick={() => {
                                  setIsEditingFlagship(false);
                                  setSelectedModuleId(mod.id);
                                  scrollToModule(mod);
                                  handleOpenEditModal(mod);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                                title="Открыть редактор этого отдела"
                              >
                                <Edit2 size={13} />
                                <span>Редактор</span>
                              </button>

                              {/* Delete Department */}
                              <button
                                type="button"
                                onClick={() => handleRemoveDepartment(mod.id)}
                                className="p-1.5 rounded-xl hover:bg-red-500/20 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                                title="Удалить отдел"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Subdepartment Input Form when active */}
                          {isAddingSub && (
                            <div className={`p-2.5 rounded-xl border flex items-center gap-2 ${
                              isLight ? 'bg-amber-50/80 border-amber-300' : 'bg-[#1A0F02]/60 border-amber-400/40'
                            }`}>
                              <div className="flex-1">
                                <MiniAudioField
                                  value={newSubDeptInputName}
                                  onChange={(val) => setNewSubDeptInputName(val.slice(0, 20))}
                                  maxLength={20}
                                  onEnter={() => {
                                    if (newSubDeptInputName.trim()) {
                                      addSubDepartmentByName(mod.id, newSubDeptInputName);
                                      setNewSubDeptInputName('');
                                      setActiveSubDeptInputDeptId(null);
                                    }
                                  }}
                                  placeholder="Название подотдела (до 20 символов)..."
                                  isLightTheme={isLight}
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  if (newSubDeptInputName.trim()) {
                                    addSubDepartmentByName(mod.id, newSubDeptInputName);
                                    setNewSubDeptInputName('');
                                    setActiveSubDeptInputDeptId(null);
                                  }
                                }}
                                className="w-8 h-8 rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] text-amber-950 font-bold text-xs flex items-center justify-center cursor-pointer shadow shrink-0"
                                title="Добавить подотдел"
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          )}

                          {/* Subdepartments List */}
                          {subDepts.length > 0 && (
                            <div className="pl-2.5 sm:pl-4 space-y-2 pt-1 border-l-2 border-amber-400/40 ml-1">
                              {subDepts.map((sub, sIdx, sArr) => (
                                <div
                                  key={sub.id}
                                  className={`flex items-center justify-between p-2 sm:p-2.5 rounded-xl border text-sm gap-2 min-w-0 overflow-hidden ${
                                    isLight
                                      ? 'bg-[#FFFBF5] border-amber-400/60 text-amber-950'
                                      : 'bg-[#1A0F02]/60 border-amber-400/30 text-amber-100 shadow-[0_0_15px_rgba(244,238,142,0.06)]'
                                  }`}
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                                    <input
                                      type="text"
                                      maxLength={20}
                                      value={sub.name}
                                      onChange={(e) => handleUpdateDepartmentName(sub.id, e.target.value.slice(0, 20))}
                                      className={`flex-1 min-w-0 bg-transparent text-sm font-medium outline-none ${
                                        isLight ? 'text-amber-950' : 'text-amber-100'
                                      }`}
                                    />
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0">
                                    {/* Reorder Subdepartment Up */}
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSubdepartment(sub.id, 'up')}
                                      disabled={sIdx === 0}
                                      className="p-1 rounded-lg border border-amber-400/30 hover:bg-amber-500/20 disabled:opacity-20 text-amber-500 cursor-pointer"
                                      title="Переместить выше"
                                    >
                                      <ChevronUp size={14} />
                                    </button>

                                    {/* Reorder Subdepartment Down */}
                                    <button
                                      type="button"
                                      onClick={() => handleMoveSubdepartment(sub.id, 'down')}
                                      disabled={sIdx === sArr.length - 1}
                                      className="p-1 rounded-lg border border-amber-400/30 hover:bg-amber-500/20 disabled:opacity-20 text-amber-500 cursor-pointer"
                                      title="Переместить ниже"
                                    >
                                      <ChevronDown size={14} />
                                    </button>

                                    {/* Move to another Department selector */}
                                    {structure.modules.filter(m => m.type === 'department' && m.id !== mod.id).length > 0 && (
                                      <select
                                        onChange={(e) => {
                                          if (e.target.value) {
                                            handleMoveSubdepartment(sub.id, e.target.value);
                                          }
                                        }}
                                        defaultValue=""
                                        className={`w-28 sm:w-32 max-w-[125px] px-1.5 py-1 rounded-lg border text-xs sm:text-sm font-bold outline-none cursor-pointer truncate ${
                                          isLight
                                            ? 'bg-[#FFFBF5] border-amber-400 text-amber-950 focus:border-amber-600'
                                            : 'bg-[#1A0F02] border-amber-400/50 text-[#F4EE8E] focus:border-[#F4EE8E]'
                                        }`}
                                        title="Перенести в другой отдел"
                                      >
                                        <option value="" disabled className={isLight ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#1A0F02] text-[#F4EE8E]'}>➜ Отдел</option>
                                        {structure.modules
                                          .filter(m => m.type === 'department' && m.id !== mod.id)
                                          .map(otherDept => (
                                            <option 
                                              key={otherDept.id} 
                                              value={otherDept.id}
                                              className={isLight ? 'bg-[#FFFBF5] text-amber-950' : 'bg-[#1A0F02] text-[#F4EE8E]'}
                                            >
                                              {otherDept.name.length > 15 ? otherDept.name.slice(0, 15) + '...' : otherDept.name}
                                            </option>
                                          ))}
                                      </select>
                                    )}

                                    {/* Delete Subdepartment */}
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveDepartment(sub.id)}
                                      className="p-1 rounded-lg hover:bg-red-500/20 text-red-500 hover:text-red-600 transition-colors cursor-pointer"
                                      title="Удалить подотдел"
                                    >
                                      <X size={14} />
                                    </button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Footer with Delete Company Button on Left & Save on Right */}
            <div className="flex items-center justify-between pt-3 border-t border-amber-500/30 shrink-0 gap-2">
              <div>
                {(structure.hasCompany || flagshipName.trim()) && (
                  <button
                    type="button"
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    className="px-3.5 py-2 min-h-[40px] rounded-xl border border-red-500/40 hover:bg-red-500/10 text-red-500 dark:text-red-400 font-bold text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Удалить компанию</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingFlagship(false)}
                  className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                    isLight
                      ? 'text-amber-950 hover:bg-amber-200/50'
                      : 'text-amber-200/80 hover:bg-amber-500/10'
                  }`}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  disabled={isSavingCompany}
                  onClick={async () => {
                    try {
                      setIsSavingCompany(true);
                      const userStr = typeof window !== 'undefined' ? localStorage.getItem('rr_user') : null;
                      const currentUser = userStr ? JSON.parse(userStr) : null;
                      const directorId = currentUser?.id || '91827364501';

                      const cName = (flagshipName.trim() || 'Моя Компания').slice(0, 20);
                      const compId = (structure.flagship.id && structure.flagship.id !== 'flagship-main')
                        ? structure.flagship.id
                        : (directorId ? `com-${directorId}` : `com-${Date.now()}`);

                      // 1. Save company to database & wait for confirmation
                      const res = await fetch('/api/company/my', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: compId,
                          director_id: directorId,
                          name: cName,
                          description: flagshipDescription,
                          products: flagshipProducts,
                          websites: flagshipWebsites,
                          product_description: flagshipDescription
                        })
                      });
                      const data = await res.json();
                      const savedCom = data?.company;
                      const actualCompanyId = savedCom?.id || compId;

                      // 2. Synchronize all departments & sub-departments to database batch with actual company ID and employees
                      const deptPayload = structure.modules.map(mod => ({
                        id: mod.id,
                        name: mod.name.slice(0, 20),
                        type: mod.type || 'department',
                        lead_name: mod.leadName || (mod.type === 'subdepartment' ? 'Руководитель группы' : 'Руководитель отдела'),
                        parent_id: (!mod.parentId || mod.parentId === 'flagship-main' || mod.parentId === compId) ? actualCompanyId : mod.parentId,
                        x: mod.x,
                        y: mod.y,
                        description: mod.description || '',
                        employee_ids: (mod.employees || []).map(e => String(e.id)).join(','),
                        employees: mod.employees || []
                      }));

                      const resBatch = await fetch('/api/departments/batch', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          company_id: actualCompanyId,
                          departments: deptPayload
                        })
                      });
                      const batchData = await resBatch.json();
                      const finalDepts: any[] = batchData?.departments || [];

                      // 3. Transform database truth departments into ShipModule objects preserving assigned employees
                      const verifiedModules: ShipModule[] = finalDepts.map(d => {
                        const isSub = d.type === 'subdepartment';
                        const mX = d.x !== undefined && d.x !== null ? Number(d.x) : 0;
                        const mY = d.y !== undefined && d.y !== null ? Number(d.y) : (isSub ? 60 : 60);
                        const docks = isSub ? getSubDepartmentDocks(d.id, mX, mY) : getDepartmentDocks(d.id, mX, mY);

                        // Preserve employees assigned to this module
                        const prevMod = structure.modules.find(m => m.id === d.id);
                        const modEmployees = prevMod?.employees || [];

                        return {
                          id: d.id,
                          type: (d.type as any) || 'department',
                          name: d.name || 'Отдел',
                          subtitle: isSub ? 'Рабочая группа' : 'Производственный отсек',
                          employeeCount: modEmployees.length,
                          employees: modEmployees,
                          leadName: d.lead_name || (isSub ? 'Руководитель группы' : 'Руководитель отдела'),
                          status: 'Active',
                          activityScore: isSub ? 85 : 90,
                          systemLoad: isSub ? 40 : 50,
                          x: mX,
                          y: mY,
                          parentId: (!d.parent_id || d.parent_id === 'flagship-main') ? actualCompanyId : d.parent_id,
                          attachedDockType: isSub ? 'left' : 'bottom',
                          docks: docks,
                          description: d.description || `${isSub ? 'Подотдел' : 'Отдел'}: ${d.name}`
                        };
                      });

                      // 4. Calculate flagship crew: only employees NOT assigned to any department or subdepartment
                      const assignedModuleEmpIds = new Set<string>();
                      verifiedModules.forEach(m => (m.employees || []).forEach(e => assignedModuleEmpIds.add(String(e.id))));
                      const cleanFlagshipEmps = (flagshipEmployees || []).filter(e => !assignedModuleEmpIds.has(String(e.id)));

                      // 5. Update the entire structure state from PostgreSQL BD ProTalk truth
                      const nextStruct: ShipCompanyStructure = {
                        hasCompany: true,
                        companyName: savedCom?.name || cName,
                        companyTitle: 'Командный Центр Оргструктуры',
                        totalCrew: (allCompanyEmployees.length || (cleanFlagshipEmps.length + assignedModuleEmpIds.size)),
                        shipLevel: 1,
                        userRole: 'Генеральный Директор / Капитан',
                        status: 'Активный экипаж',
                        flagship: {
                          id: actualCompanyId,
                          type: 'flagship',
                          name: savedCom?.name || cName,
                          subtitle: 'Капитанский Мостик Корабля',
                          employeeCount: cleanFlagshipEmps.length,
                          leadName: 'Генеральный Директор',
                          status: 'Active',
                          activityScore: 100,
                          systemLoad: 0,
                          userRole: 'Генеральный Директор / Капитан',
                          orgLevel: 1,
                          x: 0,
                          y: -180,
                          parentId: null,
                          docks: getFlagshipDocks(0, -180),
                          description: flagshipDescription || (savedCom?.description || ''),
                          employees: cleanFlagshipEmps
                        },
                        modules: verifiedModules
                      };

                      setStructure(nextStruct);
                      if (onSaveStructure) onSaveStructure(nextStruct);
                      if (typeof window !== 'undefined') {
                        localStorage.setItem('company_name', cName);
                        localStorage.setItem('company_id', actualCompanyId);
                        const curStr = localStorage.getItem('rr_user');
                        if (curStr) {
                          try {
                            const curU = JSON.parse(curStr);
                            curU.company = cName;
                            curU.company_id = actualCompanyId;
                            localStorage.setItem('rr_user', JSON.stringify(curU));
                          } catch (e) {}
                        }
                        window.dispatchEvent(new CustomEvent('company_updated', { detail: { name: cName, companyId: actualCompanyId } }));
                        window.dispatchEvent(new CustomEvent('db-company-updated', { detail: { name: cName, companyId: actualCompanyId } }));
                        window.dispatchEvent(new CustomEvent('db-updated'));
                      }
                      shipSound.playSuccess();
                      setIsEditingFlagship(false);
                    } catch (e) {
                      console.error('Failed to save company to DB:', e);
                    } finally {
                      setIsSavingCompany(false);
                    }
                  }}
                  className="px-5 py-2.5 min-h-[40px] rounded-xl bg-gradient-to-r from-[#F4EE8E] via-[#E7C768] to-[#D99E41] hover:brightness-110 text-amber-950 font-black text-xs shadow-lg cursor-pointer transition-all active:scale-95 disabled:opacity-60 flex items-center gap-2"
                >
                  {isSavingCompany ? (
                    <>
                      <Loader2 size={15} className="animate-spin text-amber-950" />
                      <span>Сохранение...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>{structure.hasCompany ? 'Сохранить изменения' : 'Создать компанию'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CASCADE DELETE CONFIRMATION MODAL */}
      {isDeleteConfirmOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm pointer-events-auto">
          <div className={`w-full max-w-md liquid-glass-modal rounded-3xl border-2 border-red-500/60 p-5 sm:p-6 shadow-2xl space-y-4 relative ${
            isLight ? 'text-amber-950' : 'text-amber-100'
          }`}>
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-red-500/20 text-red-500 shrink-0">
                <Trash2 size={24} />
              </div>
              <div>
                <h3 className={`text-base sm:text-lg font-black ${isLight ? 'text-red-950' : 'text-red-400'}`}>
                  Удаление компании
                </h3>
                <p className={`text-xs mt-0.5 ${isLight ? 'text-amber-900/70' : 'text-amber-200/70'}`}>
                  Подтвердите полное каскадное удаление
                </p>
              </div>
            </div>

            <div className={`p-3.5 rounded-2xl border text-xs leading-relaxed space-y-2 ${
              isLight ? 'border-red-300 bg-red-50/60 text-amber-950' : 'border-red-500/30 bg-red-950/20 text-amber-200'
            }`}>
              <p className="font-bold text-red-500">Внимание! При удалении произойдет:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Полное удаление карточки компании и реквизитов из базы данных</li>
                <li>Каскадное удаление всех отделов, подотделов и стыковок на карте</li>
                <li>Сброс рабочих расписаний и привязок сотрудников</li>
                <li>Это действие необратимо и не может быть отменено</li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-amber-500/30">
              <button
                type="button"
                disabled={isDeletingCompany}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className={`px-4 py-2 min-h-[40px] rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                  isLight
                    ? 'text-amber-950 hover:bg-amber-200/50'
                    : 'text-amber-200/80 hover:bg-amber-500/10'
                }`}
              >
                Отмена
              </button>
              <button
                type="button"
                disabled={isDeletingCompany}
                onClick={handleConfirmDeleteCompany}
                className="px-5 py-2 min-h-[40px] rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:brightness-110 text-white font-black text-xs shadow-lg cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
              >
                <Trash2 size={14} />
                <span>{isDeletingCompany ? 'Удаление...' : 'Подтвердить удаление'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REUSABLE EMPLOYEE EDIT MODAL FOR ASTRONAUT CLICK / EDIT */}
      {isEmpModalOpen && (
        <EmployeeEditModal
          employee={selectedEmpForEditModal}
          isOpen={isEmpModalOpen}
          isLightTheme={isLight}
          companyName={structure.flagship.name || 'Командный Мостик'}
          companyId={(structure.flagship.id && structure.flagship.id !== 'flagship-main') ? structure.flagship.id : 'flagship-main'}
          departments={structure.modules.map(m => ({ id: m.id, name: m.name, type: m.type }))}
          onClose={() => {
            setIsEmpModalOpen(false);
            setSelectedEmpForEditModal(null);
          }}
          onSave={async (saved) => {
            setIsEmpModalOpen(false);
            setSelectedEmpForEditModal(null);
            await loadCompanyStructureFromDb();
            setRelocateToast({
              message: `✅ Данные сотрудника ${saved.name} сохранены!`,
              timestamp: Date.now()
            });
          }}
          onDelete={async (empId) => {
            setIsEmpModalOpen(false);
            setSelectedEmpForEditModal(null);
            await loadCompanyStructureFromDb();
            setRelocateToast({
              message: '🗑️ Сотрудник удален из экипажа',
              timestamp: Date.now()
            });
          }}
        />
      )}

      {/* FLOATING DRAGGING ASTRONAUT GHOST CURSOR */}
      {draggingAstronaut && draggingAstronaut.clientX !== undefined && draggingAstronaut.clientY !== undefined && (
        <div
          className="fixed z-[100] pointer-events-none -translate-x-1/2 -translate-y-1/2 flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-md transition-transform scale-105"
          style={{
            left: `${draggingAstronaut.clientX}px`,
            top: `${draggingAstronaut.clientY}px`,
            borderColor: isLight ? 'rgba(217, 119, 6, 0.7)' : 'rgba(244, 238, 142, 0.7)',
            backgroundColor: isLight ? 'rgba(255, 251, 245, 0.95)' : 'rgba(26, 15, 2, 0.95)',
            boxShadow: isLight ? '0 12px 30px rgba(217, 119, 6, 0.3)' : '0 0 35px rgba(244, 238, 142, 0.45)'
          }}
        >
          {/* Avatar Icon */}
          <div className="relative shrink-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-base border shadow-inner ${
              isLight ? 'bg-amber-200/90 border-amber-500 text-amber-950' : 'bg-amber-400/20 border-amber-400/70 text-[#F4EE8E]'
            }`}>
              {draggingAstronaut.employee.name ? draggingAstronaut.employee.name.charAt(0).toUpperCase() : '👨‍🚀'}
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white animate-ping" />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-amber-500 border-2 border-white" />
          </div>

          <div className="min-w-0 pr-1 space-y-0.5">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-black truncate max-w-[160px] ${isLight ? 'text-amber-950' : 'text-[#F4EE8E]'}`}>
                {draggingAstronaut.employee.name || 'Сотрудник'}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-md font-bold ${
                isLight ? 'bg-amber-200/80 text-amber-950 border border-amber-400/50' : 'bg-amber-500/20 text-[#F4EE8E] border border-amber-400/30'
              }`}>
                {draggingAstronaut.employee.role === 'SUPER_ADMIN' 
                  ? 'Супер-Админ' 
                  : (draggingAstronaut.employee.role === 'DIRECTOR' ? 'Директор' : (draggingAstronaut.employee.position || 'Специалист'))}
              </span>
            </div>
            <p className={`text-xs flex items-center gap-1 ${
              dragOverModuleId 
                ? (isLight ? 'text-amber-900 font-bold' : 'text-[#F4EE8E] font-bold') 
                : (isLight ? 'text-amber-900/80' : 'text-amber-200/80')
            }`}>
              {dragOverModuleId 
                ? `🎯 Отпустите для переноса в «${dragOverModuleId === 'flagship' ? 'Штаб (Флагман)' : (structure.modules.find(m => m.id === dragOverModuleId)?.name || 'Отсек')}»` 
                : 'Перетащите на нужный отдел или штаб'}
            </p>
          </div>
        </div>
      )}

      {/* AI PROCESSING OVERLAY WITH MASCOT & 0-120 SECONDS COUNTDOWN */}
      <AiLoadingOverlay
        isOpen={isFlagshipProtalkLoading || isEditProtalkLoading || isDockProtalkLoading}
        title={
          isFlagshipProtalkLoading 
            ? "ИИ Ревизор RR оформляет компанию"
            : (isEditProtalkLoading 
                ? `ИИ Ревизор RR оформляет ${editingModule?.type === 'department' ? 'отдел' : 'подотдел'}`
                : "ИИ Ревизор RR проектирует подразделение")
        }
        subtitle="Анализ сведений, создание структуры отделов, подотделов и регламентов..."
        isLightTheme={isLight}
        maxSeconds={120}
        onCancel={() => {
          setIsFlagshipProtalkLoading(false);
          setIsEditProtalkLoading(false);
          setIsDockProtalkLoading(false);
        }}
      />

      {/* FLOATING RELOCATION / UPDATE NOTIFICATION TOAST */}
      {relocateToast && (
        <div
          className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl border shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-300 pointer-events-none ${
            isLight
              ? 'bg-amber-100/95 border-amber-500/60 text-amber-950 shadow-amber-900/10'
              : 'bg-[#1A0F02]/95 border-amber-400/60 text-amber-100 shadow-[0_0_25px_rgba(244,238,142,0.25)]'
          }`}
        >
          <Sparkles size={16} className="text-amber-400 shrink-0" />
          <span className="text-sm font-black">{relocateToast.message}</span>
        </div>
      )}
    </div>
  );
};
