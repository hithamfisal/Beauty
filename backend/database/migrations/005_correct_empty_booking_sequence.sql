WITH max_number AS (
  SELECT COALESCE(MAX((regexp_match(booking_number, '(\d+)$'))[1]::bigint), 0) AS value
  FROM bookings WHERE booking_number IS NOT NULL
)
SELECT setval('booking_number_seq', GREATEST(value, 1), value > 0) FROM max_number;
