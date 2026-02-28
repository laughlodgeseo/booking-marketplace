export type GalleryCategory =
  | "LIVING_ROOM"
  | "BEDROOM"
  | "KITCHEN_DINING"
  | "BATHROOM"
  | "BALCONY_VIEW"
  | "POOL_AMENITIES"
  | "NEIGHBORHOOD";

export type GalleryImage = {
  id: string;
  src: string;
  alt: string;
};

export type GalleryItem = {
  id: string;
  slug: string;
  title: string;
  area: string;
  description: string;
  category: GalleryCategory;
  cover: GalleryImage;
  gallery: GalleryImage[];
};

export const GALLERY_CATEGORY_LABEL: Record<GalleryCategory, string> = {
  LIVING_ROOM: "Living Rooms",
  BEDROOM: "Bedrooms",
  KITCHEN_DINING: "Kitchens & Dining",
  BATHROOM: "Bathrooms",
  BALCONY_VIEW: "Balconies & Views",
  POOL_AMENITIES: "Pool & Building Amenities",
  NEIGHBORHOOD: "Neighborhood Vibes",
};

export const GALLERY_CATEGORY_ORDER: GalleryCategory[] = [
  "LIVING_ROOM",
  "BEDROOM",
  "KITCHEN_DINING",
  "BATHROOM",
  "BALCONY_VIEW",
  "POOL_AMENITIES",
  "NEIGHBORHOOD",
];

function unsplash(photoId: string): string {
  return `/images/gallery/${photoId}.webp`;
}

function image(id: string, photoId: string, alt: string): GalleryImage {
  return {
    id,
    src: unsplash(photoId),
    alt,
  };
}

const LIVING_ROOM_IMAGES: GalleryImage[] = [
  image(
    "living-01",
    "1583847268964-b28dc8f51f92",
    "Double-height living room with panoramic skyline windows and curved sofa seating",
  ),
  image(
    "living-02",
    "1631679706909-1844bbd07221",
    "Indigo-accent lounge corner with marble coffee table and layered ambient lighting",
  ),
  image(
    "living-03",
    "1618220179428-22790b461013",
    "Open-plan living space linking the lounge and dining zones in warm neutral tones",
  ),
  image(
    "living-04",
    "1598928506311-c55ded91a20c",
    "Comfort-first conversation area with plush seating and statement side lighting",
  ),
  image(
    "living-05",
    "1616047006789-b7af5afb8c20",
    "Modern TV wall setup with low-profile sofa and premium decorative textures",
  ),
  image(
    "living-06",
    "1605774337664-7a846e9cdf17",
    "Sunlit living room with full-width glazing and balanced furniture circulation",
  ),
  image(
    "living-07",
    "1586023492125-27b2c045efd7",
    "Refined living room composition with sculpted seating and textured art pieces",
  ),
  image(
    "living-08",
    "1564078516393-cf04bd966897",
    "Evening-ready lounge styling with warm perimeter lighting and layered textiles",
  ),
];

const BEDROOM_IMAGES: GalleryImage[] = [
  image(
    "bedroom-01",
    "1615874959474-d609969a20ed",
    "King bedroom suite with upholstered headboard and floor-to-ceiling blackout drapes",
  ),
  image(
    "bedroom-02",
    "1616594039964-ae9021a400a0",
    "Soft-neutral primary bedroom with layered linens and bedside reading chair",
  ),
  image(
    "bedroom-03",
    "1595526114035-0d45ed16cfbf",
    "Minimal guest bedroom with integrated storage wall and clean circulation paths",
  ),
  image(
    "bedroom-04",
    "1522771739844-6a9f6d5f14af",
    "Morning-light bedroom with skyline corner view and warm tactile finishes",
  ),
  image(
    "bedroom-05",
    "1540518614846-7eded433c457",
    "Bedroom work nook with compact desk setup for extended-stay routines",
  ),
  image(
    "bedroom-06",
    "1560185893-a55cbc8c57e8",
    "Calm sleep-focused bedroom palette with timber accents and soft lighting",
  ),
  image(
    "bedroom-07",
    "1566665797739-1674de7a421a",
    "Modern bedroom composition with floating side tables and wall-mounted sconces",
  ),
  image(
    "bedroom-08",
    "1505693416388-ac5ce068fe85",
    "Quiet restorative suite arranged for comfort and low-visual-clutter stays",
  ),
];

