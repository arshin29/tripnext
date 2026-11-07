-- CreateTable
CREATE TABLE "destinations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "short_description" TEXT NOT NULL,
    "detailed_description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "cover_image" TEXT NOT NULL,
    "gallery_images" TEXT[],
    "attractions" TEXT[],
    "best_time_to_visit" TEXT NOT NULL,
    "approximate_duration" TEXT NOT NULL,
    "is_featured" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "destinations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_destinations" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_destinations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "destinations_slug_key" ON "destinations"("slug");

-- CreateIndex
CREATE INDEX "destinations_category_idx" ON "destinations"("category");

-- CreateIndex
CREATE INDEX "destinations_is_featured_idx" ON "destinations"("is_featured");

-- CreateIndex
CREATE INDEX "destinations_name_idx" ON "destinations"("name");

-- CreateIndex
CREATE INDEX "destinations_city_idx" ON "destinations"("city");

-- CreateIndex
CREATE INDEX "destinations_country_idx" ON "destinations"("country");

-- CreateIndex
CREATE INDEX "saved_destinations_user_id_idx" ON "saved_destinations"("user_id");

-- CreateIndex
CREATE INDEX "saved_destinations_destination_id_idx" ON "saved_destinations"("destination_id");

-- CreateIndex
CREATE UNIQUE INDEX "saved_destinations_user_id_destination_id_key" ON "saved_destinations"("user_id", "destination_id");

-- AddForeignKey
ALTER TABLE "saved_destinations" ADD CONSTRAINT "saved_destinations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "saved_destinations" ADD CONSTRAINT "saved_destinations_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
