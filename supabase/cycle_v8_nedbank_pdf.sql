-- v8: Nedbank PDF statements get their own import format
ALTER TABLE public.cycle_import_batches DROP CONSTRAINT IF EXISTS cycle_import_batches_file_format_check;
ALTER TABLE public.cycle_import_batches ADD CONSTRAINT cycle_import_batches_file_format_check
  CHECK (file_format IN ('capitec_csv', 'capitec_pdf', 'gotyme_pdf', 'nedbank_pdf', 'generic_csv', 'workbook', 'claude_pdf'));
