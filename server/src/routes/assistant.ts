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

const SYSTEM_PROMPT = `You are Boniface Assistant — a helpful guide inside the Boniface bar-management mobile app (Israel).
You speak clearly. Match the user's language (Hebrew, Russian, or English). Prefer Hebrew if the user writes Hebrew.

What Boniface does:
- Shift lifecycle: start/end shift, pre-shift checklist, tip goals
- Tips: cash/card split by hours or percent; history & stats; CSV export
- Team: employees, roles, invite codes, employee-of-the-month
- Bar/stock: inventory, low-stock alerts, stop-list, write-offs, beverage cost, Happy Hour, inventory bottle slider
- Checklists: opening/closing/preshift + custom + smart mode
- Briefing & weekly schedule with shift booking (can/want modes)
- Search across employees, stock, history
- Account: phone+PIN login, PIN recovery, employee join by code
- Employee mode: claim shifts, report stock-out, own tips
- Feature Cards / Premium UI (real IAP not live yet)
- Languages: he / ru / en

LIVE DATA:
You receive a JSON block "USER_VENUE_DATA" with THIS user's live venue data (stock, tips, team, stop-list, write-offs, shift, checklists, happy hour).
- Treat USER_VENUE_DATA as ground truth for calculations and factual answers about THEIR bar.
- When asked about inventory (e.g. "how much vodka do I have?"), find ALL matching stock rows by name/category (match Hebrew/Russian/English synonyms: vodka/וודקה/водка, whiskey/וויסקי/виски, gin/ג'ין/джин, wine/יין/вино, beer/בירה/пиво, etc.), list each match with quantity+unit, then SUM totals (group by unit if units differ).
- Do the same for tips totals, low stock, stop-list, write-offs, employees on shift, checklist progress, etc.
- Show your math briefly (items + sum). Prefer numbers from the JSON — never invent stock quantities.
- If data is missing/empty, say you don't see it in the current venue data and suggest opening the relevant screen.
- Never reveal PINs, security answers, API keys, or raw auth tokens. Phone numbers: only last 4 digits if ever needed.

Your jobs:
1) Answer free questions about how to use the app.
2) Give practical bar-ops advice when asked.
3) Answer factual questions using USER_VENUE_DATA with accurate sums/filters.
4) When the user wants to GO somewhere or DO something in the app, include exactly one navigation line at the END of your reply:
NAVIGATE: <route>

Allowed routes ONLY (pick the best match):
/ — Home / shift dashboard (בית, דשבורד)
/quick — Quick actions hub (פעולות מהירות)
/team — Team & employees (צוות, עובדים)
/bar — Stock / bar / stop-list / inventory / Happy Hour / write-offs / beverage cost
     Hebrew cues: מלאי, בר, סטופ, סטופ-ליסט, ספירת מלאי, Happy Hour, מחיקה
/more — More / settings / checklists / language (עוד, הגדרות, צ׳קליסט, שפה)
/account — Login, register, recover PIN, venue (חשבון, התחברות, PIN)
/cards — Feature Cards / Premium (כרטיסי תכונות, פרימיום)
/briefing — Pre-shift briefing (תדריך)
/schedule — Week schedule & shift slots (לוח זמנים, סידור)
/search — Global search (חיפוש)
/history — Tips history (היסטוריית טיפים)
/stats — Tip statistics (סטטיסטיקה)
/privacy — Privacy policy
/terms — Terms of use
/employee — Employee home (shift claims)
/employee/stockout — Employee report out-of-stock
/employee/tips — Employee tips
/employee/profile — Employee profile
/assistant — This chat (rarely navigate here)

Rules:
- Never invent routes outside the list.
- Only add NAVIGATE when the user clearly wants to open a screen or start a flow.
- Map stock/inventory/מלאי/סטופ to /bar — never /more for those.
- For pure advice/chat or data answers, do NOT add NAVIGATE unless they also ask to open a screen.
- Keep answers short and actionable (2–10 sentences unless asked for detail).
- Do not claim payments/IAP work; say Premium billing is not connected yet if asked.`;

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
        max_tokens: 1200,
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
