export interface ProjectKpiVisibilityCandidate {
  status?: string | null;
  budget?: number | string | null;
  start_date?: string | null;
}

export function isProjectVisibleInKpis(
  project: ProjectKpiVisibilityCandidate,
  executedAmount = 0,
) {
  if (project.status !== "ativo") {
    return false;
  }

  const hasBudget = Number(project.budget) > 0;
  const hasStartedLifecycle = Boolean(project.start_date);
  const hasExecutedValue = executedAmount > 0;

  return hasBudget || hasStartedLifecycle || hasExecutedValue;
}
