# Consider

Pause before you purchase. Upload a photo of something you want, wait 24 hours, then swipe right to buy or left to let it go, and track how much you've saved.

**Stack:** Next.js 16 (App Router, Cache Components) · TypeScript · Tailwind CSS v4 · MongoDB Atlas + Mongoose · Clerk · Cloudinary · Vercel

## Status

- **Phase 1 (done):** project setup, Clerk auth, MongoDB connection, `Item` model, Cloudinary utility, landing page, navigation.
- **Phase 2 (done):** item upload (signed direct-to-Cloudinary upload, server-verified item creation).
- **Phase 3+:** review deck, history.

## Prerequisites

- Node.js 20.9+ (developed on Node 24)
- Free accounts on MongoDB Atlas, Clerk, and Cloudinary

## 1. Install

```bash
npm install
cp .env.example .env.local
```

## 2. Configure services

### MongoDB Atlas
1. Sign up at https://www.mongodb.com/cloud/atlas/register and create a free **M0** cluster.
2. **Database Access**: add a database user with a password.
3. **Network Access**: add your IP. For Vercel, allow `0.0.0.0/0` or use Vercel's Atlas integration.
4. **Connect → Drivers**: copy the `mongodb+srv://...` string, insert the password, and add a database name before the `?`, e.g. `.../mindful-shopping?retryWrites=true&w=majority`.
5. Set it as `MONGODB_URI`.

### Clerk
1. Sign up at https://dashboard.clerk.com and create an application. Choose your sign-in methods, such as email or Google.
2. **API Keys**: copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
3. Keep `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in` and `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`.

> The app returns a 500 error ("Clerk keys are missing") on every page until these keys are set. To try the app without a Clerk account, `npx clerk@latest init` can write temporary development keys.

### Cloudinary
1. Sign up at https://cloudinary.com/users/register_free.
2. Open the dashboard (or **Settings → API Keys**) and copy the **Cloud name**, **API Key**, and **API Secret**.
3. Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.

Only the two `NEXT_PUBLIC_CLERK_*` keys and the sign-in/up URLs reach the browser. `MONGODB_URI`, `CLERK_SECRET_KEY` and the Cloudinary credentials are read only in `server-only` modules.

## 3. Run

```bash
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

## Deploying to Vercel

1. Push the repo to GitHub and import it in Vercel.
2. Add every variable from `.env.example` under **Project → Settings → Environment Variables**.
3. Make sure Atlas Network Access allows Vercel's IPs.

## Project structure

```
app/                  routes (landing, sign-in/up, upload, review, history)
components/           UI components
lib/mongodb.ts        cached Mongoose connection (safe for serverless)
lib/cloudinary.ts     server-only upload signing, lookup, delete
lib/validations.ts    Zod schemas shared by the form and API
lib/http.ts           JSON response helpers
lib/items.ts          document -> client DTO
lib/auth.ts           server-side Clerk user helpers
lib/constants.ts      waiting period, upload limits, field lengths
models/Item.ts        Item schema and indexes
types/item.ts         shared item types
proxy.ts              Clerk middleware (Next 16 renamed middleware.ts to proxy.ts)
```

## How image uploads work

Photos go straight from the browser to Cloudinary, so they never pass through a Vercel function and its ~4.5 MB request limit doesn't apply.

1. The browser checks the file type (JPEG/PNG/WebP) and size (≤ 5 MB).
2. `POST /api/uploads/signature` (requires sign-in) signs an upload for a server-chosen public ID, `mindful-shopping/<userId>/<uuid>`, limited to `jpg,png,webp`. The API secret stays on the server, and Cloudinary rejects signatures older than one hour.
3. The browser uploads the file to Cloudinary with that signature.
4. `POST /api/items` (requires sign-in) validates the fields with Zod. It checks that the public ID is in the user's folder, then fetches the real asset from Cloudinary's Admin API. It re-checks the format and size and stores Cloudinary's `secure_url`. Invalid images are deleted. `userId`, `status`, `decision`, `currency` and `availableAt` are set on the server, never taken from the client.

Known limitation: if a user uploads a photo and then abandons the form, the image stays in Cloudinary unused.

## How the 24-hour wait works

There is no cron job. Each item stores `availableAt = createdAt + 24h` as a UTC `Date`. The review queue queries `{ userId, status: "pending", availableAt: { $lte: now } }`, which is backed by a compound index.
