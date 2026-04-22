CREATE TABLE IF NOT EXISTS ticket_price_monthly_stats (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source_db VARCHAR(100) NOT NULL,
  origin CHAR(3) NOT NULL,
  destination CHAR(3) NOT NULL,
  bucket VARCHAR(16) NOT NULL,
  `year_month` CHAR(7) NOT NULL,
  sample_count INT NOT NULL DEFAULT 0,
  price_min_idr BIGINT NOT NULL DEFAULT 0,
  price_avg_idr BIGINT NOT NULL DEFAULT 0,
  price_median_idr BIGINT NOT NULL DEFAULT 0,
  price_max_idr BIGINT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ticket_monthly_stats (source_db, origin, destination, bucket, `year_month`),
  KEY idx_ticket_monthly_lookup (origin, destination, bucket, `year_month`)
);

CREATE TABLE IF NOT EXISTS ticket_price_projections (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  source_db VARCHAR(100) NOT NULL,
  origin CHAR(3) NOT NULL,
  destination CHAR(3) NOT NULL,
  bucket VARCHAR(16) NOT NULL,
  projected_month CHAR(7) NOT NULL,
  projected_price_idr BIGINT NOT NULL DEFAULT 0,
  baseline_price_idr BIGINT NOT NULL DEFAULT 0,
  trend_slope_idr BIGINT NOT NULL DEFAULT 0,
  method VARCHAR(40) NOT NULL,
  confidence_score DECIMAL(5,2) NOT NULL DEFAULT 0,
  history_months INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_ticket_projection (source_db, origin, destination, bucket, projected_month),
  KEY idx_ticket_projection_lookup (origin, destination, bucket, projected_month)
);
