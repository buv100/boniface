# Boniface

Bar management app (Expo / React Native) with a local Express + SQLite API.

## Run mobile

```bash
npm install
npm start
```

Then press `i` / `a` / `w` for iOS simulator, Android emulator, or web.

Optional platform scripts: `npm run android`, `npm run ios`, `npm run web`.

Copy `.env.example` to `.env` if you need to override `EXPO_PUBLIC_API_URL`. Without it, the app talks to `http://localhost:3001/api`.

## Run API

```bash
npm run api
```

Starts the local server on port **3001** (SQLite file under `server/data/`).

## Typecheck

```bash
npm run typecheck
```

## EAS / store builds

Profiles live in `eas.json`:

| Profile | iOS | Android |
| --- | --- | --- |
| `preview` | internal distribution | APK |
| `production` | App Store / TestFlight binary | Play App Bundle (AAB) |

Typical flow:

```bash
npx eas-cli login
npx eas build --platform ios --profile preview
npx eas build --platform android --profile preview
npx eas build --platform all --profile production
```

### TestFlight (iOS)

1. Build with `--profile production` (or preview for internal testers).
2. Submit with `npx eas submit --platform ios --profile production` (or upload the `.ipa` in App Store Connect).
3. Enable TestFlight testing for the build in App Store Connect.

### Google Play

1. Build with `--profile production` (AAB).
2. Upload via Play Console or `npx eas submit --platform android --profile production`.
3. Use internal / closed testing tracks before production rollout.

### Store listing legal URLs

Use these for Privacy Policy / Terms fields (GitHub raw; also fine as GitHub Pages if you publish `docs/`):

- Privacy: https://raw.githubusercontent.com/buv100/boniface/main/docs/privacy.html
- Terms: https://raw.githubusercontent.com/buv100/boniface/main/docs/terms.html

Local copies: [`docs/privacy.html`](docs/privacy.html), [`docs/terms.html`](docs/terms.html). In-app screens: `app/privacy.tsx`, `app/terms.tsx`.

## Monetization / IAP

In-app purchase (App Store / Play Billing) is **not wired yet**. Ship store billing (and restore) before any monetization go-live — do not invent broken IAP stubs for production.

## Project map

- `app/` — Expo Router screens (tabs, account, employee mode, schedule, …)
- `components/` — modals / sheets
- `context/` — Auth + Boniface offline-first state
- `server/` — Express API
- `change.md` — change log (newest first)
