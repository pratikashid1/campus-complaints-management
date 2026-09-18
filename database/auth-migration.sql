ALTER TABLE users
    ADD COLUMN password_hash VARCHAR(255) NULL AFTER email,
    DROP COLUMN google_id,
    DROP COLUMN profile_picture;
