# Boniface — יומן שינויים

כל שינוי בפרויקט נרשם כאן **לפני או יחד עם הקומיט**, מהחדש לישן.

## פורמט חובה (העתק לכל רשומה)

```
### YYYY-MM-DD — כותרת קצרה
- **מה השתנה:** …
- **למה:** …
- **איפה שונה בקוד:** קבצים / תיקיות / מודולים
- **איפה שונה באפליקציה:** מסך / מודל / זרימה למשתמש (או «אין — מסמכים בלבד»)
```

### 2026-08-10 — עוזר AI (Groq) עם ניווט למסכים
- **מה השתנה:** מסך צ׳אט `assistant` מול `POST /api/assistant/chat` (Groq); תשובות בעברית/רוסית/אנגלית; עצות שימוש + שורת `NAVIGATE:` שמעבירה למסך מותר מרשימה לבנה; כניסות מ«עוד», כותרת הבית, ומסך עובד; `optionalAuth`; מפתח רק ב-`.env` (לא בגיט).
- **למה:** לתת מדריך אינטראקטיבי באפליקציה שמסביר וגם מנווט לפיצ׳ר המבוקש.
- **איפה שונה בקוד:** `app/assistant.tsx`, `lib/assistantNav.ts`, `server/src/routes/assistant.ts`, `server/src/index.ts`, `server/src/middleware/auth.ts`, `app/_layout.tsx`, `app/(tabs)/more.tsx`, `app/(tabs)/index.tsx`, `app/employee/index.tsx`, `lib/api.ts`, `lib/translations.ts`, `.env.example`, `change.md`
- **איפה שונה באפליקציה:** מסך עוזר AI; כפתור זהב בכותרת הבית ובמצב עובד; פריט תפריט בעוד

### 2026-08-10 — Inventory P2 lite, subCategory, Tips keyboard, EAS/README
- **מה השתנה:** `InventorySheet` עם סליידר צללית בקבוק (0–100%) ל-spirits/wine, שמירה ב-`updateStockItem`, שיתוף CSV/טקסט; שדה אופציונלי `subCategory` (display|speedbar|storage|custom) + שבבי סינון בבר; `TipsEntryModal` עם `KeyboardAwareScrollView` (fallback ל-web); `eas.json` עם פרופילי preview/production ל-iOS+Android; `README.md` להרצה, API, TestFlight/Play וקישורי privacy/terms; הערת IAP לפני go-live מונטיזציה.
- **למה:** לסגור חלקי roadmap בעלי ערך גבוה בלי לשבור offline-first ולשמור typecheck ירוק.
- **איפה שונה בקוד:** `components/InventorySheet.tsx`, `components/TipsEntryModal.tsx`, `app/(tabs)/bar.tsx`, `context/BonifaceContext.tsx`, `utils/exportCsv.ts`, `lib/translations.ts`, `server/src/db/schema.ts`, `server/src/db/index.ts`, `server/src/routes/stock.ts`, `eas.json`, `README.md`, `change.md`
- **איפה שונה באפליקציה:** כפתור ספירת מלאי בבר; סינון אזורים; מקלדת בטיפים; מסמכי הרצה/חנות

### 2026-08-10 — Share, שחזור, מצב עובד, סלוטים, משפטי, מנוי
- **מה השתנה:** תדריך משתף טקסט אמיתי (Share); לוח זמנים מייצא CSV/טקסט ופותח StartShiftModal; סלוטי משמרת (can/want) עם תביעות; שחזור PIN + הצטרפות עובד בקוד בחשבון; תפקיד manager|employee בסשן + מסכי `app/employee/`; הזמנות מצוות; מסמכי `docs/privacy.html`/`terms.html` + מסכים באפליקציה; שערי מנוי (אזהרה + חסימת פעולות מנהל בענן, grace לעובדים); תרגומים he/ru/en.
- **למה:** להשלים את השכבות הבאות של המוצר על גבי ה-API המקומי בלי לשבור offline-first.
- **איפה שונה בקוד:** `app/briefing.tsx`, `app/schedule.tsx`, `app/account.tsx`, `app/employee/**`, `app/privacy.tsx`, `app/terms.tsx`, `app/_layout.tsx`, `app/(tabs)/team.tsx`, `app/(tabs)/more.tsx`, `app/(tabs)/index.tsx`, `context/AuthContext.tsx`, `utils/exportCsv.ts`, `lib/translations.ts`, `docs/*`, `app.json`, `server/src/routes/auth.ts`, `server/src/routes/sync.ts`, `server/src/middleware/auth.ts`, `change.md`
- **איפה שונה באפליקציה:** שיתוף תדריך/לוח; שחזור PIN והצטרפות עובד; מצב עובד (משמרות/סטופ/טיפים/פרופיל); בורסת סלוטים; קישורים משפטיים; אזהרת מנוי שפג

