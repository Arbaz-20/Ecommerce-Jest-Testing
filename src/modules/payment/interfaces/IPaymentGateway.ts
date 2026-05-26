export interface PaymentGatewayResult {
  success: boolean;
  transactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

export interface IPaymentGateway {
  charge(
    amount: number,
    method: string,
    cardToken?: string
  ): Promise<PaymentGatewayResult>;
  refund(transactionId: string, amount: number): Promise<PaymentGatewayResult>;
}
