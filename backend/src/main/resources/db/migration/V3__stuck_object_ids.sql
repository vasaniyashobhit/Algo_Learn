-- Stuck query ids become 24-hex ObjectId-style text (legacy ids): the frontend routes and the E2E tests expect
-- /stuck/<24 hex>. The app supplies the id (common.db.ObjectIds); the default covers direct SQL inserts.
-- Existing UUID rows (dev databases only) keep their first 24 hex digits.
ALTER TABLE stuck_queries ALTER COLUMN id DROP DEFAULT;
ALTER TABLE stuck_queries ALTER COLUMN id TYPE text USING left(replace(id::text, '-', ''), 24);
ALTER TABLE stuck_queries ALTER COLUMN id SET DEFAULT
    lpad(to_hex(floor(extract(epoch FROM clock_timestamp()))::bigint), 8, '0')
    || left(replace(gen_random_uuid()::text, '-', ''), 16);
ALTER TABLE stuck_queries ADD CONSTRAINT ck_stuck_queries_id CHECK (id ~ '^[0-9a-f]{24}$');
