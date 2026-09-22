# Vendly Payment Implementation & Setup

Vendly uses a custom **Escrow (Hold-and-Release)** payment flow powered by Paystack.

This documentation outlines how payments are processed, held, and settled, along with the setup required to run this flow.

## 1. Flow Overview

1. **Checkout (Escrow Hold)**:
   - The buyer checks out. The platform initializes a transaction with Paystack for the total amount.
   - We **do not** use Paystack's auto-split (subaccount) feature. The full amount is collected into the platform's main Paystack balance.
2. **Payment Success**:
   - The `charge.success` webhook fires.
   - The system calculates the platform fee and the net seller payout.
   - The seller's `pending_balance` (Escrow) is credited. The funds are _not_ immediately available to the seller.
3. **Delivery (Escrow Release)**:
   - When the order status is updated to `DELIVERED` (either by the admin or the seller), the escrow is released.
   - The system moves the funds from the seller's `pending_balance` to their `available_balance`.
   - A `Payout` record is created, and the system attempts an automatic transfer via the Paystack Transfers API (if the payout mode is AUTO).
4. **Settlement**:
   - The `transfer.success` webhook fires.
   - The Payout status is marked as `SUCCESS` and the seller is notified.

_Note: If the seller's payout mode is `MANUAL` or if the automatic transfer fails, the admin can manually process the payout from the Admin Dashboard._

## 2. Paystack Setup Requirements

To make this flow work, you must configure the following in your Paystack dashboard.

### API Keys

Provide your Paystack Secret Key in the `.env` file of the `api` app:

```env
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Webhooks

You must configure your webhook URL in the Paystack Dashboard:
`https://<your-api-domain>/payments/webhook`

Paystack must send the following events for the system to function:

- `charge.success` (Handles order payments and wallet top-ups)
- `transfer.success` (Handles final settlement of payouts to sellers)
- `transfer.failed` (Alerts the system if a payout bounces)
- `refund.processed` / `refund.failed` (Handles order refunds)

### Transfers & Balance

Since Vendly initiates transfers from the platform balance to seller bank accounts, you must ensure:

- Your Paystack account is activated to use the **Transfers API**.
- You have sufficient funds in your Paystack balance to cover payouts (funds collected from checkouts automatically sit in your balance).

## 3. Manual Payouts & Administration

If a seller's payout fails (e.g., invalid bank details) or if you prefer to manually control payouts, they will appear in the Admin Dashboard (`/dashboard/payments`) under the **Payouts** tab.

- Click **Process Transfer** on a payout to trigger the Paystack Transfers API.
- If the transfer is successful, Paystack will instantly credit the seller's bank account, and the system will update the record.

## 4. Seller Bank Details

Sellers must provide their bank details (Bank Code and Account Number) in their Vendly store profile.

- The system uses these details to generate a **Transfer Recipient** on the fly via Paystack's API before initiating the transfer.
- If a seller does not provide these details, their funds will sit securely in their Vendly wallet (`available_balance`) until the details are provided or the admin settles it manually.
