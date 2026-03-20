'use client';

import { useState, useRef, useEffect } from 'react';
import { Message, MessageContent, Conversation, ConversationContent, ConversationScrollButton, PromptInput, PromptInputTextarea, PromptInputSubmit, Response, Loader, Actions, Action, CodeBlock, CodeBlockCopyButton } from '../components/ai-elements';
import { Copy, RefreshCw } from 'lucide-react';

const EMPTY_INPUT = '';
const LOADING_DELAY_MS = 500;

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

interface StreamResponse {
  type: 'reasoning' | 'text';
  content: string;
}

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState(EMPTY_INPUT);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState<string>(EMPTY_INPUT);
  const [streamingReasoning, setStreamingReasoning] = useState<string>(EMPTY_INPUT);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingMessage]);

  const processStreamResponse = async (
    reader: ReadableStreamDefaultReader<Uint8Array>,
    onStreamUpdate: (type: 'reasoning' | 'text', content: string) => void,
    onStreamComplete: (finalContent: string, finalReasoning: string) => void
  ) => {
    const decoder = new TextDecoder();
    let assistantContent = EMPTY_INPUT;
    let reasoningContent = EMPTY_INPUT;

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);

            if (data === '[DONE]') {
              onStreamComplete(assistantContent, reasoningContent);
              return;
            }

            try {
              const parsed: StreamResponse = JSON.parse(data);

              if (parsed.type === 'text') {
                assistantContent += parsed.content;
                onStreamUpdate('text', assistantContent);
              } else if (parsed.type === 'reasoning') {
                reasoningContent += parsed.content;
                onStreamUpdate('reasoning', reasoningContent);
              }
            } catch (e) {
              console.warn('Failed to parse stream chunk:', data);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error processing stream:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    setError(null);

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue(EMPTY_INPUT);
    setIsLoading(true);
    setStreamingMessage(EMPTY_INPUT);
    setStreamingReasoning(EMPTY_INPUT);

    abortControllerRef.current = new AbortController();

    try {
      await new Promise(resolve => setTimeout(resolve, LOADING_DELAY_MS));

      const response = await fetch(process.env.NEXT_PUBLIC_API_ENDPOINT || '/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(({ role, content }) => ({ role, content })),
          model: process.env.NEXT_PUBLIC_DEFAULT_MODEL || 'deepseek-chat',
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const reader = response.body?.getReader();

      if (reader) {
        await processStreamResponse(
          reader,
          (type, content) => {
            if (type === 'text') {
              setStreamingMessage(content);
            } else if (type === 'reasoning') {
              setStreamingReasoning(content);
            }
          },
          (finalContent, finalReasoning) => {
            const assistantMessage: ChatMessage = {
              id: (Date.now() + 1).toString(),
              role: 'assistant',
              content: finalContent,
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, assistantMessage]);
            setStreamingMessage(EMPTY_INPUT);
            setStreamingReasoning(EMPTY_INPUT);
          }
        );
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        setError(err.message);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  };

  const copyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const regenerateResponse = async (messageId: string) => {
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
    if (messageIndex === -1 || messageIndex === 0) return;

    const previousMessages = messages.slice(0, messageIndex);
    setMessages(previousMessages);

    const lastUserMessage = messages[messageIndex - 1];
    if (lastUserMessage) {
      setInputValue(lastUserMessage.content);
      handleSubmit(new Event('submit') as unknown as React.FormEvent);
    }
  };

  const cancelRequest = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setIsLoading(false);
    }
  };

  const parseMessageContent = (content: string) => {
    const codeBlockRegex = /```(\w+)?\n?([\s\S]*?)```/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
        });
      }

      const language: string = match[1] || 'text';
      const code = match[2]?.trim() || '';
      parts.push({
        type: 'code',
        language,
        code,
      });

      lastIndex = codeBlockRegex.lastIndex;
    }

    if (lastIndex < content.length) {
      parts.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    return parts;
  };

  const renderMessageContent = (content: string) => {
    const parts = parseMessageContent(content);

    return parts.map((part, index) => {
      if (part.type === 'code') {
        return (
          <CodeBlock
            key={index}
            code={part.code || ''}
            language={part.language || 'text'}
            showLineNumbers={true}
          >
            <CodeBlockCopyButton />
          </CodeBlock>
        );
      }
      return (
        <span key={index} className="whitespace-pre-wrap">
          {part.content}
        </span>
      );
    });
  };

  return (
    <div className="flex flex-col bg-background">
      <div className="flex-1 overflow-hidden">
        <Conversation>
          <ConversationContent>
            {messages.length === 0 && !isLoading && (
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
                      {message.role === 'assistant' ? (
                        <Response>{message.content}</Response>
                      ) : (
                        <div className="whitespace-pre-wrap">{message.content}</div>
                      )}
                    </div>
                    <Actions>
                      {message.role === 'assistant' && (
                        <Action
                          tooltip="Copy"
                          label="Copy message"
                          onClick={() => copyToClipboard(message.content)}
                        >
                          <Copy className="size-4" />
                        </Action>
                      )}
                      {message.role === 'assistant' && (
                        <Action
                          tooltip="Regenerate"
                          label="Regenerate response"
                          onClick={() => regenerateResponse(message.id)}
                        >
                          <RefreshCw className="size-4" />
                        </Action>
                      )}
                    </Actions>
                  </div>
                </MessageContent>
              </Message>
            ))}

            {streamingMessage && (
              <Message from="assistant">
                <MessageContent>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      {streamingReasoning && (
                        <div className="mb-2 p-2 bg-muted rounded text-sm">
                          <strong>Reasoning:</strong>
                          <div className="whitespace-pre-wrap">{streamingReasoning}</div>
                        </div>
                      )}
                      <div>{renderMessageContent(streamingMessage)}</div>
                    </div>
                    <Loader size={16} />
                  </div>
                </MessageContent>
              </Message>
            )}

            {error && (
              <Message from="assistant">
                <MessageContent className="bg-destructive/10 text-destructive">
                  <div className="flex items-center gap-2">
                    <span>Error: {error}</span>
                    <Action
                      tooltip="Retry"
                      label="Retry last message"
                      onClick={() => {
                        setError(null);
                        if (messages.length > 0) {
                          const lastUserMessage = messages[messages.length - 1];
                          if (lastUserMessage.role === 'user') {
                            setInputValue(lastUserMessage.content);
                            handleSubmit(new Event('submit') as unknown as React.FormEvent);
                          }
                        }
                      }}
                    >
                      <RefreshCw className="size-4" />
                    </Action>
                  </div>
                </MessageContent>
              </Message>
            )}

            <div ref={messagesEndRef} />
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      <div className="border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                    onClick={cancelRequest}
                  >
                    <div className="size-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  </Action>
                )}
              </div>
            </div>
            <PromptInputSubmit
              className="absolute bottom-1 right-1"
              disabled={!inputValue.trim() || isLoading}
              status={isLoading ? 'submitted' : undefined}
            />
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
