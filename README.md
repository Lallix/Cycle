# Cycle — Budget PWA

A personal finance PWA built with React, Vite, Tailwind CSS, and Supabase. Tracks income, fixed recurring expenses, variable spending, and savings goals across configurable monthly cycles (default: 25th of each month).

---

## Tech Stack

| Layer | Tool |
|---|---|
| Frontend | React 18 + Vite 5 |
| Styling | Tailwind CSS v3 |
| Charts | Recharts |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Auth | Supabase Auth + WebAuthn (biometric) |
| Offline | vite-plugin-pwa + Workbox |
| Fonts | Poppins (UI) · DM Mono (currency) |

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project (free tier works)

---

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd cycle
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Edit `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Find these in your Supabase dashboard → **Project Settings → API**.

### 3. Run the database schema

In your Supabase dashboard, go to **SQL Editor** and run the full contents of:

```
supabase/schema.sql
```

This creates all tables, RLS policies, triggers, and seeds default categories and recurring expenses for new users.

### 4. Start the dev server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

---

## Build for Production

```bash
npm run build
```

Output is in `/dist`. Deploy to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

### Vercel (recommended)

```bash
npm install -g vercel
vercel --prod
```

Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables in the Vercel dashboard.

### Netlify

Drag and drop the `/dist` folder into Netlify, or connect your repo. Set the build command to `npm run build` and publish directory to `dist`.

---

## PWA Installation

On mobile (Chrome/Safari), visit the deployed URL and use **Add to Home Screen**. On desktop Chrome, click the install icon in the address bar.

Icons are in `/public/icons/`.

---

## Supabase Auth Setup

In your Supabase dashboard → **Authentication → Settings**:

1. Enable **Email** provider
2. Set **Site URL** to your deployed domain (e.g. `https://cycle.yoursite.com`)
3. Add your domain to **Redirect URLs** (e.g. `https://cycle.yoursite.com/**`)

For biometric auth (WebAuthn), the app must be served over **HTTPS** — it will not work on plain HTTP.

---

## Budget Cycle Logic

- The default cycle start day is **25** (i.e. the 25th of each month to the 24th of the following month)
- Users can change this in **Settings**
- All transaction queries are scoped to the active cycle date range
- Daily Safe Spend = (remaining budget) ÷ (days left in cycle)

---

## Expense Types

| Type | Description |
|---|---|
| Fixed Recurring | Monthly bills with a fixed amount — rent, subscriptions, insurance |
| Variable Budgeted | Spending categories with a set budget — groceries, transport, fuel |
| Unbudgeted / Ad-hoc | Once-off expenses outside normal categories |

---

## Admin Panel

Users with `role = 'admin'` in the `profiles` table gain access to `/admin`:

- User list with join dates
- Category management (view + delete unused)
- App-wide spend statistics
- CSV export for users and categories

To promote a user to admin, run in Supabase SQL editor:

```sql
UPDATE profiles SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Project Structure

```
cycle/
├── public/
│   └── icons/               # PWA icons
├── src/
│   ├── components/
│   │   ├── branding/        # BrandLogo, SplashScreen (V1 placeholders)
│   │   ├── budget/          # FixedExpenseRow, VariableBudgetRow
│   │   ├── dashboard/       # HeroCard, UpcomingBills, BudgetSnapshot, RecentExpenses
│   │   ├── expenses/        # AddExpenseSheet, ExpenseItem, ExpenseFilters
│   │   ├── layout/          # AppLayout (bottom nav)
│   │   ├── reports/         # Charts (Recharts wrappers)
│   │   ├── savings/         # SavingsModal
│   │   └── ui/              # Button, Input, BottomSheet, Toast, etc.
│   ├── context/
│   │   ├── AuthContext.jsx  # Supabase auth + biometric
│   │   └── BudgetContext.jsx # All budget data + CRUD
│   ├── lib/
│   │   ├── cycle.js         # Cycle date logic
│   │   ├── format.js        # Formatting helpers
│   │   └── supabase.js      # Supabase client
│   ├── pages/
│   │   ├── AuthPage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── BudgetPage.jsx
│   │   ├── ExpensesPage.jsx
│   │   ├── ReportsPage.jsx
│   │   ├── SettingsPage.jsx
│   │   └── AdminPage.jsx
│   ├── styles/
│   │   └── globals.css
│   ├── App.jsx
│   └── main.jsx
├── supabase/
│   └── schema.sql
├── .env.example
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## Branding (V2 swap)

Branding is isolated in `/src/components/branding/`:

- **`BrandLogo.jsx`** — SVG lettermark, accepts `size` and `animated` props
- **`SplashScreen.jsx`** — Splash with fade lifecycle, accepts `visible` and `onDone` props

To update the brand in V2, only these two files need to change — no other component touches the logo or splash directly.

---

## Seed Data

The schema auto-seeds the following for each new user signup:

**Income:** R 5,360 / month  
**Cycle start day:** 25  

**Fixed recurring:**
- Rent · R 1,200 · Capitec · 1st
- Medical Aid · R 280 · Capitec · 1st
- Electricity · R 152 · Capitec · 1st
- Bank Charges · R 10 · FNB · 1st
- Netflix · R 14 · FNB · 7th
- Xbox Game Pass · R 15 · FNB · 7th
- Internet · R 50 · FNB · 7th
- School Fees · R 62 · FNB · 15th
- SA House Bond · R 125 · FNB · 25th

**Variable budgets:**
- Groceries R 650 · Transport R 150 · Eating Out R 500 · Entertainment R 200
- Clothing R 300 · Kids / School R 100 · Medical R 200 · Petrol R 800

---

## License

MIT
