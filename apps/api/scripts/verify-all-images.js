const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const https = require('https');

function checkHttp(url) {
  return new Promise((resolve) => {
    https.get(url, (res) => {
      resolve({ url, status: res.statusCode, ok: res.statusCode === 200 });
    }).on('error', (err) => {
      resolve({ url, error: err.message, ok: false });
    });
  });
}

async function verify() {
  console.log('=== VERIFYING DESTINATION PHOTOGRAPHY & ASSET MAPPINGS ===\n');

  const dests = await prisma.destination.findMany({
    orderBy: { name: 'asc' },
  });

  const allUrls = new Set();
  const duplicateCrossDestination = [];
  const urlOwners = {};

  for (const d of dests) {
    const urls = [d.coverImage, ...(d.galleryImages || [])];
    for (const u of urls) {
      allUrls.add(u);
      if (!urlOwners[u]) {
        urlOwners[u] = [];
      }
      urlOwners[u].push(`${d.name} (${d.city}, ${d.country})`);
    }
  }

  for (const [url, owners] of Object.entries(urlOwners)) {
    const uniqueDestNames = Array.from(new Set(owners));
    if (uniqueDestNames.length > 1) {
      duplicateCrossDestination.push({ url, uniqueDestNames });
    }
  }

  console.log(`Total Destinations: ${dests.length}`);
  console.log(`Total Unique Photo URLs: ${allUrls.size}`);
  console.log(`Cross-Destination Duplicate Images: ${duplicateCrossDestination.length}`);

  if (duplicateCrossDestination.length > 0) {
    console.error('ERROR: Found cross-destination duplicate images!');
    for (const dup of duplicateCrossDestination) {
      console.error(`- ${dup.url} shared by: ${dup.uniqueDestNames.join(' AND ')}`);
    }
    process.exit(1);
  }

  console.log('\n--- VERIFYING LIVE HTTP STATUS FOR ALL ASSETS ---');
  const urlList = Array.from(allUrls);
  const results = await Promise.all(urlList.map(checkHttp));

  let failed = 0;
  for (const r of results) {
    if (!r.ok) {
      console.error(`FAILED [${r.status || r.error}]: ${r.url}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\nERROR: ${failed} image URLs failed to load!`);
    process.exit(1);
  }

  console.log(`All ${urlList.length} image URLs successfully verified (HTTP 200 OK)!`);

  // Verify trips
  const trips = await prisma.trip.findMany({ include: { destination: true } });
  console.log(`\n--- VERIFYING TRIPS ---`);
  for (const t of trips) {
    console.log(`Trip: "${t.title}"`);
    console.log(`  Destination: ${t.destination?.name} (${t.destination?.city}, ${t.destination?.country})`);
    console.log(`  Cover: ${t.coverImage}`);
    if (t.destination && t.coverImage !== t.destination.coverImage) {
      console.warn(`  Warning: trip coverImage differs from destination coverImage`);
    }
  }

  console.log('\nVerification completed successfully with ZERO errors.');
}

verify()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
