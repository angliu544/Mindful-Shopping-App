# Consider

Pause before you purchase. Snap a photo of something you want, wait 24 hours, then swipe right to buy or left to let it go, and see how much you've saved.

**Stack:** Next.js 16 (App Router, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · MongoDB Atlas + Mongoose · Auth.js (NextAuth v5) · Cloudinary · Vercel

## Features

- Sign up / sign in with **Google** or **email and password** (Auth.js).
- **Add an item** (`/upload`): add a photo (JPEG/PNG/WebP, ≤ 5 MB), name, price and an optional reason. The item becomes reviewable 24 hours later.
- **Review** (`/review`): one card at a time. Swipe right or press **Buy**; swipe left or press **Do Not Buy**. The ← / → keys also work, and you can undo the most recent decision. Signed-in visitors to `/` land here.
- **History** (`/history`): your Buy and Do Not Buy lists, the number reviewed, bought and skipped, and the total money saved.
- **Income settings** (`/settings`, also in the avatar menu): enter an hourly rate or a yearly salary. Cards and savings are then also shown as time worked (e.g. "≈ 3 h 5 min of work").

---

## 1. Prerequisites

- Node.js **20.9 or later** (Node 22 or 24 recommended)
- Free accounts on [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register) and [Cloudinary](https://cloudinary.com/users/register_free)
- A Google account, to create the OAuth client for "Continue with Google"

## 2. Install

```bash
git clone <your-repo-url> consider
cd consider
npm install
```

Then create `.env.local` in the project root with the variables below. `.env.local` is git-ignored; never commit real values.

## 3. Environment variables

| Variable | Where it's used | Description |
|---|---|---|
| `MONGODB_URI` | server only | Atlas connection string |
| `AUTH_SECRET` | server only | Encrypts Auth.js session cookies. Generate with `npx auth secret` or `openssl rand -base64 32`; use a different value per environment |
| `AUTH_GOOGLE_ID` | server only | Google OAuth client ID |
| `AUTH_GOOGLE_SECRET` | server only | Google OAuth client secret |
| `CLOUDINARY_CLOUD_NAME` | server + build | Your Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | server only | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | server only | Cloudinary API secret |
| `WAITING_PERIOD_SECONDS` | server only, optional | Overrides the 24-hour wait, in seconds (`0` = items are reviewable immediately). Useful for local testing or a demo deployment. Leave it unset for the real 24-hour pause. |
| `AUTH_TRUST_HOST` | server only, optional | Set to `true` only when running `next start` yourself (not on Vercel, which is trusted automatically) |

Example `.env.local`:

```bash
MONGODB_URI=
AUTH_SECRET=
AUTH_GOOGLE_ID=
AUTH_GOOGLE_SECRET=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
# WAITING_PERIOD_SECONDS=1
```

No variable is exposed to the browser. Secrets are read only on the server (`auth.ts`, `lib/mongodb.ts`, `lib/cloudinary.ts`). In a dashboard like Vercel, enter **only the value**, never `NAME=value`.

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

## 5. Authentication setup (Auth.js)

Users can sign in with Google or with an email and password. Both end up with the same kind of account: a document in the `users` collection, whose `_id` owns their items and settings.

### Session secret
Run `npx auth secret` (or `openssl rand -base64 32`) and set the result as `AUTH_SECRET`. Changing it signs everyone out.

### Google OAuth client
1. Open the [Google Cloud console](https://console.cloud.google.com/) and create (or pick) a project.
2. **APIs & Services → OAuth consent screen**: choose **External**, fill in the app name and your support email, and add the scopes `openid`, `email` and `profile`. While the app is in *Testing*, add your own Google account under **Test users**.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → *Web application*.
   - **Authorized JavaScript origins:** `http://localhost:3000` and, later, `https://<your-domain>`
   - **Authorized redirect URIs:** `http://localhost:3000/api/auth/callback/google` and, later, `https://<your-domain>/api/auth/callback/google`
4. Copy the **Client ID** into `AUTH_GOOGLE_ID` and the **Client secret** into `AUTH_GOOGLE_SECRET`.

### How accounts work
- **Email/password:** `/sign-up` posts to `POST /api/register`. Emails are lowercased; passwords need 8+ characters and are stored only as a bcrypt hash (cost 12). The new user is signed in straight away.
- **Sign-in errors** are always "Incorrect email or password.", whether the email or the password was wrong. Unknown emails take as long to check as real ones.
- **Google:** the first Google sign-in creates the user. A Google email must be verified by Google.
- **Same email, two methods:** accounts are **not linked**. If an email already has a password account, Google sign-in with that email is refused (and vice versa for registration). Since emails aren't verified yet, linking would let someone pre-register your address and share your account.

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
2. Sign up (with Google or email/password), then go to **Add item**. Pick a photo, enter a name and price, and submit. You'll see when the item becomes available.
   - The item appears in Atlas under `items` with `status: "pending"`, `decision: null` and `availableAt` 24 h after `createdAt` (UTC).
   - The photo appears in Cloudinary under `mindful-shopping/<your user id>/`.
3. Open **Review**. Swipe or use the buttons, and try **Undo**.
4. Open **History** to check the totals and money saved.
5. In the avatar menu, open **Income settings** and add an hourly rate or salary. The review cards and history now show work time.

**What `npm test` covers** (`tests/`, 111 tests):
- **Validation:** item fields, prices, image type and size, ObjectIds, decision values, income settings.
- **Work-time maths.**
- **Review logic** (against a real, in-memory MongoDB):
  - the queue only contains the user's ready items
  - decisions are atomic and can't be overwritten
  - exactly 1 of 10 simultaneous decisions wins
  - undo works, and history totals are correct
- **Authentication** (`tests/auth.test.ts`):
  - registration lowercases emails, stores only a bcrypt hash and never returns it
  - duplicate emails (any casing) and Google-account emails are rejected
  - field validation (email, 8+ char password, matching confirmation)
  - wrong password and unknown email give the same result; Google-only accounts can't use a password
  - Google sign-in creates/reuses the user, refuses unverified emails, never links to a password account, and puts the MongoDB user id in the session
  - `callbackUrl` can't redirect to another site
- **The real API route handlers, with the Auth.js session mocked:**
  - every route returns 401 when signed out
  - users can't decide, undo or see another user's items, even by putting a `userId` in the request
  - client-sent `userId`/`status`/`availableAt`/`imageUrl` are ignored
  - bad uploads are deleted
  - double submits create one item

## 8. Deploy to Vercel

1. Push the repository to GitHub, GitLab or Bitbucket.
2. In Vercel, choose **Add New → Project** and import the repo. The framework preset is **Next.js**; keep the default build settings.
3. **Settings → Environment Variables**: add every variable from the table above. Only add `WAITING_PERIOD_SECONDS` if you want a shorter wait (e.g. `0` for a demo); without it, items wait 24 hours.
   - Use a **new** `AUTH_SECRET` for production, not your local one.
   - `CLOUDINARY_CLOUD_NAME` is also read at build time, to restrict image optimization to your own cloud.
4. Make sure Atlas **Network Access** allows Vercel (step 4.3).
5. Deploy. After adding or changing environment variables, **redeploy**; they only apply to new deployments.

Already set up for Vercel:
- **Database connections:** `lib/mongodb.ts` reuses one connection across warm invocations and uses `@vercel/functions`' `attachDatabasePool` so idle connections close cleanly.
- **Security headers:** `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, HSTS (`next.config.ts`).
- **Uploads:** they go straight from the browser to Cloudinary, so Vercel's ~4.5 MB request-body limit doesn't apply.

## 9. Google sign-in in production

1. In the Google Cloud console, open your OAuth client and add your production URLs:
   - **Authorized JavaScript origins:** `https://<your-domain>` (for example `https://consider.vercel.app`)
   - **Authorized redirect URIs:** `https://<your-domain>/api/auth/callback/google`

   Each Vercel preview URL is different, so Google sign-in only works on the URLs you list. Email/password sign-in works everywhere.
2. **OAuth consent screen:** while it's in *Testing*, only listed test users can sign in with Google. Choose **Publish app** to open it to everyone (Google may ask for verification if you request more than the basic scopes).
3. In Vercel, set `AUTH_SECRET`, `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` for **Production**, then redeploy.
4. Check: open `https://<your-domain>/sign-in`, choose **Continue with Google**, and confirm you land on `/review`. Then sign out from the avatar menu.

If you previously used Clerk, delete the old `CLERK_*` and `NEXT_PUBLIC_CLERK_*` variables from Vercel; they're no longer used.

---

## How it works

### Security model
- **Authentication:** Auth.js with JWT sessions in an httpOnly cookie. `proxy.ts` (Next 16's name for middleware) redirects signed-out visitors away from `/upload`, `/review`, `/history` and `/settings`. Every page and API route **also** checks the session on the server (`lib/auth.ts`), so the redirect is never the only protection. Signed-out API calls get a JSON `401`.
- **Ownership:** every MongoDB query and update includes the `userId` from the Auth.js session (`session.user.id`, the MongoDB `users._id`). A `userId` sent by the client is never read. Another user's item answers exactly like a missing one (`404`).
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
| `GET` / `POST` | `/api/auth/*` | Auth.js (sign-in, callbacks, sign-out) |
| `POST` | `/api/register` | Create an email/password account |
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
auth.ts                 Auth.js config: Google + Credentials providers, callbacks
lib/auth.ts             server-side session helpers (requireUserId, getApiUserId)
lib/auth-actions.ts     server actions: Google sign-in, password sign-in, sign-out
lib/users.ts            registration, password check, Google account lookup
lib/mongodb.ts          cached Mongoose connection (serverless-safe)
lib/cloudinary.ts       server-only upload signing, lookup, delete
lib/items.ts            review queue, decisions, undo, history (all userId-scoped)
lib/settings.ts         income settings (userId-scoped)
lib/validations.ts      Zod schemas shared by forms and API
lib/income.ts           price → work time
models/                 Mongoose models: User, Item, UserSettings
types/                  shared types
proxy.ts                protects private pages; sends signed-in users from / to /review
tests/                  Vitest suites
```

### Known limitations
- If someone uploads a photo and then abandons the form, the image stays in Cloudinary unused.
- There's no rate limiting. A signed-in user could request many upload signatures. For a public launch, add rate limiting (e.g. Vercel Firewall rules or Upstash) and consider a Cloudinary upload quota.
- Creating an item uses one Cloudinary Admin API call (the free plan allows about 500 per hour).
- The internal storage names (`mindful-shopping` database default and Cloudinary folder) predate the rename to Consider. They're kept so existing data keeps working.

### Future improvements
- **Password reset** ("forgot password") by email. Not implemented yet.
- **Email verification** for email/password sign-ups. Not implemented yet; once it exists, Google and password accounts with the same verified email could be linked safely.
- **Rate limiting** sign-in and registration attempts, to slow down password guessing.
