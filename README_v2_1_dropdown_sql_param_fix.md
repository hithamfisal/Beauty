# v2.1 Dropdown SQL Parameter Fix

This patch fixes PostgreSQL error:

```json
{
  "error": "Failed to update booking status",
  "details": "inconsistent types deduced for parameter $1"
}
```

## Fixed

- Booking status dropdown save.
- Payment status dropdown save.
- Payment details save.
- Beautician assignment save.

## Root cause

PostgreSQL could not infer the same parameter type when the same placeholder was used in `UPDATE` and `CASE WHEN` expressions.

## Change

Explicit casts were added, for example:

```sql
status=$1::varchar
confirmed_at=CASE WHEN $1::text='confirmed' THEN ...
WHERE id=$3::uuid
```

After replacing files, restart backend and test dropdown changes again.
