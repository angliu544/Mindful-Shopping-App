# Consider

Pause before you purchase. Snap a photo of something you want, wait 24 hours, then swipe right to buy or left to let it go, and see how much you've saved.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · MongoDB Atlas + Mongoose · Clerk · Cloudinary · Vercel

## Features

- Sign up / sign in with Clerk.
- **Add an item** (`/upload`): add a photo (JPEG/PNG/WebP, ≤ 5 MB), name, price and an optional reason. The item becomes reviewable 24 hours later.
- **Review** (`/review`): one card at a time. Swipe right or press **Buy**; swipe left or press **Do Not Buy**. The ← / → keys also work, and you can undo the most recent decision. Signed-in visitors to `/` land here.
- **History** (`/history`): your Buy and Do Not Buy lists, the number reviewed, bought and skipped, and the total money saved.
- **Income settings** (`/settings`, also in the avatar menu): enter an hourly rate or a yearly salary. Cards and savings are then also shown as time worked (e.g. "≈ 3 h 5 min of work").

---

## 1. Prerequisites

- Node.js **20.9 or later** (Node 22 or 24 recommended)
- Free accounts on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register), [Clerk](https://dashboard.clerk.com/sign-up) and [Cloudinary](https://cloudinary.com/users/register_free)

## 2. Install

```bash
git clone <your-repo-url> consider
cd consider
npm install
cp .env.example .env.local
```

Then fill in `.env.local` as described below. `.env.local` is git-ignored; never commit real values.

## 3. Environment variables

| Variable | Where it's used | Description |
|---|---|---|
| `MONGODB_URI` | server only | Atlas connection string |
| `CLERK_SECRET_KEY` | server only | Clerk secret key (`sk_test_…` / `sk_live_…`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | browser | Clerk publishable key (`pk_test_…` / `pk_live_…`) |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | browser | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | browser | `/sign-up` |
| `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL` | browser | `/review`: where users go after signing in |
| `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL` | browser | `/review`: where users go after signing up |
| `CLOUDINARY_CLOUD_NAME` | server + build | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | server only | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | server only | Cloudinary API secret |
| `WAITING_PERIOD_SECONDS` | dev only, optional | Shortens the 24-hour wait for local testing. **Ignored in production builds. Don't set it on Vercel.** |

Only `NEXT_PUBLIC_*` values reach the browser. Everything else is read only in `server-only` modules (`lib/mongodb.ts`, `lib/cloudinary.ts`).

## 4. MongoDB Atlas setup

1. Create a project and a free **M0** cluster.
2. **Database Access → Add New Database User**: choose password authentication and give the user the *Read and write to any database* role. Use a strong password without `@ : / ?` (or URL-encode them).
3. **Network Access → Add IP Address**:
   - **Local development:** add your current IP.
   - **Vercel:** Vercel functions don't have fixed IPs, so allow `0.0.0.0/0`. Access is still protected by the database user's password. Alternatively, use the MongoDB Atlas integration on the Vercel Marketplace, which manages this for you.
4. **Connect → Drivers**: copy the `mongodb+srv://…` string and put in your password. Add a database name before the `?`, for example:
   ```
   mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/consider?retryWrites=true&w=majority
   ```
   If you leave the database name out, the app uses `mindful-shopping`.
5. Set it as `MONGODB_URI`.

Collections (`items`, `usersettings`) and their indexes are created automatically on first use.

## 5. Clerk setup (development)

1. In the [Clerk dashboard](https://dashboard.clerk.com) create an application. Choose sign-in methods such as email + password or Google.
2. **Configure → API Keys**: use the **copy** buttons for the Publishable key (`pk_test_…`) and the Secret key (`sk_test_…`).
   > Copy the secret key with the copy button. If you copy the masked `••••` text, sign-in will loop back to the sign-in page.
3. Put them in `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`, and keep the four `NEXT_PUBLIC_CLERK_*_URL` values from `.env.example`.

## 6. Cloudinary setup

1. Open the [Cloudinary console](https://console.cloudinary.com).
2. **Settings → Product environment**: copy the **Cloud name**. This is the environment's ID, not a display name.
3. **Settings → API Keys**: copy an **API Key** and **API Secret** from the same environment. The key needs permission to **upload, read (Admin API) and delete** assets. A restricted key fails with `403 … missing permissions`.
4. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

No upload preset is needed: uploads are signed by the server.

## 7. Run and test locally

```bash
npm run dev        # http://localhost:3000
npm test           # unit + integration tests (in-memory MongoDB, no accounts needed)
npm run lint
npm run typecheck
npm run build      # production build
```

> Only one `next dev` can run per project. If you change `.env.local`, restart the dev server.

The first `npm test` downloads a MongoDB binary for the in-memory database (about 100 MB, cached afterwards).

**Manual walkthrough:**
1. (Optional) set `WAITING_PERIOD_SECONDS=1` in `.env.local` so new items are reviewable straight away, then restart `npm run dev`.
2. Sign up, then go to **Add item**. Pick a photo, enter a name and price, and submit. You'll see when the item becomes available.
   - The item appears in Atlas under `items` with `status: "pending"`, `decision: null` and `availableAt` 24 h after `createdAt` (UTC).
   - The photo appears in Cloudinary under `mindful-shopping/<your user id>/`.
3. Open **Review**. Swipe or use the buttons, and try **Undo**.
4. Open **History** to check the totals and money saved.
5. In the avatar menu, open **Income settings** and add an hourly rate or salary. The review cards and history now show work time.

**What `npm test` covers** (`tests/`, 71 tests):
- **Validation:** item fields, prices, image type and size, ObjectIds, decision values, income settings.
- **Work-time maths.**
- **Review logic** (against a real, in-memory MongoDB):
  - the queue only contains the user's ready items
  - decisions are atomic and can't be overwritten
  - exactly 1 of 10 simultaneous decisions wins
  - undo works, and history totals are correct
- **The real API route handlers, with Clerk mocked:**
  - every route returns 401 when signed out
  - users can't decide, undo or see another user's items, even by putting a `userId` in the request
  - client-sent `userId`/`status`/`availableAt`/`imageUrl` are ignored
  - bad uploads are deleted
  - double submits create one item

## 8. Deploy to Vercel

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repo. The framework preset is **Next.js**; keep the default build settings.
3. **Settings → Environment Variables**: add every variable from the table above **except** `WAITING_PERIOD_SECONDS`.
   - **Production** environment: use your Clerk **production** keys (see below).
   - **Preview** environment: you can use the development keys.
   - `CLOUDINARY_CLOUD_NAME` is also read at build time, to restrict image optimization to your own cloud.
4. Make sure Atlas **Network Access** allows Vercel (step 4.3).
5. Deploy. After adding or changing environment variables, **redeploy**; they only apply to new deployments.

Already set up for Vercel:
- **Database connections:** `lib/mongodb.ts` reuses one connection across warm invocations and uses `@vercel/functions`' `attachDatabasePool` so idle connections close cleanly.
- **Security headers:** `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS (`next.config.ts`).
- **Uploads:** they go straight from the browser to Cloudinary, so Vercel's ~4.5 MB request-body limit doesn't apply.

## 9. Clerk production setup and redirects

Clerk development keys (`pk_test_`/`sk_test_`) are for development only and show a "Development mode" badge. For a real launch:

1. **Create a production instance.** In the Clerk dashboard, switch the instance toggle from *Development* to *Production* and create the production instance (you can clone the development settings).
2. **Use your own domain.** Clerk production instances need a domain you own; a `*.vercel.app` domain can't be used.
   - Add the domain to your Vercel project (**Settings → Domains**).
   - In Clerk, open **Configure → Domains**, enter that domain, and add the **DNS records** (CNAMEs) Clerk lists at your DNS provider.
   - Wait until Clerk shows the domain as verified and SSL as issued.
3. **Set the paths and redirects.** In Clerk, under **Configure → Paths**, set:
   - Sign-in page: `https://<your-domain>/sign-in` (the app's own page, not the Account Portal)
   - Sign-up page: `https://<your-domain>/sign-up`
   - After sign-in and after sign-up fallback: `/review`
   - After sign-out: `/`

   Also set the matching env vars in Vercel's **Production** environment: `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`, `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up` and both `…_FALLBACK_REDIRECT_URL=/review`. Even without them, a signed-in user who lands on `/` is sent to `/review` by `proxy.ts`.
4. **Social sign-in.** If you use social providers (Google, etc.) in production, enter your own OAuth client ID and secret for each one under **Configure → SSO connections**; Clerk's shared dev credentials don't work in production. Add the redirect URI Clerk shows to each provider's console.
5. **Production keys in Vercel.** Copy the production `pk_live_…` and `sk_live_…` keys into Vercel's **Production** environment variables, then redeploy.
6. **Check.** Open `https://<your-domain>`, sign up, and confirm you land on `/review`. Production users are a separate user base from development users.

---

## How it works

### Security model
- **Authentication:** `proxy.ts` (Next 16's name for middleware) redirects signed-out visitors away from private pages. Every page and API route **also** checks the Clerk session on the server (`lib/auth.ts`), so the redirect is never the only protection. Signed-out API calls get a JSON `401`.
- **Ownership:** every MongoDB query and update includes the `userId` from the Clerk session. A `userId` sent by the client is never read. Another user's item answers exactly like a missing one (`404`).
- **Decisions** are a single atomic `findOneAndUpdate` that matches only when the item belongs to the user, is `pending`, and `availableAt <= now`. Double taps, two tabs or replayed requests can succeed at most once (`409` afterwards).
- **Validation:** Zod schemas in `lib/validations.ts` are shared by the forms and the API, and unknown fields are stripped. ObjectIds and `"buy" | "skip"` are validated before any query runs.

### Image uploads
1. The browser checks the type (JPEG/PNG/WebP) and size (≤ 5 MB).
2. `POST /api/uploads/signature` signs an upload for a **server-chosen** public ID, `mindful-shopping/<userId>/<uuid>`, limited to `jpg,png,webp`. Cloudinary rejects tampered or expired (> 1 h) signatures. The API secret never leaves the server.
3. The browser uploads the file directly to Cloudinary.
4. `POST /api/items` checks that the public ID is in the user's folder, then fetches the real asset from Cloudinary's Admin API. It re-checks the format and size, stores Cloudinary's `secure_url` (never a client-supplied URL), and deletes images that fail. A unique index on `imagePublicId` stops a double submit from creating two items.

### The 24-hour wait
There is no cron job. Each item stores `availableAt = now + 24h` as a BSON `Date` (always UTC). The review queue queries `{ userId, status: "pending", availableAt: { $lte: now } }`, backed by a compound index. Dates are rendered in each viewer's own time zone in the browser (`components/LocalDate.tsx`).

### API
| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/uploads/signature` | Signed parameters for a direct Cloudinary upload |
| `POST` | `/api/items` | Create an item after the upload |
| `GET` | `/api/items` | Items ready for review, plus when the next one is ready |
| `POST` | `/api/items/:id/decision` | `{ "decision": "buy" \| "skip" }` |
| `DELETE` | `/api/items/:id/decision` | Undo a decision |
| `GET` | `/api/history` | Reviewed items and totals |
| `GET` / `PUT` / `DELETE` | `/api/settings` | Income settings |

### Project structure
```
app/                    pages: / (landing), upload, review, history, settings, sign-in, sign-up
app/api/                route handlers (table above)
components/             UI (ItemUploadForm, ReviewDeck, SwipeCard, HistoryView, IncomeSettingsForm, …)
lib/auth.ts             server-side Clerk helpers
lib/mongodb.ts          cached Mongoose connection (serverless-safe)
lib/cloudinary.ts       server-only upload signing, lookup, delete
lib/items.ts            review queue, decisions, undo, history (all userId-scoped)
lib/settings.ts         income settings (userId-scoped)
lib/validations.ts      Zod schemas shared by forms and API
lib/income.ts           price → work time
models/                 Mongoose models: Item, UserSettings
types/                  shared types
proxy.ts                Clerk middleware + signed-in redirect from /
tests/                  Vitest suites
```

### Known limitations
- If someone uploads a photo and then abandons the form, the image stays in Cloudinary unused.
- There's no rate limiting. A signed-in user could request many upload signatures. For a public launch, add rate limiting (e.g. Vercel Firewall rules or Upstash) and consider a Cloudinary upload quota.
- Creating an item uses one Cloudinary Admin API call (the free plan allows about 500 per hour).
- The internal storage names (`mindful-shopping` database default and Cloudinary folder) predate the rename to Consider. They're kept so existing data keeps working.