### 2026-08-10 — Cloud sync, חיפוש, Happy Hour, עובד החודש, multi-venue stub
- **מה השתנה:** סנכרון ענן ל-`stockItems`/`stopList`/`writeOffs`/`checklists` (GET בלוגין, PUT עם debounce 800ms, AsyncStorage כ-cache); מסך חיפוש גלובלי; Happy Hour מקומי + תג בבר; כרטיס «עובד החודש» בסטטיסטיקה/צוות; בחירת מקום (venues list) מכותרת הבית; עדכון `implemented` ב-feature cards.
- **למה:** לחבר את הלקוח ל-API הקיים ולסגור פערים ב-roadmap בלי לשבור זרימות אופליין.
- **איפה שונה בקוד:** `context/BonifaceContext.tsx`, `context/AuthContext.tsx`, `app/search.tsx`, `components/HappyHourSheet.tsx`, `components/VenuePickerModal.tsx`, `app/(tabs)/index.tsx`, `bar.tsx`, `more.tsx`, `stats.tsx`, `team.tsx`, `app/_layout.tsx`, `lib/translations.ts`, `lib/featureCards.ts`, `change.md`
- **איפה שונה באפליקציה:** חיפוש מהבית/עוד; Happy Hour בבר; בחירת מקום בכותרת; כרטיס עובד החודש בסטטיסטיקה וצוות; כרטיסי תכונות מסומנים כמוממשים

### 2026-08-10 — Backend מקומי Express + SQLite
- **מה השתנה:** נוסף שרת API מלא תחת `server/` (Express 5, TypeScript, Drizzle, better-sqlite3) עם Auth, עובדים, יומן ימים, מלאי/סטופ/מחיקות/צ׳קליסטים, מנוי, הזמנות, וסלוטי משמרת עם חוקי עבודה ישראליים; `npm run api` על פורט 3001; לקוח מצביע ל-`http://localhost:3001/api` כשאין `EXPO_PUBLIC_API_URL`; נוספו `forgotCheck`/`recover` ב-AuthContext; `.env.example`.
- **למה:** להריץ את Boniface מקומית בלי Replit חיצוני, תוך שמירה על עבודה אופליין באפליקציה כשה-API לא זמין.
- **איפה שונה בקוד:** `server/src/**`, `package.json`, `lib/api.ts`, `context/AuthContext.tsx`, `.env.example`, `tsconfig.json`, `.gitignore`, `change.md`
- **איפה שונה באפליקציה:** כתובת API ברירת מחדל מקומית; שחזור PIN זמין דרך הקונטקסט (מסך חשבון עדיין אותו UI)

### 2026-08-06 — תרגום מלא 100% כולל מלאי ברירת מחדל
- **מה השתנה:** כל מסכי/מודלי ה-UI עוברים דרך `tr`; נוספו `seedStock` + `getLocalizedStockItem` כך שפריטי מלאי ברירת מחדל מוצגים בעברית/רוסית/אנגלית לפי השפה; תיקון `tsconfig` references שבור.
- **למה:** החלפת שפה משנה את כל האפליקציה — כולל בר, סטופ-ליסט ובביקוסט — לא רק חלק מהמסכים.
- **איפה שונה בקוד:** `lib/translations.ts`, `context/BonifaceContext.tsx`, `app/(tabs)/bar.tsx`, `components/BevCostSheet.tsx`, `components/StopListSheet.tsx`, `tsconfig.json`, `change.md`
- **איפה שונה באפליקציה:** כל הממשק לפי שפה; שמות יחידות/פריטי מלאי ברירת מחדל

