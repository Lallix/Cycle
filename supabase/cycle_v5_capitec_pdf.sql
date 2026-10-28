-- Allow Capitec PDF statements as an import format.
ALTER TABLE cycle_import_batches DROP CONSTRAINT cycle_import_batches_file_format_check;
ALTER TABLE cycle_import_batches ADD CONSTRAINT cycle_import_batches_file_format_check
  CHECK (file_format IN ('capitec_csv', 'capitec_pdf', 'gotyme_pdf', 'generic_csv', 'workbook'));
