import { describe, expect, it } from "vitest";

// F1.2 placeholder: proves Vitest and the @/ alias are wired up.
// Delete once real unit tests exist (F5).
import { APP_NAME } from "@/lib/constants";

describe("F1.2 unit test setup", () => {
  it("F1.2 runs and resolves the @/ alias", () => {
    expect(APP_NAME).toBe("TradeLens");
  });
});
