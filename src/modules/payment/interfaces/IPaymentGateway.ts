export interface PaymentGatewayResult {
  success: boolean;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPaymentGateway {
  Charge(
    amount: number,
    method: string,
    cardToken?: string
  ): Promise<PaymentGatewayResult>;
  Refund(transactionId: string, amount: number): Promise<PaymentGatewayResult>;
}
