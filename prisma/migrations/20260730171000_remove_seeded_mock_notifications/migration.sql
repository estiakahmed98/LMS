-- Remove only the four historical demo rows created by the old mock seed.
-- Real workflow notifications use generated cuid identifiers and are untouched.
DELETE FROM "notifications"
WHERE "id" IN ('notif_1', 'notif_2', 'notif_3', 'notif_4');
