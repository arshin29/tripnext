const fs = require('fs');
const path = require('path');

const seedContent = fs.readFileSync(path.join(__dirname, '../prisma/seed.ts'), 'utf8');

// Extract all destination blocks
const destRegex = /{\s*name:\s*'([^']+)',\s*slug:\s*'([^']+)',\s*city:\s*'([^']+)',\s*country:\s*'([^']+)'[\s\S]*?coverImage:\s*'([^']+)',\s*galleryImages:\s*\[([\s\S]*?)\],[\s\S]*?}/g;

let match;
const destinations = [];
while ((match = destRegex.exec(seedContent)) !== null) {
  const [_, name, slug, city, country, coverImage, galleryStr] = match;
  const gallery = galleryStr
    .split(',')
    .map(s => s.trim().replace(/^'|'$/g, ''))
    .filter(Boolean);
  destinations.push({ name, slug, city, country, coverImage, gallery });
}

console.log(`Found ${destinations.length} destinations:`);
const imageUsage = {};

for (const d of destinations) {
  console.log(`\n[${d.slug}] ${d.name} (${d.city}, ${d.country})`);
  console.log(`  Cover: ${d.coverImage}`);
  console.log(`  Gallery: ${d.gallery.join(', ')}`);

  const allImgs = [d.coverImage, ...d.gallery];
  for (const img of allImgs) {
    const idMatch = img.match(/photo-[0-9a-f-]+/);
    const id = idMatch ? idMatch[0] : img;
    imageUsage[id] = imageUsage[id] || [];
    imageUsage[id].push(`${d.slug} (${d.city})`);
  }
}

console.log('\n--- MULTIPLY-USED IMAGES ---');
for (const [id, usedBy] of Object.entries(imageUsage)) {
  if (usedBy.length > 1) {
    console.log(`Image ${id} used by ${usedBy.length} times:`);
    console.log(`  -> ${usedBy.join('; ')}`);
  }
}
