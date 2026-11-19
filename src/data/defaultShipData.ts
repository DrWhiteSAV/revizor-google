import { ShipCompanyStructure, DockConnector } from '../types/shipOrg';

// Helper to generate dock connectors for flagship
export const getFlagshipDocks = (x: number, y: number): DockConnector[] => [
  {
    id: 'flagship-dock-bottom',
    type: 'bottom' as const,
    localX: 0,
    localY: 120,
    worldX: x,
    worldY: y + 120,
    status: 'free' as const,
    connectedToId: null
  }
];

// Helper to generate dock connectors for circular Department module (240px diameter)
export const getDepartmentDocks = (id: string, x: number, y: number): DockConnector[] => [
  {
    id: `${id}-dock-top`,
    type: 'top' as const,
    localX: 0,
    localY: -120,
    worldX: x,
    worldY: y - 120,
    status: 'free' as const,
    connectedToId: null
  },
  {
    id: `${id}-dock-bottom`,
    type: 'bottom' as const,
    localX: 0,
    localY: 120,
    worldX: x,
    worldY: y + 120,
    status: 'free' as const,
    connectedToId: null
  },
  {
    id: `${id}-dock-left`,
    type: 'left' as const,
    localX: -120,
    localY: 0,
    worldX: x - 120,
    worldY: y,
    status: 'free' as const,
    connectedToId: null
  },
  {
    id: `${id}-dock-right`,
    type: 'right' as const,
    localX: 120,
    localY: 0,
    worldX: x + 120,
    worldY: y,
    status: 'free' as const,
    connectedToId: null
  }
];

// Helper to generate dock connectors for rectangular Sub-department module (200x100px)
// Subdepartments strictly only have side (lateral) docks (left and right). Top and bottom docks are exclusive to departments!
export const getSubDepartmentDocks = (id: string, x: number, y: number): DockConnector[] => [
  {
    id: `${id}-dock-left`,
    type: 'left' as const,
    localX: -100,
    localY: 0,
    worldX: x - 100,
    worldY: y,
    status: 'free' as const,
    connectedToId: null
  },
  {
    id: `${id}-dock-right`,
    type: 'right' as const,
    localX: 100,
    localY: 0,
    worldX: x + 100,
    worldY: y,
    status: 'free' as const,
    connectedToId: null
  }
];

// Default Initial Starship Configuration (Clean slate, empty until created)
export const defaultShipStructure: ShipCompanyStructure = {
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
};
