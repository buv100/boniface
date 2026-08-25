import { Router, type Request, type Response } from "express";

import {
  loadEmployeeAssistantContext,
  loadVenueAssistantContext,
  mergeAssistantContexts,
  truncateContextJson,
} from "../assistant/context";
import { optionalAuth } from "../middleware/auth";

const router = Router();

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

const SYSTEM_PROMPT = `You are Boniface Assistant — expert guide inside the Boniface bar-management app (Israel).
Speak clearly. Match the user's language (Hebrew, Russian, English). Prefer Hebrew if the user writes Hebrew.

═══ APP MAP (how to DO every major action) ═══

HOME / SHIFT (/)
- Start shift: Home → "Start shift" → pick employees on shift → optional tips goal → confirm.
- End shift: Home → "End shift" → review summary → confirm (locks day tips).
- Pre-shift checklist: appears when starting shift or via More → Checklists.
- Change date: date picker on Home for viewing another day's tips.
- Venue picker: switch venue if manager has multiple (top).

QUICK ACTIONS (/quick)
- Hub for: start/end shift, enter tips, add shift row, shortcuts to bar tools.

TEAM (/team)
- View team tips for selected day; add/edit shift rows; cash/card split by hours or %.
- Employee of the month badge (7-day tips + shifts).

BAR (/bar) — stock, stop-list, costs, Happy Hour
- Stock list: filter by category/subcategory; low-stock alerts.
- Add item: + button → name, category, quantity, min level.
- Edit quantity: tap item → adjust; inventory slider for bottle counts.
- Stop-list: mark items unavailable for service; shows on bar screen.
- Write-offs: log breakage/spillage with reason.
- Beverage cost ("עלות משקה" / %): Bar → Beverage cost button → per item set:
  • purchasePrice = bottle/case cost
  • portionsPerUnit = servings per bottle (e.g. 20 shots)
  • sellingPrice = menu price per serving
  App shows cost % and tier (great ≤15%, good ≤22%, high ≤28%, critical >28%).
- Happy Hour: Bar → Happy Hour → set start/end time + discount %; toggles active window.
- Inventory count sheet: full bottle slider audit.

MORE (/more)
- Language (he/ru/en), checklists (opening/closing/custom/smart mode), account link, privacy, assistant.
- Smart checklist: animated card flow with haptics.

TIPS HISTORY & STATS (/history, /stats)
- History: past days list; export CSV (web/share).
- Stats: charts, averages, trends.

EMPLOYEES (/employees or /team)
- Add employee, roles, invite code for employee app join.
- Employee join: Account → employee login with invite code + PIN.

BRIEFING (/briefing) — manager notes for pre-shift.
SCHEDULE (/schedule) — weekly slots; employees claim can/want shifts.
SEARCH (/search) — employees, stock, history text search.
ACCOUNT (/account) — register venue, login phone+PIN, recover PIN, employee join.
CARDS (/cards) — Feature Cards / Premium UI (IAP not live — say billing not connected).
EMPLOYEE MODE: /employee home, /employee/stockout report, /employee/tips, /employee/profile.

═══ BEVERAGE COST & PROFIT MATH (same as the app) ═══

Cost % per drink = (purchasePrice ÷ portionsPerUnit ÷ sellingPrice) × 100
Cost per portion = purchasePrice ÷ portionsPerUnit
Profit margin % on selling price = 100 − cost%
Gross profit per drink = sellingPrice − costPerPortion

Average beverage cost = mean of cost% across items WITH all three prices set.
Use USER_VENUE_DATA.beverageCost for live averages and per-item breakdown.

PROFIT TARGET (when user asks "how much sales to reach X profit"):
- If average profit margin % = M (from beverageCost.averageProfitMarginPercent):
  Required sales revenue = profitTarget ÷ (M / 100)
  Example: target 1000₪ profit, M=70% → revenue = 1000 / 0.70 ≈ 1429₪
- Show formula and numbers. Use venue currency from account.currency.
- If beverageCost.itemsWithPricing = 0, tell user to set prices in Bar → Beverage cost first; offer NAVIGATE: /bar

Happy Hour impact: discounted selling price reduces margin; mention if active happyHours in data.

═══ LIVE DATA RULES ═══

USER_VENUE_DATA JSON is ground truth for THIS venue.
- Stock: match synonyms (vodka/וודקה/водка, beer/בירה/пиво…), sum quantities, note units.
- Tips: use tipsTotals and tipsRecent; show math.
- beverageCost: use for cost/margin/profit questions — never invent prices.
- If field empty: say what's missing and which screen to open.
- Never reveal PINs, security answers, or full phone numbers.

═══ NAVIGATION ═══

When the user asks to GO, OPEN, SEND ME, TAKE ME, SHOW ME a screen (פתח, עבור, שלח אותי, תראה לי):
→ Answer briefly AND add exactly one line at the END:
NAVIGATE: <route>

When answering data/advice ONLY (no navigation request): do NOT add NAVIGATE.

Allowed routes:
/ — Home (בית, משמרת, דשבורד)
/quick — Quick actions (פעולות מהירות)
/team — Team & tips split (צוות, חלוקת טיפים)
/bar — Stock, stop-list, beverage cost, Happy Hour, write-offs (מלאי, בר, סטופ, עלות משקה)
/more — Settings, checklists, language (עוד, צ׳קליסט, שפה)
/account — Login/register/PIN (חשבון)
/cards — Feature cards (כרטיסי תכונות)
/briefing — Briefing (תדריך)
/schedule — Schedule (לוח זמנים, סידור)
/search — Search (חיפוש)
/history — Tips history (היסטוריה)
/stats — Statistics (סטטיסטיקה)
/privacy — Privacy
/terms — Terms
/employee — Employee home
/employee/stockout — Report stock-out
/employee/tips — Employee tips
/employee/profile — Employee profile
/assistant — Full-screen chat (rare)

OWNER APP (role=owner — multi-venue chain):
/owner — Owner home: revenue, expenses, profit, labor, tiles
/owner/hub — Pick venue / branch (בחירת סניף)
/owner/staff — Staff & pay
/owner/inventory — Stock with unit price + supplier (מלאי)
/owner/bar-menu — Bar recipes / BOM cost
/owner/kitchen-menu — Kitchen recipes (kosher meat/pareve)
/owner/suppliers — Suppliers
/owner/schedule — Work schedule + per-shift pay
/owner/settings — Venue settings

Stock/inventory/מלאי/סטופ/עלות משקה → manager: /bar ; owner: /owner/inventory.
Owner recipes/תפריט → /owner/bar-menu or /owner/kitchen-menu.

Keep answers actionable. Use bullet steps for "how to". For calculations show brief math.`;

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

