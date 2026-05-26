
-- Disable WhatsApp/IA related cron jobs (idempotent)
DO $$
DECLARE
  j text;
BEGIN
  FOREACH j IN ARRAY ARRAY[
    'process-campaign-queue',
    'check-scheduled-campaigns',
    'process-orphan-messages'
  ] LOOP
    BEGIN
      PERFORM cron.unschedule(j);
    EXCEPTION WHEN OTHERS THEN
      -- ignore if not present
      NULL;
    END;
  END LOOP;
END $$;
