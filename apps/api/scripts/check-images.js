const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const dests = await prisma.destination.findMany({
    select: { slug: true, name: true, city: true, country: true, coverImage: true, galleryImages: true },
  });
  console.log('DESTINATIONS COUNT:', dests.length);
  for (const d of dests) {
    console.log(`- [${d.slug}] ${d.city}, ${d.country}: ${d.coverImage}`);
    if (d.galleryImages && d.galleryImages.length > 0) {
      console.log(`    Gallery: ${d.galleryImages.join(', ')}`);
    }
  }

  const trips = await prisma.trip.findMany({
    select: {
      id: true,
      title: true,
      status: true,
      startDate: true,
      endDate: true,
      coverImage: true,
      destination: { select: { name: true, slug: true, city: true, country: true, coverImage: true } },
    },
  });
  console.log('\nTRIPS COUNT:', trips.length);
  for (const t of trips) {
    console.log(`- Trip "${t.title}" (${t.status}):`);
    console.log(`    trip.coverImage: ${t.coverImage}`);
    console.log(`    destination: ${t.destination ? `${t.destination.name} (${t.destination.city}, ${t.destination.country})` : 'NONE'}`);
    console.log(`    destination.coverImage: ${t.destination?.coverImage}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
