

## Analysis: Cross-Module Integration Audit & Fixes

After thorough investigation, I identified **6 critical integration gaps** between the modules.

---

### Current Integration Map (What EXISTS)

- **Orders → Production**: Trigger `create_production_on_order_approval` creates production orders when status = 'aprovado'. Working.
- **Orders → Inventory**: Trigger `process_order_stock_movement` creates stock exits when status = 'faturado'. Working.
- **Purchase Orders → Financeiro (Payables)**: Trigger `create_payable_from_purchase_order` creates `fin_payables` on INSERT. Working.
- **Purchase Orders → Inventory**: `ReceivePurchaseDialog` creates `stock_movements` on receipt. Working (frontend-only).
- **Production → Inventory**: Trigger `process_production_stock_consumption` consumes BOM components. Working.
- **Global Realtime**: `useGlobalRealtime` in `DashboardLayout` listens to key tables. Partially working.

---

### Identified Integration Gaps

#### 1. Orders → Financeiro (Receivables) — MISSING
When an order is created/approved, **no trigger creates `fin_receivables`**. The `fin_receivables` table has `order_id` and `customer_id` columns ready, but nothing populates them. This means sales orders don't appear in "Contas a Receber".

**Fix**: Create a trigger `create_receivable_from_order` on the `orders` table that generates a `fin_receivables` entry when status changes to `aprovado` or `faturado`.

#### 2. Purchase Orders NOT in Realtime Publication — MISSING
Tables `purchase_orders`, `purchase_order_items`, `production_types`, `production_phase_templates` are **not** in the `supabase_realtime` publication. Changes to purchase orders don't trigger realtime updates.

**Fix**: Add these 4 tables to `supabase_realtime` publication.

#### 3. `useGlobalRealtime` Missing Purchase Orders — MISSING
The global realtime hook doesn't listen to `purchase_orders` or `purchase_order_items` tables, so purchase changes don't invalidate suppliers, inventory, or financeiro queries.

**Fix**: Add `purchase_orders` and `purchase_order_items` listeners to `useGlobalRealtime`, invalidating `purchase-orders`, `fin-`, `suppliers`, and `inventory` query keys.

#### 4. Payables Trigger Missing Ledger Entry — INCOMPLETE
The `create_payable_from_purchase_order` trigger creates a `fin_payables` record but does NOT create a corresponding `fin_ledger_entries` record. Per the architecture rules, the ledger is the single source of truth, so every payable should have a ledger entry.

**Fix**: Update the trigger to also insert a `fin_ledger_entries` record of type 'DESPESA' and link it via `ledger_entry_id`.

#### 5. Receivables/Payables Payment Missing Ledger Sync — INCOMPLETE  
When payables or receivables are paid (status changes to 'PAGO'/'RECEBIDO'), there's no trigger to create the corresponding cash-date ledger entry. This means paid items don't reflect in the cash flow.

**Fix**: Create triggers `sync_payable_payment_to_ledger` and `sync_receivable_payment_to_ledger` that create/update ledger entries with `cash_date` when payment is recorded.

#### 6. Cross-Module Query Invalidation Gaps — INCOMPLETE
Several mutation handlers don't invalidate related modules:
- `ReceivePurchaseDialog` doesn't invalidate `inventory-metrics`, `fin-payables`, or `products` queries after stock receipt.
- `CreatePurchaseOrderDialog` doesn't invalidate `fin-payables` queries.
- Production order mutations don't invalidate `orders` queries consistently.

**Fix**: Add missing `invalidateQueries` calls in:
- `ReceivePurchaseDialog`: add `products`, `inventory-metrics`, `stock-movements`, `fin-payables`
- `CreatePurchaseOrderDialog`: add `fin-payables`
- `PurchaseOrderDetailSheet`: add `fin-payables`, `suppliers`

---

### Implementation Plan

**Step 1 — Database Migration** (single migration):
- Create trigger `create_receivable_from_order` on `orders` (status → 'aprovado'/'faturado' → insert `fin_receivables` + `fin_ledger_entries`)
- Update `create_payable_from_purchase_order` to also create a `fin_ledger_entries` record
- Create trigger `sync_payable_payment_to_ledger` on `fin_payables` 
- Create trigger `sync_receivable_payment_to_ledger` on `fin_receivables`
- Add `purchase_orders`, `purchase_order_items`, `production_types`, `production_phase_templates` to `supabase_realtime`

**Step 2 — Update `useGlobalRealtime.ts`**:
- Add listeners for `purchase_orders`, `purchase_order_items`
- Create `onPurchasesChange` callback invalidating purchases, financeiro, inventory, suppliers

**Step 3 — Fix Frontend Query Invalidation**:
- `ReceivePurchaseDialog`: add cross-module invalidation
- `CreatePurchaseOrderDialog`: add `fin-payables` invalidation
- `PurchaseOrderDetailSheet`: add `fin-payables`, `suppliers` invalidation