### 2026-08-06 — i18n למסכי briefing/schedule/more/team/stats/cards
- **מה השתנה:** מחרוזות UI במסכים שנותרו עברו ל-`useLang().tr`; נוספו `briefing`/`schedule`/`notFound`/`checklistDefaults` וכלים נלווים ב-he/ru/en; `getLocalizedChecklist` לתבניות opening|closing|preshift; BevCost עם `tr.categories`.
- **למה:** 100% מהטקסטים בממשק דרך תרגום — במיוחד עברית.
- **איפה שונה בקוד:** `lib/translations.ts`, `context/BonifaceContext.tsx`, `app/briefing.tsx`, `app/schedule.tsx`, `app/(tabs)/more.tsx`, `app/(tabs)/team.tsx`, `app/(tabs)/stats.tsx`, `app/cards.tsx`, `app/+not-found.tsx`, `components/StartShiftModal.tsx`, `components/SmartChecklistModal.tsx`, `components/BevCostSheet.tsx`, `change.md`
- **איפה שונה באפליקציה:** תדריך, לוח זמנים, עוד, צוות, סטטיסטיקה, כרטיסים, 404; צ׳ק-ליסטים ברירת מחדל לפי שפה

### 2026-08-06 — תרגום מלא למודלים (he/ru/en)
- **מה השתנה:** כל מחרוזות ה-UI במודלים ובגיליונות עברו ל-`useLang().tr`; נוספו מפתחות תרגום מלאים ל-he/ru/en; קיצור שעות ב-`ShiftCard` דרך `card.hoursAbbrev`.
- **למה:** 100% ממחרוזות הממשק דרך מערכת השפות — במיוחד עברית — בלי טקסט רוסי/אנגלי קשיח.
- **איפה שונה בקוד:** `lib/translations.ts`, `components/StartShiftModal.tsx`, `StopListSheet.tsx`, `BevCostSheet.tsx`, `TipsEntryModal.tsx`, `EndShiftSummaryModal.tsx`, `EmployeeDetailModal.tsx`, `DatePickerModal.tsx`, `ErrorFallback.tsx`, `ShiftCard.tsx`, `change.md`
- **איפה שונה באפליקציה:** מודל התחלת/סיום משמרת, סטופ-ליסט, בביקוסט, הזנת טיפים, פרטי עובד, בחירת תאריך, מסך שגיאה, כרטיס משמרת

### 2026-08-05 — UX נוח יותר (אותו מותג)
- **מה השתנה:** היררכיה ברורה יותר ב-Home/Quick: הנחיות «הצעד הבא», כפתורים גדולים, תוויות פעולות עם הסבר קצר, תווית לטאב המרכזי, תרגום מלא he/ru/en במקום טקסט רוסי קשיח; ברירת שפה עברית; קומפוננטות `EasyUI`.
- **למה:** אותו רעיון/צבעים/Inter — אבל ממשק שקל יותר להבין לכל משתמש.
- **איפה שונה בקוד:** `components/ui/EasyUI.tsx`, `app/(tabs)/index.tsx`, `app/(tabs)/quick.tsx`, `app/(tabs)/_layout.tsx`, `lib/translations.ts`, `constants/colors.ts`, `context/LangContext.tsx`, `change.md`
- **איפה שונה באפליקציה:** מסך ראשי, פעולות מהירות, שורת טאבים, שפה ברירת מחדל

