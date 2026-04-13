import type { StatusKey, StatusConfig, StatusMachineConfig, StatusTransition, AutoApprovalRule } from "./types";

export class StatusMachine {
  private config: StatusMachineConfig;
  private statusMap: Map<StatusKey, StatusConfig>;

  constructor(config: StatusMachineConfig) {
    this.config = config;
    this.statusMap = new Map(config.statuses.map((s) => [s.key, s]));
  }

  /** Get config for a status */
  getStatus(key: StatusKey): StatusConfig | undefined {
    return this.statusMap.get(key);
  }

  /** Get all statuses */
  getAllStatuses(): StatusConfig[] {
    return this.config.statuses;
  }

  /** Check if transition is allowed */
  canTransition(from: StatusKey, to: StatusKey): boolean {
    const status = this.statusMap.get(from);
    if (!status) return false;
    return status.transitions.includes(to);
  }

  /** Get allowed next statuses */
  getAvailableTransitions(current: StatusKey): StatusConfig[] {
    const status = this.statusMap.get(current);
    if (!status) return [];
    return status.transitions
      .map((key) => this.statusMap.get(key))
      .filter(Boolean) as StatusConfig[];
  }

  /** Check if record is editable in current status */
  isEditable(current: StatusKey): boolean {
    const status = this.statusMap.get(current);
    return status ? !status.blockEdit : true;
  }

  /** Get events triggered by entering a status */
  getEventsForStatus(statusKey: StatusKey) {
    return this.config.events?.find((e) => e.status === statusKey)?.actions || [];
  }

  /** Evaluate auto-approval rules */
  evaluateAutoApproval(
    record: Record<string, any>,
    rules?: AutoApprovalRule[]
  ): StatusKey | null {
    const activeRules = rules || this.config.autoApprovalRules;
    if (!activeRules?.length) return null;

    for (const rule of activeRules) {
      const val = record[rule.field];
      let match = false;

      switch (rule.operator) {
        case "lt": match = val < rule.value; break;
        case "lte": match = val <= rule.value; break;
        case "eq": match = val === rule.value; break;
        case "gte": match = val >= rule.value; break;
        case "gt": match = val > rule.value; break;
        case "in": match = Array.isArray(rule.value) && rule.value.includes(val); break;
      }

      if (match) return rule.targetStatus;
    }
    return null;
  }

  /** Create a transition record */
  createTransition(
    from: StatusKey,
    to: StatusKey,
    userId: string,
    userName?: string,
    reason?: string
  ): StatusTransition | null {
    if (!this.canTransition(from, to)) return null;
    return {
      from,
      to,
      userId,
      userName,
      timestamp: new Date().toISOString(),
      reason,
    };
  }
}
