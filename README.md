# BreatheWise — Urban Air Quality & Low-Emission Routine Assistant

**Hack2skill PromptWars Challenge 06 ("Build the Urban Air Quality Assistant")**

BreatheWise is an urban air-quality intelligence and low-emission household advisor built for Indian cities. It pairs real-time **Open-Meteo** atmospheric telemetry and deterministic **Indian CPCB National AQI (0–500)** calculations with **Gemini 2.5 Flash** (`@google/genai`) structured synthesis—plus full deterministic fallbacks when offline or rate-limited—so households never receive hallucinated pollutant numbers.

---

## 1. Problem Statement Alignment (Challenge 06)

- **Zero-Hallucination Live Telemetry:** Every AQI reading, sub-index, WHO 2021 guideline ratio, and 24-hour airing window is computed deterministically in TypeScript from live Open-Meteo data before any AI synthesis runs.
- **Actionable Low-Emission Living:** Converts city-level smog data into time-blocked daily routines, room-by-room indoor mitigation plans (HEPA and zero-purifier DIY budget modes), quantified CO₂/PM2.5/₹ habit swaps, emergency smog-shock overrides, and ready-to-share family/RWA/carpool advisories.
- **Honest Provenance:** Every AI response carries explicit provenance (`source: 'gemini-2.5-flash'` / `'gemini-2.0-flash'` vs. `source: 'deterministic'`) alongside the live Open-Meteo source URL and local reading timestamp.

---

## 2. Live Data Integrity & CPCB Standard

- **Live Providers:** [Open-Meteo Air Quality API](https://air-quality-api.open-meteo.com/v1/air-quality) and [Open-Meteo Geocoding API](https://geocoding-api.open-meteo.com/v1/search) (auto-refreshes every 5 minutes and on stale-tab resume, with `cache: 'no-store'`).
- **Official Indian CPCB National AQI (0–500):** Piecewise linear interpolation across `PM2.5`, `PM10`, `NO₂`, `O₃`, and `SO₂` (`src/utils/cpcbAqi.ts`), selecting the highest pollutant sub-index as overall AQI and reporting the dominant pollutant.
- **WHO 2021 Guideline Ratios:** Displays real-time multiples against WHO 24-hour/8-hour thresholds (`15`, `45`, `25`, `100`, `40` µg/m³) and includes an interactive **CPCB Audit** modal (`MethodologyDialog`) showing the live formula and breakpoint table.

---

## 3. Architecture & Serverless Security Model

```text
React 19 + Vite SPA (src/)
   ├── Direct Live Telemetry ──> Open-Meteo Air Quality & Geocoding APIs
   └── AI Synthesis Requests ──> Vercel Serverless (/api/*) or Express (server.ts)
                                    ├── HTTP Guards: POST-only (405), JSON-only (415), 128 KB max (413), Cache-Control: no-store
                                    ├── Runtime Trust Boundary: Zod Request & Response Schemas (src/validation/aqiContracts.ts)
                                    ├── @google/genai: gemini-2.5-flash (fallback: gemini-2.0-flash, 15s timeout)
                                    └── Safe Error Boundary (no key/stack leakage) + Client Deterministic Fallback
```

- **Shared Controller (`src/services/aiController.ts`):** Both `server.ts` (local Express + Vite middleware) and `api/**/*.ts` (Vercel Serverless Functions) execute the exact same Zod-validated request/response pipeline.
- **API Endpoints:**
  - `GET /api/health`
  - `POST /api/gemini/questions` & `POST /api/gemini/questions/stream` (SSE incremental streaming)
  - `POST /api/gemini/routine`
  - `POST /api/gemini/indoor`
  - `POST /api/gemini/shock`
  - `POST /api/gemini/community`

---

## 4. Five Workspaces & 1-Click Evaluator Profiles

1. **Intake (`ProfileIntakeWorkspace`):** All-India city search + quick city chips (`Delhi`, `Noida`, `Chandigarh`, `Mumbai`, `Kolkata`, `Bengaluru`), CPCB AQI meter, 4 one-click sample profiles (`Delhi NCR Working Commuter`, `Noida Young Family`, `Chandigarh / Jalandhar College Student`, `Mumbai Coastal Apartment Household`), custom household builder, and streaming clarifying intake.
2. **Routine (`DailyRoutineWorkspace`):** 24-hour Recharts PM2.5 trajectory chart with shaded safest 3-hour cross-ventilation band, peak smog danger hours, and interactive 4-block checklist (`Morning`, `Midday`, `Evening`, `Night`) updating the live **Protection Score (%)**.
3. **Indoor Lab (`IndoorLabWorkspace`):** Synced HEPA vs. zero-purifier DIY controls, cooking fuel & exhaust toggles, active room slider, deterministic indoor PM2.5 reduction meter, targeted indoor questions, and room-by-room playbooks (`Living Room`, `Bedroom / Nursery`, `Kitchen`) with a scientific note on indoor plants.
4. **Simulator (`AlternativesSimulatorWorkspace`):** Low-emission habit swap engine calculating weekly/annual CO₂ avoided, diminishing-returns PM2.5 exposure reduction, and monthly ₹ savings, plus the **"What-If" Sudden Smog Spike Simulator** that patches active routine blocks in one click.
5. **Community (`CommunityBriefingWorkspace`):** Copyable WhatsApp family advisory, RWA/apartment notice, and carpool pitch, plus one-click **JSON** and **Printable Markdown** Master Clean-Air Runbook exports.

---

## 5. Modularity, Local Setup, Testing & Deployment

- **Modularity & Type Safety:** Strict TypeScript (`"strict": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`), zero `any` types, and every source file kept strictly under **250 lines**.
- **Accessibility:** Semantic HTML5 landmarks (`<header>`, `<nav>` with `role="tablist"`, `<main id="main-content">` with `role="tabpanel"`), skip-to-content link, roving keyboard tabs, native `<dialog>` with Escape/focus restoration, and WCAG AA `>=4.5:1` contrast.

### Local Setup (Node 22.x)

```bash
npm ci
cp .env.example .env
# Set GEMINI_API_KEY in .env (optional: GEMINI_MODEL=gemini-2.5-flash)
npm run dev
```

### Verification & Coverage

```bash
npm run check           # Runs tsc --noEmit, vitest run, and vite build
npm run test:coverage   # Runs Vitest with V8 coverage thresholds (90% stmts/lines/funcs, 75% branches)
```

### Vercel Deployment

- `vercel.json` sets `maxDuration: 30` for `api/**/*.ts` and rewrites `/api/*` to serverless functions with `/index.html` SPA fallback.
- Configure `GEMINI_API_KEY` (and optionally `GEMINI_MODEL`) in Vercel Project Environment Variables and deploy with `vercel --prod`.
