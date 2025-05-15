-- AlterTable
ALTER TABLE "repositories" ADD COLUMN     "last_updated" TIMESTAMP(3),
ADD COLUMN     "published_at" TIMESTAMP(3),
ADD COLUMN     "readme" TEXT,
ADD COLUMN     "tags" TEXT[];

-- CreateTable
CREATE TABLE "keywords" (
    "id" SERIAL NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "code_files" (
    "id" SERIAL NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "content" TEXT,
    "comments" TEXT,
    "apiEndpoints" TEXT[],
    "functions" TEXT[],
    "packages" TEXT[],
    "components" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "repositoryId" INTEGER NOT NULL,

    CONSTRAINT "code_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "repository_keywords" (
    "id" SERIAL NOT NULL,
    "repositoryId" INTEGER NOT NULL,
    "keywordId" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "repository_keywords_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "keywordId" INTEGER NOT NULL,
    "totalRepositories" INTEGER NOT NULL DEFAULT 0,
    "avgStars" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgForks" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topLanguages" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "analytics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "keywords_text_key" ON "keywords"("text");

-- CreateIndex
CREATE INDEX "code_files_repositoryId_idx" ON "code_files"("repositoryId");

-- CreateIndex
CREATE INDEX "repository_keywords_repositoryId_idx" ON "repository_keywords"("repositoryId");

-- CreateIndex
CREATE INDEX "repository_keywords_keywordId_idx" ON "repository_keywords"("keywordId");

-- CreateIndex
CREATE UNIQUE INDEX "repository_keywords_repositoryId_keywordId_key" ON "repository_keywords"("repositoryId", "keywordId");

-- CreateIndex
CREATE INDEX "analytics_keywordId_idx" ON "analytics"("keywordId");

-- CreateIndex
CREATE INDEX "analytics_date_idx" ON "analytics"("date");

-- AddForeignKey
ALTER TABLE "code_files" ADD CONSTRAINT "code_files_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_keywords" ADD CONSTRAINT "repository_keywords_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "repositories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "repository_keywords" ADD CONSTRAINT "repository_keywords_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_keywordId_fkey" FOREIGN KEY ("keywordId") REFERENCES "keywords"("id") ON DELETE CASCADE ON UPDATE CASCADE;
