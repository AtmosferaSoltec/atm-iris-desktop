CREATE TABLE service_plan_items (
 id TEXT PRIMARY KEY,
 kind TEXT NOT NULL CHECK(kind IN ('song','media','youtube')),
 ref_id TEXT NOT NULL,
 position INTEGER NOT NULL,
 created_at TEXT NOT NULL,
 updated_at TEXT NOT NULL
);
CREATE INDEX service_plan_items_position ON service_plan_items(position);
CREATE TRIGGER remove_song_plan_items AFTER DELETE ON songs BEGIN
 DELETE FROM service_plan_items WHERE kind='song' AND ref_id=OLD.id;
 UPDATE service_plan_items SET position=(SELECT count(*) FROM service_plan_items AS earlier WHERE earlier.position<service_plan_items.position);
END;
CREATE TRIGGER remove_media_plan_items AFTER DELETE ON media_assets BEGIN
 DELETE FROM service_plan_items WHERE kind='media' AND ref_id=OLD.id;
 UPDATE service_plan_items SET position=(SELECT count(*) FROM service_plan_items AS earlier WHERE earlier.position<service_plan_items.position);
END;
