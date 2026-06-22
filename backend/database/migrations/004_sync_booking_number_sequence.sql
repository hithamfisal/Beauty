SELECT setval(
  'booking_number_seq',
  GREATEST(
    COALESCE((SELECT MAX((regexp_match(booking_number, '(\d+)$'))[1]::bigint) FROM bookings WHERE booking_number IS NOT NULL), 0),
    1
  ),
  TRUE
);
