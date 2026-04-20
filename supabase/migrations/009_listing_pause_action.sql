-- Allow admins to log pause / unpause actions in the audit trail.
-- The 'paused' listing status already exists; we just need the approvals
-- log's CHECK constraint to accept the new action names.

ALTER TABLE listing_approvals
  DROP CONSTRAINT IF EXISTS listing_approvals_action_check;

ALTER TABLE listing_approvals
  ADD CONSTRAINT listing_approvals_action_check
  CHECK (action IN ('approved', 'rejected', 'requested_changes', 'paused', 'unpaused'));
