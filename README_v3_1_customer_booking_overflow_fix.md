# Beauty Home Service v3.1 - Customer Booking Overflow Fix

## Fix

This update fixes the customer booking form overflowing outside the page boundaries.

## Changed file

- `customer-web/src/style.css`

## What was adjusted

- Prevent horizontal page scroll.
- Force booking form columns to shrink correctly.
- Set all booking inputs/selects/textareas to `width: 100%` and `min-width: 0`.
- Improve responsive layout:
  - Desktop: 3 columns.
  - Tablet: 2 columns.
  - Mobile: 1 column.

## Deploy

```powershell
cd "D:\Dashboards Projects\Beauty\Beauty V1"

git add customer-web/src/style.css README_v3_1_customer_booking_overflow_fix.md
git commit -m "Fix customer booking form overflow and mobile layout"
git push origin main
```

Redeploy Customer Web only.
