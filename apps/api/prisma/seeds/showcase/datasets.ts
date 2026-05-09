import {
  MessageCounterpartyRole,
  MessageTopic,
  PropertyMediaCategory,
  PropertyType,
} from '@prisma/client';

const unsplash = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1800&h=1200&q=86&fm=jpg`;

export type PersonSeed = {
  fullName: string;
  nationality: string;
  phone: string;
  bio: string;
};

export type AreaSeed = {
  city: string;
  area: string;
  lat: number;
  lng: number;
  attractions: string[];
  addressHints: string[];
  priceBand: 'budget' | 'mid' | 'luxury' | 'ultra';
};

export type PropertyArchetype = {
  label: string;
  propertyType: PropertyType;
  minBedrooms: number;
  maxBedrooms: number;
  minBathrooms: number;
  maxBathrooms: number;
  minGuests: number;
  maxGuests: number;
  basePrice: [number, number];
  cleaningFee: [number, number];
  titleNouns: string[];
  descriptors: string[];
};

export const ADMIN_PEOPLE: PersonSeed[] = [
  {
    fullName: 'Noura Al Hashimi',
    nationality: 'Emirati',
    phone: '+971 50 700 1001',
    bio: 'Operations lead focused on guest standards, property moderation, and Dubai short-stay compliance.',
  },
  {
    fullName: 'Daniel Foster',
    nationality: 'British',
    phone: '+971 50 700 1002',
    bio: 'Marketplace administrator managing payout review, host onboarding, and service quality checks.',
  },
];

export const VENDOR_PEOPLE: PersonSeed[] = [
  {
    fullName: 'Omar Al Mansoori',
    nationality: 'Emirati',
    phone: '+971 50 211 1401',
    bio: 'Dubai-based holiday home operator with a portfolio of premium waterfront apartments and villas.',
  },
  {
    fullName: 'Sarah Khan',
    nationality: 'Pakistani',
    phone: '+971 55 311 1402',
    bio: 'Licensed short-stay host managing serviced residences across Marina, JBR, and Business Bay.',
  },
  {
    fullName: 'Priya Mehta',
    nationality: 'Indian',
    phone: '+971 52 411 1403',
    bio: 'Hospitality founder focused on family-ready apartments with strong cleaning and turnover standards.',
  },
  {
    fullName: 'Layla Haddad',
    nationality: 'Lebanese',
    phone: '+971 56 511 1404',
    bio: 'Boutique host specializing in Downtown Dubai and DIFC business-travel inventory.',
  },
  {
    fullName: 'James Walker',
    nationality: 'British',
    phone: '+971 58 611 1405',
    bio: 'Luxury rental manager with a background in serviced apartments and corporate relocation stays.',
  },
  {
    fullName: 'Aisha Al Nuaimi',
    nationality: 'Emirati',
    phone: '+971 50 711 1406',
    bio: 'Owner representative for premium Palm Jumeirah and Dubai Hills family homes.',
  },
  {
    fullName: 'Ravi Menon',
    nationality: 'Indian',
    phone: '+971 54 811 1407',
    bio: 'Full-service host managing guest access, linen programs, and preventive maintenance.',
  },
  {
    fullName: 'Maya Petrova',
    nationality: 'European expat',
    phone: '+971 55 911 1408',
    bio: 'Design-led host curating stylish apartments for couples, executives, and longer UAE visits.',
  },
  {
    fullName: 'Ahmed Siddiqui',
    nationality: 'Pakistani',
    phone: '+971 52 222 1409',
    bio: 'Holiday homes operator focused on value-led studios and mid-range apartments in central Dubai.',
  },
  {
    fullName: 'Celine Moreau',
    nationality: 'European expat',
    phone: '+971 56 333 1410',
    bio: 'Boutique property manager with a portfolio of high-floor skyline apartments and penthouses.',
  },
  {
    fullName: 'Maria Santos',
    nationality: 'Filipino',
    phone: '+971 58 444 1411',
    bio: 'Guest-experience specialist managing serviced homes with reliable check-in support.',
  },
  {
    fullName: 'Khaled Barakat',
    nationality: 'Lebanese',
    phone: '+971 50 555 1412',
    bio: 'UAE host focused on waterfront residences, verified operations, and responsive guest messaging.',
  },
];

export const CUSTOMER_PEOPLE: PersonSeed[] = [
  {
    fullName: 'Ayaan Khan',
    nationality: 'Pakistani',
    phone: '+971 54 200 3001',
    bio: 'Dubai resident who books weekend stays for visiting family.',
  },
  {
    fullName: 'Sara Malik',
    nationality: 'Pakistani',
    phone: '+971 54 200 3002',
    bio: 'Frequent UAE traveller looking for clean apartments near beaches and malls.',
  },
  {
    fullName: 'Huda Al Nuaimi',
    nationality: 'Emirati',
    phone: '+971 54 200 3003',
    bio: 'Books family-friendly holiday homes for staycations and celebrations.',
  },
  {
    fullName: 'Arjun Rao',
    nationality: 'Indian',
    phone: '+971 54 200 3004',
    bio: 'Business traveller who prefers serviced apartments over hotels.',
  },
  {
    fullName: 'Meera Iyer',
    nationality: 'Indian',
    phone: '+971 54 200 3005',
    bio: 'Enjoys walkable Dubai neighbourhoods, strong Wi-Fi, and quiet bedrooms.',
  },
  {
    fullName: 'Thomas Reed',
    nationality: 'British',
    phone: '+971 54 200 3006',
    bio: 'Remote worker booking longer stays around DIFC and Business Bay.',
  },
  {
    fullName: 'Emma Clarke',
    nationality: 'British',
    phone: '+971 54 200 3007',
    bio: 'Returns to Dubai often for beach breaks and shopping trips.',
  },
  {
    fullName: 'Rami Haddad',
    nationality: 'Lebanese',
    phone: '+971 54 200 3008',
    bio: 'Prefers premium apartments with easy parking and responsive hosts.',
  },
  {
    fullName: 'Nadine Karam',
    nationality: 'Lebanese',
    phone: '+971 54 200 3009',
    bio: 'Looks for design-led homes close to restaurants and nightlife.',
  },
  {
    fullName: 'Miguel Santos',
    nationality: 'Filipino',
    phone: '+971 54 200 3010',
    bio: 'Books practical apartments for family visits and short work trips.',
  },
  {
    fullName: 'Grace Dela Cruz',
    nationality: 'Filipino',
    phone: '+971 54 200 3011',
    bio: 'Values spotless cleaning, clear check-in details, and fair pricing.',
  },
  {
    fullName: 'Sophie Laurent',
    nationality: 'European expat',
    phone: '+971 54 200 3012',
    bio: 'Explores UAE neighbourhoods through short stays and weekend escapes.',
  },
  {
    fullName: 'Luca Bianchi',
    nationality: 'European expat',
    phone: '+971 54 200 3013',
    bio: 'Chooses skyline apartments with gyms and strong transport links.',
  },
  {
    fullName: 'Fatima Al Mazrouei',
    nationality: 'Emirati',
    phone: '+971 54 200 3014',
    bio: 'Books premium villas and spacious homes for family gatherings.',
  },
  {
    fullName: 'Bilal Sheikh',
    nationality: 'Pakistani',
    phone: '+971 54 200 3015',
    bio: 'Travels between Dubai, Abu Dhabi, and Sharjah for work.',
  },
  {
    fullName: 'Anika Sharma',
    nationality: 'Indian',
    phone: '+971 54 200 3016',
    bio: 'Often books apartments near malls and metro connections.',
  },
  {
    fullName: 'Oliver Bennett',
    nationality: 'British',
    phone: '+971 54 200 3017',
    bio: 'Likes high-floor apartments with balconies and professional service.',
  },
  {
    fullName: 'Yara Mansour',
    nationality: 'Lebanese',
    phone: '+971 54 200 3018',
    bio: 'Prefers central stays near cafes, galleries, and restaurants.',
  },
  {
    fullName: 'Hassan Al Ketbi',
    nationality: 'Emirati',
    phone: '+971 54 200 3019',
    bio: 'Books staycations in waterfront and resort-style homes.',
  },
  {
    fullName: 'Neha Kapoor',
    nationality: 'Indian',
    phone: '+971 54 200 3020',
    bio: 'Looks for family-ready apartments with laundry and parking.',
  },
  {
    fullName: 'George Wilson',
    nationality: 'British',
    phone: '+971 54 200 3021',
    bio: 'Corporate traveller who needs quiet spaces and fast internet.',
  },
  {
    fullName: 'Lea Schneider',
    nationality: 'European expat',
    phone: '+971 54 200 3022',
    bio: 'Enjoys modern interiors, balconies, and walkable communities.',
  },
  {
    fullName: 'Junaid Ahmed',
    nationality: 'Pakistani',
    phone: '+971 54 200 3023',
    bio: 'Books affordable Dubai apartments for visiting relatives.',
  },
  {
    fullName: 'Camille Dubois',
    nationality: 'European expat',
    phone: '+971 54 200 3024',
    bio: 'Chooses premium serviced stays for leisure trips around the UAE.',
  },
  {
    fullName: 'Ryan Garcia',
    nationality: 'Filipino',
    phone: '+971 54 200 3025',
    bio: 'Looks for good value, clean kitchens, and easy host communication.',
  },
  {
    fullName: 'Salma Al Farsi',
    nationality: 'Emirati',
    phone: '+971 54 200 3026',
    bio: 'Plans short luxury breaks around Palm Jumeirah and Downtown Dubai.',
  },
  {
    fullName: 'Ibrahim Noor',
    nationality: 'Pakistani',
    phone: '+971 54 200 3027',
    bio: 'Business guest who values flexible check-in and reliable parking.',
  },
  {
    fullName: 'Pooja Nair',
    nationality: 'Indian',
    phone: '+971 54 200 3028',
    bio: 'Books family holidays with good kitchens, pools, and safe buildings.',
  },
  {
    fullName: 'Charlotte Evans',
    nationality: 'British',
    phone: '+971 54 200 3029',
    bio: 'Enjoys beachfront apartments and easy access to restaurants.',
  },
  {
    fullName: 'Karim Saad',
    nationality: 'Lebanese',
    phone: '+971 54 200 3030',
    bio: 'Prefers premium locations with nightlife, dining, and skyline views.',
  },
  {
    fullName: 'Mariam Faisal',
    nationality: 'Emirati',
    phone: '+971 54 200 3031',
    bio: 'Books spacious homes for UAE family weekends.',
  },
  {
    fullName: 'Elena Rossi',
    nationality: 'European expat',
    phone: '+971 54 200 3032',
    bio: 'Repeat Dubai visitor who compares apartments by design and service.',
  },
  {
    fullName: 'Noel Reyes',
    nationality: 'Filipino',
    phone: '+971 54 200 3033',
    bio: 'Values straightforward check-in and clean, practical apartments.',
  },
  {
    fullName: 'Zain Ahmed',
    nationality: 'Pakistani',
    phone: '+971 54 200 3034',
    bio: 'Likes Marina and JBR homes close to restaurants and beach access.',
  },
  {
    fullName: 'Amit Verma',
    nationality: 'Indian',
    phone: '+971 54 200 3035',
    bio: 'Books mid-range serviced apartments for work and family travel.',
  },
  {
    fullName: 'Laura Mitchell',
    nationality: 'British',
    phone: '+971 54 200 3036',
    bio: 'Looks for reliable hosts, premium bedding, and smooth checkout.',
  },
];

export const UAE_AREAS: AreaSeed[] = [
  {
    city: 'Dubai',
    area: 'Dubai Marina',
    lat: 25.0804,
    lng: 55.1404,
    attractions: ['Marina Walk', 'JBR Beach', 'Dubai Harbour', 'Ain Dubai'],
    addressHints: [
      'Marina Gate',
      'Silverene Tower',
      'Princess Tower',
      'Vida Residences Marina',
    ],
    priceBand: 'luxury',
  },
  {
    city: 'Dubai',
    area: 'Downtown Dubai',
    lat: 25.1972,
    lng: 55.2744,
    attractions: [
      'Burj Khalifa',
      'Dubai Mall',
      'Dubai Fountain',
      'Dubai Opera',
    ],
    addressHints: [
      'Burj Vista',
      'The Address Boulevard',
      'Opera Grand',
      'Boulevard Heights',
    ],
    priceBand: 'ultra',
  },
  {
    city: 'Dubai',
    area: 'Palm Jumeirah',
    lat: 25.1124,
    lng: 55.139,
    attractions: [
      'Palm West Beach',
      'Atlantis The Royal',
      'Nakheel Mall',
      'The Pointe',
    ],
    addressHints: [
      'Shoreline Apartments',
      'Oceana Residences',
      'Serenia Residences',
      'Garden Homes Frond',
    ],
    priceBand: 'ultra',
  },
  {
    city: 'Dubai',
    area: 'Jumeirah Beach Residence (JBR)',
    lat: 25.0786,
    lng: 55.1342,
    attractions: ['JBR Beach', 'The Walk', 'Bluewaters Island', 'Ain Dubai'],
    addressHints: ['Bahar', 'Sadaf', 'Rimal', 'Murjan'],
    priceBand: 'luxury',
  },
  {
    city: 'Dubai',
    area: 'Business Bay',
    lat: 25.1867,
    lng: 55.2719,
    attractions: ['Dubai Canal', 'Bay Avenue', 'Downtown Dubai', 'Dubai Mall'],
    addressHints: [
      'DAMAC Maison',
      'Executive Towers',
      'Canal Heights',
      'Paramount Tower',
    ],
    priceBand: 'mid',
  },
  {
    city: 'Dubai',
    area: 'DIFC',
    lat: 25.2135,
    lng: 55.2797,
    attractions: [
      'Museum of the Future',
      'DIFC Gate Village',
      'Dubai Mall',
      'Burj Khalifa',
    ],
    addressHints: [
      'Index Tower',
      'Central Park Towers',
      'Sky Gardens',
      'Liberty House',
    ],
    priceBand: 'luxury',
  },
  {
    city: 'Dubai',
    area: 'Dubai Hills',
    lat: 25.0924,
    lng: 55.2376,
    attractions: [
      'Dubai Hills Mall',
      'Dubai Hills Park',
      'Golf Club',
      'Mall of the Emirates',
    ],
    addressHints: [
      'Park Heights',
      'Executive Residences',
      'Golf Suites',
      'Sidra Villas',
    ],
    priceBand: 'luxury',
  },
  {
    city: 'Dubai',
    area: 'Bluewaters Island',
    lat: 25.0808,
    lng: 55.122,
    attractions: [
      'Ain Dubai',
      'JBR Beach',
      'Bluewaters Wharf',
      'Caesars Palace Dubai',
    ],
    addressHints: [
      'Bluewaters Residences',
      'Building 4',
      'Building 8',
      'Island Residences',
    ],
    priceBand: 'ultra',
  },
  {
    city: 'Dubai',
    area: 'Jumeirah Village Circle (JVC)',
    lat: 25.0602,
    lng: 55.2089,
    attractions: [
      'Circle Mall',
      'Dubai Marina',
      'Dubai Hills Mall',
      'Mall of the Emirates',
    ],
    addressHints: [
      'Belgravia',
      'Bloom Towers',
      'Five JVC',
      'Binghatti Heights',
    ],
    priceBand: 'mid',
  },
  {
    city: 'Dubai',
    area: 'Al Barsha',
    lat: 25.112,
    lng: 55.203,
    attractions: [
      'Mall of the Emirates',
      'Ski Dubai',
      'Al Barsha Pond Park',
      'Dubai Hills Mall',
    ],
    addressHints: ['Al Murad Tower', 'API Trio', 'Barsha Heights', 'Mont Rose'],
    priceBand: 'budget',
  },
  {
    city: 'Dubai',
    area: 'Deira',
    lat: 25.2697,
    lng: 55.3095,
    attractions: ['Gold Souk', 'Dubai Creek', 'Al Seef', 'Dubai Frame'],
    addressHints: [
      'Al Muraqqabat',
      'Creek View Tower',
      'Rigga Road',
      'Baniyas Square',
    ],
    priceBand: 'budget',
  },
  {
    city: 'Abu Dhabi',
    area: 'Abu Dhabi',
    lat: 24.4539,
    lng: 54.3773,
    attractions: [
      'Corniche Beach',
      'Louvre Abu Dhabi',
      'Qasr Al Watan',
      'Yas Island',
    ],
    addressHints: [
      'Al Reem Island',
      'Corniche Road',
      'Saadiyat Island',
      'Yas Bay',
    ],
    priceBand: 'luxury',
  },
  {
    city: 'Sharjah',
    area: 'Sharjah',
    lat: 25.3463,
    lng: 55.4209,
    attractions: [
      'Al Majaz Waterfront',
      'Sharjah Aquarium',
      'Blue Souk',
      'Al Noor Island',
    ],
    addressHints: ['Al Majaz', 'Al Khan', 'Al Taawun', 'Maryam Island'],
    priceBand: 'mid',
  },
];

export const PROPERTY_ARCHETYPES: PropertyArchetype[] = [
  {
    label: 'Budget Studio',
    propertyType: PropertyType.STUDIO,
    minBedrooms: 0,
    maxBedrooms: 1,
    minBathrooms: 1,
    maxBathrooms: 1,
    minGuests: 2,
    maxGuests: 3,
    basePrice: [180, 350],
    cleaningFee: [90, 160],
    titleNouns: ['Smart Studio', 'Compact Suite', 'Urban Studio'],
    descriptors: ['efficient', 'bright', 'well-connected'],
  },
  {
    label: 'Serviced Apartment',
    propertyType: PropertyType.APARTMENT,
    minBedrooms: 1,
    maxBedrooms: 2,
    minBathrooms: 1,
    maxBathrooms: 2,
    minGuests: 2,
    maxGuests: 5,
    basePrice: [400, 900],
    cleaningFee: [150, 260],
    titleNouns: ['Serviced Apartment', 'Executive Suite', 'Modern Residence'],
    descriptors: ['serviced', 'polished', 'guest-ready'],
  },
  {
    label: 'Luxury Apartment',
    propertyType: PropertyType.APARTMENT,
    minBedrooms: 2,
    maxBedrooms: 3,
    minBathrooms: 2,
    maxBathrooms: 3,
    minGuests: 4,
    maxGuests: 7,
    basePrice: [1200, 2600],
    cleaningFee: [260, 480],
    titleNouns: ['Luxury Apartment', 'Skyline Residence', 'Waterfront Home'],
    descriptors: ['premium', 'view-led', 'high-floor'],
  },
  {
    label: 'Palm Villa',
    propertyType: PropertyType.VILLA,
    minBedrooms: 3,
    maxBedrooms: 5,
    minBathrooms: 3,
    maxBathrooms: 6,
    minGuests: 6,
    maxGuests: 10,
    basePrice: [2500, 5600],
    cleaningFee: [650, 1200],
    titleNouns: ['Palm Villa', 'Beach Villa', 'Family Villa'],
    descriptors: ['private', 'resort-style', 'spacious'],
  },
  {
    label: 'Downtown Penthouse',
    propertyType: PropertyType.PENTHOUSE,
    minBedrooms: 2,
    maxBedrooms: 4,
    minBathrooms: 3,
    maxBathrooms: 5,
    minGuests: 4,
    maxGuests: 8,
    basePrice: [1800, 5200],
    cleaningFee: [480, 950],
    titleNouns: ['Penthouse', 'Duplex Penthouse', 'Signature Residence'],
    descriptors: ['statement', 'panoramic', 'entertaining-ready'],
  },
  {
    label: 'Family Townhouse',
    propertyType: PropertyType.TOWNHOUSE,
    minBedrooms: 3,
    maxBedrooms: 4,
    minBathrooms: 3,
    maxBathrooms: 5,
    minGuests: 6,
    maxGuests: 9,
    basePrice: [900, 2200],
    cleaningFee: [380, 750],
    titleNouns: ['Family Townhouse', 'Garden Home', 'Community Villa'],
    descriptors: ['family-ready', 'quiet', 'spacious'],
  },
];

export const AMENITY_GROUPS = [
  { key: 'ESSENTIALS', name: 'Essentials', sortOrder: 10 },
  { key: 'KITCHEN', name: 'Kitchen', sortOrder: 20 },
  { key: 'COMFORT', name: 'Comfort', sortOrder: 30 },
  { key: 'BUILDING', name: 'Building', sortOrder: 40 },
  { key: 'OUTDOOR', name: 'Outdoor', sortOrder: 50 },
  { key: 'FAMILY', name: 'Family', sortOrder: 60 },
  { key: 'SAFETY', name: 'Safety', sortOrder: 70 },
];

export const AMENITIES = [
  {
    key: 'WIFI',
    name: 'High-speed Wi-Fi',
    groupKey: 'ESSENTIALS',
    sortOrder: 10,
  },
  {
    key: 'DEDICATED_WORKSPACE',
    name: 'Dedicated workspace',
    groupKey: 'ESSENTIALS',
    sortOrder: 20,
  },
  {
    key: 'TOWELS',
    name: 'Hotel-quality towels',
    groupKey: 'ESSENTIALS',
    sortOrder: 30,
  },
  {
    key: 'BED_LINENS',
    name: 'Premium bed linens',
    groupKey: 'ESSENTIALS',
    sortOrder: 40,
  },
  {
    key: 'KITCHEN',
    name: 'Fully equipped kitchen',
    groupKey: 'KITCHEN',
    sortOrder: 10,
  },
  {
    key: 'COFFEE_MAKER',
    name: 'Coffee maker',
    groupKey: 'KITCHEN',
    sortOrder: 20,
  },
  { key: 'DISHWASHER', name: 'Dishwasher', groupKey: 'KITCHEN', sortOrder: 30 },
  { key: 'OVEN', name: 'Oven', groupKey: 'KITCHEN', sortOrder: 40 },
  {
    key: 'AIR_CONDITIONING',
    name: 'Central air conditioning',
    groupKey: 'COMFORT',
    sortOrder: 10,
  },
  {
    key: 'BLACKOUT_CURTAINS',
    name: 'Blackout curtains',
    groupKey: 'COMFORT',
    sortOrder: 20,
  },
  {
    key: 'WASHING_MACHINE',
    name: 'Washing machine',
    groupKey: 'COMFORT',
    sortOrder: 30,
  },
  { key: 'SMART_TV', name: 'Smart TV', groupKey: 'COMFORT', sortOrder: 40 },
  { key: 'ELEVATOR', name: 'Elevator', groupKey: 'BUILDING', sortOrder: 10 },
  {
    key: 'PARKING',
    name: 'Private parking',
    groupKey: 'BUILDING',
    sortOrder: 20,
  },
  { key: 'GYM', name: 'Building gym', groupKey: 'BUILDING', sortOrder: 30 },
  {
    key: 'CONCIERGE',
    name: 'Concierge desk',
    groupKey: 'BUILDING',
    sortOrder: 40,
  },
  { key: 'POOL', name: 'Swimming pool', groupKey: 'OUTDOOR', sortOrder: 10 },
  {
    key: 'BALCONY',
    name: 'Private balcony',
    groupKey: 'OUTDOOR',
    sortOrder: 20,
  },
  {
    key: 'BEACH_ACCESS',
    name: 'Beach access',
    groupKey: 'OUTDOOR',
    sortOrder: 30,
  },
  { key: 'BBQ_AREA', name: 'BBQ area', groupKey: 'OUTDOOR', sortOrder: 40 },
  { key: 'BABY_COT', name: 'Baby cot', groupKey: 'FAMILY', sortOrder: 10 },
  { key: 'HIGH_CHAIR', name: 'High chair', groupKey: 'FAMILY', sortOrder: 20 },
  {
    key: 'SMOKE_ALARM',
    name: 'Smoke alarm',
    groupKey: 'SAFETY',
    sortOrder: 10,
  },
  {
    key: 'FIRST_AID_KIT',
    name: 'First aid kit',
    groupKey: 'SAFETY',
    sortOrder: 20,
  },
  {
    key: 'SECURITY_24_7',
    name: '24/7 building security',
    groupKey: 'SAFETY',
    sortOrder: 30,
  },
];

export const IMAGE_SOURCES: Record<PropertyMediaCategory, string[]> = {
  COVER: [
    unsplash('1600607687939-ce8a6c25118c'),
    unsplash('1600566753190-17f0baa2a6c3'),
    unsplash('1616486338812-3dadae4b4ace'),
    unsplash('1600585154340-be6161a56a0c'),
  ],
  LIVING_ROOM: [
    unsplash('1560448204-e02f11c3d0e2'),
    unsplash('1616486338812-3dadae4b4ace'),
    unsplash('1600607687920-4e2a09cf159d'),
    unsplash('1600566752355-35792bedcfea'),
  ],
  BEDROOM: [
    unsplash('1505693416388-ac5ce068fe85'),
    unsplash('1616593969747-4797dc75033e'),
    unsplash('1615874694520-474822394e73'),
    unsplash('1617104678098-de229db51175'),
  ],
  BATHROOM: [
    unsplash('1584622650111-993a426fbf0a'),
    unsplash('1507652313519-d4e9174996dd'),
    unsplash('1604014237800-1c9102c219da'),
    unsplash('1600566752355-35792bedcfea'),
  ],
  KITCHEN: [
    unsplash('1556911220-bff31c812dba'),
    unsplash('1600489000022-c2086d79f9d4'),
    unsplash('1600566753086-00f18fb6b3ea'),
    unsplash('1556909114-f6e7ad7d3136'),
  ],
  DINING: [
    unsplash('1615874959474-d609969a20ed'),
    unsplash('1616137466211-f939a420be84'),
    unsplash('1600585154526-990dced4db0d'),
  ],
  ENTRY: [
    unsplash('1618221195710-dd6b41faaea6'),
    unsplash('1616486029423-aaa4789e8c9a'),
    unsplash('1600607687920-4e2a09cf159d'),
  ],
  HALLWAY: [
    unsplash('1600607687920-4e2a09cf159d'),
    unsplash('1618221195710-dd6b41faaea6'),
  ],
  STUDY: [
    unsplash('1595526114035-0d45ed16cfbf'),
    unsplash('1593642532400-2682810df593'),
    unsplash('1600494603989-9650cf6ddd3d'),
  ],
  LAUNDRY: [
    unsplash('1600566752355-35792bedcfea'),
    unsplash('1584622650111-993a426fbf0a'),
  ],
  BALCONY: [
    unsplash('1512453979798-5ea266f8880c'),
    unsplash('1526495124232-a04e1849168c'),
    unsplash('1500530855697-b586d89ba3ee'),
  ],
  TERRACE: [
    unsplash('1500530855697-b586d89ba3ee'),
    unsplash('1512453979798-5ea266f8880c'),
    unsplash('1542314831-068cd1dbfeeb'),
  ],
  VIEW: [
    unsplash('1512453979798-5ea266f8880c'),
    unsplash('1496412705862-e0088f16f791'),
    unsplash('1518684079-3c830dcef090'),
    unsplash('1526495124232-a04e1849168c'),
  ],
  EXTERIOR: [
    unsplash('1512453979798-5ea266f8880c'),
    unsplash('1542314831-068cd1dbfeeb'),
    unsplash('1500530855697-b586d89ba3ee'),
  ],
  BUILDING: [
    unsplash('1512453979798-5ea266f8880c'),
    unsplash('1496412705862-e0088f16f791'),
    unsplash('1526495124232-a04e1849168c'),
  ],
  NEIGHBORHOOD: [
    unsplash('1512453979798-5ea266f8880c'),
    unsplash('1518684079-3c830dcef090'),
    unsplash('1496412705862-e0088f16f791'),
  ],
  POOL: [
    unsplash('1571896349842-33c89424de2d'),
    unsplash('1540541338287-41700207dee6'),
    unsplash('1566073771259-6a8506099945'),
  ],
  GYM: [
    unsplash('1534438327276-14e5300c3a48'),
    unsplash('1576678927484-cc907957088c'),
    unsplash('1581009146145-b5ef050c2e1e'),
  ],
  PARKING: [
    unsplash('1500530855697-b586d89ba3ee'),
    unsplash('1618221195710-dd6b41faaea6'),
  ],
  AMENITY: [
    unsplash('1566073771259-6a8506099945'),
    unsplash('1540541338287-41700207dee6'),
    unsplash('1534438327276-14e5300c3a48'),
  ],
  FLOOR_PLAN: [
    unsplash('1600607687920-4e2a09cf159d'),
    unsplash('1616486338812-3dadae4b4ace'),
  ],
  OTHER: [
    unsplash('1560448204-e02f11c3d0e2'),
    unsplash('1600566753190-17f0baa2a6c3'),
  ],
};

export const MEDIA_CATEGORY_PLAN: PropertyMediaCategory[] = [
  PropertyMediaCategory.COVER,
  PropertyMediaCategory.LIVING_ROOM,
  PropertyMediaCategory.BEDROOM,
  PropertyMediaCategory.BATHROOM,
  PropertyMediaCategory.KITCHEN,
  PropertyMediaCategory.VIEW,
  PropertyMediaCategory.POOL,
  PropertyMediaCategory.BALCONY,
  PropertyMediaCategory.DINING,
  PropertyMediaCategory.BUILDING,
  PropertyMediaCategory.GYM,
  PropertyMediaCategory.AMENITY,
];

export const REVIEW_SNIPPETS = [
  'The Marina view was exactly what we hoped for, especially at sunset. Check-in was smooth and the apartment felt professionally managed.',
  'Spotless apartment, comfortable beds, and very clear instructions. The only small issue was traffic noise late at night.',
  'Perfect location near Dubai Mall. We walked to dinner most evenings and the host replied quickly whenever we had a question.',
  'The photos were accurate and the kitchen was genuinely usable. Wi-Fi slowed down one evening but recovered after a router restart.',
  'Great value for the area. Building security was helpful, parking was easy, and the apartment had fresh linens on arrival.',
  'A polished stay overall. The pool and gym were excellent, though the shower pressure could be stronger.',
  'Beautiful interior and a fantastic balcony. We used the workspace daily and had no issues with video calls.',
  'The apartment was clean and stylish, but check-in instructions arrived a little later than expected.',
  'Amazing host communication. We requested a late checkout and the team handled it without fuss.',
  'Good family stay with plenty of space. Kids loved the pool and the location was convenient for Mall of the Emirates.',
  'A very premium feel. The bedroom was quiet, the living room had a great skyline view, and everything worked.',
  'The location is unbeatable for JBR Beach. Some weekend street noise, but that is expected in this area.',
  'Well-managed apartment with hotel-level linens and quick maintenance response when the AC needed adjustment.',
  'Comfortable and practical. Not the most luxurious unit, but clean and fairly priced for Dubai.',
  'We loved the Palm location and resort feel. The villa was spacious and ideal for our family weekend.',
  'Excellent DIFC base for meetings. Fast elevators, good desk setup, and reliable Wi-Fi.',
  'Nice stay overall, although one kitchen appliance was missing. The host arranged a replacement the next morning.',
  'The apartment felt freshly prepared, with towels, toiletries, and coffee ready when we arrived.',
  'Great building amenities and a calm neighbourhood. We would happily book again.',
  'The view and location carried the stay. Cleaning was good, but a few scuffs in the hallway should be refreshed.',
];

export const HOST_RESPONSES = [
  'Thank you for staying with us. We are glad the location and preparation met your expectations.',
  'We appreciate the detailed feedback and have already shared the maintenance note with our operations team.',
  'It was a pleasure hosting you. We would be happy to welcome you again on your next UAE visit.',
  'Thank you for highlighting the check-in experience. We are tightening the timing on those instructions.',
  'We are pleased your family enjoyed the home and building amenities.',
];

export const MESSAGE_TOPICS = [
  {
    topic: MessageTopic.CHECKIN_ACCESS,
    role: MessageCounterpartyRole.CUSTOMER,
    subject: 'Check-in timing and access code',
    customer:
      'Hi, our flight lands early. Is there any chance the apartment can be ready before 3pm?',
    admin:
      'We can arrange a 1pm check-in if housekeeping completes on schedule. I will confirm by 11am on arrival day.',
  },
  {
    topic: MessageTopic.MAINTENANCE,
    role: MessageCounterpartyRole.CUSTOMER,
    subject: 'AC cooling concern',
    customer:
      'The bedroom AC is running but not cooling properly. Could someone take a look?',
    admin:
      'Sorry about that. A technician is scheduled within two hours and we will update you once the visit is complete.',
  },
  {
    topic: MessageTopic.PAYMENT_REFUND,
    role: MessageCounterpartyRole.VENDOR,
    subject: 'Payout schedule confirmation',
    customer:
      'Can you confirm when the last completed booking will be included in my payout?',
    admin:
      'It will be included in the next vendor statement after checkout, net of the agreed management fee.',
  },
  {
    topic: MessageTopic.CLEANING,
    role: MessageCounterpartyRole.VENDOR,
    subject: 'Turnover cleaning request',
    customer:
      'Please add a deep clean after the next JBR checkout. The guest is staying six nights.',
    admin:
      'Confirmed. We added cleaning and linen tasks to the operations schedule for checkout day.',
  },
];