const KITCHEN_DINING_IMAGES: GalleryImage[] = [
  image(
    "kitchen-01",
    "1556911220-bff31c812dba",
    "Quartz island kitchen with bar stools and premium integrated appliances",
  ),
  image(
    "kitchen-02",
    "1600489000022-c2086d79f9d4",
    "Matte cabinetry galley kitchen with generous prep counters and clean lines",
  ),
  image(
    "kitchen-03",
    "1484154218962-a197022b5858",
    "Open kitchen and dining layout designed for family and group stays",
  ),
  image(
    "kitchen-04",
    "1565538810643-b5bdb714032a",
    "Built-in appliance wall with functional work triangle and natural stone surfaces",
  ),
  image(
    "kitchen-05",
    "1622372738946-62e02505feb3",
    "Dining corner with statement pendant lighting and window-side seating",
  ),
  image(
    "kitchen-06",
    "1617228069096-4638a7ffc906",
    "Breakfast bar transition zone connecting prep area to the living room",
  ),
  image(
    "kitchen-07",
    "1507089947368-19c1da9775ae",
    "Family dining table arrangement with wide circulation and textured finishes",
  ),
  image(
    "kitchen-08",
    "1588854337221-4cf9fa96059c",
    "Compact chef-ready kitchen with smart storage and efficient counter planning",
  ),
];

const BATHROOM_IMAGES: GalleryImage[] = [
  image(
    "bathroom-01",
    "1584622650111-993a426fbf0a",
    "Spa-inspired bathroom with walk-in rainfall shower and large-format stone",
  ),
  image(
    "bathroom-02",
    "1631889993959-41b4e9c6e3c5",
    "Backlit vanity mirror and sculpted countertop with premium fixture detailing",
  ),
  image(
    "bathroom-03",
    "1620626011761-996317b8d101",
    "Marble bathroom suite featuring a freestanding tub and soft layered lighting",
  ),
  image(
    "bathroom-04",
    "1695002817411-203c7f19dfa3",
    "Guest bathroom styling with recessed niche shelving and matte hardware",
  ),
  image(
    "bathroom-05",
    "1507652313519-d4e9174996dd",
    "Dual-sink vanity layout designed for family and multi-guest convenience",
  ),
  image(
    "bathroom-06",
    "1552321554-5fefe8c9ef14",
    "Warm-toned bathroom palette combining timber vanity and soft cove lighting",
  ),
  image(
    "bathroom-07",
    "1629079447777-1e605162dc8d",
    "Modern shower room with frameless glass enclosure and stone bench ledge",
  ),
  image(
    "bathroom-08",
    "1576698483491-8c43f0862543",
    "Hotel-inspired bathroom arrangement with premium towel staging and clean symmetry",
  ),
];

const BALCONY_IMAGES: GalleryImage[] = [
  image(
    "balcony-01",
    "1616593969747-4797dc75033e",
    "Private balcony lounge framing marina skyline views at golden hour",
  ),
  image(
    "balcony-02",
    "1560448205-d82bf18b9bcf",
    "Terrace dining setup with outdoor chairs and evening city backdrop",
  ),
  image(
    "balcony-03",
    "1524549207884-e7d1130ae2f3",
    "Corner balcony seating nook with uninterrupted high-floor skyline perspective",
  ),
  image(
    "balcony-04",
    "1567627007677-b6502f1fcfd5",
    "Palm-facing balcony retreat with woven chairs and low outdoor table",
  ),
  image(
    "balcony-05",
    "1619082791183-1888233d6569",
    "Compact outdoor balcony arrangement with greenery and coffee-time styling",
  ),
  image(
    "balcony-06",
    "1564829439675-0eec72f0b695",
    "High-floor terrace composition capturing evening light over the district",
  ),
  image(
    "balcony-07",
    "1621045081424-97aa08903f76",
    "Breezy balcony lounge with neutral cushions and view-first positioning",
  ),
  image(
    "balcony-08",
    "1597663459867-9903bf92dcfd",
    "Sunrise-facing deck space designed for relaxed morning routines",
  ),
];

const POOL_IMAGES: GalleryImage[] = [
  image(
    "pool-01",
    "1562016600-ece13e8ba570",
    "Infinity-edge resident pool deck with resort-style loungers and palm accents",
  ),
  image(
    "pool-02",
    "1568145675395-66a2eda0c6d7",
    "Shaded amenity pool area with cabana seating and premium hardscape finishes",
  ),
  image(
    "pool-03",
    "1591285713698-598d587de63e",
    "Building leisure pool surrounded by landscaped planters and day beds",
  ),
  image(
    "pool-04",
    "1509600110300-21b9d5fedeb7",
    "Evening pool atmosphere with reflective waterline lighting and skyline glow",
  ),
  image(
    "pool-05",
    "1604348825621-22800b6ed16d",
    "Family-friendly poolside zone with broad circulation and lounge seating",
  ),
  image(
    "pool-06",
    "1557459325-b6733cbeae9c",
    "Rooftop amenity pool with panoramic city backdrop and clean modern edges",
  ),
  image(
    "pool-07",
    "1498747946579-bde604cb8f44",
    "Wellness deck integrating plunge moments with tranquil seating pockets",
  ),
  image(
    "pool-08",
    "1566230555350-59683b1d16e0",
    "Contemporary leisure pool scene with architectural symmetry and soft lighting",
  ),
];

