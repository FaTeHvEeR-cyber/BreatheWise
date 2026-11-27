import type { HabitSwapSpec } from '../types';

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
