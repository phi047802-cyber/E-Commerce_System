export interface CreatePaymentParams {
  userId: string;
  walletId: string;
  amount: number;
  provider?: string;
}

export interface CreatePaymentResult {
  payment_id: string;
  gateway_ref: string;
  amount: number;
  provider: string;
  status: string;
  qr_url?: string;
  transfer_content: string;
  account_number?: string;
  bank_code?: string;
  account_name?: string;
  expires_at: Date;
  created_at: Date;
}

export interface IPaymentProvider {
  readonly name: 'simulator' | 'sepay';
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>;
}

export interface ConfirmPaymentInflowParams {
  transfer_content: string;
  actual_amount: number;
  external_transaction_id: string;
  provider: string;
  gateway_bank?: string;
  transfer_type?: 'in' | 'out';
  transaction_date?: string;
}

export interface ConfirmPaymentInflowResult {
  success: boolean;
  payment_id?: string;
  status: string;
  is_idempotent_replay: boolean;
  wallet_balance_after?: number;
  message: string;
  alert_id?: number | string;
  warning?: string;
}
