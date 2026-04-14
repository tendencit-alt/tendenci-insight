export type { StatusColor, StatusDef, ModuleStatusConfig, StatusAutomation, StatusAutomationAction } from "./types";
export { STATUS_BG, STATUS_TEXT, STATUS_BORDER, STATUS_DOT } from "./colors";
export {
  ORDERS_STATUS,
  PAYABLES_STATUS,
  RECEIVABLES_STATUS,
  PURCHASES_STATUS,
  PROJECTS_STATUS,
  PRODUCTION_STATUS,
  getModuleStatusConfig,
  getStatusDef,
  getStatusLabel,
  getAvailableTransitions,
  canTransition,
  isEditable,
} from "./modules";
