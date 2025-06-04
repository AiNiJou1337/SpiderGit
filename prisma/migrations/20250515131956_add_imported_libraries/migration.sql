-- AlterTable
ALTER TABLE "analytics" ADD COLUMN     "totalStars" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "code_files" ADD COLUMN     "importedLibraries" TEXT[];
