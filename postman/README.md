# Postman Collection — Ecommerce SOA

## Files

- `Ecommerce-SOA.postman_collection.json` — full API collection
- `Ecommerce-SOA.postman_environment.json` — local environment (`baseUrl = http://localhost:3000`)

## Import

1. Open Postman → **Import** → drag both JSON files.
2. Top-right environment dropdown → select **Ecommerce SOA — Local**.
3. Start the API: `npm run dev` (or `npm start` after `npm run build`).

## Suggested flow

The collection auto-captures variables between requests:

1. **Auth → Register** — captures `{{token}}` and `{{userId}}`
2. **Products → Create Product (admin)** — captures `{{productId}}`
   - Requires an admin user. Either seed one in the DB, or sign a token manually with `role: "admin"`.
3. **Orders → Create Order** — captures `{{orderId}}` and `{{orderTotal}}`
4. **Payments → Process Payment** — captures `{{paymentId}}`
   - Card tokens: `tok_visa_test` (success), `tok_fail` (declined), `tok_insufficient` (insufficient funds)
5. **Payments → Refund Payment** — refunds the captured payment

## Variables

Defined at collection scope so tests can write to them across requests:

| Variable      | Set by                          |
| ------------- | ------------------------------- |
| `token`       | Auth → Register / Login         |
| `userId`      | Auth → Register / Login         |
| `productId`   | Products → Create Product       |
| `orderId`     | Orders → Create Order           |
| `orderTotal`  | Orders → Create Order           |
| `paymentId`   | Payments → Process Payment      |
