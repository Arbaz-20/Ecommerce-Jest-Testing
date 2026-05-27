import { generateId } from '../../shared/utils';
import { IPaymentGateway, PaymentGatewayResult } from './interfaces/IPaymentGateway';

export class PaymentGateway implements IPaymentGateway {
  async Charge(
    amount: number,
    _method: string,
    cardToken?: string
  ): Promise<PaymentGatewayResult> {
    if (cardToken === 'tok_fail') {
      return {
        success: false,
        errorCode: 'CARD_DECLINED',
        errorMessage: 'Card was declined by the issuer',
      };
    }

    if (cardToken === 'tok_insufficient') {
      return {
        success: false,
        errorCode: 'INSUFFICIENT_FUNDS',
        errorMessage: 'Insufficient funds',
      };
    }

    if (amount > 10000) {
      return {
        success: false,
        errorCode: 'AMOUNT_TOO_LARGE',
        errorMessage: 'Transaction amount exceeds limit',
      };
    }

    return {
      success: true,
      transactionId: `txn_${generateId().slice(0, 12)}`,
    };
  }

  async Refund(_transactionId: string, _amount: number): Promise<PaymentGatewayResult> {
    return {
      success: true,
      transactionId: `ref_${generateId().slice(0, 12)}`,
    };
  }
}
