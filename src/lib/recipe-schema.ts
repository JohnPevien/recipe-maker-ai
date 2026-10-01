import { z } from 'zod';

export const recipeSchema = z.object({
  name: z.string().describe('Appetizing recipe name'),
  description: z.string().describe('One-sentence summary of the dish'),
  servings: z.number().int().describe('Number of servings'),
  prepMinutes: z.number().int().describe('Prep time in minutes'),
  cookMinutes: z.number().int().describe('Cook time in minutes'),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  ingredients: z
    .array(
      z.object({
        name: z.string(),
        amount: z.string().describe('Quantity plus unit, e.g. "2 cups"'),
      }),
    )
    .describe('Ingredient list'),
  steps: z.array(z.string()).describe('Ordered cooking steps'),
  tips: z.array(z.string()).describe('Short chef tips or variations'),
});

export type Recipe = z.infer<typeof recipeSchema>;
