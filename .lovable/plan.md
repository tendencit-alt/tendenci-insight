

## Plan: Add Click-to-Origin on Drill-Down Entries

### Problem
When clicking on Receitas/Despesas in the BI Cost Center KPIs, the drill-down dialog shows entries but they are not clickable. Users want to click an entry and navigate to the originating order (for entries generated from Pedidos/Recursos Estrategicos) or view the original ledger entry details.

### How It Works Today
- `CostCenterEntriesDialog` shows `fin_ledger_entries` data
- `fin_ledger_entries` has NO `order_id` column
- However, `fin_payables` and `fin_receivables` have both `ledger_entry_id` and `order_id`, creating the link back to orders
- Entries from orders follow the pattern "PED #N - Comissão Vendedor (Nome)" or "PED #N - Receita"

### Implementation

**Step 1: Fetch order linkage in the query**

In `CostCenterEntriesDialog.tsx`, after fetching ledger entries, perform a secondary lookup:
- Query `fin_payables` and `fin_receivables` where `ledger_entry_id` is in the fetched entry IDs, selecting `ledger_entry_id, order_id`
- Also fetch order numbers from `orders` table via the join
- Build a map: `ledger_entry_id -> { order_id, order_number }`
- Attach this info to each entry in the merged results

**Step 2: Add a clickable action per row**

- Add an "open origin" icon button (ExternalLink) at the end of each row
- For entries linked to an order: open `OrderDetailSheet` with the order ID
- For entries without an order link: optionally open a simple detail view or show a tooltip "Lançamento manual"
- The checkbox/selection behavior remains on the row click; the origin button is a separate action

**Step 3: Integrate OrderDetailSheet**

- Import and render `OrderDetailSheet` conditionally when an order is selected
- Track state: `selectedOrderId` for opening the sheet
- When clicked, the sheet opens showing full order details (already exists as a reusable component)

### Files to Edit
1. **`src/components/financeiro/CostCenterEntriesDialog.tsx`** — Add order lookup query, add origin button per row, integrate OrderDetailSheet

### Technical Details
- The select query will include: `fin_payables(ledger_entry_id, order_id, order:orders(order_number))` and same for `fin_receivables`
- Grid columns adjusted to add a narrow action column: `[32px_1fr_120px_100px_80px_32px]`
- Badge or icon indicating "Pedido #N" when order is linked

