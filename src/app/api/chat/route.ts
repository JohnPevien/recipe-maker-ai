import {
  assertMessagesSize,
  checkApiKey,
  checkRateLimit,
  toErrorResponse,
  ValidationError,
} from '@/lib/api-guard';
import { deepseek } from '@ai-sdk/deepseek';
import { convertToModelMessages, stepCountIs, streamText, tool, type UIMessage } from 'ai';
import { convertMeasurement, convertMeasurementSchema } from '@/lib/convert-measurement';

// Constants
const DEFAULT_MODEL = 'deepseek-chat';
const SUPPORTED_MODELS = ['deepseek-chat', 'deepseek-reasoner'] as const;
const MAX_STEPS = 4;

// Types
interface ChatRequest {
  messages: UIMessage[];
  model?: string;
}


function validateRequest(body: unknown): ChatRequest {
  if (!body || typeof body !== 'object') {
    throw new ValidationError('Invalid request body');
  }

  const { messages, model } = body as Partial<ChatRequest>;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ValidationError('Messages array is required and cannot be empty');
  }

  assertMessagesSize(messages);

  const selectedModel = model || DEFAULT_MODEL;
  if (!SUPPORTED_MODELS.includes(selectedModel as (typeof SUPPORTED_MODELS)[number])) {
    throw new ValidationError(`Unsupported model: ${selectedModel}`);
  }

  return { messages, model: selectedModel };
}

// Server-side tools the model can call.
const kitchenTools = {
  convertMeasurement: tool({
    description:
      'Convert a cooking measurement between units. Supports volume (ml, l, tsp, tbsp, fl oz, cup, pint, quart) and weight (g, kg, oz, lb). Cannot convert across the volume/weight families.',
    inputSchema: convertMeasurementSchema,
    execute: convertMeasurement,
  }),
};

// Main handler
export async function POST(request: Request): Promise<Response> {
  try {
    const keyError = checkApiKey();
    if (keyError) return keyError;

    const rateLimited = checkRateLimit(request);
    if (rateLimited) return rateLimited;

    // Parse and validate request
    const body = await request.json();
    const { messages, model } = validateRequest(body);

    // Create streaming response
    const result = streamText({
      model: deepseek(model!),
      system:
        'You are a helpful cooking assistant. When a request involves unit conversions, call the convertMeasurement tool instead of doing arithmetic yourself.',
      messages: convertToModelMessages(messages),
      tools: kitchenTools,
      stopWhen: stepCountIs(MAX_STEPS),
    });

    return result.toUIMessageStreamResponse({ sendReasoning: true });

  } catch (error) {
    return toErrorResponse(error, 'Chat API error:');
  }
}
