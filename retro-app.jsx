import { useState, useEffect, useRef } from "react";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = SUPABASE_URL && SUPABASE_ANON_KEY ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;
console.log("[RetroKit] Supabase URL:", SUPABASE_URL ? SUPABASE_URL.slice(0,30)+"..." : "MISSING");
console.log("[RetroKit] Supabase key:", SUPABASE_ANON_KEY ? "present ("+SUPABASE_ANON_KEY.length+" chars)" : "MISSING");
console.log("[RetroKit] Supabase client:", supabase ? "OK" : "NULL - localStorage fallback only");

// ── Data ──────────────────────────────────────────────────────────────────────

const Q3_VARIANTS = [
  "Is there anything we should start, stop, or continue doing?",
  "What's one thing slowing us down, and one thing we should protect?",
  "What's working well, what isn't, and what should we try differently?",
  "If you could change one thing about how we work, what would it be?",
];

const QUESTIONS = (sprintNumber, q3Override) => [
  { id: "q1", label: "Q1", prompt: "Describe the sprint using an emoji or gif", type: "emoji", color: "#E8003D" },
  { id: "q2", label: "Q2", prompt: "What were our standout achievements this sprint?", type: "text", color: "#10b981" },
  { id: "q3", label: "Q3", prompt: q3Override || Q3_VARIANTS[Math.floor((sprintNumber - 1) / 2) % Q3_VARIANTS.length], type: "text", color: "#6366f1" },
  { id: "q4", label: "Q4", prompt: "Anything else? Is there anyone you'd like to give a shout-out to?", type: "text", color: "#f59e0b" },
];

const EMOJIS = ["🚀","🔥","💪","🎯","⚡","😤","😅","🌊","🐛","🎉","💡","🧠","🤝","🌱","🏆","😬","🙌","💥","🌀","🎸"];
const CARD_COLORS = ["#E8003D","#10b981","#6366f1","#f59e0b","#ec4899","#06b6d4","#8b5cf6","#14b8a6"];
const AVATAR_COLORS = ["#E8003D","#6366f1","#10b981","#f59e0b","#ec4899","#06b6d4","#8b5cf6","#14b8a6"];

const TENOR_KEY = import.meta.env.VITE_TENOR_KEY || "AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCDY";
const GIPHY_KEY = import.meta.env.VITE_GIPHY_KEY || "Lat2X82BQoZI8UZnG0cHU2QnlITbWYr3";

function randomColor() { return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]; }
function uid() { return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2, 9); }

// ── Facilitator detection (sessionStorage = per tab, not permanent) ────────────

const facilitatorStore = {
  set() { try { sessionStorage.setItem("rk_facilitator", "1"); } catch(e) { console.warn(e); } },
  clear() { try { sessionStorage.removeItem("rk_facilitator"); } catch(e) { console.warn(e); } },
  is() { try { return sessionStorage.getItem("rk_facilitator") === "1"; } catch(e) { return false; } }
};

// ── Session Store ─────────────────────────────────────────────────────────────

const sessionStore = {
  list() {
    try {
      const ids = JSON.parse(localStorage.getItem("rk_sessions") || "[]");
      return ids.map(id => { try { return JSON.parse(localStorage.getItem("rk_session_" + id)); } catch { return null; } }).filter(Boolean);
    } catch(e) { console.warn(e); return []; }
  },
  get(id) { try { return JSON.parse(localStorage.getItem("rk_session_" + id)); } catch(e) { console.warn(e); return null; } },
  save(session) {
    try {
      localStorage.setItem("rk_session_" + session.id, JSON.stringify(session));
      const ids = JSON.parse(localStorage.getItem("rk_sessions") || "[]");
      if (!ids.includes(session.id)) { ids.push(session.id); localStorage.setItem("rk_sessions", JSON.stringify(ids)); }
    } catch(e) { console.warn(e); }
  },
  delete(id) {
    try {
      localStorage.removeItem("rk_session_" + id);
      const ids = JSON.parse(localStorage.getItem("rk_sessions") || "[]");
      localStorage.setItem("rk_sessions", JSON.stringify(ids.filter(i => i !== id)));
    } catch(e) { console.warn(e); }
  },
  getSessionUrl(id) {
    const base = window.location.origin + window.location.pathname.replace(/\?.*$/, "");
    const s = sessionStore.get(id);
    if (!s) return `${base}?session=${id}`;
    // Encode minimal session config so team members can bootstrap in a fresh browser
    const payload = btoa(JSON.stringify({ id: s.id, name: s.name, sprintNumber: s.sprintNumber, date: s.date, cutoffDate: s.cutoffDate, cutoffTime: s.cutoffTime, q3Variant: s.q3Variant, allowReactions: s.allowReactions, allowVoting: s.allowVoting }));
    return `${base}?session=${id}&sc=${payload}`;
  },
  getCutoff(session) {
    if (!session?.cutoffDate || !session?.cutoffTime) return null;
    const dt = new Date(`${session.cutoffDate}T${session.cutoffTime}`);
    return isNaN(dt.getTime()) ? null : dt;
  },
  isSubmissionOpen(session) { const c = sessionStore.getCutoff(session); return c ? Date.now() < c.getTime() : true; }
};

// One-time migration: clear stale rk_ data on first v2 load
function runMigrationIfNeeded() {
  try {
    if (localStorage.getItem("rk_version") === "2") return;
    Object.keys(localStorage).filter(k => k.startsWith("rk_")).forEach(k => localStorage.removeItem(k));
    localStorage.setItem("rk_version", "2");
    console.log("RetroKit v2: stale data cleared");
  } catch(e) { console.warn("migration error", e); }
}

// Wipe everything — facilitator reset
function wipeAllData() {
  try {
    Object.keys(localStorage).filter(k => k.startsWith("rk_")).forEach(k => localStorage.removeItem(k));
    localStorage.setItem("rk_version", "2");
  } catch(e) { console.warn("wipeAllData error", e); }
}

// Wipe all board/submission data for a given session id
function wipeSessionData(id) {
  try {
    // Free cards, votes
    localStorage.removeItem(`rk_free_${id}`);
    localStorage.removeItem(`rk_votes_${id}`);
    localStorage.removeItem(`rk_joined_${id}`);
    // Submissions scoped to this session
    Object.keys(localStorage)
      .filter(k => k.startsWith("rk_sub_"))
      .forEach(k => {
        try {
          const s = JSON.parse(localStorage.getItem(k));
          if (s && s.sessionId === id) localStorage.removeItem(k);
        } catch {}
      });
  } catch(e) { console.warn("wipeSessionData error", e); }
}

// Sessions created explicitly by facilitator — no auto-default

// ── Countdown ─────────────────────────────────────────────────────────────────

function useCountdown(cutoff) {
  const [ms, setMs] = useState(() => cutoff ? cutoff.getTime() - Date.now() : null);
  useEffect(() => {
    if (!cutoff) { setMs(null); return; }
    const id = setInterval(() => setMs(cutoff.getTime() - Date.now()), 1000);
    return () => clearInterval(id);
  }, [cutoff]);
  return ms;
}

function exactTime(ms) {
  if (ms === null || ms <= 0) return ms === null ? "—" : "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600), m = Math.floor((totalSec % 3600) / 60), s = totalSec % 60;
  return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
}

function getCountdownState(ms) {
  if (ms === null) return "open";
  if (ms <= 0) return "closed";
  if (Math.floor(ms / 60000) <= 15) return "urgent";
  if (Math.floor(ms / 60000) <= 45) return "soon";
  return "open";
}

function CountdownBar({ session }) {
  const cutoff = sessionStore.getCutoff(session);
  const ms = useCountdown(cutoff);
  const state = getCountdownState(ms);
  const exact = exactTime(ms);
  if (ms === null) return null;
  return (
    <div className={`countdown-bar state-${state}`}>
      <span className="countdown-dot" />
      <span className="countdown-label">Submissions close in</span>
      <span className="countdown-time">{exact}</span>
    </div>
  );
}

// ── Seed Data ─────────────────────────────────────────────────────────────────



