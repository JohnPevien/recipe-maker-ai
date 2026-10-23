import { deepseek } from '@ai-sdk/deepseek';
import { streamText } from 'ai';
import {
  assertPromptLength,
  checkApiKey,
  checkRateLimit,
  toErrorResponse,
} from '@/lib/api-guard';

const MODEL = 'deepseek-chat';

export async function POST(request: Request): Promise<Response> {
  try {
    const keyError = checkApiKey();
    if (keyError) return keyError;

    const rateLimited = checkRateLimit(request);
    if (rateLimited) return rateLimited;

    const { prompt } = (await request.json()) as { prompt?: string };

    if (!prompt?.trim()) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }
    const trimmedPrompt = prompt.trim();
    assertPromptLength(trimmedPrompt);

    const result = streamText({
      model: deepseek(MODEL),
      system:
        'You are a concise chef. Reply with one short paragraph (max 3 sentences) of serving suggestions: pairings, sides, or drinks.',
      prompt: trimmedPrompt,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    return toErrorResponse(error, 'Completion API error:');
  }
}