const NEIGHBORHOOD_IMAGES: GalleryImage[] = [
  image(
    "neighborhood-01",
    "1524813686514-a57563d77965",
    "Walkable neighborhood boulevard with cafes, retail terraces, and evening foot traffic",
  ),
  image(
    "neighborhood-02",
    "1628624747295-ea5e7fc3d76f",
    "Night streetscape surrounding premium residential towers and dining strips",
  ),
  image(
    "neighborhood-03",
    "1597026405082-eda9beae7513",
    "Waterfront promenade route suited for morning runs and sunset walks",
  ),
  image(
    "neighborhood-04",
    "1616113364365-b6013f3dad25",
    "District plaza with landscaped seating pockets and mixed-use street activity",
  ),
  image(
    "neighborhood-05",
    "1628624747186-a941c476b7ef",
    "Neighborhood dining row with warm storefront lighting and active sidewalks",
  ),
  image(
    "neighborhood-06",
    "1516156008625-3a9d6067fab5",
    "City crosswalk perspective near transit-friendly blocks and local conveniences",
  ),
  image(
    "neighborhood-07",
    "1627927518258-b67557570840",
    "Public art corner with pedestrian-priority streets and premium urban finishes",
  ),
  image(
    "neighborhood-08",
    "1603298108410-e6f28ad2708d",
    "Weekend neighborhood energy around mixed retail and outdoor gathering spaces",
  ),
];

export const GALLERY_ITEMS: GalleryItem[] = [
  {
    id: "gallery-living-room",
    slug: "curated-living-room-moments",
    title: "Curated living room moments",
    area: "Downtown Dubai",
    description:
      "Spacious lounges with natural light and premium finishes for comfortable stays.",
    category: "LIVING_ROOM",
    cover: LIVING_ROOM_IMAGES[0],
    gallery: LIVING_ROOM_IMAGES,
  },
  {
    id: "gallery-bedroom",
    slug: "calm-and-restorative-bedrooms",
    title: "Calm and restorative bedrooms",
    area: "Dubai Marina",
    description:
      "Calm bedroom suites with quality linens and blackout comfort for restful stays.",
    category: "BEDROOM",
    cover: BEDROOM_IMAGES[0],
    gallery: BEDROOM_IMAGES,
  },
  {
    id: "gallery-kitchen",
    slug: "kitchens-built-for-longer-stays",
    title: "Kitchens built for longer stays",
    area: "City Walk",
    description:
      "Functional kitchens and dining spaces for families, remote workers, and longer stays.",
    category: "KITCHEN_DINING",
    cover: KITCHEN_DINING_IMAGES[0],
    gallery: KITCHEN_DINING_IMAGES,
  },
  {
    id: "gallery-bathroom",
    slug: "spa-forward-bathrooms",
    title: "Spa-forward bathrooms",
    area: "Business Bay",
    description:
      "Modern bathrooms with premium fixtures, soft lighting, and comfort-focused layouts.",
    category: "BATHROOM",
    cover: BATHROOM_IMAGES[0],
    gallery: BATHROOM_IMAGES,
  },
  {
    id: "gallery-balcony",
    slug: "balconies-with-skyline-rhythm",
    title: "Balconies with skyline rhythm",
    area: "JBR",
    description:
      "Balconies and terraces with skyline views for relaxed mornings and evenings.",
    category: "BALCONY_VIEW",
    cover: BALCONY_IMAGES[0],
    gallery: BALCONY_IMAGES,
  },
  {
    id: "gallery-pool",
    slug: "pool-and-amenity-experiences",
    title: "Pool and amenity experiences",
    area: "Palm Jumeirah",
    description:
      "Resort-style pool decks and building amenities with comfortable lounge spaces.",
    category: "POOL_AMENITIES",
    cover: POOL_IMAGES[0],
    gallery: POOL_IMAGES,
  },
  {
    id: "gallery-neighborhood",
    slug: "neighborhood-scenes-around-each-stay",
    title: "Neighborhood scenes around each stay",
    area: "DIFC & Downtown",
    description:
      "Neighborhood context around our stays, including walkability, dining, and waterfront routes.",
    category: "NEIGHBORHOOD",
    cover: NEIGHBORHOOD_IMAGES[0],
    gallery: NEIGHBORHOOD_IMAGES,
  },
];
