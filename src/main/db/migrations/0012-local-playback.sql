-- Keep song rows (including lyrics and local audio) when retiring linked playback.
UPDATE songs SET youtube_id=NULL WHERE youtube_id IS NOT NULL;
DELETE FROM service_plan_items WHERE kind='youtube';
DROP TABLE youtube_videos;
WITH ordered AS (
  SELECT id, row_number() OVER (ORDER BY position,id)-1 AS new_position FROM service_plan_items
)
UPDATE service_plan_items SET position=(SELECT new_position FROM ordered WHERE ordered.id=service_plan_items.id);
