ALTER TABLE users
  ADD COLUMN last_ip VARCHAR(64) NULL AFTER last_login,
  ADD COLUMN last_location VARCHAR(255) NULL AFTER last_ip,
  ADD COLUMN user_agent VARCHAR(255) NULL AFTER last_location,
  ADD COLUMN last_page_code VARCHAR(120) NULL AFTER user_agent;
