
-- Add budget_percent column with default 50
ALTER TABLE public.fin_projects ADD COLUMN IF NOT EXISTS budget_percent NUMERIC(5,2) NOT NULL DEFAULT 50;

-- Create function to recalculate project budget from linked orders
CREATE OR REPLACE FUNCTION public.recalculate_project_budget()
RETURNS TRIGGER AS $$
DECLARE
  v_project_id UUID;
  v_total NUMERIC;
  v_percent NUMERIC;
BEGIN
  -- Determine which project_id to recalculate
  IF TG_OP = 'DELETE' THEN
    v_project_id := OLD.project_id;
  ELSE
    v_project_id := NEW.project_id;
  END IF;

  -- Also handle project_id change (old project needs recalc too)
  IF TG_OP = 'UPDATE' AND OLD.project_id IS DISTINCT FROM NEW.project_id AND OLD.project_id IS NOT NULL THEN
    SELECT COALESCE(SUM(valor_total), 0) INTO v_total
    FROM orders
    WHERE project_id = OLD.project_id
      AND status NOT IN ('rascunho', 'cancelado');

    SELECT budget_percent INTO v_percent FROM fin_projects WHERE id = OLD.project_id;

    UPDATE fin_projects
    SET budget = v_total * COALESCE(v_percent, 50) / 100
    WHERE id = OLD.project_id;
  END IF;

  IF v_project_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Sum all active orders for this project
  SELECT COALESCE(SUM(valor_total), 0) INTO v_total
  FROM orders
  WHERE project_id = v_project_id
    AND status NOT IN ('rascunho', 'cancelado');

  -- Get project percent
  SELECT budget_percent INTO v_percent FROM fin_projects WHERE id = v_project_id;

  -- Update project budget
  UPDATE fin_projects
  SET budget = v_total * COALESCE(v_percent, 50) / 100
  WHERE id = v_project_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on orders table
DROP TRIGGER IF EXISTS trg_recalculate_project_budget ON orders;
CREATE TRIGGER trg_recalculate_project_budget
  AFTER INSERT OR UPDATE OF project_id, valor_total, status OR DELETE
  ON orders
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_project_budget();

-- Create function to recalculate budget when percent changes
CREATE OR REPLACE FUNCTION public.recalculate_budget_on_percent_change()
RETURNS TRIGGER AS $$
DECLARE
  v_total NUMERIC;
BEGIN
  IF OLD.budget_percent IS DISTINCT FROM NEW.budget_percent THEN
    SELECT COALESCE(SUM(valor_total), 0) INTO v_total
    FROM orders
    WHERE project_id = NEW.id
      AND status NOT IN ('rascunho', 'cancelado');

    NEW.budget := v_total * NEW.budget_percent / 100;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_recalculate_budget_on_percent ON fin_projects;
CREATE TRIGGER trg_recalculate_budget_on_percent
  BEFORE UPDATE OF budget_percent
  ON fin_projects
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_budget_on_percent_change();

-- Recalculate existing projects
UPDATE fin_projects fp
SET budget = sub.total * fp.budget_percent / 100
FROM (
  SELECT project_id, COALESCE(SUM(valor_total), 0) as total
  FROM orders
  WHERE project_id IS NOT NULL AND status NOT IN ('rascunho', 'cancelado')
  GROUP BY project_id
) sub
WHERE fp.id = sub.project_id;
