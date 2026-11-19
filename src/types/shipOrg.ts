export type ThemeMode = 'desktop-dark' | 'desktop-light' | 'mobile-dark' | 'mobile-light';

export type ViewMode = 'ship' | 'tree' | 'blueprint';

export type DockType = 'top' | 'bottom' | 'left' | 'right';

export interface DockConnector {
  id: string;
  type: DockType;
  localX: number; // Offset relative to module center
  localY: number;
  worldX: number;
  worldY: number;
  status: 'free' | 'occupied' | 'snapping';
  connectedToId: string | null; // ID of the connected module's dock connector
}

export type ModuleType = 'flagship' | 'department' | 'subdepartment';

export interface ShipModule {
  id: string;
  type: ModuleType;
  name: string;
  subtitle?: string;
  employeeCount: number;
  leadName?: string;
  status: 'Active' | 'Optimizing' | 'High-Load' | 'Warning' | 'Standby';
  activityScore: number; // 0 - 100%
  systemLoad: number; // 0 - 100%
  userRole?: string;
  orgLevel?: number;
  specIcon?: string;
  colorTheme?: 'gold' | 'blue' | 'cyan' | 'purple' | 'emerald';
  
  // Canvas positioning (Center point)
  x: number;
  y: number;
  
  // Parent & Branch relationship in Ship Tree
  parentId: string | null;
  attachedDockType?: DockType; // Which dock on parent it attaches to
  
  // Dock Connectors list
  docks: DockConnector[];
  
  // Custom metadata
  description?: string;
  kpiTarget?: string;
  employees?: Array<{ id: string; name: string; role?: string }>;
}

export interface ShipCompanyStructure {
  hasCompany?: boolean;
  companyName: string;
  companyTitle: string;
  totalCrew: number;
  shipLevel: number;
  userRole: string;
  status: string;
  flagship: ShipModule;
  modules: ShipModule[];
}

export interface DraggingState {
  moduleId: string;
  offsetX: number;
  offsetY: number;
  snappedDock: {
    sourceDockId: string;
    targetModuleId: string;
    targetDockId: string;
    targetWorldX: number;
    targetWorldY: number;
  } | null;
}
