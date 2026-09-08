# Loops.so Integration & Newsletter Architecture

> **Executive Summary**: Verndly integrates [Loops](https://loops.so) — the modern email marketing, audience management, and event automation platform. This document outlines the technical architecture, data pipelines, audience schema, event triggers, and compliance standards governing user subscriptions from authentication pages and storefront touchpoints.

---

## 1. System Architecture & Flow

```mermaid
flowchart TD
    subgraph Client [Client-Side Touchpoints]
        RegForm["Auth Page: Registration (/register)"]
        OAuth["Auth Page: Google OAuth"]
        Footer["Storefront: Newsletter Footer"]
        Contact["Support: Contact Form"]
    end

    subgraph API [Verndly NestJS API (apps/api)]
        AuthSvc["AuthService"]
        OAuthSvc["OAuthService"]
        ContactSvc["ContactService"]
        LoopsSvc["LoopsService"]
        DB[(PostgreSQL Prisma)]
    end

    subgraph LoopsPlatform [Loops.so Platform]
        Audience["Audience / Contacts API"]
        Events["Event Pipeline (/events/send)"]
        AutoLoops["Automated Loops (Drips & Sequences)"]
        Campaigns["Newsletter Campaigns"]
    end

    RegForm -->|"{ marketing_opt_in: true }"| AuthSvc
    OAuth -->|Google Profile| OAuthSvc
    Footer -->|"{ email }"| ContactSvc
    Contact -->|"{ name, email, message }"| ContactSvc

    AuthSvc -->|upsert| DB
    AuthSvc -->|createOrUpdateContact| LoopsSvc
    AuthSvc -->|sendEvent 'signup_completed'| LoopsSvc

    OAuthSvc -->|createOrUpdateContact| LoopsSvc
    OAuthSvc -->|sendEvent 'signup_completed'| LoopsSvc

    ContactSvc -->|create / update| DB
    ContactSvc -->|createOrUpdateContact| LoopsSvc
    ContactSvc -->|sendEvent 'newsletter_subscribed'| LoopsSvc

    LoopsSvc -->|HTTP REST /contacts/create or /update| Audience
    LoopsSvc -->|HTTP REST /events/send| Events

    Events --> AutoLoops
    Audience --> Campaigns
```

---

## 2. Configuration & Environment Variables

| Variable | Required | Default | Description |
| :--- | :--- | :--- | :--- |
| `LOOPS_API_KEY` | **Production Only** | `""` | Secret API key generated in the Loops dashboard under **Settings → API Keys**. When empty, the system operates in resilient **mock mode** (logging interactions without network calls). |
| `FRONTEND_URL` | Yes | `https://verndly.com` | Base storefront URL for dynamic link generation in email templates. |

### Adding to Environment Files
In `apps/api/.env`:
```env
LOOPS_API_KEY=your_loops_api_key_here
```

In `render.yaml` or AWS SSM / Secret Manager for production:
```yaml
- key: LOOPS_API_KEY
  sync: false
```

---

## 3. Data Schema & Audience Mapping

Every user synchronized to Loops receives standard profile attributes mapped to Verndly's domain entities:

### Contact Properties

| Property | Type | Source | Description |
| :--- | :--- | :--- | :--- |
| `email` | `string` | User / Form | Primary key (normalised to lowercase). |
| `firstName` | `string` | Full Name | Parsed first token from full name. |
| `lastName` | `string` | Full Name | Remaining tokens from full name. |
| `userId` | `string (UUID)` | PostgreSQL | Verndly internal user ID for cross-system telemetry. |
| `phone` | `string` | Normalized E.164 | Verified Ghana telephone number (e.g. `+233240000000`). |
| `userGroup` | `string` | Account Type | Categorization tag: `Buyer`, `Seller`, `Lead`, or `Contact`. |
| `source` | `string` | Origin | Channel where contact entered: `Auth Registration`, `Google OAuth`, `Storefront Newsletter`, or `Contact Form`. |
| `subscribed` | `boolean` | User Choice | `true` if user selected the marketing opt-in or joined newsletter; `false` otherwise. |

---

## 4. Custom Event Triggers

Events allow you to trigger automated email sequences (**Loops**) inside Loops.so based on user lifecycle moments:

### 1. `signup_completed`
Triggered immediately after user registration (both email and Google OAuth).

**Payload**:
```json
{
  "accountType": "SELLER",
  "storeName": "Accra Threads",
  "marketingOptIn": true,
  "authMethod": "password"
}
```

### 2. `newsletter_subscribed`
Triggered when a visitor or customer subscribes via the storefront newsletter form.

**Payload**:
```json
{
  "source": "Storefront Newsletter"
}
```

### 3. `contact_form_submitted`
Triggered when an inquiry is submitted via the Contact form.

**Payload**:
```json
{
  "subject": "Wholesale inquiries"
}
```

---

## 5. Setting Up Automated Loops in the Loops Dashboard

To activate automated email journeys in [app.loops.so](https://app.loops.so):

### Journey 1: New Seller Onboarding Sequence
1. Navigate to **Loops → New Loop**.
2. **Trigger**: Select **Event** → `signup_completed`.
3. **Filter**: Add condition `userGroup equals "Seller"`.
4. **Step 1 (Immediate)**: Send *Welcome to Verndly Commerce — Setting Up Your Storefront*.
5. **Step 2 (Wait 24h)**: Send *3 Steps to Receiving Your First Mobile Money Payout*.
6. **Step 3 (Wait 3 days)**: Send *How Top Merchants Drive Traffic via WhatsApp & Instagram*.

### Journey 2: New Buyer Onboarding Sequence
1. Navigate to **Loops → New Loop**.
2. **Trigger**: Select **Event** → `signup_completed`.
3. **Filter**: Add condition `userGroup equals "Buyer"`.
4. **Step 1 (Immediate)**: Send *Welcome to Verndly — Discover Verified Campus Drops*.

### Journey 3: Weekly Commerce Insights (Campaign)
1. Navigate to **Campaigns → New Campaign**.
2. **Recipient Segment**: `subscribed equals true`.
3. Compose the weekly product drop or merchant growth guide.

---

## 6. Endpoints & API Reference

### Newsletter Subscription
- **Route**: `POST /contact/newsletter`
- **Body**:
  ```json
  {
    "email": "customer@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "status": "subscribed"
  }
  ```

### Newsletter Unsubscribe
- **Route**: `POST /contact/newsletter/unsubscribe`
- **Body**:
  ```json
  {
    "email": "customer@example.com"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "status": "unsubscribed"
  }
  ```

---

## 7. Reliability, Resilience & Error Isolation

1. **Non-Blocking Architecture**:
   All Loops operations are executed asynchronously (`Promise.then().catch()`) without blocking the primary HTTP response. If Loops is down or experiences high latency, customer registration and checkout proceed without interruption.
2. **Built-in Timeout**:
   Every HTTP request to Loops uses native Node.js `fetch` wrapped in an `AbortController` with a **5,000ms hard ceiling**.
3. **Idempotent Contact Upsert**:
   The service issues `POST /contacts/create`. If Loops returns `409 Conflict` (contact exists), the service automatically falls back to `PUT /contacts/update` with identical payload.
4. **Safe Mock Mode**:
   If `LOOPS_API_KEY` is not present, `LoopsService.isConfigured()` returns `false`, safely recording debug logs in development without making outbound requests.

---

## 8. Compliance & Privacy

- **Consent Record**: Explicit opt-in checkbox on the registration page (`marketing_opt_in`) ensures affirmative consent under the **Ghana Data Protection Act 2012 (Act 843)** and international standards (GDPR).
- **Dual Status Persistence**: Subscriptions are recorded locally in the `newsletter_subscribers` table in PostgreSQL as well as in Loops.
- **Instant Unsubscribe**: Unsubscribe requests update the local database (`is_active = false`) and simultaneously sync `subscribed: false` to Loops.
