-- CreateTable
CREATE TABLE "repositories" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "owner" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "description" TEXT,
    "language" TEXT,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "forks" INTEGER NOT NULL DEFAULT 0,
    "today_stars" INTEGER NOT NULL DEFAULT 0,
    "url" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "trending" BOOLEAN NOT NULL DEFAULT true,
    "trend_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "trend_period" TEXT NOT NULL DEFAULT 'daily',

    CONSTRAINT "repositories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "repositories_full_name_key" ON "repositories"("full_name");
