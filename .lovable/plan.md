

## Problem

The "Painel Owner" link was added to `AppSidebar.tsx`, but the app actually uses `AppNavbar.tsx` (top navbar) for navigation. The navbar loads menu items dynamically from the `menu_items` database table and has no logic for `ownerOnly` items. That's why the link doesn't appear.

## Solution

Add the "Painel Owner" link directly in `AppNavbar.tsx` as a hardcoded item (not from the database), visible only when `isOwner === true`. It will appear as a distinct icon button or link in the navbar, separate from the dynamic menu system.

### Changes

1. **`src/components/layout/AppNavbar.tsx`**
   - Import `isOwner` from `usePermissions()`
   - Add a "Painel Owner" link (with `Building2` icon) in the desktop navbar, positioned before the right-side controls (theme/notifications/user)
   - Add the same link in the mobile menu as a separate section labeled "Owner" at the bottom, only when `isOwner` is true
   - The link routes to `/super-admin`

2. **`src/components/layout/AppSidebar.tsx`** (cleanup)
   - Remove the "Painel Owner" entry from the sidebar since it's not used

This is a small, focused change — just adding a conditional nav link in the component that actually renders the navigation.

