import { deepseek } from '@ai-sdk/deepseek';
import { streamText } from 'ai';

const MODEL = 'deepseek-chat';

export async function POST(request: Request): Promise<Response> {
  try {
    const { prompt } = (await request.json()) as { prompt?: string };

    if (!prompt?.trim()) {
      return Response.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const result = streamText({
      model: deepseek(MODEL),
      system:
        'You are a concise chef. Reply with one short paragraph (max 3 sentences) of serving suggestions: pairings, sides, or drinks.',
      prompt: prompt.trim(),
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Completion API error:', error);
    return Response.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 400 },
    );
  }
}