// ── Styles ────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  :root {
    --red: #E8003D;
    --red-dark: #c0002f;
    --red-glow: rgba(232,0,61,.15);
    --bg: #0d1017;
    --bg-card: #131720;
    --bg-raised: #1a1f2e;
    --bg-input: #1e2333;
    --bg-hover: #232840;
    --border: #252b3b;
    --border-light: #2e3548;
    --border-focus: #3d4560;
    --text: #e2e8f0;
    --text-muted: #7c8596;
    --text-dim: #4a5168;
    --white: #ffffff;
    --green: #10b981;
    --blue: #6366f1;
    --amber: #f59e0b;
    --radius: 8px;
    --radius-lg: 12px;
    --shadow-sm: 0 1px 3px rgba(0,0,0,.4);
    --shadow-md: 0 4px 12px rgba(0,0,0,.5);
    --shadow-lg: 0 8px 32px rgba(0,0,0,.6);
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg); min-height: 100vh; color: var(--text); font-size: 14px; line-height: 1.5; -webkit-font-smoothing: antialiased; }
  .app { min-height: 100vh; }

  /* ── NAV ── */
  .nav { background: rgba(13,16,23,.95); backdrop-filter: blur(12px); padding: 0 24px; height: 56px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; border-bottom: 1px solid var(--border); }
  .nav-brand { font-size: 15px; font-weight: 700; color: var(--white); letter-spacing: -.3px; display: flex; align-items: center; gap: 8px; }
  .nav-brand-dot { width: 8px; height: 8px; background: var(--red); border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 8px var(--red); }
  .nav-tabs { display: flex; gap: 1px; }
  .nav-tab { padding: 6px 14px; border-radius: var(--radius); border: none; cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 500; transition: all .15s; background: transparent; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }
  .nav-tab:hover { background: var(--bg-raised); color: var(--text); }
  .nav-tab.active { background: var(--bg-raised); color: var(--text); border: 1px solid var(--border-light); }
  .nav-tab-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--red); box-shadow: 0 0 6px var(--red); animation: pulse-dot 1.2s ease-in-out infinite; flex-shrink: 0; }
  @keyframes pulse-dot { 0%,100% { opacity: 1; transform: scale(1); } 50% { opacity: .5; transform: scale(.75); } }
  .refresh-btn { background: none; border: none; cursor: pointer; color: var(--text-muted); font-size: 14px; padding: 2px 4px; transition: color .15s; display: inline-flex; align-items: center; line-height: 1; }
  .refresh-btn:hover { color: var(--red); }
  .sub-chip { display: inline-flex; align-items: center; gap: 4px; background: var(--bg-raised); border: 1px solid var(--border); border-radius: 20px; padding: 2px 8px 2px 3px; font-size: 11px; font-weight: 500; color: var(--text-muted); }
  .sub-chip-dot { width: 18px; height: 18px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 9px; font-weight: 700; color: white; flex-shrink: 0; }

  .session-select-wrap { position: relative; }
  .session-select { background: var(--bg-raised); border: 1px solid var(--border-light); border-radius: var(--radius); color: var(--text); font-family: inherit; font-size: 13px; font-weight: 500; padding: 5px 28px 5px 10px; cursor: pointer; outline: none; appearance: none; -webkit-appearance: none; max-width: 200px; }
  .session-select:focus { border-color: var(--border-focus); }
  .session-select-arrow { position: absolute; right: 8px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--text-muted); font-size: 10px; }

  /* ── COUNTDOWN ── */
  .countdown-bar { width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 7px 24px; font-size: 12px; font-weight: 500; border-bottom: 1px solid var(--border); transition: all .8s; }
  .countdown-bar.state-open   { background: rgba(16,185,129,.06); color: #34d399; }
  .countdown-bar.state-soon   { background: rgba(245,158,11,.06); color: #fbbf24; }
  .countdown-bar.state-urgent { background: rgba(239,68,68,.08); color: #f87171; animation: pulse 1.4s ease-in-out infinite; }
  .countdown-bar.state-closed { background: transparent; color: var(--text-dim); }
  .countdown-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; background: currentColor; }
  .countdown-bar.state-open .countdown-dot   { box-shadow: 0 0 6px currentColor; }
  .countdown-bar.state-urgent .countdown-dot { box-shadow: 0 0 8px currentColor; }
  .countdown-time { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; letter-spacing: .5px; }
  .countdown-label { opacity: .65; font-size: 11px; }
  @keyframes pulse { 0%,100% { opacity:1; } 50% { opacity:.6; } }

  /* ── BUTTONS ── */
  .btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 14px; border-radius: var(--radius); border: 1px solid transparent; font-family: inherit; font-size: 13px; font-weight: 500; cursor: pointer; transition: all .15s; white-space: nowrap; }
  .btn-primary { background: var(--red); color: white; border-color: var(--red); }
  .btn-primary:hover { background: var(--red-dark); border-color: var(--red-dark); }
  .btn-secondary { background: var(--bg-raised); color: var(--text-muted); border-color: var(--border-light); }
  .btn-secondary:hover { background: var(--bg-hover); color: var(--text); border-color: var(--border-focus); }
  .btn-ghost { background: transparent; color: var(--text-muted); border-color: transparent; }
  .btn-ghost:hover { background: var(--bg-raised); color: var(--text); }
  .btn-success { background: rgba(16,185,129,.12); color: #34d399; border-color: rgba(16,185,129,.25); }
  .btn-success:hover { background: rgba(16,185,129,.2); }
  .btn-danger { background: transparent; color: #f87171; border-color: rgba(248,113,113,.3); }
  .btn-danger:hover { background: rgba(248,113,113,.1); }
  .btn:disabled { opacity: .4; cursor: not-allowed; }

  /* ── FORM ELEMENTS ── */
  .input { width: 100%; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 8px 12px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; transition: border .15s; }
  .input::placeholder { color: var(--text-dim); }
  .input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
  .select { width: 100%; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 8px 12px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; cursor: pointer; }
  .label { font-size: 12px; font-weight: 600; color: var(--text-muted); margin-bottom: 5px; display: block; letter-spacing: .02em; }

  /* ── SUBMIT VIEW ── */
  .submit-wrap { max-width: 640px; margin: 0 auto; padding: 40px 24px 80px; }
  .submit-header { margin-bottom: 32px; }
  .submit-header h1 { font-size: 24px; font-weight: 700; color: var(--text); letter-spacing: -.4px; }
  .submit-header p { color: var(--text-muted); margin-top: 4px; font-size: 14px; }
  .anon-badge { display: inline-flex; align-items: center; gap: 5px; background: rgba(16,185,129,.08); color: #34d399; border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 600; margin-top: 10px; border: 1px solid rgba(16,185,129,.2); }

  .name-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 20px 24px; margin-bottom: 16px; }
  .name-card-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.2px; color: var(--text-dim); margin-bottom: 6px; }
  .name-card-title { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 12px; }

  .q-card { background: var(--bg-card); border-radius: var(--radius-lg); padding: 24px; margin-bottom: 12px; border: 1px solid var(--border); border-left: 3px solid #444; transition: border-color .2s; }
  .q-card:focus-within { border-color: var(--border-focus); }
  .q-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-dim); margin-bottom: 4px; }
  .q-prompt { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 16px; line-height: 1.4; }

  .emoji-grid { display: flex; flex-wrap: wrap; gap: 6px; }
  .emoji-btn { width: 42px; height: 42px; border-radius: var(--radius); border: 1px solid var(--border); background: var(--bg-raised); font-size: 20px; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: center; }
  .emoji-btn:hover { background: var(--bg-hover); border-color: var(--border-focus); transform: scale(1.08); }
  .emoji-btn.selected { border-color: var(--red); background: var(--red-glow); }

  .submit-btn { width: 100%; padding: 12px; background: var(--red); color: white; border: none; border-radius: var(--radius); font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: all .15s; }
  .submit-btn:hover { background: var(--red-dark); }
  .submit-btn:disabled { opacity: .35; cursor: not-allowed; }
  .exit-btn { padding: 12px 18px; background: transparent; color: var(--text-muted); border: 1px solid var(--border-light); border-radius: var(--radius); font-family: inherit; font-size: 14px; font-weight: 500; cursor: pointer; transition: all .15s; white-space: nowrap; }
  .exit-btn:hover { border-color: var(--border-focus); color: var(--text); }
  .submit-actions { display: flex; gap: 8px; margin-top: 16px; }

  .success-wrap { text-align: center; padding: 80px 24px; }
  .success-icon { font-size: 56px; margin-bottom: 16px; }
  .success-wrap h2 { font-size: 24px; font-weight: 700; color: var(--text); }
  .success-wrap p { color: var(--text-muted); margin-top: 8px; }

  .edit-link-box { background: var(--bg-raised); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 18px 20px; margin-top: 24px; }
  .edit-link-box h3 { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .edit-link-box p { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; }
  .edit-link-copy-row { display: flex; gap: 8px; align-items: center; }
  .edit-link-url { flex: 1; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius); padding: 7px 10px; font-size: 11px; color: var(--text-muted); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .copy-btn { padding: 7px 12px; background: var(--red); color: white; border: none; border-radius: var(--radius); font-family: inherit; font-weight: 600; cursor: pointer; font-size: 12px; white-space: nowrap; transition: all .15s; }
  .copy-btn:hover { background: var(--red-dark); }
  .copy-btn.copied { background: #059669; }

  .session-link-box { background: rgba(16,185,129,.05); border: 1px solid rgba(16,185,129,.2); border-radius: var(--radius-lg); padding: 18px 20px; margin-top: 16px; }
  .session-link-box h3 { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
  .session-link-box p { font-size: 12px; color: var(--text-muted); margin-bottom: 10px; }

  .editing-banner { background: rgba(99,102,241,.08); border: 1px solid rgba(99,102,241,.25); border-radius: var(--radius); padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); display: flex; align-items: center; gap: 8px; }
  .closed-banner { background: var(--bg-raised); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 14px; margin-bottom: 16px; font-size: 13px; color: var(--text-muted); text-align: center; }

  /* ── MODAL ── */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; backdrop-filter: blur(4px); }
  .modal { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 16px; padding: 28px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-lg); }
  .modal h2 { font-size: 18px; font-weight: 700; color: var(--text); margin-bottom: 6px; }
  .modal p { color: var(--text-muted); font-size: 13px; margin-bottom: 16px; }
  .modal-btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; flex-wrap: wrap; }

  /* ── CONFIRM MODAL ── */
  .confirm-summary { background: var(--bg-raised); border-radius: var(--radius); padding: 14px; margin: 14px 0; display: flex; flex-direction: column; gap: 10px; }
  .confirm-row { display: flex; gap: 10px; align-items: flex-start; }
  .confirm-q-label { font-size: 10px; font-weight: 700; color: white; border-radius: 4px; padding: 2px 7px; flex-shrink: 0; margin-top: 2px; }
  .confirm-answer { font-size: 13px; color: var(--text); line-height: 1.4; }
  .confirm-answer.empty { color: var(--text-dim); font-style: italic; }

  /* ── SETTINGS ── */
  .settings-gear { width: 32px; height: 32px; border-radius: var(--radius); border: 1px solid var(--border-light); background: transparent; color: var(--text-muted); font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; }
  .settings-gear:hover { background: var(--bg-raised); color: var(--text); }
  .settings-lock { text-align: center; padding: 8px 0 4px; }
  .settings-lock-icon { font-size: 36px; margin-bottom: 10px; }
  .settings-pw-row { display: flex; gap: 8px; }
  .settings-pw-input { flex: 1; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 9px 12px; font-family: inherit; font-size: 14px; color: var(--text); outline: none; }
  .settings-pw-input:focus { border-color: var(--border-focus); }
  .settings-pw-error { color: #f87171; font-size: 12px; margin-top: 6px; text-align: center; }
  .settings-section { margin-bottom: 20px; }
  .settings-section-title { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .settings-row { display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; }
  .settings-hint { font-size: 11px; color: var(--text-dim); margin-top: 3px; }
  .settings-saved { display: flex; align-items: center; gap: 5px; color: var(--green); font-size: 13px; font-weight: 500; }

  .session-list { display: flex; flex-direction: column; gap: 6px; margin-bottom: 12px; }
  .session-list-item { display: flex; align-items: center; gap: 10px; background: var(--bg-raised); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; cursor: pointer; transition: all .15s; }
  .session-list-item:hover { border-color: var(--border-focus); }
  .session-list-item.active { border-color: var(--red); background: rgba(232,0,61,.05); }
  .session-list-item-name { font-weight: 600; font-size: 13px; color: var(--text); }
  .session-list-item-meta { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
  .session-list-item-del { color: var(--text-dim); cursor: pointer; font-size: 15px; padding: 2px 5px; border-radius: 4px; }
  .session-list-item-del:hover { color: #f87171; background: rgba(248,113,113,.1); }

  /* ── TOGGLE SWITCH ── */
  .toggle-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .toggle-row:last-child { border-bottom: none; }
  .toggle-label { font-size: 13px; font-weight: 500; color: var(--text); }
  .toggle-hint { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
  .toggle { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
  .toggle input { opacity: 0; width: 0; height: 0; }
  .toggle-slider { position: absolute; inset: 0; background: var(--border-light); border-radius: 20px; cursor: pointer; transition: background .2s; }
  .toggle-slider:before { content: ''; position: absolute; width: 14px; height: 14px; border-radius: 50%; background: white; top: 3px; left: 3px; transition: transform .2s; box-shadow: var(--shadow-sm); }
  .toggle input:checked + .toggle-slider { background: var(--red); }
  .toggle input:checked + .toggle-slider:before { transform: translateX(16px); }

  /* ── Q1 PICKER ── */
  .q1-mode-toggle { display: flex; margin-bottom: 16px; background: var(--bg-raised); border-radius: var(--radius); padding: 3px; width: fit-content; border: 1px solid var(--border); }
  .q1-mode-btn { padding: 6px 16px; border: none; background: transparent; font-family: inherit; font-weight: 500; font-size: 13px; cursor: pointer; transition: all .15s; color: var(--text-muted); border-radius: 6px; display: flex; align-items: center; gap: 5px; }
  .q1-mode-btn.active { background: var(--bg-card); color: var(--text); box-shadow: var(--shadow-sm); }
  .toggle-switch { width: 26px; height: 14px; background: var(--border-light); border-radius: 8px; position: relative; transition: background .2s; flex-shrink: 0; }
  .toggle-switch.on { background: var(--green); }
  .toggle-switch::after { content: ''; position: absolute; width: 10px; height: 10px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform .2s; }
  .toggle-switch.on::after { transform: translateX(12px); }

  /* ── GIF PICKER ── */
  .gif-picker { display: flex; flex-direction: column; gap: 10px; }
  .gif-search-row { display: flex; gap: 8px; }
  .gif-search-input { flex: 1; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 8px 12px; font-family: inherit; font-size: 13px; color: var(--text); outline: none; }
  .gif-search-input:focus { border-color: var(--border-focus); }
  .gif-search-btn { padding: 8px 16px; background: var(--bg-raised); color: var(--text); border: 1px solid var(--border-light); border-radius: var(--radius); font-family: inherit; font-weight: 500; cursor: pointer; font-size: 13px; white-space: nowrap; transition: all .15s; }
  .gif-search-btn:hover { background: var(--bg-hover); }
  .gif-search-btn:disabled { opacity: .4; cursor: not-allowed; }
  .gif-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; max-height: 260px; overflow-y: auto; border-radius: var(--radius); }
  .gif-item { border-radius: var(--radius); overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: all .15s; aspect-ratio: 1; position: relative; }
  .gif-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gif-item:hover { border-color: var(--blue); }
  .gif-item.selected { border-color: var(--blue); }
  .gif-item .gif-check { position: absolute; top: 4px; right: 4px; background: var(--blue); color: white; border-radius: 50%; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
  .gif-loading,.gif-empty { text-align: center; padding: 24px; color: var(--text-muted); font-size: 13px; }
  .gif-selected-preview { display: flex; align-items: center; gap: 10px; background: var(--bg-raised); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 10px; }
  .gif-selected-preview img { width: 60px; height: 60px; object-fit: cover; border-radius: var(--radius); }
  .gif-selected-preview-text { flex: 1; font-size: 12px; color: var(--text-muted); }
  .gif-selected-preview-text strong { display: block; color: var(--text); font-size: 13px; margin-bottom: 2px; }
  .gif-change-btn { font-size: 11px; color: var(--text-muted); text-decoration: underline; cursor: pointer; background: none; border: none; font-family: inherit; padding: 0; margin-top: 4px; }
  .giphy-attr { font-size: 10px; color: var(--text-dim); text-align: right; margin-top: 4px; }

  /* ── RICH TEXT EDITOR ── */
  .rte-wrap { position: relative; }
  .rte-toolbar { display: flex; align-items: center; gap: 2px; padding: 4px 6px; background: var(--bg-raised); border: 1px solid var(--border-light); border-bottom: none; border-radius: var(--radius) var(--radius) 0 0; }
  .rte-btn { width: 26px; height: 26px; border-radius: 4px; border: none; background: transparent; color: var(--text-muted); font-size: 12px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; font-family: inherit; }
  .rte-btn:hover { background: var(--bg-hover); color: var(--text); }
  .rte-btn.active { background: var(--red); color: white; }
  .rte-divider { width: 1px; height: 16px; background: var(--border); margin: 0 3px; }
  .rte-emoji-btn { padding: 0 6px; width: auto; font-size: 14px; }
  .rte-editor { min-height: 88px; border: 1px solid var(--border-light); border-radius: 0 0 var(--radius) var(--radius); padding: 10px 12px; font-family: inherit; font-size: 14px; color: var(--text); background: var(--bg-input); outline: none; transition: border .15s; line-height: 1.6; }
  .rte-editor:focus { border-color: var(--border-focus); }
  .rte-editor:empty:before { content: attr(data-placeholder); color: var(--text-dim); pointer-events: none; }
  .rte-editor b, .rte-editor strong { font-weight: 700; }
  .rte-editor i, .rte-editor em { font-style: italic; }
  .rte-editor ul { padding-left: 18px; margin: 4px 0; }

  /* ── EMOJI POPUP ── */
  .emoji-popup { position: absolute; z-index: 300; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: var(--radius-lg); padding: 10px; box-shadow: var(--shadow-lg); width: 268px; }
  .emoji-popup-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; max-height: 180px; overflow-y: auto; }
  .emoji-popup-item { width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; border-radius: 5px; transition: background .1s; }
  .emoji-popup-item:hover { background: var(--bg-raised); }
  .emoji-popup-search { width: 100%; background: var(--bg-input); border: 1px solid var(--border); border-radius: var(--radius); padding: 5px 8px; font-family: inherit; font-size: 12px; color: var(--text); outline: none; margin-bottom: 7px; }

  /* ── AI IDEAS ── */
  .ai-ideas-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 11px; border-radius: 20px; border: 1px solid rgba(139,92,246,.35); background: rgba(139,92,246,.07); color: #a78bfa; font-size: 11px; font-weight: 600; cursor: pointer; transition: all .15s; margin-bottom: 10px; }
  .ai-ideas-btn:hover { background: rgba(139,92,246,.14); }
  .ai-ideas-btn:disabled { opacity: .4; cursor: not-allowed; }
  .ai-ideas-wrap { background: rgba(139,92,246,.05); border: 1px solid rgba(139,92,246,.15); border-radius: var(--radius-lg); padding: 12px; margin-bottom: 10px; display: flex; flex-direction: column; gap: 6px; }
  .ai-ideas-header { font-size: 10px; font-weight: 700; color: #7c3aed; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; }
  .ai-idea-chip { display: flex; align-items: flex-start; gap: 8px; background: var(--bg-raised); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 9px 11px; cursor: pointer; transition: all .15s; text-align: left; }
  .ai-idea-chip:hover { border-color: rgba(139,92,246,.4); background: var(--bg-hover); }
  .ai-idea-chip-text { font-size: 12px; color: var(--text); line-height: 1.45; flex: 1; }
  .ai-idea-use { font-size: 11px; color: #8b5cf6; font-weight: 600; white-space: nowrap; flex-shrink: 0; }
  .ai-ideas-loading { display: flex; align-items: center; gap: 8px; color: #7c3aed; font-size: 12px; padding: 4px 0; }
  .ai-dot-spin { width: 14px; height: 14px; border: 2px solid rgba(139,92,246,.2); border-top-color: #8b5cf6; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── JOIN SCREEN ── */
  .join-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--bg); }
  .join-card { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 16px; padding: 44px 36px; max-width: 420px; width: 100%; text-align: center; box-shadow: var(--shadow-lg); }
  .join-logo { font-size: 14px; font-weight: 700; color: var(--text-muted); letter-spacing: .3px; margin-bottom: 28px; display: flex; align-items: center; justify-content: center; gap: 7px; }
  .join-logo-dot { width: 7px; height: 7px; background: var(--red); border-radius: 50%; box-shadow: 0 0 8px var(--red); }
  .join-sprint { display: inline-block; background: rgba(232,0,61,.08); color: var(--red); border: 1px solid rgba(232,0,61,.2); border-radius: 20px; padding: 3px 12px; font-size: 12px; font-weight: 600; margin-bottom: 18px; }
  .join-title { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 6px; letter-spacing: -.3px; }
  .join-sub { color: var(--text-muted); font-size: 14px; margin-bottom: 28px; }
  .join-input { width: 100%; background: var(--bg-input); border: 1px solid var(--border-light); border-radius: var(--radius); padding: 12px 14px; font-family: inherit; font-size: 16px; font-weight: 500; color: var(--text); outline: none; transition: border .15s; text-align: center; margin-bottom: 10px; }
  .join-input::placeholder { color: var(--text-dim); font-weight: 400; }
  .join-input:focus { border-color: var(--border-focus); box-shadow: 0 0 0 3px rgba(99,102,241,.1); }
  .join-btn { width: 100%; padding: 12px; background: var(--red); color: white; border: none; border-radius: var(--radius); font-family: inherit; font-size: 15px; font-weight: 600; cursor: pointer; transition: all .15s; }
  .join-btn:hover { background: var(--red-dark); }
  .join-btn:disabled { opacity: .35; cursor: not-allowed; }
  .join-presence { margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border); }
  .join-presence-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin-bottom: 10px; }
  .join-avatars { display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; }
  .join-avatar { display: flex; align-items: center; gap: 5px; background: var(--bg-raised); border-radius: 20px; padding: 3px 9px 3px 3px; border: 1px solid var(--border); }
  .join-avatar-dot { width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: white; }
  .join-avatar-name { font-size: 12px; font-weight: 500; color: var(--text); }
  .join-q1-section { margin-top: 20px; padding-top: 18px; border-top: 1px solid var(--border); text-align: left; }
  .join-q1-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin-bottom: 6px; }
  .join-q1-prompt { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 12px; }
  .join-greeting { font-size: 36px; margin-bottom: 8px; }
  .join-greeting-text { font-size: 15px; color: var(--text-muted); margin-bottom: 20px; }

  /* ── BOARD ── */
  .board-wrap { background: var(--bg); min-height: calc(100vh - 56px); overflow-x: auto; }

  /* Presence strip */
  .presence-strip { display: flex; align-items: center; gap: 6px; padding: 7px 20px; background: var(--bg-card); border-bottom: 1px solid var(--border); font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
  .presence-avatar { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: white; flex-shrink: 0; }
  .presence-name { font-weight: 500; font-size: 12px; }

  /* Reaction bar */
  .reaction-bar { display: flex; align-items: center; gap: 6px; padding: 8px 20px; background: var(--bg-card); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
  .reaction-bar-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin-right: 2px; }
  .reaction-emoji-btn { width: 32px; height: 32px; border-radius: var(--radius); border: 1px solid var(--border-light); background: var(--bg-raised); font-size: 16px; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: center; }
  .reaction-emoji-btn:hover { background: var(--bg-hover); border-color: var(--border-focus); transform: scale(1.15); }
  .reaction-drop { position: fixed; pointer-events: none; font-size: 26px; z-index: 999; animation: float-up 2.2s ease-out forwards; }
  @keyframes float-up { 0% { opacity:1; transform: translateY(0) scale(1); } 60% { opacity:.9; transform: translateY(-60px) scale(1.15); } 100% { opacity:0; transform: translateY(-120px) scale(.8); } }

  /* Board toolbar */
  .board-toolbar { display: flex; align-items: center; gap: 8px; margin-bottom: 20px; flex-wrap: wrap; }

  /* Columns */
  .col { width: 300px; flex-shrink: 0; }
  .col-header { border-radius: var(--radius-lg) var(--radius-lg) 0 0; padding: 12px 16px; display: flex; align-items: center; justify-content: space-between; border-left: 3px solid transparent; }
  .col-header-title { font-size: 12px; font-weight: 600; color: var(--text-muted); line-height: 1.4; letter-spacing: .01em; }
  .col-body { background: var(--bg-card); border-radius: 0 0 var(--radius-lg) var(--radius-lg); padding: 10px; min-height: 200px; display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--border); border-top: none; }

  /* Refined sticky cards — white/light with color bar */
  .sticky { border-radius: var(--radius); padding: 12px 14px; background: #1e2333; border: 1px solid var(--border-light); border-left: 3px solid #555; cursor: pointer; transition: all .15s; position: relative; }
  .sticky:hover { background: var(--bg-hover); border-color: var(--border-focus); transform: translateY(-1px); box-shadow: var(--shadow-md); }
  .sticky-content { font-size: 13px; color: var(--text); line-height: 1.55; font-weight: 400; }
  .sticky-emoji { font-size: 26px; text-align: center; padding: 4px; }
  .sticky-author { font-size: 11px; color: var(--text-dim); margin-top: 8px; font-weight: 500; }
  .sticky-group-badge { position: absolute; top: -5px; right: 8px; background: var(--bg-raised); color: var(--text-muted); border: 1px solid var(--border); border-radius: 6px; padding: 1px 6px; font-size: 10px; font-weight: 600; }

  .group-block { background: rgba(255,255,255,.02); border: 1px dashed var(--border-light); border-radius: var(--radius-lg); padding: 8px; }
  .group-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin-bottom: 6px; display: flex; align-items: center; justify-content: space-between; }
  .group-label input { background: transparent; border: none; font: inherit; color: var(--text-muted); width: 120px; outline: none; font-size: 11px; }

  .revealed-banner { background: rgba(16,185,129,.1); color: #34d399; text-align: center; padding: 6px; font-weight: 600; font-size: 12px; border-radius: var(--radius); margin-bottom: 6px; border: 1px solid rgba(16,185,129,.2); transition: opacity .5s; }
  .revealed-banner.fade-out { opacity: 0; }

  /* Action items column */
  .action-check { width: 18px; height: 18px; border-radius: 50%; border: 1.5px solid var(--border-focus); cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .15s; }
  .action-check.done { background: var(--green); border-color: var(--green); color: white; font-size: 10px; }
  .action-text { flex: 1; font-size: 13px; color: var(--text); min-width: 0; line-height: 1.4; }
  .action-text.done { text-decoration: line-through; color: var(--text-dim); }
  .action-owner { font-size: 11px; color: var(--blue); font-weight: 500; background: rgba(99,102,241,.1); padding: 1px 6px; border-radius: 6px; white-space: nowrap; flex-shrink: 0; }
  .add-action-btn { padding: 6px 10px; background: var(--red); color: white; border: none; border-radius: var(--radius); font-weight: 600; cursor: pointer; font-size: 15px; flex-shrink: 0; transition: background .15s; }
  .add-action-btn:hover { background: var(--red-dark); }

  /* AI suggestion */
  .ai-suggestion { background: rgba(99,102,241,.05); border: 1px solid rgba(99,102,241,.15); border-radius: var(--radius); padding: 10px; margin-top: 8px; }
  .ai-suggestion-title { font-size: 10px; font-weight: 700; color: #6366f1; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px; }
  .suggestion-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text); cursor: pointer; border-radius: var(--radius); padding: 5px 7px; transition: background .15s; }
  .suggestion-item:hover { background: rgba(99,102,241,.08); }
  .suggestion-apply { font-size: 11px; color: #6366f1; font-weight: 600; margin-left: auto; }

  /* History */
  .history-wrap { max-width: 760px; margin: 0 auto; padding: 36px 24px; min-height: 100vh; }
  .history-title { font-size: 22px; font-weight: 700; color: var(--text); margin-bottom: 20px; letter-spacing: -.3px; }
  .history-card { background: var(--bg-card); border-radius: var(--radius-lg); padding: 20px 22px; margin-bottom: 10px; border: 1px solid var(--border); cursor: pointer; transition: all .15s; border-left: 3px solid var(--red); }
  .history-card:hover { border-color: var(--border-focus); box-shadow: var(--shadow-md); transform: translateY(-1px); }
  .history-sprint { font-size: 15px; font-weight: 600; color: var(--text); }
  .history-meta { font-size: 12px; color: var(--text-muted); margin-top: 3px; }
  .history-stats { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
  .stat-pill { background: var(--bg-raised); border: 1px solid var(--border); border-radius: 20px; padding: 3px 10px; font-size: 11px; font-weight: 500; color: var(--text-muted); }

  /* User chip */
  .user-chip { display: flex; align-items: center; gap: 5px; background: var(--bg-raised); border-radius: 20px; padding: 3px 10px 3px 3px; border: 1px solid var(--border); }
  .user-chip-dot { width: 20px; height: 20px; border-radius: 50%; background: var(--red); display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; color: white; }
  .user-chip-name { font-size: 12px; font-weight: 500; color: var(--text); }
  .user-chip-x { background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 12px; padding: 0; margin-left: 2px; }
  .user-chip-x:hover { color: var(--text); }

  /* Facilitator badge */
  .facilitator-badge { display: inline-flex; align-items: center; gap: 4px; background: rgba(232,0,61,.1); color: var(--red); border: 1px solid rgba(232,0,61,.2); border-radius: 20px; padding: 2px 8px; font-size: 10px; font-weight: 600; letter-spacing: .03em; }
`;

// ── GIF / Q1 ──────────────────────────────────────────────────────────────────

async function searchGifs(query) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=12&media_filter=gif`, { signal: controller.signal });
    clearTimeout(timeout);
    const data = await res.json();
    if (data.results?.length > 0) return data.results.map(r => ({ id: r.id, title: r.content_description || query, images: { fixed_height_small: { url: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url } } }));
  } catch(e) { if (e.name !== "AbortError") console.warn("Tenor", e); clearTimeout(timeout); }
  try {
    const res = await fetch(`https://api.giphy.com/v1/gifs/search?api_key=${GIPHY_KEY}&q=${encodeURIComponent(query)}&limit=12&rating=g`);
    const data = await res.json(); return data.data || [];
  } catch(e) { console.warn("Giphy", e); }
  return [];
}

function GifPicker({ value, onChange }) {
  const [query, setQuery] = useState(""); const [results, setResults] = useState([]); const [loading, setLoading] = useState(false); const [searched, setSearched] = useState(false); const [showGrid, setShowGrid] = useState(!value);
  const search = async () => { if (!query.trim()) return; setLoading(true); setSearched(true); setResults(await searchGifs(query)); setLoading(false); };
  const selectGif = (gif) => { onChange({ url: gif.images.fixed_height_small.url, id: gif.id, title: gif.title }); setShowGrid(false); };
  if (value && !showGrid) return (<div><div className="gif-selected-preview"><img src={value.url} alt={value.title} /><div className="gif-selected-preview-text"><strong>GIF selected ✓</strong><span>{value.title || "Untitled"}</span><button className="gif-change-btn" onClick={() => setShowGrid(true)}>Change GIF</button></div></div><div className="giphy-attr">Powered by GIPHY</div></div>);
  return (
    <div className="gif-picker">
      <div className="gif-search-row"><input className="gif-search-input" placeholder="Search GIFs…" value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && search()} /><button className="gif-search-btn" onClick={search} disabled={loading || !query.trim()}>{loading ? "…" : "Search"}</button></div>
      {loading && <div className="gif-loading">Searching…</div>}
      {!loading && searched && results.length === 0 && <div className="gif-empty">No GIFs found.</div>}
      {!loading && results.length > 0 && <><div className="gif-grid">{results.map(gif => (<div key={gif.id} className={`gif-item ${value?.id === gif.id ? "selected" : ""}`} onClick={() => selectGif(gif)}><img src={gif.images.fixed_height_small.url} alt={gif.title} loading="lazy" />{value?.id === gif.id && <div className="gif-check">✓</div>}</div>))}</div><div className="giphy-attr">Powered by GIPHY</div></>}
      {!searched && <div className="gif-empty">Type something and hit Search</div>}
    </div>
  );
}

function Q1Picker({ value, onChange }) {
  const isGif = value && typeof value === "object";
  const [mode, setMode] = useState(isGif ? "gif" : "emoji");
  const handleModeSwitch = (m) => { setMode(m); if (m === "emoji" && isGif) onChange(""); if (m === "gif" && !isGif) onChange(""); };
  return (
    <div>
      <div className="q1-mode-toggle">
        <button className={`q1-mode-btn ${mode === "emoji" ? "active" : ""}`} onClick={() => handleModeSwitch("emoji")}>😄 Emoji</button>
        <button className={`q1-mode-btn ${mode === "gif" ? "active" : ""}`} onClick={() => handleModeSwitch("gif")}><span className={`toggle-switch ${mode === "gif" ? "on" : ""}`} />🎬 GIF</button>
      </div>
      {mode === "emoji" ? <div className="emoji-grid">{EMOJIS.map(e => <button key={e} className={`emoji-btn ${value === e ? "selected" : ""}`} onClick={() => onChange(e)}>{e}</button>)}</div> : <GifPicker value={isGif ? value : null} onChange={onChange} />}
    </div>
  );
}

// ── StickyCard ────────────────────────────────────────────────────────────────

function StickyCard({ card, hidden, onGroup, grouped, groupName, revealed, currentUser, onVote, allowVoting, accentColor }) {
  const isGif = card.content && typeof card.content === "object" && card.content.url;
  const votes = card.votes || {};
  const myVote = votes[currentUser] || 0;
  const netScore = Object.values(votes).reduce((sum, v) => sum + v, 0);
  const upCount = Object.values(votes).filter(v => v === 1).length;
  const downCount = Object.values(votes).filter(v => v === -1).length;
  const handleVote = (e, dir) => { e.stopPropagation(); if (!revealed || !allowVoting) return; onVote(card.id, myVote === dir ? 0 : dir); };

  return (
    <div className="sticky" style={{ borderLeftColor: accentColor || "#555" }} onClick={onGroup}>
      {grouped && <span className="sticky-group-badge">📌 {groupName}</span>}
      {card.type === "emoji" && !isGif && <div className="sticky-emoji">{card.content}</div>}
      {card.type === "emoji" && isGif && !hidden && <div style={{ borderRadius: 6, overflow: "hidden", lineHeight: 0 }}><img src={card.content.url} alt="gif" style={{ width: "100%", borderRadius: 6 }} /></div>}
      {card.type === "emoji" && isGif && hidden && <div className="sticky-emoji">🎬</div>}
      {card.type !== "emoji" && (
        <div className="sticky-content">{hidden ? <span style={{ color: "var(--text-dim)", letterSpacing: 2 }}>● ● ● ● ●</span> : (typeof card.content === "string" && card.content.startsWith("<") ? <span dangerouslySetInnerHTML={{ __html: card.content }} /> : card.content)}</div>
      )}
      {!hidden && <div className="sticky-author">— {card.author}</div>}
      {revealed && allowVoting && (
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 8, paddingTop: 7, borderTop: "1px solid var(--border)" }} onClick={e => e.stopPropagation()}>
          <button onClick={e => handleVote(e, 1)} style={{ display: "flex", alignItems: "center", gap: 3, background: myVote === 1 ? "#ff4500" : "var(--bg-raised)", border: "1px solid var(--border-light)", borderRadius: 5, padding: "2px 7px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: myVote === 1 ? "white" : "var(--text-muted)", transition: "all .15s" }}>▲ {upCount > 0 ? upCount : ""}</button>
          <button onClick={e => handleVote(e, -1)} style={{ display: "flex", alignItems: "center", gap: 3, background: myVote === -1 ? "#6366f1" : "var(--bg-raised)", border: "1px solid var(--border-light)", borderRadius: 5, padding: "2px 7px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: myVote === -1 ? "white" : "var(--text-muted)", transition: "all .15s" }}>▼ {downCount > 0 ? downCount : ""}</button>
          {netScore !== 0 && <span style={{ fontSize: 11, fontWeight: 700, color: netScore > 0 ? "#ff4500" : "#6366f1", marginLeft: "auto" }}>{netScore > 0 ? "+" : ""}{netScore}</span>}
        </div>
      )}
    </div>
  );
}

// ── AI Ideas ──────────────────────────────────────────────────────────────────

async function fetchIdeas(question) {
  const starters = {
    achievements: ["We finally shipped the feature that's been in progress for weeks — solid execution from the whole team.", "Collaboration was strong this sprint, but we need to be more realistic about what we can actually finish.", "The technical debt we paid down this sprint will save us significant time next quarter."],
    start: ["Start doing async design reviews before sprint planning so we catch issues earlier.", "We should start time-boxing exploratory tasks — they tend to sprawl without a hard limit.", "Start sharing blockers in the standup channel same-day instead of waiting for the next sync."],
    stop: ["Stop pulling in stretch tickets without checking team capacity first.", "Stop context-switching mid-sprint — it's killing our focus time.", "Stop leaving PRs open for more than 24 hours without a reviewer assigned."],
    continue: ["Keep the daily standup short and focused — it's one of the few rituals that actually works.", "The pairing sessions this sprint were really effective, let's keep that going.", "Continue the async-first communication approach — it's reduced interruptions noticeably."],
    shoutout: ["Shoutout to the folks who stayed focused even when things got chaotic mid-sprint.", "Big thanks to whoever documented that gnarly bug fix — future us will appreciate it.", "Recognition to the team for being proactive about unblocking each other this sprint."],
    default: ["This sprint felt more focused than usual — the prep work beforehand really paid off.", "We need to get better at flagging risks earlier rather than discovering them at the end.", "One thing worth trying: a quick team check-in at the midpoint of each sprint."]
  };
  const q = question.toLowerCase();
  let bank = starters.default;
  if (q.includes("achiev") || q.includes("standout")) bank = starters.achievements;
  else if (q.includes("start")) bank = starters.start;
  else if (q.includes("stop")) bank = starters.stop;
  else if (q.includes("continue") || q.includes("working")) bank = starters.continue;
  else if (q.includes("shout") || q.includes("anything else")) bank = starters.shoutout;
  return [...bank].sort(() => Math.random() - 0.5).slice(0, 3);
}

function AIIdeas({ question, onSelect }) {
  const [ideas, setIdeas] = useState([]); const [loading, setLoading] = useState(false); const [shown, setShown] = useState(false);
  const generate = async () => { setLoading(true); setShown(true); try { setIdeas(await fetchIdeas(question)); } catch(e) { console.warn(e); setIdeas([]); } setLoading(false); };
  if (!shown) return <button className="ai-ideas-btn" onClick={generate}>✨ Give me ideas</button>;
  return (
    <div style={{ marginBottom: 10 }}>
      <button className="ai-ideas-btn" onClick={() => { setIdeas([]); generate(); }} disabled={loading}>✨ {loading ? "Generating…" : "Refresh ideas"}</button>
      {loading ? <div className="ai-ideas-wrap"><div className="ai-ideas-loading"><div className="ai-dot-spin" />Thinking…</div></div>
        : ideas.length > 0 && <div className="ai-ideas-wrap"><div className="ai-ideas-header">Starter ideas — click to use</div>{ideas.map((idea, i) => <button key={i} className="ai-idea-chip" onClick={() => onSelect(idea)}><span className="ai-idea-chip-text">{idea}</span><span className="ai-idea-use">Use →</span></button>)}</div>}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const submissionsStore = {
  async save(token, data) {
    try { localStorage.setItem("rk_sub_" + token, JSON.stringify(data)); } catch(e) { console.warn(e); }
    if (supabase) {
      const { error } = await supabase.from("submissions").upsert({
        id: token, session_id: data.sessionId, name: data.name,
        answers: data.answers, submitted_at: data.submittedAt
      });
      if (error) console.warn("Supabase submission save:", error.message);
    }
  },
  get(token) { try { return JSON.parse(localStorage.getItem("rk_sub_" + token) || "null"); } catch(e) { console.warn(e); return null; } }
};
function generateEditToken() { return uid(); }

function CopyButton({ text, label = "Copy Link" }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { try { const ta = document.createElement("textarea"); ta.value = text; ta.style.cssText = "position:fixed;opacity:0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); document.body.removeChild(ta); } catch(e) { console.warn(e); } }
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };
  return <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={copy}>{copied ? "✓ Copied!" : label}</button>;
}

function ConfirmModal({ answers, questions, onConfirm, onCancel }) {
  const getPreview = (q) => { const val = answers[q.id]; if (!val) return null; if (typeof val === "object" && val.url) return "GIF: " + (val.title || "selected"); return val; };
  return (
    <div className="modal-overlay"><div className="modal">
      <h2>Ready to submit?</h2><p>Here's a summary of your responses.</p>
      <div className="confirm-summary">{questions.map(q => { const p = getPreview(q); return (<div key={q.id} className="confirm-row"><span className="confirm-q-label" style={{ background: q.color }}>{q.label}</span><span className={`confirm-answer ${!p ? "empty" : ""}`}>{p || "No response"}</span></div>); })}</div>
      <div className="modal-btns"><button className="btn btn-secondary" onClick={onCancel}>← Go Back</button><button className="btn btn-primary" onClick={onConfirm}>Submit →</button></div>
    </div></div>
  );
}

function EditLinkBox({ token }) {
  const base = window.location.origin + window.location.pathname.replace(/\?.*$/, "");
  const sessionParam = new URLSearchParams(window.location.search).get("session");
  const editUrl = `${base}?${sessionParam ? "session=" + sessionParam + "&" : ""}edit=${token}`;
  return (
    <div className="edit-link-box"><h3>🔗 Your edit link</h3><p>Save this to update your responses before the cutoff.</p>
      <div className="edit-link-copy-row"><div className="edit-link-url" title={editUrl}>{editUrl}</div><CopyButton text={editUrl} /></div>
    </div>
  );
}

// ── Rich Text Editor ──────────────────────────────────────────────────────────

const ALL_EMOJIS = ["😀","😂","🥲","😍","🤩","😎","🤔","😬","😅","🙌","👏","🔥","💯","🚀","⚡","🎯","💪","🧠","💡","✅","❌","⚠️","📌","🔧","🐛","🎉","🏆","🌱","🌊","💥","🤝","👀","😤","😮","🥳","🫠","😵","🤯","💀","🙏","👋","✊","🫡","🎸","🌀","⏰","📊","🗓️","💬","📝","🔗","🔑","🚧","🛠️","📦","🧩","🎲","🪄","🫶","❤️","💙","💚","💛","🖤"];

function EmojiPopup({ onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = search ? ALL_EMOJIS.filter(e => e.includes(search)) : ALL_EMOJIS;
  useEffect(() => { const h = e => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [onClose]);
  return (<div className="emoji-popup"><input className="emoji-popup-search" placeholder="Search emoji…" value={search} onChange={e => setSearch(e.target.value)} autoFocus /><div className="emoji-popup-grid">{filtered.map((e, i) => <div key={i} className="emoji-popup-item" onClick={() => { onSelect(e); onClose(); }}>{e}</div>)}</div></div>);
}

function RichTextEditor({ value, onChange, placeholder, injectText }) {
  const editorRef = useRef(null); const [showEmoji, setShowEmoji] = useState(false); const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, list: false }); const lastInjectedRef = useRef("");
  useEffect(() => { if (editorRef.current && value && editorRef.current.innerHTML === "") editorRef.current.innerHTML = value; }, []);
  useEffect(() => {
    if (!injectText || !editorRef.current) return;
    const clean = injectText.replace(/_\d+$/, "");
    if (clean === lastInjectedRef.current) return;
    lastInjectedRef.current = clean; editorRef.current.innerHTML = clean; onChange(clean); editorRef.current.focus();
    const range = document.createRange(); const sel = window.getSelection(); range.selectNodeContents(editorRef.current); range.collapse(false); sel.removeAllRanges(); sel.addRange(range);
  }, [injectText]);
  const exec = cmd => { editorRef.current.focus(); document.execCommand(cmd, false, null); syncFormats(); emitChange(); };
  const syncFormats = () => setActiveFormats({ bold: document.queryCommandState("bold"), italic: document.queryCommandState("italic"), list: document.queryCommandState("insertUnorderedList") });
  const emitChange = () => { if (editorRef.current) onChange(editorRef.current.innerHTML); };
  const insertEmoji = emoji => { editorRef.current.focus(); document.execCommand("insertText", false, emoji); emitChange(); };
  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        <button className={`rte-btn ${activeFormats.bold ? "active" : ""}`} onMouseDown={e => { e.preventDefault(); exec("bold"); }}><b>B</b></button>
        <button className={`rte-btn ${activeFormats.italic ? "active" : ""}`} onMouseDown={e => { e.preventDefault(); exec("italic"); }}><i>I</i></button>
        <div className="rte-divider" />
        <button className={`rte-btn ${activeFormats.list ? "active" : ""}`} onMouseDown={e => { e.preventDefault(); exec("insertUnorderedList"); }}>≡</button>
        <div className="rte-divider" />
        <button className="rte-btn rte-emoji-btn" onMouseDown={e => { e.preventDefault(); setShowEmoji(s => !s); }}>😊</button>
      </div>
      <div ref={editorRef} className="rte-editor" contentEditable suppressContentEditableWarning data-placeholder={placeholder || "Type your response…"} onInput={emitChange} onKeyUp={syncFormats} onMouseUp={syncFormats} onKeyDown={e => { if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); exec("bold"); } if ((e.metaKey || e.ctrlKey) && e.key === "i") { e.preventDefault(); exec("italic"); } }} />
      {showEmoji && <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 300 }}><EmojiPopup onSelect={insertEmoji} onClose={() => setShowEmoji(false)} /></div>}
    </div>
  );
}

// ── Submit View ───────────────────────────────────────────────────────────────

function SubmitView({ session, questions, currentUser, joinQ1 }) {
  const urlParams = new URLSearchParams(window.location.search);
  const editToken = urlParams.get("edit");
  const existingSubmission = editToken ? submissionsStore.get(editToken) : null;
  const isOpen = sessionStore.isSubmissionOpen(session);
  const [name, setName] = useState(existingSubmission?.name || currentUser || "");
  const [answers, setAnswers] = useState(existingSubmission?.answers || { q1: joinQ1 || "", q2: "", q3: "", q4: "" });
  const [injected, setInjected] = useState({ q1: "", q2: "", q3: "", q4: "" });
  const [showConfirm, setShowConfirm] = useState(false); const [submitted, setSubmitted] = useState(false);
  const [editLink, setEditLink] = useState(existingSubmission ? { token: editToken } : null);
  const [exited, setExited] = useState(false);
  const isEditing = !!existingSubmission;
  const handleExit = () => { try { window.history.replaceState({}, "", window.location.href.split("?")[0]); } catch(e) { console.warn(e); } setExited(true); };
  if (exited) return <div className="submit-wrap"><div className="success-wrap"><div className="success-icon">👋</div><h2>No changes made</h2><p>Your original responses are still saved.</p></div></div>;
  const setAnswer = (id, val) => setAnswers(a => ({ ...a, [id]: val }));
  const injectIdea = (qId, text) => { setAnswer(qId, text); setInjected(i => ({ ...i, [qId]: text })); };
  const handleSubmit = async () => {
    const token = editToken || generateEditToken();
    await submissionsStore.save(token, { name: name.trim(), answers, sprintNumber: session.sprintNumber, sessionId: session.id, submittedAt: new Date().toISOString() });
    setEditLink({ token }); setSubmitted(true); setShowConfirm(false);
  };
  if (submitted) return <div className="submit-wrap"><div className="success-wrap"><div className="success-icon">{isEditing ? "✏️" : "🎉"}</div><h2>{isEditing ? "Responses updated!" : "You're all set!"}</h2><p>Your responses have been saved. See you at the retro!</p>{editLink && <EditLinkBox token={editLink.token} />}</div></div>;
  return (
    <div className="submit-wrap">
      {showConfirm && <ConfirmModal answers={answers} questions={questions} onConfirm={handleSubmit} onCancel={() => setShowConfirm(false)} />}
      <div className="submit-header">
        <h1>{session.name} · Sprint {session.sprintNumber}</h1>
        <p>Share your thoughts before the meeting.</p>
        <div className="anon-badge">👥 Responses visible after reveal</div>
      </div>
      {!isOpen && <div className="closed-banner">🔒 Submissions are closed for this session.</div>}
      <div className="name-card">
        <div className="name-card-label">Your name</div>
        <div className="name-card-title">Who's submitting?</div>
        <input className="input" placeholder="First name or display name…" value={name} onChange={e => setName(e.target.value)} maxLength={30} />
      </div>
      {isEditing && <div className="editing-banner">✏️ You're editing your previous responses.</div>}
      {questions.map(q => (
        <div key={q.id} className="q-card" style={{ borderLeftColor: q.color }}>
          <div className="q-label" style={{ color: q.color }}>{q.label}</div>
          <div className="q-prompt">{q.prompt}</div>
          {q.type === "emoji" ? <Q1Picker value={answers[q.id]} onChange={v => setAnswer(q.id, v)} /> : (<><AIIdeas question={q.prompt} onSelect={idea => injectIdea(q.id, idea)} /><RichTextEditor value={answers[q.id]} onChange={v => setAnswer(q.id, v)} placeholder="Type your response…" injectText={injected[q.id]} /></>)}
        </div>
      ))}
      <div className="submit-actions">
        {isEditing && <button className="exit-btn" onClick={handleExit}>← Exit without saving</button>}
        <button className="submit-btn" style={{ flex: 1 }} disabled={!name.trim() || !isOpen} onClick={() => setShowConfirm(true)}>{isEditing ? "Update Responses →" : "Review & Submit →"}</button>
      </div>
    </div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

function exportCSV({ session, questions, cards, freeCards, actionItems }) {
  const escape = val => { const s = typeof val === "object" && val?.url ? `[GIF: ${val.title || "gif"}]` : String(val ?? ""); return `"${s.replace(/"/g, '""')}"`; };
  const netVotes = card => Object.values(card.votes || {}).reduce((sum, x) => sum + x, 0);
  const rows = [["Section","Question","Author","Content","Net Votes"]];
  questions.forEach(q => { cards.filter(c => c.qId === q.id).forEach(c => rows.push([q.label, q.prompt, c.author, c.content, netVotes(c)])); });
  freeCards.forEach(c => rows.push(["Free Card","",c.author, c.content, netVotes(c)]));
  actionItems.forEach(item => rows.push(["Action Item","", item.owner, item.text, item.done ? "Done" : "Open"]));
  const csv = rows.map(r => r.map(escape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${session.name || "retro"}-sprint${session.sprintNumber}.csv`.replace(/\s+/g, "-").toLowerCase(); a.click(); URL.revokeObjectURL(url);
}

// ── Board View ────────────────────────────────────────────────────────────────

const AI_SUGGESTIONS = {
  q3: [{ label: "Blockers & friction", cards: ["Unplanned interruptions", "ticket grooming"] }, { label: "Process improvements", cards: ["async design reviews", "sprint planning"] }],
  q2: [{ label: "Wins", cards: ["dashboard", "CI/CD", "zero bugs"] }],
};
const REACTION_EMOJIS = ["🔥","💯","👏","😅","🚀","💡","🤔","😬","🙌","❤️","😂","👀"];

function FreeCard({ card, onDragStart, onEdit, onDelete }) {
  const [editing, setEditing] = useState(false); const [text, setText] = useState(card.content); const [showEmoji, setShowEmoji] = useState(false); const editorRef = useRef(null);
  const handleDoubleClick = e => { e.stopPropagation(); setEditing(true); setTimeout(() => editorRef.current?.focus(), 0); };
  const handleBlur = () => { setEditing(false); setShowEmoji(false); onEdit(card.id, text); };
  const insertEmoji = emoji => { setText(t => t + emoji); setShowEmoji(false); setTimeout(() => editorRef.current?.focus(), 0); };
  return (
    <div style={{ position: "absolute", left: card.x, top: card.y, width: 200, background: "#1e2333", border: `1px solid ${card.color}40`, borderLeft: `3px solid ${card.color}`, borderRadius: 8, padding: "12px 14px", boxShadow: "0 4px 12px rgba(0,0,0,.4)", cursor: editing ? "text" : "grab", userSelect: "none", zIndex: editing ? 50 : 10 }}
      onMouseDown={e => { if (editing) return; e.preventDefault(); onDragStart(e, card.id); }} onDoubleClick={handleDoubleClick}>
      {!editing && (
        <button onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onDelete(card.id); }}
          style={{ position: "absolute", top: 5, right: 5, width: 16, height: 16, borderRadius: "50%", border: "none", background: "var(--border-focus)", color: "var(--text-muted)", fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1, transition: "all .15s" }}
          onMouseOver={e => { e.currentTarget.style.background = "#f87171"; e.currentTarget.style.color = "white"; }}
          onMouseOut={e => { e.currentTarget.style.background = "var(--border-focus)"; e.currentTarget.style.color = "var(--text-muted)"; }}
          title="Delete card">×</button>
      )}
      {editing ? (
        <div style={{ position: "relative" }}>
          <textarea ref={editorRef} value={text} onChange={e => setText(e.target.value)} onBlur={handleBlur} onKeyDown={e => { if (e.key === "Escape") { setEditing(false); onEdit(card.id, text); } }} style={{ width: "100%", minHeight: 60, border: "none", background: "transparent", fontFamily: "inherit", fontSize: 13, color: "var(--text)", resize: "none", outline: "none", lineHeight: 1.5 }} />
          <button onMouseDown={e => { e.preventDefault(); setShowEmoji(s => !s); }} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 15, padding: "2px 4px", opacity: 0.6 }}>😊</button>
          {showEmoji && <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 400 }}><EmojiPopup onSelect={insertEmoji} onClose={() => setShowEmoji(false)} /></div>}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "var(--text)", lineHeight: 1.5, fontWeight: 400, minHeight: 24, wordBreak: "break-word", paddingRight: 14 }}>{text || <span style={{ opacity: 0.35, fontStyle: "italic" }}>Double-click to edit…</span>}</div>
      )}
      <div style={{ fontSize: 11, color: "var(--text-dim)", marginTop: 6, fontWeight: 500, display: "flex", justifyContent: "space-between" }}>
        <span>— {card.author}</span>{!editing && <span style={{ opacity: 0.4, fontSize: 10 }}>✎ dbl-click</span>}
      </div>
    </div>
  );
}

// Revealed banner with fade-out
function RevealedBanner() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2500);
    const hideTimer = setTimeout(() => setVisible(false), 3000);
    return () => { clearTimeout(fadeTimer); clearTimeout(hideTimer); };
  }, []);
  if (!visible) return null;
  return <div className={`revealed-banner ${fading ? "fade-out" : ""}`}>✓ Revealed</div>;
}

function BoardView({ session, members, questions, currentUser, onNewSubmissions }) {
  const sessionId = session?.id;
  const isFacilitator = facilitatorStore.is();
  const allowReactions = session?.allowReactions ?? false;
  const allowVoting = session?.allowVoting ?? false;

  const [cards, setCards] = useState([]);
  const [submittedNames, setSubmittedNames] = useState([]);
  const [freeCards, setFreeCards] = useState([]);
  const [votes, setVotes] = useState({});
  const [actionItemsLoaded, setActionItemsLoaded] = useState(false);
  const [hasNewSubmissions, setHasNewSubmissions] = useState(false);

  // Helper: map a submission row to card objects
  const subToCards = sub => Object.entries(sub.answers || {}).filter(([, val]) => val).map(([qId, content]) => ({
    id: uid(), qId, content, author: sub.name,
    color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
    groupId: null, type: qId === "q1" ? "emoji" : "text"
  }));

  // Load submissions from Supabase on mount
  useEffect(() => {
    if (!sessionId) return;
    if (supabase) {
      supabase.from("submissions").select("*").eq("session_id", sessionId)
        .then(({ data, error }) => {
          if (error) { console.warn("load submissions:", error.message); return; }
          if (data?.length) {
            setCards(data.flatMap(subToCards));
            setSubmittedNames([...new Set(data.map(s => s.name).filter(Boolean))]);
          }
        });
      // Load free cards
      supabase.from("free_cards").select("*").eq("session_id", sessionId)
        .then(({ data, error }) => {
          if (error) { console.warn("load free_cards:", error.message); return; }
          if (data) setFreeCards(data.map(r => ({ id: r.id, content: r.content, author: r.author, color: r.color, x: r.x, y: r.y })));
        });
      // Load votes
      supabase.from("votes").select("*").eq("session_id", sessionId)
        .then(({ data, error }) => {
          if (error) { console.warn("load votes:", error.message); return; }
          if (data) {
            const v = {};
            data.forEach(row => { if (!v[row.card_id]) v[row.card_id] = {}; v[row.card_id][row.user_name] = row.direction; });
            setVotes(v);
          }
        });
      // Load action items
      supabase.from("action_items").select("*").eq("session_id", sessionId).order("created_at")
        .then(({ data, error }) => {
          if (error) { console.warn("load action_items:", error.message); return; }
          if (data?.length) { setActionItems(data.map(r => ({ id: r.id, text: r.text, owner: r.owner, done: r.done }))); }
          setActionItemsLoaded(true);
        });

      // Real-time subscription for new submissions
      const channel = supabase.channel(`session-${sessionId}`)
        .on("postgres_changes", { event: "INSERT", schema: "public", table: "submissions", filter: `session_id=eq.${sessionId}` },
          payload => {
            const newSub = payload.new;
            setCards(prev => [...prev, ...subToCards(newSub)]);
            setSubmittedNames(prev => [...new Set([...prev, newSub.name])]);
            setHasNewSubmissions(true);
            onNewSubmissions?.();
          }
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    } else {
      // localStorage fallback (same browser only)
      try {
        const keys = Object.keys(localStorage).filter(k => k.startsWith("rk_sub_"));
        const subs = keys.map(k => JSON.parse(localStorage.getItem(k))).filter(s => s?.sessionId === sessionId);
        if (subs.length) {
          setCards(subs.flatMap(subToCards));
          setSubmittedNames([...new Set(subs.map(s => s.name).filter(Boolean))]);
        }
      } catch(e) { console.warn(e); }
      setActionItemsLoaded(true);
    }
  }, [sessionId]);

  const cardsWithVotes = cards.map(c => ({ ...c, votes: votes[c.id] || {} }));

  // Votes handler — write to Supabase
  const handleVote = async (cardId, dir) => {
    const voteId = `${sessionId}_${cardId}_${currentUser}`;
    if (dir === 0) {
      setVotes(prev => { const next = { ...prev }; if (next[cardId]) { delete next[cardId][currentUser]; } return next; });
      if (supabase) await supabase.from("votes").delete().eq("id", voteId);
    } else {
      setVotes(prev => { const next = { ...prev }; if (!next[cardId]) next[cardId] = {}; next[cardId][currentUser] = dir; return next; });
      if (supabase) await supabase.from("votes").upsert({ id: voteId, session_id: sessionId, card_id: cardId, user_name: currentUser, direction: dir });
    }
  };

  const handleRefresh = () => { setHasNewSubmissions(false); };

  const [revealed, setRevealed] = useState(false);
  const [revealKey, setRevealKey] = useState(0); // bump to re-mount RevealedBanner
  const [groups, setGroups] = useState({});
  const [actionItems, setActionItems] = useState([]);
  const [newAction, setNewAction] = useState(""); const [newOwner, setNewOwner] = useState("");
  const [showAI, setShowAI] = useState(null); const [groupingCard, setGroupingCard] = useState(null); const [newGroupName, setNewGroupName] = useState("");
  const [appliedSuggestions, setAppliedSuggestions] = useState([]);
  const [reactions, setReactions] = useState([]);
  const canvasRef = useRef(null); const dragState = useRef(null);

  const saveFreeCard = async (card) => {
    if (supabase) {
      const { error } = await supabase.from("free_cards").upsert({ id: card.id, session_id: sessionId, content: card.content, author: card.author, color: card.color, x: card.x, y: card.y });
      if (error) console.warn("save free_card:", error.message);
    }
  };
  const deleteFreeCardRemote = async (cardId) => {
    if (supabase) await supabase.from("free_cards").delete().eq("id", cardId);
  };

  const addFreeCard = () => {
    const canvas = canvasRef.current;
    const rect = canvas ? canvas.getBoundingClientRect() : { width: 800, height: 600 };
    const x = Math.max(0, Math.round(rect.width / 2 - 100));
    const y = Math.max(0, Math.round(window.scrollY + window.innerHeight / 2 - 100));
    const newCard = { id: uid(), content: "", author: currentUser || "You", color: randomColor(), x, y };
    setFreeCards(prev => [...prev, newCard]);
    saveFreeCard(newCard);
  };
  const handleDragStart = (e, cardId) => { const card = freeCards.find(c => c.id === cardId); if (!card) return; dragState.current = { cardId, startX: e.clientX, startY: e.clientY, origX: card.x, origY: card.y }; window.addEventListener("mousemove", handleDragMove); window.addEventListener("mouseup", handleDragEnd); };
  const handleDragMove = e => { const d = dragState.current; if (!d) return; const dx = e.clientX - d.startX, dy = e.clientY - d.startY; setFreeCards(cs => cs.map(c => c.id === d.cardId ? { ...c, x: Math.max(0, d.origX + dx), y: Math.max(0, d.origY + dy) } : c)); };
  const handleDragEnd = () => {
    if (!dragState.current) return;
    const d = dragState.current;
    setFreeCards(cs => {
      const card = cs.find(c => c.id === d.cardId);
      if (card) saveFreeCard(card);
      return cs;
    });
    dragState.current = null;
    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("mouseup", handleDragEnd);
  };
  const handleEditCard = (cardId, newText) => {
    setFreeCards(cs => {
      const updated = cs.map(c => c.id === cardId ? { ...c, content: newText } : c);
      const card = updated.find(c => c.id === cardId);
      if (card) saveFreeCard(card);
      return updated;
    });
  };
  const handleDeleteCard = (cardId) => {
    setFreeCards(cs => cs.filter(c => c.id !== cardId));
    deleteFreeCardRemote(cardId);
  };
  useEffect(() => () => { window.removeEventListener("mousemove", handleDragMove); window.removeEventListener("mouseup", handleDragEnd); }, []);

  const dropReaction = emoji => { const id = uid(); const x = 100 + Math.random() * (window.innerWidth - 200); const y = 100 + Math.random() * (window.innerHeight - 200); setReactions(r => [...r, { id, emoji, x, y }]); setTimeout(() => setReactions(r => r.filter(rx => rx.id !== id)), 2400); };

  const cardsForQ = qId => cardsWithVotes.filter(c => c.qId === qId);
  const applyGroup = (cardId, groupId) => setCards(cs => cs.map(c => c.id === cardId ? { ...c, groupId } : c));
  const createGroup = (qId, name) => { const gid = uid(); setGroups(g => ({ ...g, [gid]: { name, qId } })); return gid; };
  const groupsForQ = qId => Object.entries(groups).filter(([, v]) => v.qId === qId);
  const toggleDone = async (id) => {
    const item = actionItems.find(i => i.id === id);
    if (!item) return;
    const newDone = !item.done;
    setActionItems(a => a.map(i => i.id === id ? { ...i, done: newDone } : i));
    if (supabase) await supabase.from("action_items").update({ done: newDone }).eq("id", id);
  };
  const deleteAction = async (id) => {
    setActionItems(a => a.filter(i => i.id !== id));
    if (supabase) await supabase.from("action_items").delete().eq("id", id);
  };
  const addAction = async () => {
    if (!newAction.trim()) return;
    const item = { id: uid(), text: newAction, owner: newOwner || "TBD", done: false };
    setActionItems(a => [...a, item]);
    setNewAction(""); setNewOwner("");
    if (supabase) {
      const { error } = await supabase.from("action_items").insert({ ...item, session_id: sessionId });
      if (error) console.warn("add action_item:", error.message);
    }
  };
  const editActionText = async (id, text) => {
    setActionItems(a => a.map(i => i.id === id ? { ...i, text } : i));
    if (supabase) await supabase.from("action_items").update({ text }).eq("id", id);
  };
  const editActionOwner = async (id, owner) => {
    setActionItems(a => a.map(i => i.id === id ? { ...i, owner } : i));
    if (supabase) await supabase.from("action_items").update({ owner }).eq("id", id);
  };

  const handleReveal = () => { setRevealed(true); setRevealKey(k => k + 1); };

  return (
    <div className="board-wrap">


      {/* Reaction bar — only if enabled */}
      {revealed && allowReactions && (
        <div className="reaction-bar">
          <span className="reaction-bar-label">React</span>
          {REACTION_EMOJIS.map(e => <button key={e} className="reaction-emoji-btn" onClick={() => dropReaction(e)}>{e}</button>)}
        </div>
      )}
      {reactions.map(r => <div key={r.id} className="reaction-drop" style={{ left: r.x, top: r.y }}>{r.emoji}</div>)}

      <div style={{ padding: "16px 20px 24px" }}>
        {/* Toolbar */}
        <div className="board-toolbar">
          <button className="btn btn-primary" onClick={addFreeCard} style={{ fontSize: 14, padding: "8px 18px" }}>＋ Add Card</button>
          {isFacilitator && (
            <>
              {!revealed
                ? <button className="btn btn-secondary" onClick={handleReveal}>👁 Reveal Cards</button>
                : <button className="btn btn-success" onClick={() => setRevealed(false)}>🙈 Hide Cards</button>
              }
              <button className="btn btn-ghost" onClick={() => setShowAI("q3")}>✨ AI Suggestions</button>
              <button className="btn btn-ghost" onClick={() => exportCSV({ session, questions, cards: cardsWithVotes, freeCards, actionItems })}>⬇ Export</button>
            </>
          )}
          {isFacilitator && <span className="facilitator-badge">Facilitator</span>}
          {/* Submitted name chips */}
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginLeft: "auto", flexWrap: "wrap" }}>
            {submittedNames.length > 0 && (
              <span style={{ fontSize: 10, color: "var(--text-dim)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginRight: 2 }}>Submitted</span>
            )}
            {submittedNames.map((name, i) => (
              <div key={i} className="sub-chip">
                <div className="sub-chip-dot" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{name[0]}</div>
                {name}
              </div>
            ))}
            {submittedNames.length === 0 && <span style={{ fontSize: 11, color: "var(--text-dim)" }}>No submissions yet</span>}
          </div>
        </div>

        {!revealed && isFacilitator && (
          <div style={{ background: "rgba(245,158,11,.05)", border: "1px solid rgba(245,158,11,.15)", borderRadius: 8, padding: "9px 14px", marginBottom: 16, fontSize: 13, color: "#fbbf24" }}>
            🔒 Cards are hidden. Click <strong>Reveal Cards</strong> to show responses.
          </div>
        )}
        {freeCards.length > 0 && <div style={{ fontSize: 11, color: "var(--text-dim)", marginBottom: 12 }}>💡 <strong style={{ color: "var(--text-muted)" }}>{freeCards.length} free card{freeCards.length !== 1 ? "s" : ""}</strong> on canvas — drag, double-click to edit</div>}

        <div style={{ paddingBottom: 40 }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start", position: "relative", flexWrap: "nowrap" }}>
            {/* Free cards canvas */}
            <div ref={canvasRef} style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 20 }}>
              {freeCards.map(card => <div key={card.id} style={{ pointerEvents: "all" }}><FreeCard card={card} onDragStart={handleDragStart} onEdit={handleEditCard} onDelete={handleDeleteCard} /></div>)}
            </div>

            {/* Q columns */}
            {questions.map(q => {
              const qCards = cardsForQ(q.id);
              const ungrouped = qCards.filter(c => !c.groupId);
              const qGroups = groupsForQ(q.id);
              return (
                <div key={q.id} className="col">
                  <div className="col-header" style={{ background: "var(--bg-card)", borderTop: `2px solid ${q.color}`, border: "1px solid var(--border)", borderBottom: "none", borderRadius: "10px 10px 0 0" }}>
                    <div className="col-header-title">{q.prompt}</div>
                  </div>
                  <div className="col-body">
                    {revealed && <RevealedBanner key={revealKey} />}
                    {qGroups.map(([gid, gdata]) => {
                      const gCards = qCards.filter(c => c.groupId === gid);
                      return (
                        <div key={gid} className="group-block">
                          <div className="group-label"><input value={gdata.name} onChange={e => setGroups(g => ({ ...g, [gid]: { ...g[gid], name: e.target.value } }))} /><span style={{ fontSize: 10, color: "var(--text-dim)" }}>{gCards.length}</span></div>
                          {gCards.map(c => <StickyCard key={c.id} card={c} hidden={!revealed} grouped groupName={gdata.name} onGroup={() => setGroupingCard(c)} revealed={revealed} currentUser={currentUser} onVote={handleVote} allowVoting={allowVoting} accentColor={q.color} />)}
                        </div>
                      );
                    })}
                    {ungrouped.map(c => <StickyCard key={c.id} card={c} hidden={!revealed} onGroup={() => revealed && setGroupingCard(c)} revealed={revealed} currentUser={currentUser} onVote={handleVote} allowVoting={allowVoting} accentColor={q.color} />)}
                    {qCards.length === 0 && <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, padding: "24px 0" }}>No responses yet</div>}
                  </div>
                </div>
              );
            })}

            {/* Action Items column */}
            <div style={{ width: 268, flexShrink: 0 }}>
              <div style={{ background: "var(--bg-card)", borderTop: "2px solid var(--border-focus)", border: "1px solid var(--border)", borderBottom: "none", borderRadius: "10px 10px 0 0", padding: "12px 14px" }}>
                <div className="col-header-title">✅ Action Items</div>
              </div>
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 10px 10px", padding: 10, minHeight: 200, display: "flex", flexDirection: "column", gap: 6 }}>
                {actionItems.map(item => (
                  <div key={item.id} style={{ background: item.done ? "rgba(16,185,129,.05)" : "var(--bg-raised)", border: `1px solid ${item.done ? "rgba(16,185,129,.2)" : "var(--border-light)"}`, borderRadius: 7, padding: "9px 11px", display: "flex", flexDirection: "column", gap: 4 }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                      <div className={`action-check ${item.done ? "done" : ""}`} onClick={() => toggleDone(item.id)} style={{ marginTop: 1 }}>{item.done && "✓"}</div>
                      <input
                        value={item.text}
                        onChange={e => editActionText(item.id, e.target.value)}
                        style={{ flex: 1, background: "transparent", border: "none", fontFamily: "inherit", fontSize: 13, color: item.done ? "var(--text-dim)" : "var(--text)", outline: "none", textDecoration: item.done ? "line-through" : "none", minWidth: 0 }}
                      />
                      <div style={{ color: "var(--text-dim)", cursor: "pointer", fontSize: 15, transition: "color .15s", flexShrink: 0 }} onClick={() => deleteAction(item.id)} onMouseOver={e => e.currentTarget.style.color = "#f87171"} onMouseOut={e => e.currentTarget.style.color = "var(--text-dim)"}>×</div>
                    </div>
                    <div style={{ paddingLeft: 26, display: "flex", alignItems: "center", gap: 6 }}>
                      <input
                        value={item.owner}
                        onChange={e => editActionOwner(item.id, e.target.value)}
                        style={{ background: "transparent", border: "none", fontFamily: "inherit", fontSize: 11, color: "var(--blue)", fontWeight: 500, outline: "none", width: 80 }}
                        placeholder="Owner"
                      />
                    </div>
                  </div>
                ))}
                {actionItems.length === 0 && <div style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, padding: "24px 0" }}>No actions yet</div>}
                <div style={{ marginTop: 4, display: "flex", flexDirection: "column", gap: 5 }}>
                  <input placeholder="New action item…" value={newAction} onChange={e => setNewAction(e.target.value)} onKeyDown={e => e.key === "Enter" && addAction()} style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border-light)", borderRadius: 7, padding: "6px 9px", fontFamily: "inherit", fontSize: 12, outline: "none", color: "var(--text)" }} />
                  <div style={{ display: "flex", gap: 5 }}>
                    <input placeholder="Owner" value={newOwner} onChange={e => setNewOwner(e.target.value)} onKeyDown={e => e.key === "Enter" && addAction()} style={{ flex: 1, background: "var(--bg-input)", border: "1px solid var(--border-light)", borderRadius: 7, padding: "6px 9px", fontFamily: "inherit", fontSize: 12, outline: "none", color: "var(--text)" }} />
                    <button className="add-action-btn" onClick={addAction}>+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* AI modal */}
        {showAI && (
          <div className="modal-overlay" onClick={() => setShowAI(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>✨ AI Grouping Suggestions</h2><p>Apply as many groupings as you like, then close.</p>
              {(AI_SUGGESTIONS[showAI] || []).map((s, i) => {
                const applied = appliedSuggestions.includes(s.label);
                return (
                  <div key={i} className="ai-suggestion" style={{ opacity: applied ? 0.6 : 1 }}>
                    <div className="ai-suggestion-title" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      {applied ? "✓" : "📁"} {s.label}
                      {applied && <span style={{ fontSize: 10, color: "var(--green)", fontWeight: 600 }}>Applied</span>}
                    </div>
                    {s.cards.map((c, j) => (
                      <div key={j} className="suggestion-item" onClick={() => {
                        if (applied) return;
                        const gid = createGroup(showAI, s.label);
                        cards.filter(card => card.qId === showAI && typeof card.content === "string" && card.content.toLowerCase().includes(c.toLowerCase())).forEach(card => applyGroup(card.id, gid));
                        setAppliedSuggestions(a => [...a, s.label]);
                      }}>
                        <span>·</span><span>Cards mentioning <em>{c}</em></span>
                        {!applied && <span className="suggestion-apply">Apply →</span>}
                      </div>
                    ))}
                  </div>
                );
              })}
              <div className="modal-btns">
                <button className="btn btn-secondary" onClick={() => { setShowAI(null); setAppliedSuggestions([]); }}>Done</button>
              </div>
            </div>
          </div>
        )}

        {/* Group modal */}
        {groupingCard && (
          <div className="modal-overlay" onClick={() => setGroupingCard(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>Group This Card</h2>
              <div className="sticky" style={{ borderLeftColor: "var(--blue)", marginBottom: 18 }}><div className="sticky-content">{groupingCard.content}</div></div>
              <p>Add to a group or create a new one:</p>
              {groupsForQ(groupingCard.qId).map(([gid, gdata]) => (<div key={gid} className="suggestion-item" style={{ border: "1px solid var(--border)", borderRadius: 7, marginBottom: 5 }} onClick={() => { applyGroup(groupingCard.id, gid); setGroupingCard(null); }}>📁 {gdata.name} <span className="suggestion-apply">Add here →</span></div>))}
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                <input className="input" style={{ height: 38 }} placeholder="New group name…" value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                <button className="btn btn-primary" onClick={() => { if (!newGroupName.trim()) return; const gid = createGroup(groupingCard.qId, newGroupName); applyGroup(groupingCard.id, gid); setNewGroupName(""); setGroupingCard(null); }}>Create</button>
              </div>
              <div className="modal-btns">{groupingCard.groupId && <button className="btn btn-danger" onClick={() => { applyGroup(groupingCard.id, null); setGroupingCard(null); }}>Remove from group</button>}<button className="btn btn-secondary" onClick={() => setGroupingCard(null)}>Cancel</button></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── History View ──────────────────────────────────────────────────────────────



// ── Settings Modal ────────────────────────────────────────────────────────────

const SETTINGS_PASSWORD = "retro2026";

function SettingsModal({ currentSession, onSave, onClose, onReset }) {
  // Stay unlocked for the whole browser session once password entered
  const [locked, setLocked] = useState(() => !facilitatorStore.is());
  const [pw, setPw] = useState(""); const [pwError, setPwError] = useState(false);
  const [sessions, setSessions] = useState(() => sessionStore.list());
  // "list" = sessions overview, "edit" = create/edit form
  const [panel, setPanel] = useState("list");
  const [editingSession, setEditingSession] = useState(null); // null = new
  const [form, setForm] = useState({ name: "", sprintNumber: 1, date: "", cutoffDate: "", cutoffTime: "", q3Variant: 0, allowReactions: false, allowVoting: false });
  const [saved, setSaved] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const unlock = () => {
    if (pw === SETTINGS_PASSWORD) {
      setLocked(false); setPwError(false);
      facilitatorStore.set();
      if (sessions.length === 0) setPanel("edit"); // go straight to create form if no sessions
    } else setPwError(true);
  };

  const openNew = () => {
    setEditingSession(null);
    setForm({ name: "", sprintNumber: 1, date: "", cutoffDate: "", cutoffTime: "", q3Variant: 0, allowReactions: false, allowVoting: false });
    setSaved(false);
    setPanel("edit");
  };

  const openEdit = (s, e) => {
    e.stopPropagation();
    setEditingSession(s);
    setForm({ name: s.name, sprintNumber: s.sprintNumber, date: s.date || "", cutoffDate: s.cutoffDate || "", cutoffTime: s.cutoffTime || "", q3Variant: s.q3Variant ?? 0, allowReactions: s.allowReactions ?? false, allowVoting: s.allowVoting ?? false });
    setSaved(false);
    setPanel("edit");
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = async () => {
    const isNew = !editingSession;
    const id = editingSession?.id || uid();
    const session = { id, name: form.name || "Untitled Session", sprintNumber: parseInt(form.sprintNumber) || 1, date: form.date, cutoffDate: form.cutoffDate, cutoffTime: form.cutoffTime, q3Variant: parseInt(form.q3Variant) || 0, allowReactions: form.allowReactions, allowVoting: form.allowVoting };
    if (isNew) {
      wipeSessionData(id);
      // Also delete from Supabase if re-creating
      if (supabase) await supabase.from("sessions").delete().eq("id", id);
    }
    sessionStore.save(session);
    setSessions(sessionStore.list());
    setSaved(true);
    onSave(session);
    setTimeout(() => { setSaved(false); setPanel("list"); }, 900);
  };

  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (!window.confirm("Delete this session and all its data?")) return;
    wipeSessionData(id); sessionStore.delete(id);
    setSessions(sessionStore.list());
    if (editingSession?.id === id) setPanel("list");
  };

  const copyLink = (s, e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sessionStore.getSessionUrl(s.id)).catch(() => {});
    setCopiedId(s.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const canClose = sessions.length > 0; // can't close with zero sessions

  return (
    <div className="modal-overlay" onClick={canClose ? onClose : undefined}>
      <div className="modal" style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>

        {/* ── Lock screen ── */}
        {locked ? (
          <div className="settings-lock">
            <div className="settings-lock-icon">⚙️</div>
            <h2>Settings</h2>
            <p>Enter the facilitator password to continue.</p>
            <div className="settings-pw-row">
              <input className="settings-pw-input" type="password" placeholder="Password" value={pw}
                onChange={e => { setPw(e.target.value); setPwError(false); }}
                onKeyDown={e => e.key === "Enter" && unlock()} autoFocus />
              <button className="btn btn-primary" onClick={unlock}>Unlock</button>
            </div>
            {pwError && <div className="settings-pw-error">Incorrect password</div>}
            {canClose && <div className="modal-btns" style={{ justifyContent: "center", marginTop: 14 }}><button className="btn btn-secondary" onClick={onClose}>Cancel</button></div>}
          </div>

        /* ── Sessions list ── */
        ) : panel === "list" ? (
          <>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <h2 style={{ marginBottom: 0 }}>Sessions</h2>
              <button className="btn btn-primary" onClick={openNew}>＋ New Session</button>
            </div>

            {sessions.length === 0 ? (
              <div style={{ textAlign: "center", padding: "32px 0 24px" }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <div style={{ fontWeight: 600, color: "var(--text)", fontSize: 16, marginBottom: 6 }}>No sessions yet</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>Create your first retro session to get started.</div>
                <button className="btn btn-primary" onClick={openNew} style={{ padding: "10px 24px", fontSize: 14 }}>Create your first session →</button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                {sessions.map(s => {
                  const open = sessionStore.isSubmissionOpen(s);
                  const cutoff = sessionStore.getCutoff(s);
                  const url = sessionStore.getSessionUrl(s.id);
                  return (
                    <div key={s.id} style={{ background: "var(--bg-raised)", border: `1px solid ${currentSession?.id === s.id ? "var(--red)" : "var(--border-light)"}`, borderRadius: 10, padding: "14px 16px" }}>
                      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text)", marginBottom: 3 }}>{s.name}</div>
                          <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                            Sprint {s.sprintNumber}{s.date ? ` · ${s.date}` : ""}
                            {cutoff ? ` · closes ${cutoff.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                          </div>
                          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: open ? "#34d399" : "var(--text-dim)", background: open ? "rgba(52,211,153,.1)" : "var(--bg-input)", border: `1px solid ${open ? "rgba(52,211,153,.25)" : "var(--border)"}`, borderRadius: 20, padding: "1px 8px" }}>{open ? "🟢 Open" : "🔴 Closed"}</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                          <button className="btn btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }}
                            onClick={e => copyLink(s, e)}>
                            {copiedId === s.id ? "✓ Copied" : "Copy link"}
                          </button>
                          <button className="btn btn-secondary" style={{ padding: "5px 10px", fontSize: 12 }}
                            onClick={e => openEdit(s, e)} title="Edit session">✎</button>
                          <button className="btn btn-danger" style={{ padding: "5px 10px", fontSize: 12 }}
                            onClick={e => handleDelete(s.id, e)} title="Delete session">🗑</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <button className="btn btn-danger" style={{ fontSize: 11 }} onClick={() => {
                if (!window.confirm("Delete ALL sessions, submissions, and board data?")) return;
                wipeAllData(); setSessions([]); onReset();
              }}>⚠ Reset all data</button>
              {canClose && <button className="btn btn-secondary" onClick={onClose}>Close</button>}
            </div>
          </>

        /* ── Edit / Create form ── */
        ) : (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <button className="btn btn-ghost" style={{ padding: "4px 8px", fontSize: 16 }} onClick={() => setPanel("list")}>←</button>
              <h2 style={{ marginBottom: 0 }}>{editingSession ? "Edit Session" : "New Session"}</h2>
            </div>

            <div className="settings-section">
              <div className="settings-row"><label className="label">Session name</label><input className="input" placeholder="e.g. Flex1 Sprint 16, MetaCon Retro" value={form.name} onChange={e => set("name", e.target.value)} autoFocus /></div>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="settings-row" style={{ flex: 1 }}><label className="label">Sprint #</label><input className="input" type="number" min="1" value={form.sprintNumber} onChange={e => set("sprintNumber", e.target.value)} /></div>
                <div className="settings-row" style={{ flex: 2 }}><label className="label">Retro date</label><input className="input" type="date" value={form.date} onChange={e => set("date", e.target.value)} /></div>
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Submission Cutoff</div>
              <div className="settings-hint" style={{ marginBottom: 10 }}>Countdown timer counts down to this. Set a few minutes before the retro starts.</div>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="settings-row" style={{ flex: 2 }}><label className="label">Date</label><input className="input" type="date" value={form.cutoffDate} onChange={e => set("cutoffDate", e.target.value)} /></div>
                <div className="settings-row" style={{ flex: 1 }}><label className="label">Time</label><input className="input" type="time" value={form.cutoffTime} onChange={e => set("cutoffTime", e.target.value)} /></div>
              </div>
              <div className="settings-row"><label className="label">Q3 variant</label><select className="select" value={form.q3Variant} onChange={e => set("q3Variant", e.target.value)}>{Q3_VARIANTS.map((q, i) => <option key={i} value={i}>{q}</option>)}</select></div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Board Features</div>
              <div className="toggle-row">
                <div><div className="toggle-label">Allow reactions</div><div className="toggle-hint">Floating emoji reactions on the board</div></div>
                <label className="toggle"><input type="checkbox" checked={form.allowReactions} onChange={e => set("allowReactions", e.target.checked)} /><span className="toggle-slider" /></label>
              </div>
              <div className="toggle-row">
                <div><div className="toggle-label">Allow upvoting</div><div className="toggle-hint">▲ ▼ voting on cards after reveal</div></div>
                <label className="toggle"><input type="checkbox" checked={form.allowVoting} onChange={e => set("allowVoting", e.target.checked)} /><span className="toggle-slider" /></label>
              </div>
            </div>

            <div className="modal-btns">
              <button className="btn btn-secondary" onClick={() => setPanel("list")}>Cancel</button>
              {saved
                ? <span className="settings-saved">✓ Saved!</span>
                : <button className="btn btn-primary" onClick={handleSave}>{editingSession ? "Save Changes" : "Create Session →"}</button>
              }
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Join Screen ───────────────────────────────────────────────────────────────

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 5  && h < 12) return { greeting: "Good morning",  emoji: "🌅" };
  if (h >= 12 && h < 17) return { greeting: "Good afternoon", emoji: "☀️" };
  if (h >= 17 && h < 21) return { greeting: "Good evening",  emoji: "🌆" };
  return { greeting: "Burning the midnight oil?", emoji: "🌙" };
}

function JoinScreen({ session, onJoin, joined, savedName }) {
  const [name, setName] = useState(savedName || ""); const [q1Val, setQ1Val] = useState("");
  const { greeting, emoji } = getTimeOfDay();
  const cutoff = sessionStore.getCutoff(session);
  const dateLabel = session.date ? new Date(session.date + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "";

  // If name already saved, show a simplified re-join screen
  if (savedName) {
    return (
      <div className="join-wrap">
        <div className="join-card">
          <div className="join-logo"><span className="join-logo-dot" />RetroKit</div>
          <div className="join-sprint">{session.name} · Sprint {session.sprintNumber}</div>
          <div style={{ fontSize: 40, margin: "16px 0 8px" }}>{emoji}</div>
          <div className="join-title">Welcome back, {savedName}!</div>
          <div className="join-sub" style={{ marginBottom: 24 }}>You've already joined this session.</div>
          <button className="join-btn" onClick={() => onJoin(savedName, "")}>Continue as {savedName} →</button>
          <button onClick={() => { try { localStorage.removeItem(`rk_name_${session.id}`); } catch(e) {} }} style={{ marginTop: 12, background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 12, fontFamily: "inherit", display: "block", width: "100%", textAlign: "center" }}>
            Not {savedName}? Join as someone else
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="join-wrap">
      <div className="join-card">
        <div className="join-logo"><span className="join-logo-dot" />RetroKit</div>
        <div className="join-sprint">{session.name} · Sprint {session.sprintNumber}{dateLabel ? ` · ${dateLabel}` : ""}</div>
        <div className="join-greeting">{emoji}</div>
        <div className="join-greeting-text">{greeting}! Join the retro session below.</div>
        {cutoff && <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 16, background: "var(--bg-raised)", border: "1px solid var(--border)", borderRadius: 20, padding: "4px 12px", display: "inline-block" }}>⏰ Submissions close at {cutoff.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>}
        <div className="join-title">What should we call you?</div>
        <input className="join-input" placeholder="Your name…" value={name} onChange={e => setName(e.target.value.slice(0, 20))} onKeyDown={e => e.key === "Enter" && name.trim() && onJoin(name.trim(), q1Val)} maxLength={20} autoFocus />
        {name.trim().length > 0 && (
          <div className="join-q1-section">
            <div className="join-q1-label">Optional · Q1</div>
            <div className="join-q1-prompt">Describe the sprint using an emoji or gif</div>
            <Q1Picker value={q1Val} onChange={setQ1Val} />
          </div>
        )}
        <div style={{ marginTop: 18 }}><button className="join-btn" disabled={!name.trim()} onClick={() => onJoin(name.trim(), q1Val)}>Join Session →</button></div>
        {joined.length > 0 && (
          <div className="join-presence">
            <div className="join-presence-label">Already joined</div>
            <div className="join-avatars">{joined.map((p, i) => (<div key={i} className="join-avatar"><div className="join-avatar-dot" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{p[0]}</div><span className="join-avatar-name">{p}</span></div>))}</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────

export default function App() {
  // Run one-time migration on mount
  runMigrationIfNeeded();

  const [view, setView] = useState("submit");
  const [showSettings, setShowSettings] = useState(false);
  const [isFacilitator, setIsFacilitator] = useState(() => facilitatorStore.is());
  const [hasNewSubmissions, setHasNewSubmissions] = useState(false);

  const [activeSession, setActiveSession] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    const sid = params.get("session");
    if (sid) {
      // Try local storage first
      const local = sessionStore.get(sid);
      if (local) return local;
      // Try embedded config in URL (for team members in fresh browsers)
      const sc = params.get("sc");
      if (sc) {
        try {
          const session = JSON.parse(atob(sc));
          sessionStore.save(session); // cache locally for future visits
          return session;
        } catch(e) { console.warn("Failed to decode session config", e); }
      }
      return null; // session not found
    }
    const sessions = sessionStore.list();
    return sessions.length > 0 ? sessions[sessions.length - 1] : null;
  });

  const [currentUser, setCurrentUser] = useState(() => {
    if (!activeSession) return null;
    try { return localStorage.getItem(`rk_name_${activeSession.id}`) || null; } catch(e) { console.warn(e); return null; }
  });
  const [joined, setJoined] = useState(() => {
    if (!activeSession) return [];
    try { return JSON.parse(localStorage.getItem(`rk_joined_${activeSession.id}`) || "[]"); } catch(e) { console.warn(e); return []; }
  });
  const [joinQ1, setJoinQ1] = useState("");

  const handleJoin = (name, q1Val) => {
    try { localStorage.setItem(`rk_name_${activeSession.id}`, name); const updated = joined.includes(name) ? joined : [...joined, name]; localStorage.setItem(`rk_joined_${activeSession.id}`, JSON.stringify(updated)); setJoined(updated); } catch(e) { console.warn(e); }
    setCurrentUser(name); if (q1Val) setJoinQ1(q1Val);
  };

  const handleSaveSettings = session => {
    setActiveSession(session);
    setIsFacilitator(facilitatorStore.is());
  };

  const handleSwitchSession = session => {
    setActiveSession(session);
    try { const name = localStorage.getItem(`rk_name_${session.id}`); setCurrentUser(name || null); setJoined(JSON.parse(localStorage.getItem(`rk_joined_${session.id}`) || "[]")); } catch(e) { console.warn(e); }
    setView("submit");
  };

  const questions = activeSession ? QUESTIONS(activeSession.sprintNumber, Q3_VARIANTS[activeSession.q3Variant ?? 0]) : [];
  const allSessions = sessionStore.list();

  // No sessions at all → show settings immediately (password first, then empty state)
  if (!activeSession) {
    return (
      <>
        <style>{css}</style>
        <SettingsModal
          currentSession={null}
          onSave={session => { setActiveSession(session); setIsFacilitator(facilitatorStore.is()); }}
          onClose={() => {}} // can't close with no session
          onReset={() => { setActiveSession(null); setCurrentUser(null); }}
        />
      </>
    );
  }

  const savedName = (() => { try { return localStorage.getItem(`rk_name_${activeSession.id}`) || null; } catch { return null; } })();
  if (!currentUser) return (<><style>{css}</style><JoinScreen session={activeSession} onJoin={handleJoin} joined={joined} savedName={savedName} /></>);

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <nav className="nav">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="nav-brand"><span className="nav-brand-dot" />RetroKit</div>
            <div className="session-select-wrap">
              <select className="session-select" value={activeSession.id} onChange={e => { const s = sessionStore.get(e.target.value); if (s) handleSwitchSession(s); }}>
                {allSessions.map(s => <option key={s.id} value={s.id}>{s.name} · Sprint {s.sprintNumber}{s.date ? ` · ${s.date}` : ""}</option>)}
              </select>
              <span className="session-select-arrow">▾</span>
            </div>
            <div className="user-chip">
              <div className="user-chip-dot">{currentUser[0]}</div>
              <span className="user-chip-name">{currentUser}</span>
              {isFacilitator && <span className="facilitator-badge" style={{ marginLeft: 4 }}>F</span>}
              <button className="user-chip-x" onClick={() => { try { localStorage.removeItem(`rk_name_${activeSession.id}`); } catch(e) { console.warn(e); } setCurrentUser(null); }} title="Leave session">✕</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="nav-tabs">
              {[["submit", "Submit"], ["board", "Board"]].map(([v, label]) => (
                <button key={v} className={`nav-tab ${view === v ? "active" : ""}`} onClick={() => { try { window.history.replaceState({}, "", window.location.href.split("?")[0]); } catch(e) { console.warn(e); } setView(v); }}>
                  {label}
                  {v === "board" && hasNewSubmissions && <span className="nav-tab-dot" title="New submissions available" />}
                </button>
              ))}
              {hasNewSubmissions && (
                <button className="refresh-btn" onClick={() => { setHasNewSubmissions(false); setView("board"); }} title="Refresh board">↻</button>
              )}
            </div>
            <button className="settings-gear" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
          </div>
        </nav>

        <CountdownBar session={activeSession} />

        {view === "submit" && <SubmitView session={activeSession} questions={questions} currentUser={currentUser} joinQ1={joinQ1} />}
        {view === "board" && <BoardView session={activeSession} members={joined} questions={questions} currentUser={currentUser} onNewSubmissions={() => setHasNewSubmissions(true)} />}


        {showSettings && <SettingsModal currentSession={activeSession} onSave={handleSaveSettings} onClose={() => { setShowSettings(false); setIsFacilitator(facilitatorStore.is()); }} onReset={() => { wipeAllData(); setActiveSession(null); setCurrentUser(null); setShowSettings(false); }} />}
      </div>
    </>
  );
}
