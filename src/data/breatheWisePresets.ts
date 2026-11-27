import type {
  CityLocation,
  CommuteMode,
  CookingFuel,
  EvaluatorSampleProfile,
  HabitSwapSpec,
  HouseholdProfile,
} from '../types';

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

export const HABIT_SWAP_CATALOG: readonly HabitSwapSpec[] = [
  {
    id: 'metro-carpool',
    currentHabit: 'Solo petrol car / two-wheeler rush-hour commute',
    sustainableSwap: 'AC Metro rail or 3-person office carpool 4 days/week',
    category: 'Commute',
    weeklyCo2KgBase: 14.5,
    pm25ReductionPct: 26,
    monthlyRupeesBase: 3600,
    scalesWithCommuteKm: true,
    mechanismNote:
      'Eliminates tailpipe cold-start emissions and moves commuter out of kerbside exhaust plumes.',
  },
  {
    id: 'trip-chaining',
    currentHabit: '4 separate short grocery & market vehicle runs per week',
    sustainableSwap: 'Batch errands into 1 off-peak chained trip or walk during clean window',
    category: 'Errands',
    weeklyCo2KgBase: 4.8,
    pm25ReductionPct: 11,
    monthlyRupeesBase: 1150,
    scalesWithCommuteKm: false,
    mechanismNote:
      'Short cold-engine urban trips emit up to 3× higher NOx and particulates per kilometer.',
  },
  {
    id: 'midday-venting',
    currentHabit: 'Opening balcony doors at 7 AM during winter thermal inversion',
    sustainableSwap:
      'Seal morning rooms; cross-ventilate strictly during Open-Meteo cleanest window',
    category: 'Ventilation',
    weeklyCo2KgBase: 1.2,
    pm25ReductionPct: 22,
    monthlyRupeesBase: 320,
    scalesWithCommuteKm: false,
    mechanismNote:
      'Avoids trapping peak morning inversion smog indoors and cuts purifier/AC filter load.',
  },
  {
    id: 'chimney-induction',
    currentHabit: 'High-heat tadka/frying on LPG/PNG gas without active exhaust',
    sustainableSwap: 'Run chimney/exhaust 5 min post-tadka + shift boiling/tea to induction',
    category: 'Kitchen',
    weeklyCo2KgBase: 3.4,
    pm25ReductionPct: 19,
    monthlyRupeesBase: 540,
    scalesWithCommuteKm: false,
    mechanismNote:
      'Cooking spikes indoor PM2.5 above 300 µg/m³ and NO₂ indoors; exhaust + induction slashes indoor spikes.',
  },
  {
    id: 'wet-mop-seal',
    currentHabit: 'Dry broom sweeping & unsealed balcony door gaps',
    sustainableSwap: 'Microfiber wet mopping + draft-stopper towels along main door gaps',
    category: 'Cleaning',
    weeklyCo2KgBase: 0.6,
    pm25ReductionPct: 14,
    monthlyRupeesBase: 250,
    scalesWithCommuteKm: false,
    mechanismNote:
      'Prevents resuspension of settled PM10/PM2.5 road dust and cuts outdoor infiltration by ~20%.',
  },
] as const;

export const SMOG_SHOCK_PRESETS: readonly string[] = [
  'AQI Spikes to 450+ Overnight (GRAP Stage IV)',
  'Power Cut — Air Purifier Offline for 6 Hours',
  'Mandatory Outdoor Errand During Peak Smog',
] as const;
