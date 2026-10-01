import { deepseek } from '@ai-sdk/deepseek';
import { streamObject } from 'ai';
import { recipeSchema } from '@/lib/recipe-schema';

const MODEL = 'deepseek-chat';

// DeepSeek's json_object mode needs the word "json" in the prompt and does not
// enforce a schema server-side, so spell the shape out and let the SDK validate.
const RECIPE_JSON_SHAPE = `{
  "name": string,
  "description": string,
  "servings": integer,
  "prepMinutes": integer,
  "cookMinutes": integer,
  "difficulty": "easy" | "medium" | "hard",
  "ingredients": [{ "name": string, "amount": string }],
  "steps": [string],
  "tips": [string]
}`;

// `useObject` posts its input verbatim as the JSON body, so the prompt may be a
// bare string or an object with a `prompt` field. Narrow once, then read.
function readPrompt(raw: unknown): string {
  if (typeof raw === 'string') return raw;
  if (raw !== null && typeof raw === 'object' && 'prompt' in raw && typeof raw.prompt === 'string') {
    return raw.prompt;
  }
  return '';
}

export async function POST(request: Request): Promise<Response> {
  try {
    const prompt = readPrompt(await request.json()).trim();

    if (!prompt) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = streamObject({
      model: deepseek(MODEL),
      schema: recipeSchema,
      schemaName: 'Recipe',
      schemaDescription: 'A complete cooking recipe.',
      system: 'You are a professional chef. Reply with a single json object and nothing else.',
      prompt: `Create a detailed recipe for: ${prompt}\n\nReturn json using exactly these keys:\n${RECIPE_JSON_SHAPE}`,
      onError({ error }) {
        console.error('Recipe stream error:', error);
      },
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Recipe API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 400 },
    );
  }
}
