-- Expand amenity catalog to cover full luxury apartment inventory used by portal editors and public filters.

INSERT INTO "AmenityGroup" ("id", "key", "name", "sortOrder", "isActive", "createdAt", "updatedAt")
VALUES
  ('amenity_group_essentials', 'ESSENTIALS', 'Essentials', 10, true, NOW(), NOW()),
  ('amenity_group_kitchen', 'KITCHEN', 'Kitchen', 20, true, NOW(), NOW()),
  ('amenity_group_bathroom', 'BATHROOM', 'Bathroom', 30, true, NOW(), NOW()),
  ('amenity_group_bedroom_laundry', 'BEDROOM_LAUNDRY', 'Bedroom & Laundry', 40, true, NOW(), NOW()),
  ('amenity_group_heating_cooling', 'HEATING_COOLING', 'Heating & Cooling', 50, true, NOW(), NOW()),
  ('amenity_group_entertainment', 'ENTERTAINMENT', 'Entertainment', 60, true, NOW(), NOW()),
  ('amenity_group_family', 'FAMILY', 'Family', 70, true, NOW(), NOW()),
  ('amenity_group_building', 'BUILDING', 'Building', 80, true, NOW(), NOW()),
  ('amenity_group_outdoor', 'OUTDOOR', 'Outdoor', 90, true, NOW(), NOW()),
  ('amenity_group_safety', 'SAFETY', 'Safety', 100, true, NOW(), NOW())
ON CONFLICT ("key") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true,
  "updatedAt" = NOW();

INSERT INTO "Amenity" (
  "id",
  "key",
  "name",
  "icon",
  "groupId",
  "sortOrder",
  "isActive",
  "createdAt",
  "updatedAt"
)
SELECT
  src.id,
  src.key,
  src.name,
  NULL,
  grp.id,
  src.sort_order,
  true,
  NOW(),
  NOW()
FROM (
  VALUES
    ('amenity_wifi', 'WIFI', 'Wi-Fi', 'ESSENTIALS', 10),
    ('amenity_towels', 'TOWELS', 'Towels', 'ESSENTIALS', 20),
    ('amenity_bed_linens', 'BED_LINENS', 'Bed linens', 'ESSENTIALS', 30),
    ('amenity_shampoo', 'SHAMPOO', 'Shampoo', 'ESSENTIALS', 40),
    ('amenity_basic_toiletries', 'BASIC_TOILETRIES', 'Basic toiletries', 'ESSENTIALS', 50),

    ('amenity_kitchen', 'KITCHEN', 'Kitchen', 'KITCHEN', 10),
    ('amenity_refrigerator', 'REFRIGERATOR', 'Refrigerator', 'KITCHEN', 20),
    ('amenity_microwave', 'MICROWAVE', 'Microwave', 'KITCHEN', 30),
    ('amenity_oven', 'OVEN', 'Oven', 'KITCHEN', 40),
    ('amenity_stove', 'STOVE', 'Stove', 'KITCHEN', 50),
    ('amenity_kettle', 'KETTLE', 'Kettle', 'KITCHEN', 60),
    ('amenity_coffee_maker', 'COFFEE_MAKER', 'Coffee maker', 'KITCHEN', 70),
    ('amenity_dishes_cutlery', 'DISHES_CUTLERY', 'Dishes & cutlery', 'KITCHEN', 80),

    ('amenity_hot_water', 'HOT_WATER', 'Hot water', 'BATHROOM', 10),
    ('amenity_hair_dryer', 'HAIR_DRYER', 'Hair dryer', 'BATHROOM', 20),

    ('amenity_hangers', 'HANGERS', 'Hangers', 'BEDROOM_LAUNDRY', 10),
    ('amenity_iron', 'IRON', 'Iron', 'BEDROOM_LAUNDRY', 20),
    ('amenity_washing_machine', 'WASHING_MACHINE', 'Washing machine', 'BEDROOM_LAUNDRY', 30),

    ('amenity_air_conditioning', 'AIR_CONDITIONING', 'Air conditioning', 'HEATING_COOLING', 10),
    ('amenity_heating', 'HEATING', 'Heating', 'HEATING_COOLING', 20),

    ('amenity_tv', 'TV', 'TV', 'ENTERTAINMENT', 10),
    ('amenity_netflix', 'NETFLIX', 'Netflix', 'ENTERTAINMENT', 20),

    ('amenity_baby_cot', 'BABY_COT', 'Baby cot / crib', 'FAMILY', 10),
    ('amenity_high_chair', 'HIGH_CHAIR', 'High chair', 'FAMILY', 20),

    ('amenity_elevator', 'ELEVATOR', 'Elevator', 'BUILDING', 10),
    ('amenity_gym', 'GYM', 'Gym', 'BUILDING', 20),
    ('amenity_pool', 'POOL', 'Pool', 'BUILDING', 30),
    ('amenity_parking', 'PARKING', 'Free parking', 'BUILDING', 40),
    ('amenity_doorman', 'DOORMAN', 'Doorman', 'BUILDING', 50),

    ('amenity_balcony', 'BALCONY', 'Balcony', 'OUTDOOR', 10),

    ('amenity_smoke_alarm', 'SMOKE_ALARM', 'Smoke alarm', 'SAFETY', 10),
    ('amenity_fire_extinguisher', 'FIRE_EXTINGUISHER', 'Fire extinguisher', 'SAFETY', 20),
    ('amenity_first_aid_kit', 'FIRST_AID_KIT', 'First aid kit', 'SAFETY', 30)
) AS src(id, key, name, group_key, sort_order)
JOIN "AmenityGroup" AS grp
  ON grp."key" = src.group_key
ON CONFLICT ("key") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "groupId" = EXCLUDED."groupId",
  "sortOrder" = EXCLUDED."sortOrder",
  "isActive" = true,
  "updatedAt" = NOW();
