# Beauty Home Service v3.2 - Admin Dropdown Filter Cleanup

## Summary
This version removes the separate filter dropdowns from the admin management screens and makes filtering controlled only by the related parent dropdown.

## Changes

### Service Categories & Services
- Removed the separate "Filter services by category" dropdown from the Services column.
- The existing "Category for service" dropdown now controls both:
  - the category assigned to the service being added/edited
  - the list of services displayed below it
- If no category is selected, all services are displayed.
- If a category is selected, only services under that category are displayed.
- Editing a service category also sets the Services column to that category so related services are shown directly.

### Regions, Cities & Districts
- Removed separate filter dropdowns from Cities and Districts.
- The existing "Region for city" dropdown now controls both:
  - the region assigned to the city being added/edited
  - the cities displayed under it
- The existing "City for district" dropdown now controls both:
  - the city assigned to the district being added/edited
  - the districts displayed under it
- If no region is selected, all cities are displayed.
- If no city is selected, all districts are displayed.
- If a region is selected but no city is selected, districts under cities in that region are displayed.

### Admin HTML
- Preserved the requested Arabic RTL admin HTML entry values:
  - `<html lang="ar" dir="rtl">`
  - UTF-8 charset
  - responsive viewport
  - title: `Beauty Home Service | بوابة مدير النظام`
  - root div and `/src/App.jsx` module script

## Modified files
- `admin-dashboard/src/App.jsx`
- `admin-dashboard/index.html`
- `README_v3_2_admin_dropdown_filter_cleanup.md`

## Deployment
Only the Admin Dashboard needs redeploy for this version.
