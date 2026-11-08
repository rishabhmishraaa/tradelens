// Runs once when the server starts. D14: refuse to start with the mock AI in production.
import { assertSafeAiMode } from "./server/ai/choose-model";

export function register() {
  assertSafeAiMode(process.env);
}
