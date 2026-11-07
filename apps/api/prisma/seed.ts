import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface SeedDestination {
  name: string;
  slug: string;
  city: string;
  country: string;
  shortDescription: string;
  detailedDescription: string;
  category: string;
  coverImage: string;
  galleryImages: string[];
  attractions: string[];
  bestTimeToVisit: string;
  approximateDuration: string;
  isFeatured: boolean;
  latitude: number;
  longitude: number;
}

const DESTINATIONS: SeedDestination[] = [
  {
    name: 'Kyoto Sanctuaries & Zen Gardens',
    slug: 'kyoto-japan',
    city: 'Kyoto',
    country: 'Japan',
    shortDescription:
      'Ancient wooden temples, tranquil moss rock gardens, and lantern-lit tea houses.',
    detailedDescription:
      'Kyoto served as Japan’s imperial capital for over a thousand years. Today, it stands as the cultural soul of the nation, boasting over two thousand temples and shrines. Stroll beneath the vermilion torii gates of Fushimi Inari, wander through the soaring bamboo groves of Arashiyama, and experience a traditional matcha ceremony in the historic Gion district.',
    category: 'Cultural',
    coverImage:
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Fushimi Inari Shrine',
      'Kinkaku-ji (Golden Pavilion)',
      'Arashiyama Bamboo Grove',
      'Gion Geisha District',
      'Kiyomizu-dera Temple',
    ],
    bestTimeToVisit: 'March to May & October to November',
    approximateDuration: '5-7 Days',
    isFeatured: true,
    latitude: 35.0116,
    longitude: 135.7681,
  },
  {
    name: 'Tokyo Metropolis & Modernist Alleys',
    slug: 'tokyo-japan',
    city: 'Tokyo',
    country: 'Japan',
    shortDescription:
      'Futuristic architecture, culinary innovation, and hidden yokocho bars.',
    detailedDescription:
      'Tokyo is a dynamic juxtaposition of hyper-modern skyline towers and quiet residential shrines. Explore the buzzing scramble of Shibuya, dine on pristine sushi at the Toyosu wholesale market, discover avant-garde digital art installations, and unwind in the tranquil gardens of the Meiji Jingu shrine.',
    category: 'City Break',
    coverImage:
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1536098561742-ca998e48cbcc?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Shibuya Crossing',
      'Senso-ji Temple',
      'Meiji Jingu Shrine',
      'Akihabara Tech District',
      'Shinjuku Gyoen National Garden',
    ],
    bestTimeToVisit: 'September to November & March to May',
    approximateDuration: '5-8 Days',
    isFeatured: true,
    latitude: 35.6762,
    longitude: 139.6503,
  },
  {
    name: 'Bali Coastal Havens & Surf Retreats',
    slug: 'bali-indonesia',
    city: 'Canggu & Uluwatu',
    country: 'Indonesia',
    shortDescription:
      'Cliffside beach clubs, world-class point breaks, and dramatic Indian Ocean sunsets.',
    detailedDescription:
      'Bali’s southern peninsula and coastal villages offer an idyllic coastal lifestyle. Experience the legendary surf breaks of Uluwatu, watch the fiery Kecak dance on sheer limestone cliffs at twilight, and relax at boutique beachfront cafes in Seminyak and Canggu.',
    category: 'Coastal',
    coverImage:
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1518548419970-58e3b4079ab2?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Uluwatu Temple',
      'Padang Padang Beach',
      'Tanah Lot Sea Temple',
      'Nusa Dua Coastline',
      'Seminyak Beachfront',
    ],
    bestTimeToVisit: 'April to October',
    approximateDuration: '7-10 Days',
    isFeatured: true,
    latitude: -8.8149,
    longitude: 115.0884,
  },
  {
    name: 'Ubud Emerald Terraces & Forest Lodges',
    slug: 'ubud-indonesia',
    city: 'Ubud',
    country: 'Indonesia',
    shortDescription:
      'Lush jungle valleys, terraced rice paddies, and holistic Ayurvedic wellness.',
    detailedDescription:
      'Ubud is the spiritual and cultural heart of Bali, cradled by emerald ravines and meandering rivers. Walk through the scenic Tegallalang rice terraces, discover traditional stone carving workshops in artisan hamlets, and rejuvenate at holistic yoga and wellness retreats set deep within the jungle canopy.',
    category: 'Nature',
    coverImage:
      'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1555400038-63f5ba517a47?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Tegallalang Rice Terraces',
      'Sacred Monkey Forest Sanctuary',
      'Campuhan Ridge Walk',
      'Tirta Empul Holy Water Temple',
      'Goa Gajah (Elephant Cave)',
    ],
    bestTimeToVisit: 'May to September',
    approximateDuration: '4-6 Days',
    isFeatured: false,
    latitude: -8.5069,
    longitude: 115.2625,
  },
  {
    name: 'Bangkok Royal Palaces & River Canals',
    slug: 'bangkok-thailand',
    city: 'Bangkok',
    country: 'Thailand',
    shortDescription:
      'Gilded Buddhist chedis, floating market barges, and world-renowned street fare.',
    detailedDescription:
      'Bangkok dazzles the senses with an exhilarating mix of ornate historic temples, lively river life along the Chao Phraya, and sophisticated modern rooftop lounges. Marvel at the glistening Grand Palace, take a longtail boat through historic Thonburi canals, and explore night food markets brimming with authentic Thai flavours.',
    category: 'Cultural',
    coverImage:
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1563492065599-3520f775eeed?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'The Grand Palace',
      'Wat Arun (Temple of Dawn)',
      'Wat Pho (Reclining Buddha)',
      'Chatuchak Weekend Market',
      'Chao Phraya River Cruise',
    ],
    bestTimeToVisit: 'November to February',
    approximateDuration: '4-5 Days',
    isFeatured: false,
    latitude: 13.7563,
    longitude: 100.5018,
  },
  {
    name: 'Phuket Turquoise Bays & Limestone Lagoons',
    slug: 'phuket-thailand',
    city: 'Phuket',
    country: 'Thailand',
    shortDescription:
      'Powder-white beaches, Andaman sea cliffs, and Sino-Portuguese heritage.',
    detailedDescription:
      'Thailand’s largest island is celebrated for its turquoise coves, dramatic offshore karst formations, and warm hospitality. Charter a private catamaran to the hidden lagoons of Phang Nga Bay, snorkel over vibrant coral gardens off the Phi Phi Islands, and stroll past colourful colonial shophouses in Old Phuket Town.',
    category: 'Coastal',
    coverImage:
      'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1528181304800-259b08848526?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Phang Nga Bay',
      'Old Phuket Town',
      'Kata Noi Beach',
      'Big Buddha Viewpoint',
      'Promthep Cape Sunset',
    ],
    bestTimeToVisit: 'December to March',
    approximateDuration: '5-7 Days',
    isFeatured: false,
    latitude: 7.8804,
    longitude: 98.3923,
  },
  {
    name: 'Singapore Garden City & Futuristic Domes',
    slug: 'singapore',
    city: 'Singapore',
    country: 'Singapore',
    shortDescription:
      'Botanical supertrees, Michelin culinary hawkers, and cutting-edge urban design.',
    detailedDescription:
      'Singapore seamlessly blends futuristic sustainable architecture with lush tropical greenery. Walk beneath the colossal vertical gardens of Gardens by the Bay, savour renowned chicken rice in bustling hawker centres, and explore heritage neighbourhoods such as Katong, Chinatown, and Kampong Glam.',
    category: 'City Break',
    coverImage:
      'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1565967511849-76a60a516170?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Gardens by the Bay',
      'Marina Bay Sands Skypark',
      'Singapore Botanic Gardens',
      'Chinatown Heritage Centre',
      'Jewel Changi Rain Vortex',
    ],
    bestTimeToVisit: 'February to April & July to September',
    approximateDuration: '3-5 Days',
    isFeatured: false,
    latitude: 1.3521,
    longitude: 103.8198,
  },
  {
    name: 'Seoul Royal Dynasties & Design Pavilions',
    slug: 'seoul-south-korea',
    city: 'Seoul',
    country: 'South Korea',
    shortDescription:
      'Ancient Joseon palaces, neon nightlife, and trendsetting design districts.',
    detailedDescription:
      'Seoul captivates with centuries of royal history existing harmoniously alongside cutting-edge technology and global fashion trends. Witness the changing of the royal guard at Gyeongbokgung Palace, meander through traditional hanok village courtyards in Bukchon, and feast on savoury Korean barbecue in vibrant Hongdae.',
    category: 'City Break',
    coverImage:
      'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1517154421773-0529f29ea451?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Gyeongbokgung Palace',
      'Bukchon Hanok Village',
      'N Seoul Tower & Namsan Park',
      'Dongdaemun Design Plaza',
      'Insadong Art Street',
    ],
    bestTimeToVisit: 'September to November & April to June',
    approximateDuration: '4-6 Days',
    isFeatured: false,
    latitude: 37.5665,
    longitude: 126.978,
  },
  {
    name: 'Paris Haussmann Boulevards & Beaux-Arts',
    slug: 'paris-france',
    city: 'Paris',
    country: 'France',
    shortDescription:
      'Iconic limestone architecture, riverside bouquinistes, and masterwork art museums.',
    detailedDescription:
      'The City of Light remains the benchmark of romantic European elegance and cultural refinement. Stroll along the Seine at golden hour, admire masterpieces inside the Musée d’Orsay and the Louvre, relax at sidewalk bistros in Saint-Germain-des-Prés, and ascend Montmartre for sweeping rooftop views.',
    category: 'Cultural',
    coverImage:
      'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1511739001486-6bfe10ce785f?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1549144511-f099e773c147?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Eiffel Tower & Champ de Mars',
      'Louvre Museum',
      'Musée d’Orsay',
      'Sainte-Chapelle',
      'Montmartre & Sacré-Cœur',
    ],
    bestTimeToVisit: 'April to June & September to October',
    approximateDuration: '5-7 Days',
    isFeatured: true,
    latitude: 48.8566,
    longitude: 2.3522,
  },
  {
    name: 'Amalfi Coast Terraces & Tyrrhenian Seas',
    slug: 'amalfi-coast-italy',
    city: 'Positano & Ravello',
    country: 'Italy',
    shortDescription:
      'Pastel villas perched above azure waters, fragrant lemon groves, and scenic coastal sails.',
    detailedDescription:
      'Italy’s most celebrated coastal stretch is a UNESCO World Heritage marvel of vertical pastel villages and cliffside lemon orchards. Cruise the shoreline on a classic wooden gozzo boat, walk through the high cloisters and infinity terraces of Ravello, and dine on freshly caught seafood in picturesque Positano.',
    category: 'Coastal',
    coverImage:
      'https://images.unsplash.com/photo-1499678329028-101435549a4e?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1499678329028-101435549a4e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1516483638261-f4dbaf036963?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Positano Marina & Cliffside',
      'Villa Cimbrone Gardens (Ravello)',
      'Path of the Gods (Sentiero degli Dei)',
      'Amalfi Duomo',
      'Capri Day Sail',
    ],
    bestTimeToVisit: 'May to June & September to October',
    approximateDuration: '5-7 Days',
    isFeatured: true,
    latitude: 40.6333,
    longitude: 14.6029,
  },
  {
    name: 'Rome Ancient Ruins & Baroque Piazzas',
    slug: 'rome-italy',
    city: 'Rome',
    country: 'Italy',
    shortDescription:
      'The Colosseum, Renaissance fountains, and timeless cobblestone trattorias.',
    detailedDescription:
      'The Eternal City unfolds as an open-air museum where antiquity and vibrant modern life converge. Step into the monumental Colosseum and Roman Forum, marvel at the unreinforced concrete dome of the Pantheon, toss a coin into the Trevi Fountain, and unwind over authentic cacio e pepe in Trastevere.',
    category: 'Cultural',
    coverImage:
      'https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1529260830199-42c24126f198?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1515542622106-78bda8ba0e5b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1531572753322-ad063cecc140?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'The Colosseum',
      'The Roman Forum',
      'The Pantheon',
      'Vatican City & St. Peter’s Basilica',
      'Trevi Fountain',
    ],
    bestTimeToVisit: 'October to April',
    approximateDuration: '4-6 Days',
    isFeatured: false,
    latitude: 41.9028,
    longitude: 12.4964,
  },
  {
    name: 'Barcelona Catalan Modernisme & Seafronts',
    slug: 'barcelona-spain',
    city: 'Barcelona',
    country: 'Spain',
    shortDescription:
      'Gaudí’s architectural wonders, vibrant Gothic alleys, and Mediterranean dining.',
    detailedDescription:
      'Barcelona pulses with an infectious Mediterranean energy driven by groundbreaking architecture, world-class gastronomy, and golden city beaches. Tour Antoni Gaudí’s awe-inspiring Basílica de la Sagrada Família, wander through the shaded alleys of the Gothic Quarter, and sample tapas in El Born.',
    category: 'Coastal',
    coverImage:
      'https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1511527661048-7fe73d85e9a4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1539037116277-4db20889f2d4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1564221710304-0b37c8b9d729?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Basílica de la Sagrada Família',
      'Park Güell',
      'Gothic Quarter (Barri Gòtic)',
      'Casa Batlló',
      'Barceloneta Promenade',
    ],
    bestTimeToVisit: 'May to June & September to October',
    approximateDuration: '4-6 Days',
    isFeatured: false,
    latitude: 41.3879,
    longitude: 2.1699,
  },
  {
    name: 'Swiss Alps Glaciers & Matterhorn Peaks',
    slug: 'swiss-alps-switzerland',
    city: 'Zermatt',
    country: 'Switzerland',
    shortDescription:
      'Alpine rack railways, glacial valleys, and the majestic silhouette of the Matterhorn.',
    detailedDescription:
      'The Swiss Alps provide a tranquil alpine paradise where pristine mountain air meets timeless craftsmanship. Board the Gornergrat cogwheel train for sweeping vistas of twenty-nine 4,000-metre peaks, hike through wildflower-strewn valleys, and savour rich cheese fondue beside crackling fires in car-free Zermatt.',
    category: 'Alpine',
    coverImage:
      'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1527668752968-14dc70a27c95?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'The Matterhorn',
      'Gornergrat Railway',
      'Matterhorn Glacier Paradise',
      'Five Lakes Trail',
      'Zermatt Alpine Village',
    ],
    bestTimeToVisit: 'December to April (Skiing) & July to September (Hiking)',
    approximateDuration: '5-7 Days',
    isFeatured: true,
    latitude: 45.9765,
    longitude: 7.7491,
  },
  {
    name: 'Interlaken Lakes & High Jungfrau Adventure',
    slug: 'interlaken-switzerland',
    city: 'Interlaken & Lauterbrunnen',
    country: 'Switzerland',
    shortDescription:
      'Glacial lakes, cascading valley waterfalls, and thrilling alpine pursuits.',
    detailedDescription:
      'Positioned between Lake Thun and Lake Brienz, Interlaken is the premier adventure hub of Switzerland. Travel into the Lauterbrunnen valley to witness seventy-two waterfalls plunging from sheer granite cliffs, ascend to the Jungfraujoch "Top of Europe," and experience world-renowned paragliding above alpine peaks.',
    category: 'Adventure',
    coverImage:
      'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1477346611705-65d1883cee1e?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Lauterbrunnen Valley',
      'Jungfraujoch - Top of Europe',
      'Harder Kulm Panoramic Deck',
      'Lake Brienz Steamboat Cruise',
      'Trümmelbach Falls',
    ],
    bestTimeToVisit: 'June to September',
    approximateDuration: '4-6 Days',
    isFeatured: false,
    latitude: 46.6863,
    longitude: 7.8632,
  },
  {
    name: 'Santorini Caldera Cliffs & Aegean Vistas',
    slug: 'santorini-greece',
    city: 'Oia & Fira',
    country: 'Greece',
    shortDescription:
      'Cobalt blue domes, whitewashed cliffside suites, and volcanic caldera sunsets.',
    detailedDescription:
      'Santorini is a Cycladic gem formed by a legendary volcanic eruption. Wander through the pedestrian marble paths of Oia, admire iconic blue-domed chapels against the deep Aegean Sea, sail around the volcanic hot springs, and taste crisp Assyrtiko white wines at cliffside vineyards.',
    category: 'Coastal',
    coverImage:
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Oia Sunset Viewpoint',
      'Fira to Oia Cliffside Hike',
      'Red Beach & Akrotiri Excavation',
      'Caldera Catamaran Cruise',
      'Venetsanos Winery',
    ],
    bestTimeToVisit: 'May to October',
    approximateDuration: '4-5 Days',
    isFeatured: true,
    latitude: 36.3932,
    longitude: 25.4615,
  },
  {
    name: 'Istanbul Crossroads of Continents',
    slug: 'istanbul-turkey',
    city: 'Istanbul',
    country: 'Turkey',
    shortDescription:
      'Byzantine domes, bustling spice bazaars, and Bosphorus strait ferries.',
    detailedDescription:
      'Straddling two continents, Istanbul is an extraordinary tapestry of Roman, Byzantine, and Ottoman history. Explore the breathtaking architecture of the Hagia Sophia and Blue Mosque, navigate the labyrinthine aisles of the Grand Bazaar, and take a sunset ferry between Europe and Asia across the Bosphorus.',
    category: 'Cultural',
    coverImage:
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Hagia Sophia Grand Mosque',
      'The Blue Mosque',
      'Topkapi Palace',
      'The Grand Bazaar & Spice Market',
      'Bosphorus Strait Ferry Tour',
    ],
    bestTimeToVisit: 'April to May & September to November',
    approximateDuration: '4-6 Days',
    isFeatured: false,
    latitude: 41.0082,
    longitude: 28.9784,
  },
  {
    name: 'Cappadocia Fairy Chimneys & Balloon Horizons',
    slug: 'cappadocia-turkey',
    city: 'Göreme',
    country: 'Turkey',
    shortDescription:
      'Surreal tuff stone valleys, ancient cave dwellings, and sunrise hot air ballooning.',
    detailedDescription:
      'Cappadocia features a moon-like volcanic landscape carved by millennia of wind and water. Float silently in a hot air balloon as dawn lights hundreds of fairy chimneys, sleep in centuries-old boutique cave suites, and descend into subterranean multi-level underground cities.',
    category: 'Adventure',
    coverImage:
      'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1570939274717-7eda259b50ed?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1509744645300-a2098b11871a?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1641128324972-af3212f0f6bd?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Göreme Open-Air Museum',
      'Sunrise Hot Air Balloon Flight',
      'Derinkuyu Underground City',
      'Love & Rose Valleys',
      'Uchisar Castle Rock',
    ],
    bestTimeToVisit: 'April to June & September to October',
    approximateDuration: '3-4 Days',
    isFeatured: true,
    latitude: 38.6431,
    longitude: 34.8289,
  },
  {
    name: 'Dubai Architectural Feats & Desert Dunes',
    slug: 'dubai-uae',
    city: 'Dubai',
    country: 'United Arab Emirates',
    shortDescription:
      'World-record skyscrapers, palm-shaped archipelagos, and luxury desert safaris.',
    detailedDescription:
      'Dubai has transformed into a hyper-modern global metropolis of striking ambition. Stand in awe atop the Burj Khalifa, cruise through the skyscraper canyons of Dubai Marina, browse the traditional textile and gold souks along the Creek, and venture into pristine red desert dunes on an evening safari.',
    category: 'City Break',
    coverImage:
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1518684079-3c830dcef090?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1580674684081-7617fbf3d745?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Burj Khalifa & Observation Deck',
      'The Dubai Fountain',
      'Museum of the Future',
      'Palm Jumeirah & The Pointe',
      'Dubai Creek & Al Fahidi Historic District',
    ],
    bestTimeToVisit: 'November to March',
    approximateDuration: '4-5 Days',
    isFeatured: false,
    latitude: 25.2048,
    longitude: 55.2708,
  },
  {
    name: 'Marrakech Medina Courtyards & Riads',
    slug: 'marrakech-morocco',
    city: 'Marrakech',
    country: 'Morocco',
    shortDescription:
      'Ochre ramparts, fragrant spice souks, and serene mosaic-tiled riads.',
    detailedDescription:
      'Known as the Red City, Marrakech enchants travellers with its sensory energy, intricate Moorish architecture, and storied trade history. Immerse yourself in the storytellers and street stalls of Jemaa el-Fnaa, discover cobalt-blue sanctuaries at Jardin Majorelle, and retreat to private courtyards featuring zellige tilework.',
    category: 'Cultural',
    coverImage:
      'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1548013146-72479768bada?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1597212618440-806262de4f6b?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1539020140153-e479b8c22e70?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Jardin Majorelle & Yves Saint Laurent Museum',
      'Jemaa el-Fnaa Square',
      'Bahia Palace',
      'Ben Youssef Madrasa',
      'The Old Medina Souks',
    ],
    bestTimeToVisit: 'March to May & September to November',
    approximateDuration: '4-5 Days',
    isFeatured: false,
    latitude: 31.6295,
    longitude: -7.9811,
  },
  {
    name: 'Cape Town Coastal Peaks & Winelands',
    slug: 'cape-town-south-africa',
    city: 'Cape Town',
    country: 'South Africa',
    shortDescription:
      'Iconic Table Mountain, ocean drives, and historic Cape Dutch vineyards.',
    detailedDescription:
      'Few cities in the world can match Cape Town’s spectacular natural setting between towering granite mountains and two oceans. Take the rotating cable car up Table Mountain, drive the breathtaking Chapman’s Peak roadway, visit the penguin colony at Boulders Beach, and taste vintage pinotage in Franschhoek and Stellenbosch.',
    category: 'Nature',
    coverImage:
      'https://images.unsplash.com/photo-1576485290814-1c72aa4bbb8e?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1496497243327-9dccd845c35f?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Table Mountain Aerial Cableway',
      'Cape Point & Cape of Good Hope',
      'Boulders Beach Penguin Colony',
      'Kirstenbosch National Botanical Garden',
      'Victoria & Alfred Waterfront',
    ],
    bestTimeToVisit: 'November to March',
    approximateDuration: '6-8 Days',
    isFeatured: true,
    latitude: -33.9249,
    longitude: 18.4241,
  },
  {
    name: 'New York Skyline & Central Park Avenues',
    slug: 'new-york-usa',
    city: 'New York City',
    country: 'United States',
    shortDescription:
      'Broadway theatres, world-class art institutions, and storied brownstone streets.',
    detailedDescription:
      'New York City radiates an unmatched urban vitality across its diverse boroughs. Walk across the Brooklyn Bridge at dawn, picnic beside Bethesda Terrace in Central Park, explore modern masterpieces at MoMA and The Met, and enjoy intimate jazz performances in the West Village.',
    category: 'City Break',
    coverImage:
      'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1534430480872-3498386e7856?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1538688525198-9b88f6f53126?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Central Park',
      'The Metropolitan Museum of Art (The Met)',
      'Empire State Building / Top of the Rock',
      'High Line & Hudson Yards',
      'Brooklyn Bridge & DUMBO',
    ],
    bestTimeToVisit: 'April to June & September to November',
    approximateDuration: '4-7 Days',
    isFeatured: false,
    latitude: 40.7128,
    longitude: -74.006,
  },
  {
    name: 'Banff Glacial Lakes & Canadian Rockies',
    slug: 'banff-canada',
    city: 'Banff & Lake Louise',
    country: 'Canada',
    shortDescription:
      'Vivid turquoise waters, soaring Rocky Mountain peaks, and alpine wilderness.',
    detailedDescription:
      'Canada’s oldest national park is celebrated for its dazzling turquoise glacier-fed lakes, dense evergreen forests, and abundant wildlife. Canoe across the still waters of Lake Louise and Moraine Lake, drive the legendary Icefields Parkway, and unwind in natural mineral hot springs surrounded by snow-capped summits.',
    category: 'Alpine',
    coverImage:
      'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Lake Louise & Lake Agnes Teahouse',
      'Moraine Lake & Valley of the Ten Peaks',
      'Icefields Parkway Scenic Drive',
      'Banff Gondola & Sulphur Mountain',
      'Johnston Canyon Waterfalls',
    ],
    bestTimeToVisit: 'June to August (Lakes) & December to March (Skiing)',
    approximateDuration: '5-7 Days',
    isFeatured: true,
    latitude: 51.1784,
    longitude: -115.5708,
  },
  {
    name: 'Queenstown Fjordlands & Alpine Thrills',
    slug: 'queenstown-new-zealand',
    city: 'Queenstown',
    country: 'New Zealand',
    shortDescription:
      'Glacial Lake Wakatipu, Remarkables mountain range, and world-capital adventures.',
    detailedDescription:
      'Set against the drama of the Southern Alps and the crystal waters of Lake Wakatipu, Queenstown is the adventure capital of the Southern Hemisphere. Cruise through majestic Milford Sound, jet-boat through deep river canyons, hike alpine ridgelines, and taste Central Otago Pinot Noir at local family estates.',
    category: 'Adventure',
    coverImage:
      'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1507699622108-4be3abd695ad?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Milford Sound Fjord Cruise',
      'Lake Wakatipu TSS Earnslaw Sail',
      'Skyline Gondola & Luge',
      'Shotover River Canyon Jet Boat',
      'Gibbston Valley Wine Trail',
    ],
    bestTimeToVisit: 'December to February (Summer) & June to August (Snow)',
    approximateDuration: '5-8 Days',
    isFeatured: false,
    latitude: -45.0312,
    longitude: 168.6626,
  },
  {
    name: 'Lofoten Arctic Fjords & Northern Lights',
    slug: 'lofoten-islands-norway',
    city: 'Reine & Svolvær',
    country: 'Norway',
    shortDescription:
      'Granite peaks rising from arctic seas, historic red rorbuer, and auroras.',
    detailedDescription:
      'The Lofoten archipelago in northern Norway is an untamed sanctuary of razor-sharp granite mountains, sheltered fjords, and historic red cod fishermen’s cabins. Kayak between remote arctic islands, climb the Reinebringen stairway for iconic panoramas, and witness the surreal midnight sun or dancing winter aurora borealis.',
    category: 'Nature',
    coverImage:
      'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=1200&q=80',
    galleryImages: [
      'https://images.unsplash.com/photo-1531366936337-7c912a4589a7?auto=format&fit=crop&w=800&q=80',
      'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?auto=format&fit=crop&w=800&q=80',
    ],
    attractions: [
      'Reinebringen Peak Hike',
      'Reine & Hamnøy Historic Rorbuer Cabins',
      'Henningsvær Fishing Village & Art Scene',
      'Haukland & Uttakleiv Arctic Beaches',
      'Fjord Kayaking & Aurora Safaris',
    ],
    bestTimeToVisit: 'June to August (Midnight Sun) & September to March (Auroras)',
    approximateDuration: '5-7 Days',
    isFeatured: true,
    latitude: 68.2333,
    longitude: 14.5667,
  },
];

