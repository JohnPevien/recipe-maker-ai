import { z } from 'zod';

/**
 * Kitchen measurement conversion table.
 * Volume factors are millilitres; weight factors are grams.
 * Cross-family conversions (volume <-> weight) are intentionally rejected:
 * that needs a density, which we do not know.
 */
const VOLUME_TO_ML = {
 ml: 1,
 l: 1000,
 tsp: 4.92892,
 tbsp: 14.7868,
 'fl oz': 29.5735,
 cup: 236.588,
 pint: 473.176,
 quart: 946.353,
} as const;

const WEIGHT_TO_G = {
 g: 1,
 kg: 1000,
 oz: 28.3495,
 lb: 453.592,
} as const;

const VOLUME_UNITS = Object.keys(VOLUME_TO_ML) as Array<keyof typeof VOLUME_TO_ML>;
const WEIGHT_UNITS = Object.keys(WEIGHT_TO_G) as Array<keyof typeof WEIGHT_TO_G>;

export const convertMeasurementSchema = z.object({
 value: z.number().describe('Quantity to convert'),
 from: z.string().describe(`Source unit, one of: ${[...VOLUME_UNITS, ...WEIGHT_UNITS].join(', ')}`),
 to: z.string().describe(`Target unit, one of: ${[...VOLUME_UNITS, ...WEIGHT_UNITS].join(', ')}`),
});

export type ConvertMeasurementInput = z.infer<typeof convertMeasurementSchema>;

export function convertMeasurement(input: ConvertMeasurementInput): string {
 const from = normalizeUnit(input.from);
 const to = normalizeUnit(input.to);

 if (!from) return `Unknown unit "${input.from}". Known units: ${[...VOLUME_UNITS, ...WEIGHT_UNITS].join(', ')}.`;
 if (!to) return `Unknown unit "${input.to}". Known units: ${[...VOLUME_UNITS, ...WEIGHT_UNITS].join(', ')}.`;

 const fromIsVolume = from in VOLUME_TO_ML;
 const toIsVolume = to in VOLUME_TO_ML;

 if (fromIsVolume !== toIsVolume) {
  return `Cannot convert between volume ("${from}") and weight ("${to}") without a density. Convert within one family instead.`;
 }

 const converted = fromIsVolume
  ? (input.value * VOLUME_TO_ML[from as keyof typeof VOLUME_TO_ML]) / VOLUME_TO_ML[to as keyof typeof VOLUME_TO_ML]
  : (input.value * WEIGHT_TO_G[from as keyof typeof WEIGHT_TO_G]) / WEIGHT_TO_G[to as keyof typeof WEIGHT_TO_G];

 // Round to 3 decimals so model-facing output stays readable.
 const rounded = Math.round(converted * 1000) / 1000;

 return `${input.value} ${from} = ${rounded} ${to}`;
}

function normalizeUnit(unit: string): string | undefined {
 const cleaned = unit.trim().toLowerCase().replace(/\.$/, '');
 const known = [...VOLUME_UNITS, ...WEIGHT_UNITS] as string[];
 return known.find((candidate) => candidate === cleaned);
}
