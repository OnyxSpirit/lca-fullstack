-- Stabilisation additive du module Livraison.
-- Aucune livraison, signature, checklist ou pièce jointe existante n'est supprimée.

ALTER TABLE delivery_checklists
  ADD COLUMN IF NOT EXISTS template_id BIGINT UNSIGNED NULL AFTER delivery_id,
  ADD COLUMN IF NOT EXISTS category ENUM('preparation','quality','documents','handover') NOT NULL DEFAULT 'quality' AFTER item_name,
  ADD COLUMN IF NOT EXISTS sort_order INT NOT NULL DEFAULT 0 AFTER category,
  ADD INDEX IF NOT EXISTS idx_delivery_checklist_phase (delivery_id,category,is_required,is_completed,sort_order),
  ADD CONSTRAINT IF NOT EXISTS fk_delivery_checklist_template FOREIGN KEY (template_id) REFERENCES delivery_checklist_templates(id) ON DELETE SET NULL;

UPDATE delivery_checklists dc
SET dc.template_id=(SELECT t.id FROM delivery_checklist_templates t WHERE t.item_name=dc.item_name ORDER BY t.agency_id IS NULL,t.id LIMIT 1)
WHERE dc.template_id IS NULL;

UPDATE delivery_checklists dc
JOIN delivery_checklist_templates t ON t.id=dc.template_id
SET dc.category=t.category,dc.sort_order=t.sort_order;

ALTER TABLE delivery_signatures
  ADD UNIQUE INDEX IF NOT EXISTS uk_delivery_signature_final (delivery_id);
