-- Track who ran an import batch, for traceability.
ALTER TABLE "ImportBatch" ADD COLUMN "importedByUserId" TEXT;
