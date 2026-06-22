# Beauty Home Service v2.8 - Real Phone Mask

## What changed

Implemented a real visual phone mask for all phone fields:

```text
05xxxxxxxx
```

Behavior:

- The field visually starts with `05xxxxxxxx`.
- `05` is fixed as the Saudi mobile prefix.
- Each typed digit replaces one `x`.
- Only digits are accepted.
- Backspace removes the last typed digit, not the fixed `05`.
- The saved/submitted value is the real number only, for example `0512345678`.
- Backend validation still requires `^05\d{8}$`.

## Updated areas

- Customer Web
- Admin Dashboard
- Mobile App

## Deployment

Redeploy:

1. Backend if validation was changed or if deploying full package
2. Admin Dashboard
3. Customer Web
4. Rebuild APK/AAB if mobile changes are needed
