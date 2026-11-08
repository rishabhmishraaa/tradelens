// The real Claude client. Only imported (lazily) in live mode, so tests never construct it (F7.8).
// "server-only": importing this from a client component fails the build (F7.9, first line of defence).
import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { ReviewModel } from "./generate";
import { SYSTEM_PROMPT, userMessage } from "./review-input";
import { reviewSchema } from "./review-schema";

export function createLiveModel(apiKey: string, model: string): ReviewModel {
  // maxRetries 0: our own code decides retries (one retry only for invalid output).
  const client = new Anthropic({ apiKey, maxRetries: 0 });
  return {
    name: model,
    async generate(input, signal) {
      const message = await client.messages.create(
        {
          model,
          max_tokens: 1500,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage(input) }],
          // Structured outputs: Claude returns JSON matching the schema. We still validate it ourselves,
          // because grounding rules (real trade ids, every tag covered) can't be expressed in a schema.
          output_config: { format: zodOutputFormat(reviewSchema) },
        },
        { signal },
      );
      return message.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
    },
  };
}
