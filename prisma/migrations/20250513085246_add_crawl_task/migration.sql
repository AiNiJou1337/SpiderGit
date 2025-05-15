/*
  Warnings:

  - You are about to drop the column `apiEndpoints` on the `code_files` table. All the data in the column will be lost.
  - You are about to drop the column `repositoryId` on the `code_files` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "code_files" DROP CONSTRAINT "code_files_repositoryId_fkey";

-- DropIndex
DROP INDEX "code_files_repositoryId_idx";

-- AlterTable
ALTER TABLE "code_files" DROP COLUMN "apiEndpoints",
ADD COLUMN     "api_endpoints" TEXT[];

-- 添加repository_id列，并设置临时默认值
ALTER TABLE "code_files" ADD COLUMN "repository_id" INTEGER;

-- 将原有的repositoryId数据复制到repository_id
UPDATE "code_files" SET "repository_id" = "repositoryId";

-- 设置repository_id为非空
ALTER TABLE "code_files" DROP COLUMN "repositoryId";
ALTER TABLE "code_files" ALTER COLUMN "repository_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "crawl_tasks" (
    "id" SERIAL NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "keywordId" INTEGER NOT NULL,
    "total_repositories" INTEGER NOT NULL DEFAULT 0,
    "python_repositories" INTEGER NOT NULL DEFAULT 0,
    "java_repositories" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "crawl_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "crawl_tasks_keywordId_idx" ON "crawl_tasks"("keywordId");

-- CreateIndex
CREATE INDEX "code_files_repository_id_idx" ON "code_files"("repository_id");

-- AddForeignKey
ALTER TABLE "crawl_tasks" ADD CONSTRAINT "crawl_tasks_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "code_files" ADD CONSTRAINT "code_files_repository_id_fkey" FOREIGN KEY ("repository_id") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;
