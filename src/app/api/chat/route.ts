import { NextRequest, NextResponse } from 'next/server';
import { deepseek } from '@ai-sdk/deepseek';
import { streamText } from 'ai';

// Constants
const DEFAULT_MODEL = 'deepseek-chat';
const SUPPORTED_MODELS = ['deepseek-chat', 'deepseek-reasoner'] as const;
const DEEPSEEK_API_KEY_ENV = 'DEEPSEEK_API_KEY';

// Types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
}

interface StreamResponse {
  type: 'reasoning' | 'text';
  content: string;
}

// Validation functions
function validateApiKey(): void {
  if (!process.env[DEEPSEEK_API_KEY_ENV]) {
    throw new Error(`Missing ${DEEPSEEK_API_KEY_ENV} environment variable`);
  }
}

function validateRequest(body: unknown): ChatRequest {
  if (!body || typeof body !== 'object') {
    throw new Error('Invalid request body');
  }

  const { messages, model } = body as Partial<ChatRequest>;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new Error('Messages array is required and cannot be empty');
  }

  for (const message of messages) {
    if (!message.role || !message.content) {
      throw new Error('Each message must have role and content');
    }
    if (!['user', 'assistant', 'system'].includes(message.role)) {
      throw new Error('Invalid message role');
    }
  }

  const selectedModel = model || DEFAULT_MODEL;
  if (!SUPPORTED_MODELS.includes(selectedModel as typeof SUPPORTED_MODELS[number])) {
    throw new Error(`Unsupported model: ${selectedModel}`);
  }

  return { messages, model: selectedModel };
}

// Main handler
export async function POST(request: NextRequest): Promise<Response> {
  try {
    // Validate environment
    validateApiKey();

    // Parse and validate request
    const body = await request.json();
    const { messages, model } = validateRequest(body);

    // Create streaming response
    const result = await streamText({
      model: deepseek(model!),
      messages,
    });

    // Create readable stream for response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const part of result.fullStream) {
            if (part.type === 'reasoning-delta') {
              const response: StreamResponse = {
                type: 'reasoning',
                content: part.text,
              };
              controller.enqueue(`data: ${JSON.stringify(response)}\n\n`);
            } else if (part.type === 'text-delta') {
              const response: StreamResponse = {
                type: 'text',
                content: part.text,
              };
              controller.enqueue(`data: ${JSON.stringify(response)}\n\n`);
            }
          }
          controller.enqueue('data: [DONE]\n\n');
          controller.close();
        } catch (error) {
          controller.error(error);
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 400 }
    );
  }
}