import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { convertToModelMessages, streamText } from 'ai';
import { ollama } from 'ollama-ai-provider-v2';

import { ProvideLinksToolSchema } from '~/lib/inkeep-qa-schema';

import type { Route } from './+types/chat';

const openai = createOpenAICompatible({
  name: 'inkeep',
  apiKey: process.env.INKEEP_API_KEY,
  baseURL: 'https://api.inkeep.com/v1'
});

export async function action({ request }: Route.LoaderArgs) {
  const reqJson = await request.json();

  const result = streamText({
    model: ollama('qwen3:30b'),
    tools: {
      provideLinks: {
        inputSchema: ProvideLinksToolSchema
      }
    },
    messages: await convertToModelMessages(reqJson.messages, {
      ignoreIncompleteToolCalls: true
    }),
    toolChoice: 'auto'
  });

  return result.toUIMessageStreamResponse();
}
