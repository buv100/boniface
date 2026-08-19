# Boniface — אפיון מוצר

**גרסה:** 2.1 · אוגוסט 2026  
**סטטוס:** שלב 1 — דשבורד בעל עסק + מנוי ידני + פאנל פלטפורמה  
**נלווה:** [`rules.md`](rules.md) · [`change.md`](change.md)

---

## 1. חזון

**Boniface** — מערכת תפעול לרשתות ולעסקים של ברים ומסעדות בישראל.

ארבעה צדדים לוגיים:

1. פלטפורמה — צוות Boniface (פאנל פנימי)
2. בעל עסק / רשת
3. מנהל / אחראי משמרת *(מוקפא)*
4. עובד — ברמן / מלצר / טבח *(מוקפא)*

**שלב 1** בונה את צד הבעלים ואת שער התשלום. אין הרשמה ציבורית: אנחנו יוצרים את הלקוח ומסמנים «שולם עד». קוד המשמרת הישן נשמר בשרת ובאפליקציה אבל לא מחובר לנווט החדש.

ערוץ: Expo (iOS, Android, Web). שפות: עברית (RTL) · רוסית · אנגלית. מטבע: ILS.

---

## 2. מודל ארגוני

```
Owner ──1── Organization (רשת/עסק)
                 │
                 └── N Venues (סניף: בר או מסעדה)
```

- בעלים **לא** נרשם לבד. צוות Boniface יוצר אדם (שם, טלפון, אימייל, PIN) + עסק + סניף ראשון.
- מנוי ברמת הארגון: `org_subscriptions` (`status`, `expires_at`, `plan`, `notes`).
- בכניסה: אם המנוי לא פעיל → מסך חסום. אם פעיל וסניף אחד → דשבורד הסניף; אם כמה → **מסך רשת** עם רשימת סניפים.
- בכל סניף במסך הרשת: `alerts: VenueAlert[]`. **כללי חריגה יוגדרו בהמשך** — כרגע המערך ריק וה-UI מציג placeholder.

`VenueAlert` (חוזה יציב):

```
{ id, venueId, topic, severity: "info" | "warning" | "critical", message, createdAt }
```

`topic` יישאר מחרוזת חופשית עד שיוגדרו נושאים.

---

## 3. דשבורד סניף (בעלים)

בית: שלום + שם, תאריך/שעה, שם סניף (חזרה לרשת), כרטיסים:

| כרטיס | תוכן |
|-------|------|
| עובדים | HR: תפקיד, הרשאות, שכר, ת.ז, 101, מסמכים |
| מלאי | שני אזורים: בר / מטבח |
| תפריט בר | עץ BOM |
| תפריט מטבח | עץ BOM |
| ספקים | כרטיס ספק + קישור למלאי חסר |
| הגדרות | עסק + סניף פעיל |

### 3.1 עובדים

- תפקידים בסיס: `bartender` · `waiter` · `cook` (+ תווית מותאמת)
- שכר: `hourly` | `monthly` | `topup` + סכום
- הרשאות (flags): `view_stock`, `edit_stock`, `manage_staff`, `manage_recipes`, `manage_suppliers`, `run_shift`, `view_reports`
- מסמכים: `id` | `form101` | `other`

### 3.2 מלאי

פריט: שם, `department` bar|kitchen, קטגוריה, כמות, יחידה, minQuantity. מתחת לסף — סימון במסך המלאי בלבד.

### 3.3 מתכונים

`recipes` + `recipe_lines`: רכיב = `inventoryItemId` או `subRecipeId` + כמות + יחידה. בלי פיצוץ מלאי אוטומטי.

### 3.4 ספקים

שם, טלפון, whatSupplies, scheduleNote, notes; שיוך לפריטי מלאי אופציונלי.

---

## 4. API (שלב 1)

בסיס: `/api`

בעלים (דורש מנוי פעיל חוץ מ-login/me/logout):

- `POST /auth/owner/register` — **סגור** (403 `NO_PUBLIC_SIGNUP`)
- `POST /auth/owner/login` — session גם אם המנוי לא פעיל (`subscription.isActive`)
- `GET /auth/me` — כולל owner, organization, venues[], venue, subscription
- `POST /auth/select-venue` — 402 אם המנוי לא פעיל
- `POST /owner/venues` · `PATCH /owner/venues/:id` — `requirePaidOrg`
- `PATCH /owner/organization`
- CRUD `/owner/staff` + documents
- CRUD `/owner/inventory`
- CRUD `/owner/recipes`
- CRUD `/owner/suppliers`

פלטפורמה (`requirePlatformAdmin`):

- `POST /auth/admin/login`
- `GET /admin/customers` · `POST /admin/customers`
- `GET /admin/customers/:orgId`
- `PATCH /admin/customers/:orgId/subscription` — הארכה / השהיה / הפעלה מחדש

JWT: `owner` (שדות `sid`, `ownerId`, `organizationId`, `venueId`) או `platform_admin` (`sid`, `platformAdminId`).

---

## 5. שלבים הבאים (לא עכשיו)

- דשבורד מנהל משמרת (כולל טיפים/נוכחות שכבר קיימים בקוד)
- דשבורד עובד
- כללי חריגה לכל נושא
- Postgres, POS
- סליקה אוטומטית (Stripe / Cardcom) — בלי לשנות את שער `requirePaidOrg`

---

## 6. עיצוב

רקע `#111827` · זהב `#F59E0B` · Inter · dark only · כרטיסים גדולים.
