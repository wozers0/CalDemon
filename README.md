# CalDemon

**Train. Fuel. Recover.** A private, installable fitness app for iPhone, built as a Progressive Web App (PWA) with React, TypeScript, Vite, Tailwind CSS and IndexedDB.

Everything you log stays on your phone, and the app works offline.

## Features

- **Home dashboard:** greeting, daily check-in (energy, sleep, soreness, mood) with a recovery-aware suggestion, macro balance ring, today's workout, water, weekly activity and a daily quote.
- **Workouts:**
  - 10 built-in workouts and a library of 50+ exercises with form cues.
  - Build your own workouts, or duplicate a built-in one to customise it.
  - Live workout logging: weight, reps or seconds, with your previous numbers shown.
  - Rest timer with ±15 s buttons, a chime and a floating bar.
  - Workout summary with personal bests, plus full workout history.
- **Nutrition:**
  - Meal journal by breakfast, lunch, dinner and snacks.
  - Macro balance compared with widely used healthy ranges.
  - "Balanced plate" food-group servings.
  - Water tracker and a 7-day view.
  - Four ways to log a meal:
    - Search the built-in food database (125 foods) or add custom foods.
    - Scan a barcode (Open Food Facts lookup; scanned products are cached for offline use).
    - **Paste from Claude:** use your Claude subscription. Copy the prompt, send it with a photo in the Claude app, then paste the reply back.
    - **Photo AI (optional):** one-tap photo analysis using your own Claude API key.
- **Progress:**
  - Levels and XP, and a show-up streak where rest days count.
  - Training trends and personal records.
  - Habits calendar and energy trend.
  - Personal milestones and 21 achievement badges.
- **Motivation:** daily quote (shuffle, favourite, share), affirmation, tip, one-minute box-breathing exercise and a wins journal.
- **Settings:**
  - Name, kg/lb, weekly target, rest time, sound and water goal.
  - "Show calories" toggle: switch numbers off and focus on balance.
  - Claude API key and model choice.
  - Backup export and restore, and erase all data.

**Healthy by design:** there are no calorie limits, weight-loss targets or guilt messages. Aims are things to *include* (vegetables, protein, water), rest days count towards your streak, and the app's language focuses on strength, wellbeing and recovery.

---

## Run it on Windows

### 1. Install Node.js (one time)

Download the **LTS** version from <https://nodejs.org> and install it with the default options. Then open **PowerShell** and check that it works:

```bash
node -v
```

### 2. Get the project

Either clone it with Git:

```bash
git clone https://github.com/wozers0/CalDemon.git
```

Or download the ZIP from GitHub (green **Code** button → **Download ZIP**) and extract it. Then go into the folder:

```bash
cd CalDemon
```

### 3. Install and start

```bash
npm install
```

```bash
npm run dev
```

Open <http://localhost:5173> in your browser. Press `F12` and switch on device mode (`Ctrl+Shift+M`) with "iPhone 14 Pro" to see it at phone size.

### Quick test on your iPhone over Wi-Fi (optional)

`npm run dev` also prints a **Network** address, such as `http://192.168.1.20:5173`. With your iPhone on the same Wi-Fi, open that address in Safari. If Windows asks, allow Node.js through the firewall on **private networks**.

This is fine for a quick look, but iPhones only allow **offline mode and the camera (barcode scanning) over HTTPS**. For real use, follow the next section.

---

## Install it on your iPhone (recommended)

To install properly, the app needs a free HTTPS address. The easiest option is **Netlify**.

### Option A: drag and drop (no Git needed)

1. Build the app:

   ```bash
   npm run build
   ```

2. Go to <https://app.netlify.com/drop> and sign in with a free account, so your site stays online.
3. Drag the **`dist`** folder from the project onto the page.
4. Netlify gives you a link like `https://your-name.netlify.app`. You can rename it under **Site configuration**.

To update later, run `npm run build` again and drag the new `dist` folder onto your site's **Deploys** page.

### Option B: automatic deploys from GitHub

In Netlify choose **Add new site → Import an existing project**, then pick this GitHub repository. The included `netlify.toml` already sets the build command (`npm run build`) and output folder (`dist`). Every push to GitHub redeploys the site. Vercel works the same way.

### Add to Home Screen

1. On your iPhone, open your `https://…netlify.app` link in **Safari**.
2. Tap the **Share** button (square with an arrow).
3. Scroll down and tap **Add to Home Screen**, then **Add**.
4. Open **CalDemon** from your Home Screen. It runs full screen, with Dynamic Island and home-indicator spacing, and works offline.

> **Important:** on iPhone, a Home Screen app keeps its **own storage, separate from Safari**. Install it first, then log your data inside the installed app. Use **Settings → Export backup** now and then to save a copy to Files or iCloud Drive.

When you deploy a new version, the installed app updates itself the next time you open it. If it hasn't, close it and open it again.

---

## Claude meal analysis

There are two ways to use Claude, and both are optional:

| | Paste from Claude | Photo AI |
|---|---|---|
| What you need | Your Claude subscription (Pro or Max) | A Claude API key from <https://platform.claude.com> (prepaid credits, billed separately from a subscription) |
| How it works | Log meal → **Claude** tab → copy the prompt → send it with your photo in the Claude app → paste the reply | Log meal → **Photo AI** → take or choose a photo; the result fills in automatically |
| Cost | Included in your subscription | Usually a cent or two per photo |

For Photo AI, add your key in **Settings → Claude photo analysis** and tap **Test connection**. The key is stored only on your phone and is never included in backups. Set a monthly spend limit in the Claude Console for peace of mind. The default model is Claude Opus 5.5; you can switch to Sonnet 5.5 or Haiku 5.5 in Settings.

All estimates are approximate. You can edit every item before saving.

---

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server (also reachable on your Wi-Fi) |
| `npm run build` | Type-check and build the production app into `dist/` |
| `npm run preview` | Serve the built app locally to test offline mode and the PWA |
| `npm run typecheck` | TypeScript check only |

## Project structure

```
src/
  App.tsx            App shell: tab bar, page stack with edge-swipe back, rest timer, badges, onboarding
  db.ts              IndexedDB (Dexie) tables and settings
  types.ts           Data types
  components/        Reusable UI: cards, buttons, rings, charts, sheets, pages, logo
  screens/           Home, Workouts, Session, Nutrition, Log meal, Progress, Motivation, Settings…
  state/             Navigation, toasts/dialogs, rest timer, data hooks
  lib/               Stats and streaks, nutrition maths, Claude API, backup, photo resizing, sound
  data/              Exercises, workouts, foods, quotes and tips, badges
public/              App icons, iPhone 14 Pro launch screen, favicon
```

## Privacy

There are no accounts, no analytics and no server. Data lives in IndexedDB on your device. Network requests happen only when you choose to:
- look up a barcode (Open Food Facts)
- analyse a photo with your own API key (Anthropic)
- open the Claude website

---

CalDemon supports general wellbeing and is not medical advice. If food or exercise ever feels stressful, a doctor or registered dietitian can help.
