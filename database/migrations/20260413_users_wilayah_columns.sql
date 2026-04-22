ALTER TABLE users
  MODIFY wa VARCHAR(30) NULL,
  MODIFY role ENUM('user', 'admin', 'affiliate') DEFAULT 'user',
  MODIFY prov_id VARCHAR(2) NULL,
  MODIFY city_id VARCHAR(4) NULL,
  MODIFY dis_id VARCHAR(7) NULL,
  MODIFY desa_id VARCHAR(10) NULL;
