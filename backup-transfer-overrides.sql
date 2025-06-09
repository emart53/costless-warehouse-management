-- Transfer Cost Overrides Backup - Created 2025-06-09
-- This file contains the current state of transfer_cost_overrides table

INSERT INTO transfer_cost_overrides (override_id, original_cost, override_cost, reason, start_date, end_date, reminder_date, dismissed_at, is_active, created_at, updated_at, buyer_id, product_id) VALUES 
(11, 30.00, 26.50, 'Volume discount negotiated', '2025-06-02', NULL, NULL, NULL, true, '2025-06-09 02:19:37.794727', '2025-06-09 02:19:37.794727', 1, 2),
(12, 28.50, 29.25, 'Seasonal pricing', '2025-06-02', NULL, NULL, NULL, true, '2025-06-09 02:19:37.794727', '2025-06-09 02:19:37.794727', 1, 3),
(13, 247.80, 240.00, 'Market adjustment', '2025-06-02', NULL, NULL, NULL, true, '2025-06-09 02:19:37.794727', '2025-06-09 02:19:37.794727', 1, 80),
(14, 8.75, 8.75, 'Match legacy', '2025-05-26', NULL, NULL, NULL, true, '2025-06-09 02:19:37.794727', '2025-06-09 02:19:37.794727', 1, 2930),
(15, 891.00, 918.00, 'Match legacy', '2025-05-26', NULL, NULL, NULL, true, '2025-06-09 02:19:37.794727', '2025-06-09 02:19:37.794727', 1, 2935),
(10, 168.00, 154.56, 'Legacy system manual override - selling older lower cost stock first', '2025-06-09', NULL, NULL, NULL, true, '2025-06-09 01:27:33.151733', '2025-06-09 01:27:33.151733', NULL, 1482);

-- To restore this data, first truncate the table then run these inserts:
-- TRUNCATE transfer_cost_overrides RESTART IDENTITY;
-- [Then run the INSERT statements above]