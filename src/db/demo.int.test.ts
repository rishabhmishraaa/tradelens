import { eq, sql } from "drizzle-orm";
import { beforeAll, describe, expect, it } from "vitest";
import { reviewSchema } from "@/server/ai/review-schema";
import { connect, type Db } from "./connect";
import { DEMO_REVIEW_MODEL } from "./demo-reviews";
import { sessionReviews } from "./schema";
import { seed } from "./seed";
import { databaseUrl } from "./targets";

let db: Db;
beforeAll(() => {
  db = connect(databaseUrl("test"));
});

const demoReviewRows = () =>
  db.execute(sql`SELECT session_date, model, review, created_at FROM session_reviews WHERE user_id = 'demo' ORDER BY session_date`);

describe("F8.3 the seed stores a pre-generated review for every demo session", () => {
  it("F8.3 one schema-valid review per demo session, labelled as a sample", async () => {
    await seed(db);
    const sessions = await db.execute(
      sql`SELECT DISTINCT (exit_at AT TIME ZONE 'Asia/Kolkata')::date::text AS d FROM trades WHERE user_id = 'demo' ORDER BY d`,
    );
    const reviews = await db.select().from(sessionReviews).where(eq(sessionReviews.userId, "demo"));
    expect(reviews.map((r) => r.sessionDate).sort()).toEqual(sessions.rows.map((r) => r.d));
    for (const r of reviews) {
      expect(r.model).toBe(DEMO_REVIEW_MODEL);
      expect(reviewSchema.safeParse(r.review).success, r.sessionDate).toBe(true);
    }
  });

  it("F8.3 re-seeding replaces the demo reviews with identical rows (idempotent)", async () => {
    const before = await demoReviewRows();
    await db.execute(sql`UPDATE session_reviews SET review = '{"summary":"tampered"}' WHERE user_id = 'demo' AND session_date = '2026-10-09'`);
    await seed(db);
    expect((await demoReviewRows()).rows).toEqual(before.rows);
  });
});
