import { createHash } from 'crypto';
import { PropertyMediaCategory, PropertyStatus } from '@prisma/client';

const UNSPLASH_PARAMS = '?auto=format&fit=crop&w=1600&h=1067&q=82&fm=jpg';

const unsplash = (photoId: string) =>
  `https://images.unsplash.com/photo-${photoId}${UNSPLASH_PARAMS}`;

const INTERIOR_LIVING = [
  unsplash('1560448204-e02f11c3d0e2'),
  unsplash('1502672260266-1c1ef2d93688'),
  unsplash('1493666438817-866a91353ca9'),
];

const INTERIOR_BEDROOM = [
  unsplash('1505693416388-ac5ce068fe85'),
  unsplash('1505691938895-1758d7feb511'),
  unsplash('1493809842364-78817add7ffb'),
];

const INTERIOR_BATHROOM = [
  unsplash('1523217582562-09d0def993a6'),
  unsplash('1489515217757-5fd1be406fef'),
  unsplash('1482192596544-9eb780fc7f66'),
];

const INTERIOR_KITCHEN = [
  unsplash('1484154218962-a197022b5858'),
  unsplash('1560185007-cde436f6a4d0'),
  unsplash('1494526585095-c41746248156'),
];

const CITY_VIEW = [
  unsplash('1477959858617-67f85cf4f1df'),
  unsplash('1467269204594-9661b134dd2b'),
  unsplash('1501183638710-841dd1904471'),
];

const BUILDING_LOBBY = [
  unsplash('1460317442991-0ec209397118'),
  unsplash('1507089947368-19c1da9775ae'),
  unsplash('1464890100898-a385f744067f'),
];

const AMENITY_POOL = [
  unsplash('1507537297725-24a1c029d3ca'),
  unsplash('1506377247377-2a5b3b417ebb'),
  unsplash('1494526585095-c41746248156'),
];

const AMENITY_GYM = [
  unsplash('1468824357306-a439d58ccb1c'),
  unsplash('1512918728675-ed5a9ecdebfd'),
  unsplash('1522708323590-d24dbb6b0267'),
];

const CATEGORY_IMAGE_SOURCES: Record<PropertyMediaCategory, string[]> = {
  LIVING_ROOM: INTERIOR_LIVING,
  BEDROOM: INTERIOR_BEDROOM,
  BATHROOM: INTERIOR_BATHROOM,
  KITCHEN: INTERIOR_KITCHEN,
  COVER: INTERIOR_LIVING,
  DINING: INTERIOR_LIVING,
  ENTRY: BUILDING_LOBBY,
  HALLWAY: BUILDING_LOBBY,
  STUDY: INTERIOR_LIVING,
  LAUNDRY: INTERIOR_BATHROOM,
  BALCONY: CITY_VIEW,
  TERRACE: CITY_VIEW,
  VIEW: CITY_VIEW,
  EXTERIOR: BUILDING_LOBBY,
  BUILDING: BUILDING_LOBBY,
  NEIGHBORHOOD: CITY_VIEW,
  POOL: AMENITY_POOL,
  GYM: AMENITY_GYM,
  PARKING: BUILDING_LOBBY,
  AMENITY: AMENITY_POOL,
  FLOOR_PLAN: INTERIOR_LIVING,
  OTHER: INTERIOR_LIVING,
};

type MediaSeedRow = {
  id: string;
  url: string;
  alt: string;
  sortOrder: number;
  category: PropertyMediaCategory;
};

type SeedPropertyMediaParams = {
  propertyId: string;
  propertyTitle: string;
  status: PropertyStatus;
  targetCount: number;
};

const REQUIRED_PUBLISHED_CATEGORIES: PropertyMediaCategory[] = [
  PropertyMediaCategory.LIVING_ROOM,
  PropertyMediaCategory.LIVING_ROOM,
  PropertyMediaCategory.BEDROOM,
  PropertyMediaCategory.BEDROOM,
  PropertyMediaCategory.BATHROOM,
  PropertyMediaCategory.KITCHEN,
  PropertyMediaCategory.BALCONY,
  PropertyMediaCategory.VIEW,
  PropertyMediaCategory.BUILDING,
  PropertyMediaCategory.POOL,
];

