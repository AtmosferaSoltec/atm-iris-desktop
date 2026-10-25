CREATE TABLE youtube_videos (
  id TEXT PRIMARY KEY,
  video_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TRIGGER delete_youtube_plan AFTER DELETE ON youtube_videos BEGIN
  DELETE FROM service_plan_items WHERE kind='youtube' AND ref_id=OLD.id;
  UPDATE service_plan_items SET position=(SELECT count(*) FROM service_plan_items AS earlier WHERE earlier.position < service_plan_items.position);
END;
