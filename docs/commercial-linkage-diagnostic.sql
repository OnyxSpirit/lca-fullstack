-- Diagnostic strictement en lecture seule : aucun rapprochement heuristique ni backfill.
SELECT
  COUNT(*) AS total_sales,
  SUM(opportunity_id IS NULL) AS sales_without_opportunity,
  SUM(quotation_id IS NULL) AS sales_without_quotation,
  SUM(opportunity_id IS NULL OR quotation_id IS NULL) AS sales_with_incomplete_crm_lineage
FROM sales;

SELECT
  s.id,
  s.sale_number,
  s.customer_id,
  s.opportunity_id,
  s.quotation_id,
  s.created_at
FROM sales s
WHERE s.opportunity_id IS NULL OR s.quotation_id IS NULL
ORDER BY s.created_at DESC, s.id DESC;

SELECT
  q.id,
  q.quotation_number,
  q.customer_id,
  q.opportunity_id,
  q.status,
  q.created_at
FROM quotations q
WHERE q.opportunity_id IS NULL
ORDER BY q.created_at DESC, q.id DESC;
