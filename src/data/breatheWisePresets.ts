import type {
  CityLocation,
  CommuteMode,
  CookingFuel,
  EvaluatorSampleProfile,
  HouseholdProfile,
} from '../types';
export { HABIT_SWAP_CATALOG, SMOG_SHOCK_PRESETS } from './habitSwapCatalog';

export const COMMUTE_OPTIONS: ReadonlyArray<{ id: CommuteMode; label: string }> = [
  { id: 'petrol_car', label: 'Petrol / Diesel Car' },
  { id: 'metro', label: 'AC Metro / Rail' },
  { id: 'two_wheeler', label: 'Two-Wheeler' },
  { id: 'bus_auto', label: 'Bus / Auto' },
  { id: 'walk_cycle', label: 'Walk / Cycle' },
  { id: 'hybrid_wfh', label: 'Hybrid / Work from Home' },
];

export const FUEL_OPTIONS: ReadonlyArray<{ id: CookingFuel; label: string }> = [
  { id: 'lpg_gas', label: 'LPG Gas' },
  { id: 'png_gas', label: 'PNG Piped Gas' },
  { id: 'induction', label: 'Induction / Electric' },
];

import { MAX_COMMUTE_KM, MAX_ROOMS } from '../config/constants';

export { MAX_COMMUTE_KM, MAX_ROOMS };

export const EMPTY_HOUSEHOLD_PROFILE: HouseholdProfile = {
  profileName: '',
  personaSummary: '',
  commuteDistanceKm: 12,
  commuteMode: 'hybrid_wfh',
  cookingFuel: 'lpg_gas',
  hasPurifier: false,
  hasKitchenExhaust: false,
  hasCrossVentilation: true,
  roomCount: 2,
  activeRoomCount: 2,
  vulnerableMembers: '',
};

export const QUICK_INDIAN_CITIES: readonly CityLocation[] = [
  {
    id: 'city-delhi',
    name: 'Delhi',
    admin1: 'Delhi',
    country: 'India',
    latitude: 28.6139,
    longitude: 77.209,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'city-noida',
    name: 'Noida',
    admin1: 'Uttar Pradesh',
    country: 'India',
    latitude: 28.5355,
    longitude: 77.391,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'city-chandigarh',
    name: 'Chandigarh',
    admin1: 'Chandigarh',
    country: 'India',
    latitude: 30.7333,
    longitude: 76.7794,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'city-mumbai',
    name: 'Mumbai',
    admin1: 'Maharashtra',
    country: 'India',
    latitude: 19.076,
    longitude: 72.8777,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'city-kolkata',
    name: 'Kolkata',
    admin1: 'West Bengal',
    country: 'India',
    latitude: 22.5726,
    longitude: 88.3639,
    timezone: 'Asia/Kolkata',
  },
  {
    id: 'city-bengaluru',
    name: 'Bengaluru',
    admin1: 'Karnataka',
    country: 'India',
    latitude: 12.9716,
    longitude: 77.5946,
    timezone: 'Asia/Kolkata',
  },
] as const;

export const EVALUATOR_SAMPLE_PROFILES: readonly EvaluatorSampleProfile[] = [
  {
    id: 'delhi-commuter',
    title: 'Delhi NCR Working Commuter',
    subtitle: '22 km daily car/metro commute · apartment · air purifier available',
    city: QUICK_INDIAN_CITIES[0],
    profile: {
      profileName: 'Delhi NCR Working Commuter',
      personaSummary:
        'Daily 22 km office commuter living in a high-rise apartment with one HEPA air purifier.',
      commuteDistanceKm: 22,
      commuteMode: 'petrol_car',
      cookingFuel: 'png_gas',
      hasPurifier: true,
      hasKitchenExhaust: true,
      hasCrossVentilation: true,
      roomCount: 2,
      activeRoomCount: 2,
      vulnerableMembers: 'Healthy working adult experiencing morning throat irritation',
    },
    defaultSwapIds: ['metro-carpool', 'midday-venting'],
  },
  {
    id: 'noida-family',
    title: 'Noida Young Family (Toddler & Senior)',
    subtitle: 'School drop-off · gas cooking · asthma-sensitive senior · no purifier',
    city: QUICK_INDIAN_CITIES[1],
    profile: {
      profileName: 'Noida Young Family with Toddler & Asthma-Sensitive Senior',
      personaSummary:
        'Multi-generational apartment household managing school drop-off, daily Indian gas cooking, and zero commercial HEPA purifiers.',
      commuteDistanceKm: 10,
      commuteMode: 'petrol_car',
      cookingFuel: 'lpg_gas',
      hasPurifier: false,
      hasKitchenExhaust: false,
      hasCrossVentilation: true,
      roomCount: 3,
      activeRoomCount: 3,
      vulnerableMembers: '3-year-old toddler and 68-year-old senior with asthma',
    },
    defaultSwapIds: ['chimney-induction', 'wet-mop-seal', 'midday-venting'],
  },
  {
    id: 'chandigarh-student',
    title: 'Chandigarh / Jalandhar College Student',
    subtitle: 'Two-wheeler commute · hostel/PG room · evening outdoor sports',
    city: QUICK_INDIAN_CITIES[2],
    profile: {
      profileName: 'Chandigarh / Jalandhar College Student',
      personaSummary:
        'Campus student riding a two-wheeler daily, living in a single PG/hostel room, and playing evening outdoor sports.',
      commuteDistanceKm: 14,
      commuteMode: 'two_wheeler',
      cookingFuel: 'induction',
      hasPurifier: false,
      hasKitchenExhaust: false,
      hasCrossVentilation: true,
      roomCount: 1,
      activeRoomCount: 1,
      vulnerableMembers: 'Active student with high aerobic lung ventilation during sports',
    },
    defaultSwapIds: ['trip-chaining', 'midday-venting'],
  },
  {
    id: 'mumbai-coastal',
    title: 'Mumbai Coastal Apartment Household',
    subtitle: 'Moderate coastal haze · hybrid work · balcony cross-ventilation',
    city: QUICK_INDIAN_CITIES[3],
    profile: {
      profileName: 'Mumbai Coastal Apartment Household',
      personaSummary:
        'Hybrid-working couple in a sea-facing flat navigating winter coastal haze and balcony ventilation.',
      commuteDistanceKm: 16,
      commuteMode: 'hybrid_wfh',
      cookingFuel: 'png_gas',
      hasPurifier: true,
      hasKitchenExhaust: true,
      hasCrossVentilation: true,
      roomCount: 2,
      activeRoomCount: 2,
      vulnerableMembers: 'Hybrid workers managing mild seasonal dust allergies',
    },
    defaultSwapIds: ['metro-carpool', 'trip-chaining'],
  },
] as const;
