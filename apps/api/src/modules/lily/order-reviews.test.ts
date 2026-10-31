import { describe, expect, it } from "vitest";
import { orderReviewSchema } from "./order-reviews";

describe("avaliação por dimensões do pedido", () => {
  it("aceita uma ou mais dimensões com nota e comentário opcional", () => {
    expect(orderReviewSchema.safeParse({ store: { rating: 5 }, platform: { rating: 4, comment: "Tudo certo" } }).success).toBe(true);
  });

  it("exige pelo menos uma dimensão e notas entre um e cinco", () => {
    expect(orderReviewSchema.safeParse({}).success).toBe(false);
    expect(orderReviewSchema.safeParse({ delivery: { rating: 0 } }).success).toBe(false);
    expect(orderReviewSchema.safeParse({ store: { rating: 6 } }).success).toBe(false);
    expect(orderReviewSchema.safeParse({ store: { rating: 5, comment: "x".repeat(501) } }).success).toBe(false);
  });
});
