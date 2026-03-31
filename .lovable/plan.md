

## Problem Diagnosis

Two distinct issues prevent ledger entries from appearing in DRE and Cashflow:

### Issue 1: DRE uses wrong date field
In `DRETab.tsx` line 159, the date field is hardcoded as `cash_date`:
```typescript
const dateField = "cash_date";
```
Per the system's own architecture rules, **DRE must use `competence_date`** (regime de competência). Since only 4 out of 29 entries have `cash_date` populated (while all 29 have `competence_date`), the DRE shows essentially nothing.

### Issue 2: Cashflow correctly uses `cash_date`, but entries lack it
The Cashflow tab correctly filters by `cash_date`, but order-generated entries are created with `cash_date = NULL` (status ABERTO). Only when entries are "baixados" (settled/paid) should `cash_date` be populated. This is partially correct behavior — however, the trigger that creates entries from orders should populate `cash_date` for entries that represent immediate cash movements, or the system needs a way to set `cash_date` when settling.

---

## Plan

### Step 1: Fix DRE date field
Change `DRETab.tsx` line 159 from `const dateField = "cash_date"` to `const dateField = "competence_date"`. Also update the filter and sort logic to use `competence_date` consistently within the DRE tab.

### Step 2: Populate `cash_date` on existing entries
Create a migration to set `cash_date = competence_date` for all existing ledger entries where `cash_date IS NULL`, so they also appear in the Cashflow view. This is a reasonable default — entries can be adjusted later when actual payment dates differ.

### Step 3: Update order triggers to set `cash_date`
Modify the trigger functions (`update_financial_entries_on_order_edit`, `create_order_commission_entries`, `create_receivable_from_order`) to populate `cash_date` with the same value as `competence_date` when creating new entries. This ensures future entries appear in both DRE and Cashflow immediately.

---

### Technical Details
- **File**: `src/components/financeiro/DRETab.tsx` — change line 159
- **Migration**: SQL to backfill `cash_date` and update trigger functions
- **Impact**: All 29 existing entries will become visible in both DRE and Cashflow

