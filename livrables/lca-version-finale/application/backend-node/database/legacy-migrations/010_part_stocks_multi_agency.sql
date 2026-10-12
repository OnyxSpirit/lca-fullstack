-- Stock PR multi-agence / multi-emplacement (migration additive).
-- Les colonnes current_stock/reserved_stock/min_stock/max_stock de parts sont désormais legacy ;
-- part_stocks est l'unique source d'autorité pour toute nouvelle écriture métier.
CREATE TABLE IF NOT EXISTS part_stocks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    part_id BIGINT UNSIGNED NOT NULL,
    agency_id BIGINT UNSIGNED NOT NULL,
    location_id BIGINT UNSIGNED NULL,
    location_key BIGINT UNSIGNED AS (IFNULL(location_id, 0)) STORED,
    current_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    reserved_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    min_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    max_stock DECIMAL(12,2) NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_part_stock_scope (part_id, agency_id, location_key),
    INDEX idx_part_stock_part (part_id),
    INDEX idx_part_stock_agency (agency_id),
    INDEX idx_part_stock_location (location_id),
    INDEX idx_part_stock_part_agency (part_id, agency_id),
    CONSTRAINT fk_part_stock_part FOREIGN KEY (part_id) REFERENCES parts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_part_stock_agency FOREIGN KEY (agency_id) REFERENCES agencies(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT fk_part_stock_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB;

ALTER TABLE part_reservations
    ADD COLUMN location_id BIGINT UNSIGNED NULL AFTER agency_id,
    ADD COLUMN part_stock_id BIGINT UNSIGNED NULL AFTER location_id,
    ADD INDEX idx_part_reservation_stock (part_stock_id),
    ADD INDEX idx_part_reservation_scope (part_id, agency_id, location_id),
    ADD CONSTRAINT fk_part_reservation_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    ADD CONSTRAINT fk_part_reservation_stock FOREIGN KEY (part_stock_id) REFERENCES part_stocks(id) ON DELETE RESTRICT ON UPDATE CASCADE;

-- Une affectation est automatique seulement si l'historique désigne exactement
-- une combinaison agence/emplacement. Les cas ambigus restent volontairement
-- sans part_stocks et doivent être affectés lors de l'inventaire initial.
INSERT INTO part_stocks(part_id,agency_id,location_id,current_stock,reserved_stock,min_stock,max_stock)
SELECT p.id,MIN(pm.agency_id),MIN(pm.location_id),p.current_stock,p.reserved_stock,p.min_stock,p.max_stock
FROM parts p JOIN part_movements pm ON pm.part_id=p.id
GROUP BY p.id,p.current_stock,p.reserved_stock,p.min_stock,p.max_stock
HAVING COUNT(DISTINCT CONCAT(pm.agency_id,':',IFNULL(pm.location_id,0)))=1
ON DUPLICATE KEY UPDATE id=id;

-- Une base réellement mono-agence peut recevoir les stocks sans historique
-- dans un emplacement non précisé, sans inventer une ventilation physique.
INSERT INTO part_stocks(part_id,agency_id,location_id,current_stock,reserved_stock,min_stock,max_stock)
SELECT p.id,MIN(a.id),NULL,p.current_stock,p.reserved_stock,p.min_stock,p.max_stock
FROM parts p CROSS JOIN agencies a
WHERE a.is_active=TRUE AND NOT EXISTS(SELECT 1 FROM part_stocks ps WHERE ps.part_id=p.id)
GROUP BY p.id,p.current_stock,p.reserved_stock,p.min_stock,p.max_stock
HAVING COUNT(a.id)=1
ON DUPLICATE KEY UPDATE id=id;

UPDATE part_reservations pr
JOIN part_stocks ps ON ps.part_id=pr.part_id AND ps.agency_id=pr.agency_id
JOIN (SELECT part_id,agency_id,COUNT(*) row_count FROM part_stocks GROUP BY part_id,agency_id) x
  ON x.part_id=ps.part_id AND x.agency_id=ps.agency_id AND x.row_count=1
SET pr.part_stock_id=ps.id,pr.location_id=ps.location_id
WHERE pr.part_stock_id IS NULL;
