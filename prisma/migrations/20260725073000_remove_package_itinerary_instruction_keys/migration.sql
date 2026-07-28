-- Remove the retired day-level instruction keys and itinerary-item internal note
-- keys from reusable package JSON while preserving day and item ordering.
UPDATE "TourPackage"
SET "itineraryTemplate" = COALESCE(
  (
    SELECT jsonb_agg(
      (
        day_value
        - 'internalNotes'
        - 'guideInstructions'
        - 'driverInstructions'
        - 'items'
      )
      || jsonb_build_object(
        'items',
        COALESCE(
          (
            SELECT jsonb_agg(
              item_value - 'internalNotes'
              ORDER BY item_order
            )
            FROM jsonb_array_elements(
              COALESCE(day_value->'items', '[]'::jsonb)
            ) WITH ORDINALITY AS item_entries(item_value, item_order)
          ),
          '[]'::jsonb
        )
      )
      ORDER BY day_order
    )
    FROM jsonb_array_elements("itineraryTemplate")
      WITH ORDINALITY AS day_entries(day_value, day_order)
  ),
  '[]'::jsonb
)
WHERE jsonb_typeof("itineraryTemplate") = 'array';
