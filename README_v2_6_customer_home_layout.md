# Beauty Home Service v2.6 - Customer Interface Layout Polish

## Scope
This update reorganizes the Customer Web Portal layout to match the requested clean dashboard-style visual reference while preserving the existing booking, account login/guest booking, portfolio, experts, tracking, and account flows.

## Updated
- `customer-web/src/main.jsx`
- `customer-web/src/style.css`

## Main UI Changes
- New sticky header with logo, icon navigation, active tab state, search and notification icons.
- Cleaner hero section with centered call-to-action.
- Customer login / guest booking card moved into a more organized card directly below the hero.
- Home screen now has:
  - KPI-style cards for service sections, beauty experts, and portfolio samples.
  - Service section chips.
  - Featured portfolio card grid.
  - Featured experts strip.
  - Organized footer links.
- Existing functionality is preserved.

## Deploy
Redeploy Customer Web only unless backend/admin files were changed separately.
