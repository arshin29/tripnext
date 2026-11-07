-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "destination_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "traveler_count" INTEGER NOT NULL DEFAULT 1,
    "budget_amount" DECIMAL(12,2),
    "currency" TEXT NOT NULL DEFAULT 'INR',
    "cover_image" TEXT,
    "status" TEXT NOT NULL DEFAULT 'UPCOMING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itinerary_days" (
    "id" TEXT NOT NULL,
    "trip_id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "day_number" INTEGER NOT NULL,
    "title" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "itinerary_days_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" TEXT NOT NULL,
    "itinerary_day_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "start_time" TEXT,
    "duration_minutes" INTEGER,
    "notes" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "trips_user_id_idx" ON "trips"("user_id");

-- CreateIndex
CREATE INDEX "trips_destination_id_idx" ON "trips"("destination_id");

-- CreateIndex
CREATE INDEX "trips_start_date_end_date_idx" ON "trips"("start_date", "end_date");

-- CreateIndex
CREATE INDEX "itinerary_days_trip_id_idx" ON "itinerary_days"("trip_id");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_days_trip_id_day_number_key" ON "itinerary_days"("trip_id", "day_number");

-- CreateIndex
CREATE UNIQUE INDEX "itinerary_days_trip_id_date_key" ON "itinerary_days"("trip_id", "date");

-- CreateIndex
CREATE INDEX "activities_itinerary_day_id_idx" ON "activities"("itinerary_day_id");

-- CreateIndex
CREATE INDEX "activities_itinerary_day_id_sort_order_idx" ON "activities"("itinerary_day_id", "sort_order");

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_destination_id_fkey" FOREIGN KEY ("destination_id") REFERENCES "destinations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_trip_id_fkey" FOREIGN KEY ("trip_id") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_itinerary_day_id_fkey" FOREIGN KEY ("itinerary_day_id") REFERENCES "itinerary_days"("id") ON DELETE CASCADE ON UPDATE CASCADE;
