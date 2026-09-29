'use client';

import { useState } from 'react';
import { useChat, experimental_useObject as useObject, useCompletion } from '@ai-sdk/react';
import { DefaultChatTransport, isToolOrDynamicToolUIPart, getToolOrDynamicToolName } from 'ai';
import { Message, MessageContent, Conversation, ConversationContent, ConversationScrollButton, PromptInput, PromptInputTextarea, PromptInputSubmit, Response, Loader, Actions, Action, Reasoning, ReasoningTrigger, ReasoningContent, Tool, ToolHeader, ToolContent, ToolInput, ToolOutput } from '../components/ai-elements';
import { recipeSchema } from '@/lib/recipe-schema';
import { Copy, RefreshCw, CookingPot } from 'lucide-react';

const EMPTY_INPUT = '';

export default function Home() {
  const [inputValue, setInputValue] = useState(EMPTY_INPUT);
  const [recipePrompt, setRecipePrompt] = useState(EMPTY_INPUT);

  const { messages, sendMessage, status, error, stop, regenerate, clearError } = useChat({
    transport: new DefaultChatTransport({
      api: process.env.NEXT_PUBLIC_API_ENDPOINT || '/api/chat',
      body: { model: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'deepseek-chat' },
    }),
  });

  const { object: recipe, submit: generateRecipe, isLoading: isRecipeLoading, error: recipeError, stop: stopRecipe } = useObject({
    api: '/api/recipe',
    schema: recipeSchema,
  });

  const { completion, complete: completePairing, isLoading: isCompletionLoading } = useCompletion({
    api: '/api/completion',
  });

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;
    clearError();
    sendMessage({ text: inputValue.trim() });
    setInputValue(EMPTY_INPUT);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const getMessageText = (message: (typeof messages)[number]) =>
    message.parts
      .filter((part) => part.type === 'text')
      .map((part) => (part.type === 'text' ? part.text : ''))
      .join('');

  const handleRecipeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!recipePrompt.trim() || isRecipeLoading) return;
    generateRecipe(recipePrompt.trim());
  };

  return (
    <div className="flex flex-col bg-background">
      <div className="flex-1 overflow-hidden">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 && status === 'ready' && (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <h2 className="text-xl font-semibold mb-2">Welcome to AI Chat</h2>
                <p className="text-sm">Start a conversation by typing a message below</p>
              </div>
            )}

            {messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {message.parts.map((part, index) => {
                        if (part.type === 'reasoning') {
                          return (
                            <Reasoning key={index} isStreaming={part.state === 'streaming'} defaultOpen={false}>
                              <ReasoningTrigger />
                              <ReasoningContent>{part.text}</ReasoningContent>
                            </Reasoning>
                          );
                        }
                        if (part.type === 'text') {
                          return message.role === 'assistant' ? (
                            <Response key={index}>{part.text}</Response>
                          ) : (
                            <div key={index} className="whitespace-pre-wrap">{part.text}</div>
                          );
                        }
                        if (isToolOrDynamicToolUIPart(part)) {
                          return (
                            <Tool key={part.toolCallId}>
                              <ToolHeader
                                type={`tool-${getToolOrDynamicToolName(part)}`}
                                state={part.state}
                              />
                              <ToolContent>
                                <ToolInput input={part.input} />
                                <ToolOutput
                                  output={
                                    part.state === 'output-available'
                                      ? JSON.stringify(part.output, null, 2)
                                      : undefined
                                  }
                                  errorText={part.state === 'output-error' ? part.errorText : undefined}
                                />
                              </ToolContent>
                            </Tool>
                          );
                        }
                        return null;
                      })}
                    </div>
                    <Actions>
                      {message.role === 'assistant' && (
                        <Action
                          tooltip="Copy"
                          label="Copy message"
                          onClick={() => copyToClipboard(getMessageText(message))}
                        >
                          <Copy className="size-4" />
                        </Action>
                      )}
                      {message.role === 'assistant' && (
                        <Action
                          tooltip="Regenerate"
                          label="Regenerate response"
                          onClick={() => regenerate()}
                        >
                          <RefreshCw className="size-4" />
                        </Action>
                      )}
                    </Actions>
                  </div>
                  {message.role === 'assistant' && status === 'streaming' && <Loader size={16} />}
                </MessageContent>
              </Message>
            ))}

            {error && (
              <Message from="assistant">
                <MessageContent className="bg-destructive/10 text-destructive">
                  <div className="flex items-center gap-2">
                    <span>Error: {error.message}</span>
                    <Action
                      tooltip="Retry"
                      label="Retry last message"
                      onClick={() => regenerate()}
                    >
                      <RefreshCw className="size-4" />
                    </Action>
                  </div>
                </MessageContent>
              </Message>
            )}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto p-4 space-y-4">
          <form onSubmit={handleRecipeSubmit} className="flex flex-wrap items-center gap-2">
            <input
              value={recipePrompt}
              onChange={(e) => setRecipePrompt(e.target.value)}
              placeholder="Recipe idea, e.g. vegetarian ramen"
              className="flex-1 min-w-56 rounded-md border bg-background px-3 py-2 text-sm"
              disabled={isRecipeLoading}
            />
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium hover:bg-accent disabled:opacity-50"
              disabled={!recipePrompt.trim() || isRecipeLoading}
            >
              <CookingPot className="size-4" />
              {isRecipeLoading ? 'Cooking…' : 'Build recipe'}
            </button>
            {isRecipeLoading && (
              <button
                type="button"
                onClick={() => stopRecipe()}
                className="rounded-md border px-3 py-2 text-sm hover:bg-accent"
              >
                Stop
              </button>
            )}
          </form>

          {recipeError && <p className="text-destructive text-sm">Recipe error: {recipeError.message}</p>}

          {recipe && (
            <div className="rounded-lg border bg-card p-4 text-sm">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-base">{recipe.name ?? 'Untitled recipe'}</h3>
                <span className="text-muted-foreground text-xs">
                  {recipe.servings ?? '?'} servings · prep {recipe.prepMinutes ?? '?'}m · cook {recipe.cookMinutes ?? '?'}m
                  {recipe.difficulty ? ` · ${recipe.difficulty}` : ''}
                </span>
              </div>
              {recipe.description && <p className="mt-1 text-muted-foreground">{recipe.description}</p>}

              {recipe.ingredients && recipe.ingredients.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Ingredients</h4>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    {recipe.ingredients.map((ingredient, index) => (
                      <li key={index}>
                        {ingredient?.amount} {ingredient?.name}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {recipe.steps && recipe.steps.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Steps</h4>
                  <ol className="mt-1 list-decimal pl-5 space-y-1">
                    {recipe.steps.map((step, index) => (
                      <li key={index}>{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {recipe.tips && recipe.tips.length > 0 && (
                <div className="mt-3">
                  <h4 className="font-medium text-xs uppercase tracking-wide text-muted-foreground">Tips</h4>
                  <ul className="mt-1 list-disc pl-5 space-y-1">
                    {recipe.tips.map((tip, index) => (
                      <li key={index}>{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-accent disabled:opacity-50"
                  disabled={isCompletionLoading || !recipe.name}
                  onClick={() => completePairing(`Serving suggestions for ${recipe.name}`)}
                >
                  {isCompletionLoading ? 'Thinking…' : 'Suggest pairings'}
                </button>
              </div>

              {completion && (
                <p className="mt-2 rounded-md bg-muted/50 p-3 text-muted-foreground">
                  <span className="font-medium text-foreground">Pairings: </span>
                  {completion}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="container mx-auto p-4 relative">
          <PromptInput onSubmit={handleSubmit} className="relative">
            <PromptInputTextarea
              className="w-full h-full"
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Type your message..."
              disabled={isLoading}
            />
            <div className="flex items-center p-2">
              <div className="flex items-center gap-2">
                {isLoading && (
                  <Action
                    tooltip="Cancel"
                    label="Cancel request"
                    onClick={() => stop()}
                  >
                    <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </Action>
                )}
              </div>
            </div>
            <PromptInputSubmit
              className="absolute bottom-1 right-1"
              disabled={!inputValue.trim() || isLoading}
              status={status === 'ready' ? undefined : status}
            />
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