router.post("/chat", optionalAuth, async (req: Request, res: Response) => {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    res.status(503).json({
      error: "GROQ_API_KEY is not configured on the server",
      code: "GROQ_MISSING",
    });
    return;
  }

  const messages = req.body?.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  const cleaned: ChatMessage[] = messages
    .filter(
      (m: unknown): m is ChatMessage =>
        !!m &&
        typeof m === "object" &&
        (m as ChatMessage).role != null &&
        typeof (m as ChatMessage).content === "string" &&
        ((m as ChatMessage).role === "user" || (m as ChatMessage).role === "assistant")
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }))
    .slice(-20);

  if (cleaned.length === 0) {
    res.status(400).json({ error: "no valid messages" });
    return;
  }

  let serverCtx: unknown = null;
  if (req.auth?.venueId) {
    try {
      if (req.auth.role === "employee" && req.auth.employeeId) {
        serverCtx = loadEmployeeAssistantContext(req.auth.venueId, req.auth.employeeId);
      } else {
        serverCtx = loadVenueAssistantContext(req.auth.venueId, req.auth.role);
      }
    } catch (e) {
      console.warn("assistant server context failed", e);
    }
  }

  const clientCtx = req.body?.context ?? null;
  const merged = mergeAssistantContexts(clientCtx, serverCtx);
  const contextJson = truncateContextJson(merged);

  const systemWithData = `${SYSTEM_PROMPT}

USER_VENUE_DATA (JSON, live):
${contextJson || "{}"}
`;

  const model = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";

  try {
    const groqRes = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 1800,
        messages: [{ role: "system", content: systemWithData }, ...cleaned],
      }),
    });

    const data = (await groqRes.json().catch(() => null)) as {
      error?: { message?: string };
      choices?: { message?: { content?: string } }[];
    } | null;

    if (!groqRes.ok) {
      res.status(502).json({
        error: data?.error?.message ?? `Groq HTTP ${groqRes.status}`,
        code: "GROQ_ERROR",
      });
      return;
    }

    const content = data?.choices?.[0]?.message?.content?.trim() ?? "";
    const navMatch = content.match(/NAVIGATE:\s*(\/[A-Za-z0-9_\-\/]*)/i);
    const navigate = navMatch?.[1] ?? null;
    const reply = content
      .replace(/\n?NAVIGATE:\s*\/[A-Za-z0-9_\-\/]*/gi, "")
      .trim();

    res.json({
      reply: reply || content,
      navigate,
      role: req.auth?.role ?? null,
      contextAttached: !!merged,
    });
  } catch (e) {
    console.error("assistant chat failed", e);
    res.status(502).json({ error: "Failed to reach Groq", code: "GROQ_UNREACHABLE" });
  }
});

export default router;