### 2026-08-05 — הכנת הפרויקט להרצה מקומית ב-Expo
- **מה השתנה:** `package.json` הותאם לעצמאי (הוסרו תלויות monorepo/`catalog`/`workspace`) ונוספו סקריפטים `start`/`web`.
- **למה:** לאפשר `npx expo start` מקומית ב-Windows בלי מונוריפו Replit.
- **איפה שונה בקוד:** `package.json`, `שינויים.md`
- **איפה שונה באפליקציה:** אין שינוי UI — רק תשתית הרצה

### 2026-08-06 — תרגום מלא 100% כולל מלאי ברירת מחדל
- **מה השתנה:** כל מסכי/מודלי ה-UI עוברים דרך `tr`; נוספו `seedStock` + `getLocalizedStockItem` כך שפריטי מלאי ברירת מחדל מוצגים בעברית/רוסית/אנגלית לפי השפה; תיקון `tsconfig` references שבור.
- **למה:** החלפת שפה משנה את כל האפליקציה — כולל בר, סטופ-ליסט ובביקוסט — לא רק חלק מהמסכים.
- **איפה שונה בקוד:** `lib/translations.ts`, `context/BonifaceContext.tsx`, `app/(tabs)/bar.tsx`, `components/BevCostSheet.tsx`, `components/StopListSheet.tsx`, `tsconfig.json`, `change.md`
- **איפה שונה באפליקציה:** כל הממשק לפי שפה; שמות יחידות/פריטי מלאי ברירת מחדל

### 2026-08-10 — תיקוני P0 באגים (טיפים לתאריך + StartShift)
- **מה השתנה:** `TipsEntryModal` מקבל `date` ומאפשר עריכת טיפים ליום שנבחר ב-Home; `StartShiftModal` עם Scroll + KeyboardAware לרשימות ארוכות ולשדה יעד.
- **למה:** לסגור באגים קריטיים מהאפיון לפני חנויות.
- **איפה שונה בקוד:** `components/TipsEntryModal.tsx`, `components/StartShiftModal.tsx`, `app/(tabs)/index.tsx`, `change.md`
- **איפה שונה באפליקציה:** הזנת/עריכת טיפים לפי תאריך; מודל פתיחת משמרת

---

### 2026-08-05 — הוספת יומן שינויים
- **מה השתנה:** נוצר קובץ `שינויים.md` לתיעוד מתמשך; עודכנו `rules.md` ו-`spec.md` כך שרישום שינוי הוא חובה.
- **למה:** מעקב שקוף אחרי כל שינוי — תאריך, סיבה, מיקום בקוד ובאפליקציה.
- **איפה שונה בקוד:** `שינויים.md`, `rules.md`, `spec.md`
- **איפה שונה באפליקציה:** אין — מסמכים בלבד

### 2026-08-05 — השלמת דיאגרמות באפיון + ענף main
- **מה השתנה:** נוספו דיאגרמות Mermaid לסנכרון offline→cloud ולזרימת Auth/אונבורדינג עובד; הענף ברירת המחדל ב-GitHub הועבר ל-`main`.
- **למה:** יישור מלא עם תוכנית האפיון וקישורי צפייה יציבים.
- **איפה שונה בקוד:** `spec.md` (סעיפים 5.1, 7.2); הגדרות ריפו GitHub
- **איפה שונה באפליקציה:** אין — מסמכים בלבד

### 2026-08-05 — אפיון מלא, חוקי בנייה, והעלאה ל-GitHub
- **מה השתנה:** נכתבו `spec.md` (אפיון מוצר מלא בעברית, כולל roadmap ודיאגרמות) ו-`rules.md` (חוקי בנייה); תורגם `improvments.md` לעברית; נוצר ריפו ציבורי והוקם baseline מהקוד הקיים.
- **למה:** להתחיל בנייה מאפס על בסיס אפיון וחוקים ברורים; מוצר מובייל בלבד (App Store + Google Play), GitHub לצפייה במסמכים בלבד.
- **איפה שונה בקוד:** `spec.md`, `rules.md`, `improvments.md`, אתחול git + push ל-`buv100/boniface`
- **איפה שונה באפליקציה:** אין — מסמכים ותשתית ריפו; האפליקציה עצמה לא שונתה למשתמש
