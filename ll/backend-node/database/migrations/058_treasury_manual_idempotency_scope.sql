ALTER TABLE treasury_manual_operations
  DROP INDEX uq_treasury_manual_request,
  ADD UNIQUE KEY uq_treasury_manual_request (created_by,client_request_id);
