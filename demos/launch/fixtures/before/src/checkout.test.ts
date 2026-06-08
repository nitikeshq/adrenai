import { describe, expect, it } from "vitest";
import { validateCheckout } from "./checkout.js";

describe("validateCheckout", () => {
  it("requires an idempotency key", () => {
    expect(validateCheckout({ cartId: "cart-1", idempotencyKey: "" })).toBe(false);
  });
});