const EXTRA_CATEGORIES: PropertyMediaCategory[] = [
  PropertyMediaCategory.GYM,
  PropertyMediaCategory.AMENITY,
  PropertyMediaCategory.EXTERIOR,
  PropertyMediaCategory.DINING,
  PropertyMediaCategory.ENTRY,
  PropertyMediaCategory.LIVING_ROOM,
  PropertyMediaCategory.BEDROOM,
  PropertyMediaCategory.VIEW,
  PropertyMediaCategory.BALCONY,
];

const UNDER_REVIEW_BASE_CATEGORIES: PropertyMediaCategory[] = [
  PropertyMediaCategory.LIVING_ROOM,
  PropertyMediaCategory.BEDROOM,
  PropertyMediaCategory.BEDROOM,
  PropertyMediaCategory.BATHROOM,
  PropertyMediaCategory.KITCHEN,
  PropertyMediaCategory.BALCONY,
  PropertyMediaCategory.VIEW,
  PropertyMediaCategory.BUILDING,
];

const DRAFT_BASE_CATEGORIES: PropertyMediaCategory[] = [
  PropertyMediaCategory.LIVING_ROOM,
  PropertyMediaCategory.BEDROOM,
  PropertyMediaCategory.KITCHEN,
];

function hashToInt(value: string): number {
  const hash = createHash('sha256').update(value).digest('hex').slice(0, 8);
  return Number.parseInt(hash, 16);
}

function stableUuid(value: string): string {
  const hex = createHash('sha256').update(value).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function pickCategoryPlan(status: PropertyStatus, targetCount: number) {
  if (status === PropertyStatus.PUBLISHED) {
    const categories = [...REQUIRED_PUBLISHED_CATEGORIES];
    let cursor = 0;
    while (categories.length < targetCount) {
      categories.push(EXTRA_CATEGORIES[cursor % EXTRA_CATEGORIES.length]);
      cursor += 1;
    }
    return categories;
  }

  if (status === PropertyStatus.DRAFT) {
    return [...DRAFT_BASE_CATEGORIES].slice(0, targetCount);
  }

  const categories = [...UNDER_REVIEW_BASE_CATEGORIES];
  let cursor = 0;
  while (categories.length < targetCount) {
    categories.push(EXTRA_CATEGORIES[cursor % EXTRA_CATEGORIES.length]);
    cursor += 1;
  }
  return categories.slice(0, targetCount);
}

function mediaAltText(
  category: PropertyMediaCategory,
  propertyTitle: string,
  index: number,
) {
  const label = category.replace(/_/g, ' ').toLowerCase();
  return `${propertyTitle} - ${label} ${index + 1}`;
}

export async function buildPropertyMediaRows(
  params: SeedPropertyMediaParams,
): Promise<MediaSeedRow[]> {
  const categories = pickCategoryPlan(params.status, params.targetCount);
  const rows: MediaSeedRow[] = [];

  for (let i = 0; i < categories.length; i += 1) {
    const category = categories[i];
    const mediaId = stableUuid(`demo-media:${params.propertyId}:${i}:${category}`);
    const sourcePool = CATEGORY_IMAGE_SOURCES[category] ?? CATEGORY_IMAGE_SOURCES.OTHER;
    const sourceIndex =
      hashToInt(`${params.propertyId}:${category}:${i}:remote`) %
      sourcePool.length;
    const sourceUrl = sourcePool[sourceIndex] ?? sourcePool[0];

    rows.push({
      id: mediaId,
      url: sourceUrl,
      alt: mediaAltText(category, params.propertyTitle, i),
      sortOrder: i,
      category,
    });
  }

  return rows;
}
