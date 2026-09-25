# Foodlink

A real-time food rescue platform that connects surplus food from donors to NGOs and shelters, and gets it moved by volunteer drivers before it spoils.

**Live demo: [foodlink-iota.vercel.app](https://foodlink-iota.vercel.app)**

## The problem

Edible surplus food is thrown away while people nearby go hungry. The hard part is not finding a shelter, it is finding one that can be reached *before the food becomes unsafe*, that has room for it, and that accepts that kind of food. Foodlink treats that deadline as the central constraint rather than an afterthought.

## What it does

Three roles share one live network:

- **Donors** (restaurants, canteens, event caterers) post surplus food with a quantity, a type and a safe-until time. The pickup address is geocoded so distances are real.
- **NGOs and shelters** browse what is available nearby and request what they can take. The donor accepts or rejects.
- **Volunteer drivers** claim accepted requests and move through a delivery checklist: en route, arrived, collected, arrived at the shelter, delivered.

Alongside that:

- **Matching Center** scores every available donation against every NGO. A recipient must first clear hard gates — it must be accepting deliveries, have enough capacity, accept that food type, and be reachable before the safe-until time. Only recipients that pass are scored and ranked, on proximity, the time margin on arrival, and how well the quantity fits their capacity. When nothing is feasible the page says which gate each recipient failed instead of showing a weak match.
- **Impact analytics** are derived from completed deliveries, never hard-coded: meals rescued, food diverted, CO₂e avoided, deliveries completed, and how much food is currently within two hours of expiring.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript |
| UI | Tailwind CSS 4, Recharts, Lucide icons |
| Database | Supabase (Postgres) with row level security |
| Auth | Supabase Auth, email and password |
| Geocoding | OpenStreetMap Nominatim |
| Hosting | Vercel |

## Data model

Four tables, all defined in [`supabase/schema.sql`](supabase/schema.sql):

- `profiles` — one row per account, linked to `auth.users`, holding the role (`donor`, `ngo`, `volunteer`), location and, for NGOs, capacity and accepted food types.
- `food_donations` — what a donor has posted, including `expiry_time` and coordinates.
- `food_requests` — an NGO asking for a donation. A unique constraint on `(food_id, ngo_id)` stops duplicate requests.
- `pickups` — a volunteer's delivery run against one accepted request, with a timestamp per stage.

Two database rules do work the application would otherwise have to remember:

- A trigger on `auth.users` creates the matching `profiles` row from the signup metadata, so an account can never exist without a profile.
- A trigger on `pickups` closes out the request and the donation when a delivery completes, in the same transaction, which also means a volunteer needs no write access to either table.

Row level security is enabled on all four tables. Reads require a signed-in user, because pickup addresses and contact details are personal data. Writes are restricted to the owning user, so a donor can only post as themselves and a volunteer can only advance their own pickup.

The landing page still needs to show totals to visitors who are not signed in. Rather than opening up the tables, `impact_stats()` is a `security definer` function that returns only aggregate counts, and it is the one thing the anonymous role is allowed to execute.

## Running it locally

```bash
git clone https://github.com/p7yush/Foodlink.git
cd Foodlink
npm install
```

Create a Supabase project, then run the contents of `supabase/schema.sql` in the SQL editor. It is safe to run more than once.

For an existing Supabase project, also run `supabase/order-handoff-verification.sql` once in the SQL editor. It adds donor pickup and NGO receipt confirmations used by order tracking.

To fill an empty database with a worked example, sign up the six accounts listed at the top of [`supabase/seed.sql`](supabase/seed.sql), then run that file. It seeds a network that covers every stage of the rescue flow — food still available, a request awaiting the donor's decision, a run waiting for a volunteer, a delivery in progress and one completed delivery so the impact figures are not zero. It is also safe to run more than once.

Copy the environment template and fill in your project's URL and anon key:

```bash
cp .env.example .env.local
```

Then start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and sign up three accounts, one per role, to see the full flow.

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build, including type checking |
| `npm run lint` | ESLint |
| `npm test` | Unit tests for the matching and impact logic |

## Tests

The matching algorithm and the impact maths are pure functions with no I/O, so they are tested directly. The suite covers the rules that matter rather than chasing coverage:

- A shelter that cannot be reached before the safe-until time is rejected even when it is the closest.
- A shelter is never offered food it does not accept, and no shelter is offered more than it can hold.
- An infeasible recipient is excluded outright rather than ranked last.
- Impact counts only deliveries that actually completed, and ignores a completed pickup whose donation no longer exists.
- Weight and emissions are derived from the named constants, so the headline figures cannot drift from the stated assumptions.

## Known limitations

Stated plainly, because each is contained to one place:

- **Travel times are estimated**, not routed: straight-line distance at an assumed 25 km/h urban average. Every estimate goes through `estimateTravelTime` in `src/lib/utils.ts`, so swapping in a routing API is a one-function change.
- **Geocoding depends on Nominatim**, which is rate limited and occasionally misses an address. When it does, the record is saved without coordinates and the matcher reports distance as unknown rather than guessing.
- **Notifications are in-app only.** There is no SMS or push.
- **Distance filtering happens in the client** over a city-sized network. At larger scale the coordinates should become a PostGIS `geography` column with a spatial index and the radius filter should move into SQL.