export async function main() {
  console.log(`Starting idempotent seed for ${DESTINATIONS.length} destinations...`);

  for (const dest of DESTINATIONS) {
    await prisma.destination.upsert({
      where: { slug: dest.slug },
      update: {
        name: dest.name,
        city: dest.city,
        country: dest.country,
        shortDescription: dest.shortDescription,
        detailedDescription: dest.detailedDescription,
        category: dest.category,
        coverImage: dest.coverImage,
        galleryImages: dest.galleryImages,
        attractions: dest.attractions,
        bestTimeToVisit: dest.bestTimeToVisit,
        approximateDuration: dest.approximateDuration,
        isFeatured: dest.isFeatured,
        latitude: dest.latitude,
        longitude: dest.longitude,
      },
      create: {
        name: dest.name,
        slug: dest.slug,
        city: dest.city,
        country: dest.country,
        shortDescription: dest.shortDescription,
        detailedDescription: dest.detailedDescription,
        category: dest.category,
        coverImage: dest.coverImage,
        galleryImages: dest.galleryImages,
        attractions: dest.attractions,
        bestTimeToVisit: dest.bestTimeToVisit,
        approximateDuration: dest.approximateDuration,
        isFeatured: dest.isFeatured,
        latitude: dest.latitude,
        longitude: dest.longitude,
      },
    });
  }

  const count = await prisma.destination.count();
  console.log(`Successfully seeded ${count} destinations in PostgreSQL database.`);
}

main()
  .catch((e) => {
    console.error('Seed execution failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
