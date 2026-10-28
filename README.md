# 🥜 NNNC Stonks: No Nut November Stonk Exchange

> Simulated meme stock market where community members are tradeable assets. Built for No Nut November.

Deployable for **$0.00** on **GitHub Pages** (frontend) and **Supabase Free Tier** (PostgreSQL 15+ vAMM financial engine).

---

## 🌟 Key Features

* **Virtual AMM ($x \cdot y = k$):** Dynamic liquidity curve where stock prices scale with community trading demand.
* **1x, 2x & 5x Leveraged Shorting:** Speculate against users you expect to fail NNN, with automated margin-call liquidation.
* **Strict Anti-Self-Trading Shield:** Hard database assertion preventing users from trading, pumping, or shorting their own asset.
* **The "Nutted" Hammer:** When a user fails NNN, community moderators trigger an emergency intervention that crashes the stonk by 90%+ and freezes trading, paying out short sellers.
* **High Stakes & Survival Streak Economy (Option A):**
  * **Starting Capital:** 100,000 Edgecoins
  * **Daily Bounty:** 2,500 base + 250 per consecutive day survived (Day 1: 2,500 $\to$ Day 7: 4,000 $\to$ Day 30: 9,750).
* **Spoof-Proof & Zero-PII Auth:** No emails or phone numbers stored. Reddit users are verified via a human-in-the-loop Moderator Queue with temporary passwords sent directly.
* **GDPR Right to Erasure:** Self-service `rpc_delete_my_account` endpoint that permanently wipes credentials and anonymizes trading records.

---

## 🚀 Quick Start (Local Development)

### 1. Install & Run Dev Server
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the live trading terminal.

---

## 🗄️ Supabase Database Setup

1. Open your [Supabase Dashboard](https://supabase.com/dashboard/project/jcukeepvzndwxjzbecph).
2. Go to the **SQL Editor** on the left sidebar.
3. Paste and run the complete migration script:
   - File: [`supabase/migrations/20261028_initial_schema.sql`](supabase/migrations/20261028_initial_schema.sql)
4. Create your master Admin account by running:
   - File: [`supabase/seed_admin.sql`](supabase/seed_admin.sql) *(Replace placeholder username and password before running)*.
5. In your project settings under **API**, copy your `anon public` key.
6. Create `.env.local` in the project root:
   ```env
   VITE_SUPABASE_URL=https://jcukeepvzndwxjzbecph.supabase.co
   VITE_SUPABASE_ANON_KEY=your_copied_anon_key_here
   ```

---

## 🚢 Deploying to GitHub Pages

This repository includes a preconfigured GitHub Actions workflow at [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

1. In your GitHub repository, navigate to **Settings > Secrets and variables > Actions**.
2. Add two repository secrets:
   * `VITE_SUPABASE_URL`: `https://jcukeepvzndwxjzbecph.supabase.co`
   * `VITE_SUPABASE_ANON_KEY`: Your Supabase anon public key.
3. Go to **Settings > Pages** and set the Source to **GitHub Actions**.
4. Push your changes to the `main` branch. Your site will automatically build and deploy!

---

## ⚖️ Legal & Compliance Notice

NNNC Stonks is an educational, satirical simulation game for community entertainment. **Edgecoins are virtual game tokens with no real-world monetary value, cash prize redemption, or fiat conversion.**