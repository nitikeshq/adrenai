export interface CheckoutRequest {
  cartId: string;
  idempotencyKey: string;
}

export function validateCheckout(request: CheckoutRequest): boolean {
  return request.cartId.length > 0 && request.idempotencyKey.length >= 16;
}
