import { useState, useEffect, useRef } from "react";

// ── Data ──────────────────────────────────────────────────────────────────────

const Q3_VARIANTS = [
  "Is there anything we should start, stop, or continue doing?",
  "What's one thing slowing us down, and one thing we should protect?",
  "What's working well, what isn't, and what should we try differently?",
  "If you could change one thing about how we work, what would it be?",
];

const QUESTIONS = (sprintNumber) => [
  { id: "q1", label: "Q1", prompt: "Describe the sprint using an emoji or gif", type: "emoji", color: "#FFD93D" },
  { id: "q2", label: "Q2", prompt: "What were our standout achievements this sprint?", type: "text", color: "#6BCB77" },
  { id: "q3", label: "Q3", prompt: Q3_VARIANTS[Math.floor((sprintNumber - 1) / 2) % Q3_VARIANTS.length], type: "text", color: "#FF6B6B" },
  { id: "q4", label: "Q4", prompt: "Anything else? Is there anyone you'd like to give a shout-out to?", type: "text", color: "#4D96FF" },
];

const EMOJIS = ["🚀","🔥","💪","🎯","⚡","😤","😅","🌊","🐛","🎉","💡","🧠","🤝","🌱","🏆","😬","🙌","💥","🌀","🎸"];

const CARD_COLORS = ["#FFD93D","#6BCB77","#FF6B6B","#4D96FF","#C77DFF","#FF9F43","#48DBFB","#FF6B9D"];

function randomColor() { return CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)]; }
function uid() { return Math.random().toString(36).slice(2, 9); }

// ── Countdown ─────────────────────────────────────────────────────────────────

// Demo cutoff: set to 2h 17m from whenever the page loads, so it's always live.
// In production replace this with a real fixed datetime.
const DEMO_CUTOFF = new Date(Date.now() + (2 * 60 + 17) * 60 * 1000);

function useCountdown(cutoff) {
  const [ms, setMs] = useState(() => cutoff - Date.now());
  useEffect(() => {
    const id = setInterval(() => setMs(cutoff - Date.now()), 1000);
    return () => clearInterval(id);
  }, [cutoff]);
  return ms;
}

function relaxedLabel(ms) {
  if (ms <= 0) return { text: "Submissions closed", state: "closed" };
  const totalMin = Math.floor(ms / 60000);
  const hrs = Math.floor(totalMin / 60);
  const mins = totalMin % 60;
  if (totalMin <= 5)  return { text: "Closing any moment now", state: "urgent" };
  if (totalMin <= 15) return { text: `Closes in ${totalMin} minutes`, state: "urgent" };
  if (totalMin <= 45) return { text: `About ${mins > 30 ? hrs + 1 : hrs ? hrs + "h " : ""}${mins > 0 && !hrs ? mins + " min" : mins > 30 ? "" : mins + " min"} left`, state: "soon" };
  if (hrs === 0)      return { text: `Closes in about ${mins} minutes`, state: "soon" };
  if (hrs === 1)      return { text: mins < 30 ? "About an hour left" : "Closes in about 1.5 hours", state: "open" };
  return { text: `Closes in about ${hrs} hour${hrs > 1 ? "s" : ""}`, state: "open" };
}

function exactTime(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
}

function CountdownBar({ cutoff }) {
  const ms = useCountdown(cutoff);
  const { state } = relaxedLabel(ms);
  const exact = exactTime(ms);
  return (
    <div className={`countdown-bar ${state}`}>
      <span className="countdown-bar-dot" />
      <span className="countdown-bar-label">Submissions close in</span>
      <span className="countdown-bar-time">{exact}</span>
    </div>
  );
}

// ── Seed Data ─────────────────────────────────────────────────────────────────

function seedCards(sprintNum) {
  const q = QUESTIONS(sprintNum);
  return [
    { id: uid(), qId: "q1", content: "🚀", type: "emoji", author: "Alex", color: "#FFD93D", groupId: null },
    { id: uid(), qId: "q1", content: "💪", type: "emoji", author: "Sam", color: "#FFD93D", groupId: null },
    { id: uid(), qId: "q1", content: "🌊", type: "emoji", author: "Jordan", color: "#FFD93D", groupId: null },
    { id: uid(), qId: "q2", content: "Shipped the new dashboard on time despite scope changes", author: "Alex", color: "#6BCB77", groupId: null },
    { id: uid(), qId: "q2", content: "Great cross-team collaboration with design on the component library", author: "Sam", color: "#6BCB77", groupId: null },
    { id: uid(), qId: "q2", content: "Zero P1 bugs in production this sprint!", author: "Jordan", color: "#6BCB77", groupId: null },
    { id: uid(), qId: "q2", content: "Finally got CI/CD pipeline under 8 minutes", author: "Riley", color: "#6BCB77", groupId: null },
    { id: uid(), qId: "q3", content: "START: Weekly async design reviews so we catch issues earlier", author: "Sam", color: "#FF6B6B", groupId: null },
    { id: uid(), qId: "q3", content: "STOP: Unplanned interruptions during focus blocks", author: "Alex", color: "#FF6B6B", groupId: null },
    { id: uid(), qId: "q3", content: "CONTINUE: Daily standups are tight and useful", author: "Jordan", color: "#FF6B6B", groupId: null },
    { id: uid(), qId: "q3", content: "START: Proper ticket grooming before sprint planning", author: "Riley", color: "#FF6B6B", groupId: null },
    { id: uid(), qId: "q4", content: "Shoutout to Riley for staying late to fix the auth bug — real hero behavior 🦸", author: "Alex", color: "#4D96FF", groupId: null },
    { id: uid(), qId: "q4", content: "Big thanks to Sam for the thorough PR reviews this sprint", author: "Jordan", color: "#4D96FF", groupId: null },
  ];
}

// ── Styles ────────────────────────────────────────────────────────────────────

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Libre+Franklin:wght@400;600;700;800&family=DM+Sans:wght@400;500;600&display=swap');

  :root {
    --or-red: #E8003D;
    --or-red-dark: #c0002f;
    --or-red-glow: rgba(232,0,61,.18);
    --bg: #0f1117;
    --bg-card: #181c27;
    --bg-raised: #1e2235;
    --bg-input: #242838;
    --border: #2a2f42;
    --border-light: #333849;
    --text: #e8eaf0;
    --text-muted: #8b92a8;
    --text-dim: #555e78;
    --white: #ffffff;
    --green: #10b981;
    --green-dark: #059669;
    --blue: #4d96ff;
    --teal: #0d9488;
  }

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body { font-family: 'DM Sans', sans-serif; background: var(--bg); min-height: 100vh; color: var(--text); }

  .app { min-height: 100vh; }

  /* NAV */
  .nav { background: #0a0c12; padding: 0 28px; height: 60px; display: flex; align-items: center; justify-content: space-between; position: sticky; top: 0; z-index: 100; border-bottom: 3px solid var(--or-red); box-shadow: 0 2px 20px rgba(232,0,61,.15); }
  .nav-brand { font-family: 'Libre Franklin', sans-serif; color: var(--white); font-size: 18px; font-weight: 800; letter-spacing: -.3px; display: flex; align-items: center; gap: 10px; }
  .nav-brand-dot { width: 10px; height: 10px; background: white; border-radius: 50%; flex-shrink: 0; }
  .nav-sprint { color: #aaa; font-size: 13px; }
  .nav-tabs { display: flex; gap: 2px; }
  .nav-tab { padding: 7px 18px; border-radius: 4px; border: none; cursor: pointer; font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 600; transition: all .2s; letter-spacing: .01em; }
  .nav-tab.active { background: var(--or-red); color: white; }
  .nav-tab:not(.active) { background: transparent; color: var(--text-muted); }
  .nav-tab:not(.active):hover { background: rgba(255,255,255,.07); color: var(--text); }

  /* COUNTDOWN BANNER */
  .countdown-bar { position: sticky; top: 60px; z-index: 99; width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px; padding: 8px 24px; font-size: 13px; font-weight: 600; transition: background .8s, color .8s; letter-spacing: .01em; border-bottom: 1px solid rgba(0,0,0,.1); }
  .countdown-bar.open   { background: #1a2e1a; color: #5cb85c; }
  .countdown-bar.soon   { background: #2e2010; color: #e8a020; }
  .countdown-bar.urgent { background: #2e0a0a; color: #ff4444; animation: bar-pulse 1.4s ease-in-out infinite; }
  .countdown-bar.closed { background: #222; color: #666; }
  .countdown-bar-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; transition: background .8s; }
  .countdown-bar.open   .countdown-bar-dot { background: #5cb85c; box-shadow: 0 0 6px #5cb85c; }
  .countdown-bar.soon   .countdown-bar-dot { background: #e8a020; box-shadow: 0 0 6px #e8a020; }
  .countdown-bar.urgent .countdown-bar-dot { background: #ff4444; box-shadow: 0 0 8px #ff4444; }
  .countdown-bar.closed .countdown-bar-dot { background: #555; }
  .countdown-bar-time { font-family: 'Libre Franklin', sans-serif; font-size: 15px; font-weight: 700; letter-spacing: 1px; }
  .countdown-bar-label { opacity: .65; font-size: 12px; font-weight: 500; }
  @keyframes bar-pulse { 0%,100% { opacity:1; } 50% { opacity:.65; } }

  /* AI IDEAS */
  .ai-ideas-btn { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; border: 1.5px solid #c77dff; background: rgba(199,125,255,.08); color: #c77dff; font-size: 12px; font-weight: 700; cursor: pointer; transition: all .2s; margin-bottom: 10px; }
  .ai-ideas-btn:hover { background: rgba(199,125,255,.18); }
  .ai-ideas-btn:disabled { opacity: .5; cursor: not-allowed; }
  .ai-ideas-wrap { background: linear-gradient(135deg, rgba(199,125,255,.06), rgba(77,150,255,.06)); border: 1.5px solid #c77dff30; border-radius: 12px; padding: 14px; margin-bottom: 12px; display: flex; flex-direction: column; gap: 8px; }
  .ai-ideas-header { font-size: 11px; font-weight: 700; color: #9b59b6; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 2px; display: flex; align-items: center; gap: 5px; }
  .ai-idea-chip { display: flex; align-items: flex-start; gap: 8px; background: var(--bg-raised); border: 1.5px solid rgba(199,125,255,.2); border-radius: 10px; padding: 10px 12px; cursor: pointer; transition: all .2s; text-align: left; }
  .ai-idea-chip:hover { border-color: #c77dff; background: var(--bg-input); transform: translateX(3px); }
  .ai-idea-chip-text { font-size: 13px; color: var(--text); line-height: 1.45; flex: 1; }
  .ai-idea-use { font-size: 11px; color: #c77dff; font-weight: 700; white-space: nowrap; flex-shrink: 0; margin-top: 1px; }
  .ai-ideas-loading { display: flex; align-items: center; gap: 8px; color: #9b59b6; font-size: 13px; padding: 6px 0; }
  .ai-dot-spin { width: 16px; height: 16px; border: 2px solid #e8d5f5; border-top-color: #c77dff; border-radius: 50%; animation: spin .7s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* NAME FIELD */
  .name-card { background: var(--bg-raised); border: 1px solid var(--border-light); border-radius: 12px; padding: 22px 28px; margin-bottom: 20px; }
  .name-card-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-muted); margin-bottom: 8px; }
  .name-card-title { font-family: 'Libre Franklin', sans-serif; font-size: 17px; font-weight: 700; color: var(--text); margin-bottom: 14px; }
  .name-input { width: 100%; border: 1.5px solid var(--border-light); border-radius: 8px; padding: 11px 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; font-weight: 600; background: var(--bg-input); color: var(--text); outline: none; transition: border .2s; }
  .name-input::placeholder { color: var(--text-dim); }
  .name-input:focus { border-color: var(--or-red); background: var(--bg-input); }

  /* SUBMIT VIEW */
  .submit-wrap { max-width: 680px; margin: 0 auto; padding: 36px 24px 80px; background: var(--bg); }
  .submit-header { margin-bottom: 32px; border-bottom: 1px solid var(--border); padding-bottom: 24px; }
  .submit-header h1 { font-family: 'Libre Franklin', sans-serif; font-size: 30px; font-weight: 800; color: var(--text); letter-spacing: -.5px; }
  .submit-header p { color: var(--text-muted); margin-top: 6px; font-size: 15px; }
  .anon-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(16,185,129,.12); color: var(--green); border-radius: 4px; padding: 4px 10px; font-size: 12px; font-weight: 600; margin-top: 10px; border: 1px solid rgba(16,185,129,.25); }

  .q-card { background: var(--bg-card); border-radius: 8px; padding: 26px 28px; margin-bottom: 16px; border: 1px solid var(--border); border-top: 4px solid #444; }
  .q-label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: var(--text-dim); margin-bottom: 5px; }
  .q-prompt { font-family: 'Libre Franklin', sans-serif; font-size: 16px; font-weight: 700; color: var(--text); margin-bottom: 18px; line-height: 1.4; }

  .emoji-grid { display: flex; flex-wrap: wrap; gap: 8px; }
  .emoji-btn { width: 44px; height: 44px; border-radius: 6px; border: 2px solid transparent; background: var(--bg-raised); font-size: 22px; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: center; }
  .emoji-btn:hover { background: var(--bg-input); transform: scale(1.12); }
  .emoji-btn.selected { border-color: var(--or-red); background: var(--or-red-glow); transform: scale(1.12); }

  .text-input { width: 100%; border: 1.5px solid var(--border); border-radius: 6px; padding: 12px 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; resize: vertical; min-height: 80px; transition: border .2s; outline: none; background: var(--bg-input); color: var(--text); }
  .text-input:focus { border-color: var(--or-red); box-shadow: 0 0 0 3px var(--or-red-glow); }

  .submit-btn { width: 100%; padding: 15px; background: var(--or-red); color: white; border: none; border-radius: 6px; font-family: 'Libre Franklin', sans-serif; font-size: 17px; font-weight: 800; cursor: pointer; transition: all .2s; letter-spacing: .01em; margin-top: 12px; }
  .submit-btn:hover { background: var(--or-red-dark); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(211,0,45,.3); }
  .submit-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }

  .success-wrap { text-align: center; padding: 80px 24px; }
  .success-icon { font-size: 64px; margin-bottom: 20px; }
  .success-wrap h2 { font-family: 'Libre Franklin', sans-serif; font-size: 30px; font-weight: 800; color: var(--text); }
  .success-wrap p { color: var(--text-muted); margin-top: 10px; font-size: 16px; }

  /* EDIT LINK BOX */
  .edit-link-box { background: var(--bg-raised); border: 1px solid var(--or-red); border-radius: 14px; padding: 20px 24px; margin-top: 28px; text-align: left; }
  .edit-link-box h3 { font-family: 'Libre Franklin', sans-serif; font-size: 17px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
  .edit-link-box p { font-size: 13px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.5; }
  .edit-link-copy-row { display: flex; gap: 8px; align-items: center; }
  .edit-link-url { flex: 1; background: var(--bg-input); border: 1.5px solid var(--border); border-radius: 8px; padding: 8px 12px; font-size: 12px; color: var(--text-muted); font-family: monospace; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .copy-btn { padding: 8px 14px; background: var(--or-red); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 13px; white-space: nowrap; transition: all .2s; }
  .copy-btn:hover { background: var(--or-red-dark); }
  .copy-btn.copied { background: #2e7d32; color: white; }
  .cutoff-notice { font-size: 12px; font-weight: 600; margin-top: 10px; display: flex; align-items: center; gap: 4px; color: #f59e0b; }
  .cutoff-live { font-size: 13px; }
  .cutoff-live.open { color: #5cb85c; }
  .cutoff-live.soon { color: #e8a020; }
  .cutoff-live.urgent { color: #ff4444; animation: bar-pulse 1.4s ease-in-out infinite; }
  .cutoff-live.closed { color: var(--text-dim); }
  .cutoff-live strong { font-family: 'Libre Franklin', sans-serif; letter-spacing: .5px; }

  /* CONFIRM MODAL */
  .confirm-summary { background: var(--bg-raised); border-radius: 12px; padding: 16px; margin: 16px 0; display: flex; flex-direction: column; gap: 10px; }
  .confirm-row { display: flex; gap: 10px; align-items: flex-start; }
  .confirm-q-label { font-size: 11px; font-weight: 700; color: white; border-radius: 6px; padding: 2px 8px; flex-shrink: 0; margin-top: 1px; }
  .confirm-answer { font-size: 13px; color: var(--text); line-height: 1.4; }
  .confirm-answer.empty { color: var(--text-dim); font-style: italic; }

  /* EDITING BANNER */
  .editing-banner { background: #e8f0fe; border: 2px solid #4D96FF; border-radius: 12px; padding: 12px 16px; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; font-size: 14px; color: #1a1a2e; }
  .editing-banner strong { color: #4D96FF; }

  /* CLOSED BANNER */
  .closed-wrap { text-align: center; padding: 80px 24px; }
  .closed-wrap h2 { font-family: 'Libre Franklin', sans-serif; font-size: 26px; font-weight: 800; color: var(--text); margin-top: 16px; }
  .closed-wrap p { color: var(--text-muted); margin-top: 8px; font-size: 15px; }

  /* BOARD VIEW */
  .board-wrap { padding: 24px; overflow-x: auto; background: var(--bg); min-height: calc(100vh - 56px); }
  .board-toolbar { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
  .board-title { font-family: 'Libre Franklin', sans-serif; font-size: 22px; font-weight: 800; color: var(--text); flex: 1; }
  .tool-btn { padding: 8px 16px; border-radius: 4px; border: 1.5px solid var(--border-light); background: var(--bg-raised); color: var(--text); font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; transition: all .2s; display: flex; align-items: center; gap: 6px; }
  .tool-btn:hover { background: var(--border-light); color: var(--text); }
  .tool-btn.primary { background: var(--or-red); color: white; }
  .tool-btn.primary:hover { background: var(--or-red-dark); }
  .tool-btn.danger { border-color: #FF6B6B; color: #FF6B6B; }
  .tool-btn.danger:hover { background: #FF6B6B; color: white; }

  .board-columns { display: flex; gap: 20px; min-width: max-content; align-items: flex-start; }

  .col { width: 300px; flex-shrink: 0; }
  .col-header { border-radius: 12px 12px 0 0; padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; }
  .col-header-title { font-family: 'Fredoka One', cursive; font-size: 16px; color: white; text-shadow: 0 1px 2px rgba(0,0,0,.2); line-height: 1.3; }
  .col-count { background: rgba(255,255,255,.3); color: white; border-radius: 12px; padding: 2px 8px; font-size: 12px; font-weight: 700; white-space: nowrap; }
  .col-body { background: rgba(255,255,255,.04); border-radius: 0 0 12px 12px; padding: 12px; min-height: 200px; display: flex; flex-direction: column; gap: 8px; border: 1px solid var(--border); border-top: none; }

  .sticky { border-radius: 10px; padding: 12px 14px; box-shadow: 2px 3px 0 rgba(0,0,0,.12); cursor: pointer; transition: all .2s; position: relative; }
  .sticky:hover { transform: translateY(-2px) rotate(0.5deg); box-shadow: 4px 6px 0 rgba(0,0,0,.15); }
  .sticky.hidden-card { filter: blur(4px); pointer-events: none; }
  .sticky-content { font-size: 14px; color: #1a1a1a; line-height: 1.5; font-weight: 500; }
  .sticky-emoji { font-size: 28px; text-align: center; padding: 4px; }
  .sticky-author { font-size: 11px; color: rgba(0,0,0,.55); margin-top: 6px; font-weight: 600; }
  .sticky-group-badge { position: absolute; top: -6px; right: 8px; background: #1a1a2e; color: white; border-radius: 8px; padding: 1px 7px; font-size: 10px; font-weight: 700; }

  .group-block { background: rgba(255,255,255,.04); border: 1.5px dashed rgba(255,255,255,.1); border-radius: 12px; padding: 10px; }
  .group-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 8px; display: flex; align-items: center; justify-content: space-between; }
  .group-label input { background: transparent; border: none; font: inherit; color: var(--text-muted); width: 120px; outline: none; }
  .group-label input:focus { border-bottom: 1px solid var(--border-light); }

  .revealed-banner { background: rgba(16,185,129,.2); color: #10b981; color: white; text-align: center; padding: 8px; font-weight: 700; font-size: 13px; border-radius: 8px; margin-bottom: 8px; }

  /* ACTION ITEMS */
  .actions-panel { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 24px; margin-top: 20px; box-shadow: 0 2px 12px rgba(0,0,0,.06); min-width: 300px; max-width: 600px; }
  .actions-title { font-family: 'Libre Franklin', sans-serif; font-size: 18px; font-weight: 800; color: var(--text); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
  .action-item { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid var(--border); }
  .action-item:last-child { border-bottom: none; }
  .action-check { width: 20px; height: 20px; border-radius: 50%; border: 2px solid #ddd; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center; transition: all .2s; }
  .action-check.done { background: #6BCB77; border-color: #6BCB77; color: white; font-size: 11px; }
  .action-text { flex: 1; font-size: 14px; color: var(--text); }
  .action-text.done { text-decoration: line-through; color: var(--text-dim); }
  .action-owner { font-size: 12px; color: var(--blue); font-weight: 600; background: rgba(77,150,255,.12); padding: 2px 8px; border-radius: 8px; white-space: nowrap; }
  .action-delete { color: #ccc; cursor: pointer; font-size: 16px; transition: color .2s; }
  .action-delete:hover { color: #FF6B6B; }
  .add-action { display: flex; gap: 8px; margin-top: 12px; }
  .add-action input { flex: 1; border: 1.5px solid var(--border); border-radius: 8px; padding: 8px 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; background: var(--bg-input); color: var(--text); }
  .add-action input:focus { border-color: var(--or-red); }
  .add-action-btn { padding: 8px 14px; background: var(--or-red); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 18px; }

  /* HISTORY */
  .history-wrap { max-width: 800px; margin: 0 auto; padding: 40px 24px; background: var(--bg); min-height: 100vh; }
  .history-title { font-family: 'Libre Franklin', sans-serif; font-size: 28px; font-weight: 800; color: var(--text); margin-bottom: 24px; }
  .history-card { background: var(--bg-card); border-radius: 16px; padding: 24px; margin-bottom: 16px; border: 1px solid var(--border); cursor: pointer; transition: all .2s; border-left: 6px solid var(--or-red); }
  .history-card:hover { transform: translateY(-2px); box-shadow: 0 6px 24px rgba(0,0,0,.4); border-left-color: var(--or-red); }
  .history-sprint { font-family: 'Libre Franklin', sans-serif; font-size: 18px; font-weight: 800; color: var(--text); }
  .history-meta { font-size: 13px; color: var(--text-muted); margin-top: 4px; }
  .history-stats { display: flex; gap: 16px; margin-top: 12px; flex-wrap: wrap; }
  .stat-pill { background: var(--bg-raised); border-radius: 20px; padding: 4px 12px; font-size: 12px; font-weight: 600; color: var(--text-muted); }

  /* MODALS/OVERLAYS */
  .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); z-index: 200; display: flex; align-items: center; justify-content: center; padding: 24px; }
  .modal { background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 20px; padding: 32px; max-width: 480px; width: 100%; }
  .modal h2 { font-family: 'Libre Franklin', sans-serif; font-size: 24px; font-weight: 800; color: var(--text); margin-bottom: 8px; }
  .modal p { color: var(--text-muted); font-size: 14px; margin-bottom: 20px; }
  .modal-btns { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

  .ai-suggestion { background: linear-gradient(135deg, rgba(102,126,234,.1), rgba(118,75,162,.1)); border: 1px solid #667eea40; border-radius: 10px; padding: 12px; margin-top: 8px; }
  .ai-suggestion-title { font-size: 11px; font-weight: 700; color: #764ba2; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; display: flex; align-items: center; gap: 4px; }
  .suggestion-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; font-size: 13px; color: var(--text); cursor: pointer; border-radius: 6px; transition: background .15s; padding: 6px 8px; }
  .suggestion-item:hover { background: rgba(102,126,234,.1); }
  .suggestion-apply { font-size: 11px; color: #667eea; font-weight: 600; margin-left: auto; }

  .sprint-selector { display: flex; align-items: center; gap: 8px; }
  .sprint-selector button { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid var(--border-light); background: var(--bg-raised); color: var(--text); background: white; font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 700; }
  .sprint-selector span { font-size: 14px; font-weight: 600; min-width: 70px; text-align: center; color: var(--text-muted); }

  .tag { display: inline-block; border-radius: 20px; padding: 2px 10px; font-size: 11px; font-weight: 700; }

  /* Q1 PICKER — emoji + gif toggle */
  .q1-mode-toggle { display: flex; align-items: center; gap: 0; margin-bottom: 18px; background: var(--bg-raised); border-radius: 8px; padding: 3px; width: fit-content; }
  .q1-mode-btn { padding: 7px 18px; border: none; background: transparent; font-family: 'DM Sans', sans-serif; font-weight: 600; font-size: 13px; cursor: pointer; transition: all .2s; color: var(--text-muted); border-radius: 6px; display: flex; align-items: center; gap: 6px; }
  .q1-mode-btn.active { background: var(--bg-input); color: var(--text); box-shadow: 0 1px 4px rgba(0,0,0,.12); }
  .q1-mode-btn.active.gif-mode { color: #059669; }
  .toggle-switch { width: 28px; height: 16px; background: #cbd5e1; border-radius: 8px; position: relative; transition: background .2s; flex-shrink: 0; }
  .toggle-switch.on { background: #10b981; }
  .toggle-switch::after { content: ; position: absolute; width: 12px; height: 12px; border-radius: 50%; background: white; top: 2px; left: 2px; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
  .toggle-switch.on::after { transform: translateX(12px); }

  /* GIF PICKER */
  .gif-picker { display: flex; flex-direction: column; gap: 12px; }
  .gif-search-row { display: flex; gap: 8px; }
  .gif-search-input { flex: 1; border: 1.5px solid var(--border); border-radius: 10px; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 14px; outline: none; transition: border .2s; background: var(--bg-input); color: var(--text); }
  .gif-search-input:focus { border-color: #0d9488; }
  .gif-search-btn { padding: 10px 18px; background: var(--or-black); color: white; border: none; border-radius: 10px; font-weight: 700; cursor: pointer; font-size: 13px; white-space: nowrap; transition: background .2s; }
  .gif-search-btn:hover { background: #2d2d50; }
  .gif-search-btn:disabled { opacity: .5; cursor: not-allowed; }
  .gif-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; max-height: 280px; overflow-y: auto; border-radius: 10px; }
  .gif-grid::-webkit-scrollbar { width: 4px; }
  .gif-grid::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
  .gif-item { border-radius: 8px; overflow: hidden; cursor: pointer; border: 3px solid transparent; transition: all .2s; aspect-ratio: 1; position: relative; }
  .gif-item img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .gif-item:hover { border-color: #0d9488; transform: scale(1.03); }
  .gif-item.selected { border-color: #0d9488; box-shadow: 0 0 0 2px #0d9488; }
  .gif-item .gif-check { position: absolute; top: 4px; right: 4px; background: #0d9488; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
  .gif-loading { text-align: center; padding: 32px; color: var(--text-muted); font-size: 14px; }
  .gif-empty { text-align: center; padding: 24px; color: var(--text-dim); font-size: 13px; }
  .gif-selected-preview { display: flex; align-items: center; gap: 12px; background: #f0fdf9; border: 2px solid #0d9488; border-radius: 12px; padding: 12px; }
  .gif-selected-preview img { width: 72px; height: 72px; object-fit: cover; border-radius: 8px; }
  .gif-selected-preview-text { flex: 1; font-size: 13px; color: var(--text-muted); }
  .gif-selected-preview-text strong { display: block; color: var(--text); font-size: 14px; margin-bottom: 2px; }
  .gif-change-btn { font-size: 12px; color: #999; text-decoration: underline; cursor: pointer; background: none; border: none; font-family: 'DM Sans', sans-serif; padding: 0; margin-top: 4px; }
  .giphy-attr { font-size: 10px; color: #bbb; text-align: right; margin-top: 4px; font-style: italic; }

  /* SETTINGS */
  .settings-gear { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid var(--border-light); background: transparent; color: var(--text-muted); font-size: 16px; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .2s; flex-shrink: 0; }
  .settings-gear:hover { background: var(--bg-raised); color: var(--text); border-color: var(--or-red); }
  .settings-modal { max-width: 560px; }
  .settings-lock { text-align: center; padding: 12px 0 4px; }
  .settings-lock-icon { font-size: 40px; margin-bottom: 12px; }
  .settings-lock h2 { font-family: 'Libre Franklin', sans-serif; font-size: 22px; font-weight: 800; color: var(--text); margin-bottom: 6px; }
  .settings-lock p { color: var(--text-muted); font-size: 14px; margin-bottom: 20px; }
  .settings-pw-row { display: flex; gap: 8px; }
  .settings-pw-input { flex: 1; border: 1.5px solid var(--border); border-radius: 6px; padding: 10px 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; background: var(--bg-input); color: var(--text); outline: none; transition: border .2s; }
  .settings-pw-input:focus { border-color: var(--or-red); }
  .settings-pw-error { color: var(--or-red); font-size: 13px; margin-top: 8px; text-align: center; }
  .settings-section { margin-bottom: 24px; }
  .settings-section-title { font-family: 'Libre Franklin', sans-serif; font-size: 13px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
  .settings-row { display: flex; flex-direction: column; gap: 5px; margin-bottom: 14px; }
  .settings-label { font-size: 13px; font-weight: 600; color: var(--text); }
  .settings-input { width: 100%; border: 1.5px solid var(--border); border-radius: 6px; padding: 9px 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none; transition: border .2s; }
  .settings-input:focus { border-color: var(--or-red); }
  .settings-select { width: 100%; border: 1.5px solid var(--border); border-radius: 6px; padding: 9px 12px; font-family: 'DM Sans', sans-serif; font-size: 14px; background: var(--bg-input); color: var(--text); outline: none; cursor: pointer; }
  .settings-hint { font-size: 11px; color: var(--text-dim); margin-top: 3px; }
  .settings-members { display: flex; flex-direction: column; gap: 6px; }
  .settings-member-row { display: flex; gap: 6px; align-items: center; }
  .settings-member-row input { flex: 1; border: 1.5px solid var(--border); border-radius: 6px; padding: 7px 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none; }
  .settings-member-row input:focus { border-color: var(--or-red); }
  .settings-add-member { display: flex; align-items: center; gap: 6px; color: var(--or-red); font-size: 13px; font-weight: 600; cursor: pointer; background: none; border: none; font-family: 'DM Sans', sans-serif; padding: 4px 0; margin-top: 4px; }
  .settings-saved { display: flex; align-items: center; gap: 6px; color: var(--green); font-size: 13px; font-weight: 600; }

  /* JOIN SCREEN */
  .join-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; background: var(--bg); }
  .join-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 48px 40px; max-width: 440px; width: 100%; text-align: center; box-shadow: 0 8px 40px rgba(0,0,0,.4); }
  .join-logo { font-family: 'Libre Franklin', sans-serif; font-size: 15px; font-weight: 800; color: var(--text-muted); letter-spacing: .5px; margin-bottom: 32px; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .join-logo-dot { width: 8px; height: 8px; background: var(--or-red); border-radius: 50%; }
  .join-sprint { display: inline-block; background: var(--or-red-glow); color: var(--or-red); border: 1px solid rgba(232,0,61,.25); border-radius: 20px; padding: 4px 14px; font-size: 13px; font-weight: 700; margin-bottom: 20px; }
  .join-title { font-family: 'Libre Franklin', sans-serif; font-size: 28px; font-weight: 800; color: var(--text); margin-bottom: 8px; line-height: 1.2; }
  .join-sub { color: var(--text-muted); font-size: 15px; margin-bottom: 32px; line-height: 1.5; }
  .join-input { width: 100%; border: 2px solid var(--border-light); border-radius: 8px; padding: 14px 16px; font-family: 'DM Sans', sans-serif; font-size: 17px; font-weight: 600; background: var(--bg-input); color: var(--text); outline: none; transition: border .2s; text-align: center; margin-bottom: 12px; }
  .join-input::placeholder { color: var(--text-dim); font-weight: 400; }
  .join-input:focus { border-color: var(--or-red); box-shadow: 0 0 0 3px var(--or-red-glow); }
  .join-btn { width: 100%; padding: 14px; background: var(--or-red); color: white; border: none; border-radius: 8px; font-family: 'Libre Franklin', sans-serif; font-size: 17px; font-weight: 800; cursor: pointer; transition: all .2s; }
  .join-btn:hover { background: var(--or-red-dark); transform: translateY(-1px); box-shadow: 0 4px 16px rgba(232,0,61,.3); }
  .join-btn:disabled { opacity: .4; cursor: not-allowed; transform: none; box-shadow: none; }
  .join-presence { margin-top: 28px; padding-top: 20px; border-top: 1px solid var(--border); }
  .join-presence-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin-bottom: 10px; }
  .join-avatars { display: flex; align-items: center; justify-content: center; gap: 6px; flex-wrap: wrap; }
  .join-avatar { display: flex; align-items: center; gap: 6px; background: var(--bg-raised); border-radius: 20px; padding: 4px 10px 4px 4px; }
  .join-avatar-dot { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; flex-shrink: 0; }
  .join-avatar-name { font-size: 13px; font-weight: 600; color: var(--text); }

  /* RICH TEXT EDITOR */
  .rte-wrap { position: relative; }
  .rte-toolbar { display: flex; align-items: center; gap: 2px; padding: 5px 8px; background: var(--bg-raised); border: 1.5px solid var(--border); border-bottom: none; border-radius: 6px 6px 0 0; flex-wrap: wrap; }
  .rte-btn { width: 28px; height: 28px; border-radius: 4px; border: none; background: transparent; color: var(--text-muted); font-size: 13px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .15s; font-family: 'DM Sans', sans-serif; }
  .rte-btn:hover { background: var(--bg-input); color: var(--text); }
  .rte-btn.active { background: var(--or-red); color: white; }
  .rte-divider { width: 1px; height: 18px; background: var(--border); margin: 0 4px; }
  .rte-emoji-btn { padding: 0 8px; width: auto; font-size: 15px; }
  .rte-editor { min-height: 90px; border: 1.5px solid var(--border); border-radius: 0 0 6px 6px; padding: 12px 14px; font-family: 'DM Sans', sans-serif; font-size: 15px; color: var(--text); background: var(--bg-input); outline: none; transition: border .2s; line-height: 1.6; }
  .rte-editor:focus { border-color: var(--or-red); box-shadow: 0 0 0 3px var(--or-red-glow); }
  .rte-editor:empty:before { content: attr(data-placeholder); color: var(--text-dim); pointer-events: none; }
  .rte-editor b, .rte-editor strong { font-weight: 700; color: var(--text); }
  .rte-editor i, .rte-editor em { font-style: italic; }
  .rte-editor ul { padding-left: 20px; margin: 4px 0; }
  .rte-editor li { margin: 2px 0; }

  /* EMOJI POPUP */
  .emoji-popup { position: absolute; z-index: 300; background: var(--bg-card); border: 1px solid var(--border-light); border-radius: 12px; padding: 12px; box-shadow: 0 8px 32px rgba(0,0,0,.5); width: 280px; }
  .emoji-popup-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px; max-height: 200px; overflow-y: auto; }
  .emoji-popup-grid::-webkit-scrollbar { width: 4px; }
  .emoji-popup-grid::-webkit-scrollbar-thumb { background: var(--border); border-radius: 4px; }
  .emoji-popup-item { width: 30px; height: 30px; display: flex; align-items: center; justify-content: center; font-size: 18px; cursor: pointer; border-radius: 6px; transition: background .1s; }
  .emoji-popup-item:hover { background: var(--bg-raised); }
  .emoji-popup-search { width: 100%; border: 1.5px solid var(--border); border-radius: 6px; padding: 6px 10px; font-family: 'DM Sans', sans-serif; font-size: 13px; background: var(--bg-input); color: var(--text); outline: none; margin-bottom: 8px; }
  .emoji-popup-search:focus { border-color: var(--or-red); }
  .join-q1-section { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); text-align: left; }
  .join-q1-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-dim); margin-bottom: 8px; }
  .join-q1-prompt { font-family: 'Libre Franklin', sans-serif; font-size: 15px; font-weight: 700; color: var(--text); margin-bottom: 14px; }
  .join-greeting { font-size: 40px; margin-bottom: 10px; }
  .join-greeting-text { font-size: 16px; color: var(--text-muted); margin-bottom: 24px; }

  /* REACTIONS */
  .reaction-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: var(--bg-card); border-bottom: 1px solid var(--border); flex-wrap: wrap; }
  .reaction-bar-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-right: 4px; }
  .reaction-emoji-btn { width: 36px; height: 36px; border-radius: 50%; border: 1.5px solid var(--border); background: var(--bg-raised); font-size: 18px; cursor: pointer; transition: all .15s; display: flex; align-items: center; justify-content: center; }
  .reaction-emoji-btn:hover { background: var(--bg-input); transform: scale(1.2); border-color: var(--or-red); }
  .reaction-drop { position: fixed; pointer-events: none; font-size: 28px; z-index: 999; animation: float-up 2.2s ease-out forwards; }
  @keyframes float-up { 0% { opacity:1; transform: translateY(0) scale(1); } 60% { opacity:.9; transform: translateY(-60px) scale(1.2); } 100% { opacity:0; transform: translateY(-120px) scale(.8); } }

  /* PRESENCE STRIP */
  .presence-strip { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: #0a0c12; border-bottom: 1px solid var(--border); font-size: 12px; color: var(--text-muted); flex-wrap: wrap; }
  .presence-avatar { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: white; border: 2px solid white; box-shadow: 0 1px 4px rgba(0,0,0,.15); flex-shrink: 0; }
  .presence-name { font-weight: 600; }
`;

// ── Components ────────────────────────────────────────────────────────────────

// Giphy — uses Tenor API (no key needed, CORS-friendly) as primary, Giphy beta as fallback
async function searchGifs(query) {
  try {
    const res = await fetch(
      `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCDY&limit=12&media_filter=gif`
    );
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      return data.results.map(r => ({
        id: r.id,
        title: r.content_description || query,
        images: { fixed_height_small: { url: r.media_formats?.tinygif?.url || r.media_formats?.gif?.url } }
      }));
    }
  } catch {}
  // fallback to Giphy
  try {
    const res = await fetch(
      `https://api.giphy.com/v1/gifs/search?api_key=Lat2X82BQoZI8UZnG0cHU2QnlITbWYr3&q=${encodeURIComponent(query)}&limit=12&rating=g`
    );
    const data = await res.json();
    return data.data || [];
  } catch {}
  return [];
}

function GifPicker({ value, onChange }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [showGrid, setShowGrid] = useState(!value);

  const search = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    const found = await searchGifs(query);
    setResults(found);
    setLoading(false);
  };

  const selectGif = (gif) => {
    onChange({ url: gif.images.fixed_height_small.url, id: gif.id, title: gif.title });
    setShowGrid(false);
  };

  if (value && !showGrid) {
    return (
      <div>
        <div className="gif-selected-preview">
          <img src={value.url} alt={value.title} />
          <div className="gif-selected-preview-text">
            <strong>GIF selected ✓</strong>
            <span>{value.title || "Untitled"}</span>
            <button className="gif-change-btn" onClick={() => setShowGrid(true)}>Change GIF</button>
          </div>
        </div>
        <div className="giphy-attr">Powered by GIPHY</div>
      </div>
    );
  }

  return (
    <div className="gif-picker">
      <div className="gif-search-row">
        <input
          className="gif-search-input"
          placeholder="Search GIFs… e.g. 'exhausted', 'winning', 'chaos'"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === "Enter" && search()}
        />
        <button className="gif-search-btn" onClick={search} disabled={loading || !query.trim()}>
          {loading ? "..." : "Search"}
        </button>
      </div>
      {loading && <div className="gif-loading">🔍 Searching GIPHY…</div>}
      {!loading && searched && results.length === 0 && (
        <div className="gif-empty">No GIFs found. Try different words!</div>
      )}
      {!loading && results.length > 0 && (
        <>
          <div className="gif-grid">
            {results.map(gif => (
              <div
                key={gif.id}
                className={`gif-item ${value?.id === gif.id ? "selected" : ""}`}
                onClick={() => selectGif(gif)}
              >
                <img src={gif.images.fixed_height_small.url} alt={gif.title} loading="lazy" />
                {value?.id === gif.id && <div className="gif-check">✓</div>}
              </div>
            ))}
          </div>
          <div className="giphy-attr">Powered by GIPHY</div>
        </>
      )}
      {!searched && (
        <div className="gif-empty">👆 Type something and hit Search to find GIFs</div>
      )}
    </div>
  );
}

function Q1Picker({ value, onChange }) {
  const isGif = value && typeof value === "object";
  const [mode, setMode] = useState(isGif ? "gif" : "emoji");

  const handleModeSwitch = (newMode) => {
    setMode(newMode);
    // Only clear if switching away from the current value's type
    const currentIsGif = value && typeof value === "object";
    if (newMode === "emoji" && currentIsGif) onChange("");
    if (newMode === "gif" && !currentIsGif) onChange("");
  };

  return (
    <div>
      <div className="q1-mode-toggle">
        <button className={`q1-mode-btn ${mode === "emoji" ? "active" : ""}`} onClick={() => handleModeSwitch("emoji")}>
          😄 Emoji
        </button>
        <button className={`q1-mode-btn gif-mode ${mode === "gif" ? "active" : ""}`} onClick={() => handleModeSwitch("gif")}>
          <span className={`toggle-switch ${mode === "gif" ? "on" : ""}`} />
          🎬 GIF
        </button>
      </div>
      {mode === "emoji" ? (
        <div className="emoji-grid">
          {EMOJIS.map(e => (
            <button key={e} className={`emoji-btn ${value === e ? "selected" : ""}`} onClick={() => onChange(e)}>{e}</button>
          ))}
        </div>
      ) : (
        <GifPicker value={isGif ? value : null} onChange={onChange} />
      )}
    </div>
  );
}


function StickyCard({ card, hidden, onGroup, grouped, groupName }) {
  const isGif = card.content && typeof card.content === "object" && card.content.url;
  return (
    <div className="sticky" style={{ background: card.color }} onClick={onGroup}>
      {grouped && <span className="sticky-group-badge">📌 {groupName}</span>}
      {card.type === "emoji" && !isGif && <div className="sticky-emoji">{card.content}</div>}
      {card.type === "emoji" && isGif && !hidden && (
        <div style={{ borderRadius: 6, overflow: "hidden", lineHeight: 0 }}>
          <img src={card.content.url} alt="gif" style={{ width: "100%", borderRadius: 6 }} />
        </div>
      )}
      {card.type === "emoji" && isGif && hidden && <div className="sticky-emoji">🎬</div>}
      {card.type !== "emoji" && (
        <div className="sticky-content">
          {hidden ? "••••••••" : (
            typeof card.content === "string" && card.content.startsWith("<")
              ? <span dangerouslySetInnerHTML={{ __html: card.content }} />
              : card.content
          )}
        </div>
      )}
      {!hidden && <div className="sticky-author">— {card.author}</div>}
    </div>
  );
}

// ── AI Ideas Generator ───────────────────────────────────────────────────────

async function fetchIdeas(question, sprintNumber) {
  // Uses a simple word-association approach client-side — no API needed
  const starters = {
    achievements: [
      `We finally shipped the feature that's been in progress for weeks — solid execution from the whole team.`,
      `Collaboration was strong this sprint, but we need to be more realistic about what we can actually finish.`,
      `The technical debt we paid down this sprint will save us significant time next quarter.`
    ],
    start: [
      `Start doing async design reviews before sprint planning so we catch issues earlier.`,
      `We should start time-boxing exploratory tasks — they tend to sprawl without a hard limit.`,
      `Start sharing blockers in the standup channel same-day instead of waiting for the next sync.`
    ],
    stop: [
      `Stop pulling in stretch tickets without checking team capacity first.`,
      `Stop context-switching mid-sprint — it's killing our focus time.`,
      `Stop leaving PRs open for more than 24 hours without a reviewer assigned.`
    ],
    continue: [
      `Keep the daily standup short and focused — it's one of the few rituals that actually works.`,
      `The pairing sessions this sprint were really effective, let's keep that going.`,
      `Continue the async-first communication approach — it's reduced interruptions noticeably.`
    ],
    shoutout: [
      `Shoutout to the folks who stayed focused even when things got chaotic mid-sprint.`,
      `Big thanks to whoever documented that gnarly bug fix — future us will appreciate it.`,
      `Recognition to the team for being proactive about unblocking each other this sprint.`
    ],
    default: [
      `This sprint felt more focused than usual — the prep work beforehand really paid off.`,
      `We need to get better at flagging risks earlier rather than discovering them at the end.`,
      `One thing worth trying: a quick team check-in at the midpoint of each sprint.`
    ]
  };

  const q = question.toLowerCase();
  let bank = starters.default;
  if (q.includes("achiev") || q.includes("standout") || q.includes("win")) bank = starters.achievements;
  else if (q.includes("start")) bank = starters.start;
  else if (q.includes("stop")) bank = starters.stop;
  else if (q.includes("continue") || q.includes("working")) bank = starters.continue;
  else if (q.includes("shout") || q.includes("anything else")) bank = starters.shoutout;

  // Shuffle slightly so it feels fresh each time
  return [...bank].sort(() => Math.random() - 0.5).slice(0, 3);
}

function AIIdeas({ question, sprintNumber, onSelect }) {
  const [ideas, setIdeas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [shown, setShown] = useState(false);

  const generate = async () => {
    setLoading(true);
    setShown(true);
    try {
      const result = await fetchIdeas(question, sprintNumber);
      setIdeas(result);
    } catch {
      setIdeas(["Something went wrong — try again or write your own!"]);
    }
    setLoading(false);
  };

  const regenerate = () => {
    setIdeas([]);
    generate();
  };

  if (!shown) {
    return (
      <button className="ai-ideas-btn" onClick={generate}>
        ✨ Give me ideas
      </button>
    );
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <button className="ai-ideas-btn" onClick={regenerate} disabled={loading}>
        ✨ {loading ? "Generating…" : "Refresh ideas"}
      </button>
      {loading ? (
        <div className="ai-ideas-wrap">
          <div className="ai-ideas-loading">
            <div className="ai-dot-spin" />
            Thinking of some starters for you…
          </div>
        </div>
      ) : ideas.length > 0 ? (
        <div className="ai-ideas-wrap">
          <div className="ai-ideas-header">✨ Starter ideas — click to use</div>
          {ideas.map((idea, i) => (
            <button key={i} className="ai-idea-chip" onClick={() => onSelect(idea)}>
              <span className="ai-idea-chip-text">{idea}</span>
              <span className="ai-idea-use">Use this →</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// In production this would be a real URL. Here we simulate with a token.
function generateEditToken() {
  return uid() + uid();
}

// Simulate cutoff: 5 mins before a fixed retro time. For demo, always open.
function isSubmissionOpen() {
  return true; // In production: return new Date() < cutoffTime
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button className={`copy-btn ${copied ? "copied" : ""}`} onClick={copy}>
      {copied ? "✓ Copied!" : "Copy Link"}
    </button>
  );
}

function ConfirmModal({ answers, questions, onConfirm, onCancel }) {
  const getAnswerPreview = (q) => {
    const val = answers[q.id];
    if (!val || val === "") return null;
    if (typeof val === "object" && val.url) return "GIF: " + (val.title || "selected");
    return val;
  };

  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: 540 }}>
        <h2>Ready to submit? 🚀</h2>
        <p>Here's a summary of your responses. You can go back to make changes, or submit now.</p>
        <div className="confirm-summary">
          {questions.map(q => {
            const preview = getAnswerPreview(q);
            return (
              <div key={q.id} className="confirm-row">
                <span className="confirm-q-label" style={{ background: q.color }}>{q.label}</span>
                <span className={`confirm-answer ${!preview ? "empty" : ""}`}>
                  {preview || "No response"}
                </span>
              </div>
            );
          })}
        </div>
        <div className="modal-btns">
          <button className="tool-btn" onClick={onCancel}>← Go Back</button>
          <button className="tool-btn primary" onClick={onConfirm}>Yes, Submit →</button>
        </div>
      </div>
    </div>
  );
}

function EditLinkBox({ token, sprintNumber, cutoff }) {
  const basePath = window.location.origin + window.location.pathname.replace(/\?.*$/, '');
  const editUrl = `${basePath}?edit=${token}&sprint=${sprintNumber}`;
  const ms = useCountdown(cutoff);
  const { state } = relaxedLabel(ms);
  const exact = exactTime(ms);
  const stateColors = { open: "#5cb85c", soon: "#e8a020", urgent: "#ff4444", closed: "#666" };
  const color = stateColors[state] || "#666";
  return (
    <div className="edit-link-box">
      <h3>🔗 Your personal edit link</h3>
      <p>
        Save this link to come back and update your responses before the cutoff.
        Bookmark it or paste it somewhere safe.
      </p>
      <div className="edit-link-copy-row">
        <div className="edit-link-url" title={editUrl}>{editUrl}</div>
        <CopyButton text={editUrl} />
      </div>
      <div className="cutoff-notice" style={{ color, display: "flex", alignItems: "center", gap: 6 }}>
        ⏰ {ms <= 0 ? "Submissions are now closed" : <>Submissions close in <strong style={{ fontFamily: "'Libre Franklin', sans-serif", letterSpacing: 1 }}>{exact}</strong></>}
      </div>
    </div>
  );
}

// ── Rich Text Editor ─────────────────────────────────────────────────────────

const ALL_EMOJIS = [
  "😀","😂","🥲","😍","🤩","😎","🤔","😬","😅","🙌","👏","🔥","💯","🚀","⚡","🎯",
  "💪","🧠","💡","✅","❌","⚠️","📌","🔧","🐛","🎉","🏆","🌱","🌊","💥","🤝","👀",
  "😤","😮","🥳","🫠","😵","🤯","💀","🙏","👋","✊","🫡","🎸","🌀","⏰","📊","🗓️",
  "💬","📝","🔗","🔑","🚧","🛠️","📦","🧩","🎲","🪄","🫶","❤️","💙","💚","💛","🖤"
];

function EmojiPopup({ onSelect, onClose }) {
  const [search, setSearch] = useState("");
  const filtered = search
    ? ALL_EMOJIS.filter(e => e.includes(search))
    : ALL_EMOJIS;

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  return (
    <div className="emoji-popup">
      <input
        className="emoji-popup-search"
        placeholder="Search emoji…"
        value={search}
        onChange={e => setSearch(e.target.value)}
        autoFocus
      />
      <div className="emoji-popup-grid">
        {filtered.map((e, i) => (
          <div key={i} className="emoji-popup-item" onClick={() => { onSelect(e); onClose(); }}>{e}</div>
        ))}
      </div>
    </div>
  );
}

function RichTextEditor({ value, onChange, placeholder, injectText }) {
  const editorRef = useRef(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [activeFormats, setActiveFormats] = useState({ bold: false, italic: false, list: false });
  const prevInjectRef = useRef(injectText);

  // Sync value into editor on first mount only
  useEffect(() => {
    if (editorRef.current && value && editorRef.current.innerHTML === "") {
      editorRef.current.innerHTML = value;
    }
  }, []);

  // When injectText changes (AI idea selected), set it into the editor
  useEffect(() => {
    if (injectText && injectText !== prevInjectRef.current && editorRef.current) {
      editorRef.current.innerHTML = injectText;
      onChange(injectText);
      prevInjectRef.current = injectText;
      editorRef.current.focus();
      // Move cursor to end
      const range = document.createRange();
      const sel = window.getSelection();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [injectText]);

  const exec = (cmd, val = null) => {
    editorRef.current.focus();
    document.execCommand(cmd, false, val);
    syncFormats();
    emitChange();
  };

  const syncFormats = () => {
    setActiveFormats({
      bold: document.queryCommandState("bold"),
      italic: document.queryCommandState("italic"),
      list: document.queryCommandState("insertUnorderedList"),
    });
  };

  const emitChange = () => {
    if (editorRef.current) onChange(editorRef.current.innerHTML);
  };

  const insertEmoji = (emoji) => {
    editorRef.current.focus();
    document.execCommand("insertText", false, emoji);
    emitChange();
  };

  return (
    <div className="rte-wrap">
      <div className="rte-toolbar">
        <button className={`rte-btn ${activeFormats.bold ? "active" : ""}`} onMouseDown={e => { e.preventDefault(); exec("bold"); }} title="Bold (⌘B)"><b>B</b></button>
        <button className={`rte-btn ${activeFormats.italic ? "active" : ""}`} onMouseDown={e => { e.preventDefault(); exec("italic"); }} title="Italic (⌘I)"><i>I</i></button>
        <div className="rte-divider" />
        <button className={`rte-btn ${activeFormats.list ? "active" : ""}`} onMouseDown={e => { e.preventDefault(); exec("insertUnorderedList"); }} title="Bullet list">≡</button>
        <div className="rte-divider" />
        <button className="rte-btn rte-emoji-btn" onMouseDown={e => { e.preventDefault(); setShowEmoji(s => !s); }} title="Insert emoji">😊</button>
      </div>
      <div
        ref={editorRef}
        className="rte-editor"
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || "Type your response…"}
        onInput={emitChange}
        onKeyUp={syncFormats}
        onMouseUp={syncFormats}
        onKeyDown={e => {
          if ((e.metaKey || e.ctrlKey) && e.key === "b") { e.preventDefault(); exec("bold"); }
          if ((e.metaKey || e.ctrlKey) && e.key === "i") { e.preventDefault(); exec("italic"); }
        }}
      />
      {showEmoji && (
        <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 300 }}>
          <EmojiPopup onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
        </div>
      )}
    </div>
  );
}

// ── Submit View ───────────────────────────────────────────────────────────────

// Submissions store backed by localStorage so edit links survive page reload
const submissionsStore = {
  get(token) {
    try { return JSON.parse(localStorage.getItem("rk_sub_" + token) || "null"); } catch { return null; }
  },
  set(token, data) {
    try { localStorage.setItem("rk_sub_" + token, JSON.stringify(data)); } catch {}
  }
};

function SubmitView({ sprintNumber, questions, currentUser, cutoff, joinQ1 }) {
  questions = questions || QUESTIONS(sprintNumber);
  cutoff = cutoff || DEMO_CUTOFF;

  // Check for edit token in URL params (simulated)
  const urlParams = new URLSearchParams(window.location.search);
  const editToken = urlParams.get("edit");
  const existingSubmission = editToken ? submissionsStore.get(editToken) : null;

  const [name, setName] = useState(existingSubmission ? existingSubmission.name : (currentUser || ""));
  const [answers, setAnswers] = useState(
    existingSubmission ? existingSubmission.answers : { q1: joinQ1 || "", q2: "", q3: "", q4: "" }
  );
  const [injected, setInjected] = useState({ q1: "", q2: "", q3: "", q4: "" });

  const injectIdea = (qId, text) => {
    setAnswer(qId, text);
    setInjected(i => ({ ...i, [qId]: text + "_" + Date.now() })); // unique to trigger effect
  };
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [editLink, setEditLink] = useState(existingSubmission ? { token: editToken } : null);
  const [exited, setExited] = useState(false);
  const isEditing = !!existingSubmission;
  const isOpen = isSubmissionOpen();

  // Exit without saving — clear edit param from URL and go back to fresh form
  const handleExit = () => {
    try { window.history.replaceState({}, "", window.location.href.split("?")[0]); } catch {}
    setExited(true);
  };

  const setAnswer = (id, val) => setAnswers(a => ({ ...a, [id]: val }));
  const canSubmit = name.trim(); // all questions are optional

  const handleSubmit = () => {
    const token = editToken || generateEditToken();
    submissionsStore.set(token, { name: name.trim(), answers, sprintNumber, submittedAt: new Date().toISOString() });
    setEditLink({ token });
    setSubmitted(true);
    setShowConfirm(false);
  };

  // Exited without saving
  if (exited) return (
    <div className="submit-wrap">
      <div className="success-wrap">
        <div className="success-icon">👋</div>
        <h2>No changes made</h2>
        <p>Your original responses are still saved.</p>
        {editToken && <EditLinkBox token={editToken} sprintNumber={sprintNumber} cutoff={cutoff} />}
      </div>
    </div>
  );

  // Closed state
  if (!isOpen && !isEditing) return (
    <div className="submit-wrap">
      <div className="closed-wrap">
        <div style={{ fontSize: 64 }}>🔒</div>
        <h2>Submissions are closed</h2>
        <p>The deadline has passed. See you at the retro!</p>
      </div>
    </div>
  );

  // Success state
  if (submitted) return (
    <div className="submit-wrap">
      <div className="success-wrap">
        <div className="success-icon">{isEditing ? "✏️" : "🎉"}</div>
        <h2>{isEditing ? "Responses updated!" : "You're all set!"}</h2>
        <p>Your responses have been saved.<br />See you at the retro!</p>
        {editLink && <EditLinkBox token={editLink.token} sprintNumber={sprintNumber} cutoff={cutoff} />}
      </div>
    </div>
  );

  return (
    <div className="submit-wrap">
      {showConfirm && (
        <ConfirmModal
          answers={answers}
          questions={questions}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <div className="submit-header">
        <h1>Sprint {sprintNumber} Retro</h1>
        <p>Share your thoughts before the meeting — responses are visible to the team after reveal.</p>
        <div className="anon-badge">👥 Responses visible to team after reveal</div>
      </div>

      <div className="name-card">
        <div className="name-card-label">Your name</div>
        <div className="name-card-title">Who's submitting?</div>
        <input
          className="name-input"
          placeholder="First name or display name…"
          value={name}
          onChange={e => setName(e.target.value)}
          maxLength={30}
        />
      </div>

      {isEditing && (
        <div className="editing-banner" style={{ justifyContent: "space-between" }}>
          <span>✏️ You're <strong>editing</strong> your previous responses. Changes will replace your original submission.</span>
          <button onClick={handleExit} style={{ background: "none", border: "1px solid var(--border-light)", borderRadius: 6, padding: "4px 10px", color: "var(--text-muted)", fontSize: 12, cursor: "pointer", whiteSpace: "nowrap", marginLeft: 12 }}>Exit without saving</button>
        </div>
      )}

      {questions.map(q => (
        <div key={q.id} className="q-card" style={{ borderLeftColor: q.color }}>
          <div className="q-label" style={{ color: q.color }}>{q.label}</div>
          <div className="q-prompt">{q.prompt}</div>
          {q.type === "emoji" ? (
            <>
              {joinQ1 && answers[q.id] === joinQ1 && (
                <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(16,185,129,.1)", border: "1px solid rgba(16,185,129,.2)", borderRadius: 6, padding: "6px 10px", marginBottom: 12, fontSize: 12, color: "var(--green)" }}>
                  ✓ Pre-filled from your join screen — feel free to change it
                </div>
              )}
              <Q1Picker value={answers[q.id]} onChange={v => setAnswer(q.id, v)} />
            </>
          ) : (
            <>
              <AIIdeas
                question={q.prompt}
                sprintNumber={sprintNumber}
                onSelect={idea => injectIdea(q.id, idea)}
              />
              <RichTextEditor
                value={answers[q.id]}
                onChange={v => setAnswer(q.id, v)}
                placeholder="Type your response, or pick a starter above and edit it…"
                injectText={injected[q.id]}
              />
            </>
          )}
        </div>
      ))}

      <button className="submit-btn" disabled={!canSubmit} onClick={() => setShowConfirm(true)}>
        {isEditing ? "Update My Responses →" : "Review & Submit →"}
      </button>
    </div>
  );
}

// ── Board View ────────────────────────────────────────────────────────────────

const AI_SUGGESTIONS = {
  q3: [
    { label: "Blockers & friction", cards: ["Unplanned interruptions", "ticket grooming"] },
    { label: "Process improvements", cards: ["async design reviews", "sprint planning"] },
  ],
  q2: [
    { label: "Wins", cards: ["dashboard", "CI/CD", "zero bugs"] },
  ],
};

const REACTION_EMOJIS = ["🔥","💯","👏","😅","🚀","💡","🤔","😬","🙌","❤️","😂","👀"];
const AVATAR_COLORS = ["#D3002D","#1a73e8","#188038","#e37400","#7b1fa2","#0097a7","#c62828","#2e7d32"];

function FreeCard({ card, onDragStart, onEdit, currentUser }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(card.content);
  const [showEmoji, setShowEmoji] = useState(false);
  const editorRef = useRef(null);

  const handleDoubleClick = (e) => {
    e.stopPropagation();
    setEditing(true);
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  const handleBlur = () => {
    setEditing(false);
    setShowEmoji(false);
    onEdit(card.id, text);
  };

  const insertEmoji = (emoji) => {
    setText(t => t + emoji);
    setShowEmoji(false);
    setTimeout(() => editorRef.current?.focus(), 0);
  };

  return (
    <div
      style={{
        position: "absolute",
        left: card.x,
        top: card.y,
        width: 200,
        background: card.color,
        borderRadius: 10,
        padding: "12px 14px",
        boxShadow: "2px 3px 0 rgba(0,0,0,.18)",
        cursor: editing ? "text" : "grab",
        userSelect: "none",
        zIndex: editing ? 50 : 10,
        border: editing ? "2px solid #333" : "2px solid transparent",
      }}
      onMouseDown={(e) => {
        if (editing) return;
        e.preventDefault();
        onDragStart(e, card.id);
      }}
      onDoubleClick={handleDoubleClick}
    >
      {editing ? (
        <div style={{ position: "relative" }}>
          <textarea
            ref={editorRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onBlur={handleBlur}
            onKeyDown={e => { if (e.key === "Escape") { setEditing(false); onEdit(card.id, text); } }}
            style={{
              width: "100%",
              minHeight: 60,
              border: "none",
              background: "transparent",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: 13,
              color: "#1a1a1a",
              resize: "none",
              outline: "none",
              lineHeight: 1.5,
            }}
          />
          <button
            onMouseDown={e => { e.preventDefault(); setShowEmoji(s => !s); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontSize: 16, padding: "2px 4px", opacity: 0.7 }}
            title="Insert emoji"
          >😊</button>
          {showEmoji && (
            <div style={{ position: "absolute", top: "100%", left: 0, zIndex: 400 }}>
              <EmojiPopup onSelect={insertEmoji} onClose={() => setShowEmoji(false)} />
            </div>
          )}
        </div>
      ) : (
        <div style={{ fontSize: 13, color: "#1a1a1a", lineHeight: 1.5, fontWeight: 500, minHeight: 24, wordBreak: "break-word" }}>
          {text || <span style={{ opacity: 0.4, fontStyle: "italic" }}>Double-click to edit…</span>}
        </div>
      )}
      <div style={{ fontSize: 11, color: "rgba(0,0,0,.5)", marginTop: 6, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span>— {card.author}</span>
        {!editing && <span style={{ opacity: 0.5, fontSize: 10 }}>✎ dbl-click</span>}
      </div>
    </div>
  );
}

function BoardView({ sprintNumber, members, questions, currentUser, currentVibe }) {
  questions = questions || QUESTIONS(sprintNumber);
  const [cards, setCards] = useState(() => {
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("rk_sub_"));
      const subs = keys.map(k => JSON.parse(localStorage.getItem(k))).filter(s => s && s.sprintNumber === sprintNumber);
      if (subs.length > 0) {
        return subs.flatMap(sub =>
          Object.entries(sub.answers)
            .filter(([, val]) => val)
            .map(([qId, content]) => ({
              id: uid(),
              qId,
              content,
              author: sub.name,
              color: CARD_COLORS[Math.floor(Math.random() * CARD_COLORS.length)],
              groupId: null,
              type: qId === "q1" ? "emoji" : "text"
            }))
        );
      }
    } catch {}
    return seedCards(sprintNumber);
  });

  const [freeCards, setFreeCards] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(`rk_free_${sprintNumber}`) || "[]");
    } catch { return []; }
  });

  const canvasRef = useRef(null);
  const dragState = useRef(null); // { cardId, startX, startY, origX, origY }

  const saveFreeCards = (cards) => {
    try { localStorage.setItem(`rk_free_${sprintNumber}`, JSON.stringify(cards)); } catch {}
  };

  const addFreeCard = () => {
    const canvas = canvasRef.current;
    const rect = canvas ? canvas.getBoundingClientRect() : { left: 0, top: 0, width: 800, height: 600 };
    // Center of visible canvas area
    const x = Math.round(rect.width / 2 - 100);
    const y = Math.round(window.scrollY - rect.top + window.innerHeight / 2 - 60);
    const newCard = {
      id: uid(),
      content: "",
      author: currentUser || "You",
      color: randomColor(),
      x: Math.max(0, x),
      y: Math.max(0, y),
    };
    const updated = [...freeCards, newCard];
    setFreeCards(updated);
    saveFreeCards(updated);
  };

  const handleDragStart = (e, cardId) => {
    const card = freeCards.find(c => c.id === cardId);
    if (!card) return;
    dragState.current = { cardId, startX: e.clientX, startY: e.clientY, origX: card.x, origY: card.y };
    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
  };

  const handleDragMove = (e) => {
    const d = dragState.current;
    if (!d) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    setFreeCards(cs => cs.map(c => c.id === d.cardId ? { ...c, x: Math.max(0, d.origX + dx), y: Math.max(0, d.origY + dy) } : c));
  };

  const handleDragEnd = () => {
    if (!dragState.current) return;
    setFreeCards(cs => {
      saveFreeCards(cs);
      return cs;
    });
    dragState.current = null;
    window.removeEventListener("mousemove", handleDragMove);
    window.removeEventListener("mouseup", handleDragEnd);
  };

  const handleEditCard = (cardId, newText) => {
    setFreeCards(cs => {
      const updated = cs.map(c => c.id === cardId ? { ...c, content: newText } : c);
      saveFreeCards(updated);
      return updated;
    });
  };

  // Cleanup listeners on unmount
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
    };
  }, []);

  const [revealed, setRevealed] = useState(false);
  const [groups, setGroups] = useState({});
  const [actionItems, setActionItems] = useState([
    { id: uid(), text: "Set up async design review process", owner: "Sam", done: false },
    { id: uid(), text: "Add ticket grooming to sprint planning agenda", owner: "Riley", done: false },
  ]);
  const [newAction, setNewAction] = useState("");
  const [newOwner, setNewOwner] = useState("");
  const [showAI, setShowAI] = useState(null);
  const [groupingCard, setGroupingCard] = useState(null);
  const [newGroupName, setNewGroupName] = useState("");
  const [reactions, setReactions] = useState([]);
  const teamMembers = members && members.length ? members : ["Alex", "Sam", "Jordan", "Riley"];
  const [presence] = useState(() =>
    teamMembers.filter(Boolean).map((m, i) => ({ name: typeof m === "object" ? m.name : m, vibe: typeof m === "object" ? m.vibe : null, color: AVATAR_COLORS[i % AVATAR_COLORS.length] }))
  );

  const dropReaction = (emoji) => {
    const id = uid();
    const x = 100 + Math.random() * (window.innerWidth - 200);
    const y = 100 + Math.random() * (window.innerHeight - 200);
    setReactions(r => [...r, { id, emoji, x, y }]);
    setTimeout(() => setReactions(r => r.filter(rx => rx.id !== id)), 2400);
  };

  const cardsForQ = (qId) => cards.filter(c => c.qId === qId);
  const applyGroup = (cardId, groupId) => setCards(cs => cs.map(c => c.id === cardId ? { ...c, groupId } : c));
  const createGroup = (qId, name) => {
    const gid = uid();
    setGroups(g => ({ ...g, [gid]: { name, qId } }));
    return gid;
  };
  const toggleDone = (id) => setActionItems(a => a.map(i => i.id === id ? { ...i, done: !i.done } : i));
  const deleteAction = (id) => setActionItems(a => a.filter(i => i.id !== id));
  const addAction = () => {
    if (!newAction.trim()) return;
    setActionItems(a => [...a, { id: uid(), text: newAction, owner: newOwner || "TBD", done: false }]);
    setNewAction(""); setNewOwner("");
  };
  const groupsForQ = (qId) => Object.entries(groups).filter(([, v]) => v.qId === qId);

  return (
    <div className="board-wrap" style={{ paddingTop: 0 }}>
      {/* Presence strip */}
      <div className="presence-strip">
        <span style={{ marginRight: 4 }}>👥 In this session:</span>
        {presence.map((p, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div className="presence-avatar" style={{ background: p.color }}>{p.name[0]}</div>
            <span className="presence-name">{p.name}{p.vibe ? ` ${p.vibe}` : ""}</span>
          </div>
        ))}
      </div>

      {/* Reaction bar */}
      {revealed && (
        <div className="reaction-bar">
          <span className="reaction-bar-label">React</span>
          {REACTION_EMOJIS.map(e => (
            <button key={e} className="reaction-emoji-btn" onClick={() => dropReaction(e)}>{e}</button>
          ))}
        </div>
      )}

      {reactions.map(r => (
        <div key={r.id} className="reaction-drop" style={{ left: r.x, top: r.y }}>{r.emoji}</div>
      ))}

      <div style={{ padding: "16px 24px 0" }}>
        <div className="board-toolbar">
          <div className="board-title">Sprint {sprintNumber} — Facilitation Board</div>
          <button className="tool-btn primary" onClick={addFreeCard}>＋ Add Card</button>
          {!revealed
            ? <button className="tool-btn" onClick={() => setRevealed(true)}>👁 Reveal All Cards</button>
            : <span className="tag" style={{ background: "#6BCB77", color: "white" }}>✓ Cards Revealed</span>
          }
          <button className="tool-btn" onClick={() => setShowAI("q3")}>✨ AI Group Suggestions</button>
        </div>

        {!revealed && (
          <div style={{ background: "rgba(255,200,0,.07)", borderRadius: 10, padding: "10px 16px", marginBottom: 16, fontSize: 14, color: "#d4a700", border: "1px solid rgba(255,200,0,.15)" }}>
            🔒 Cards are hidden until you reveal them. Click <strong>Reveal All Cards</strong> to show responses.
          </div>
        )}

        {freeCards.length > 0 && (
          <div style={{ fontSize: 12, color: "var(--text-dim)", marginBottom: 8 }}>
            💡 <strong style={{ color: "var(--text-muted)" }}>{freeCards.length} free card{freeCards.length !== 1 ? "s" : ""}</strong> on the canvas — drag to reposition, double-click to edit
          </div>
        )}

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
          {/* Freeform canvas + columns wrapper */}
          <div style={{ position: "relative", flex: 1, minWidth: 0 }}>
            {/* Free cards canvas */}
            <div
              ref={canvasRef}
              style={{
                position: "absolute",
                inset: 0,
                pointerEvents: "none",
                zIndex: 20,
                minHeight: "100%",
              }}
            >
              {freeCards.map(card => (
                <div key={card.id} style={{ pointerEvents: "all" }}>
                  <FreeCard
                    card={card}
                    onDragStart={handleDragStart}
                    onEdit={handleEditCard}
                    currentUser={currentUser}
                  />
                </div>
              ))}
            </div>

            {/* Column board */}
            <div className="board-columns" style={{ position: "relative", zIndex: 1 }}>
              {questions.map(q => {
                const qCards = cardsForQ(q.id);
                const ungrouped = qCards.filter(c => !c.groupId);
                const qGroups = groupsForQ(q.id);
                return (
                  <div key={q.id} className="col">
                    <div className="col-header" style={{ background: q.color }}>
                      <div className="col-header-title">{q.prompt}</div>
                      <div className="col-count">{qCards.length}</div>
                    </div>
                    <div className="col-body">
                      {revealed && <div className="revealed-banner">✓ Revealed</div>}
                      {qGroups.map(([gid, gdata]) => {
                        const gCards = qCards.filter(c => c.groupId === gid);
                        return (
                          <div key={gid} className="group-block">
                            <div className="group-label">
                              <input value={gdata.name} onChange={e => setGroups(g => ({ ...g, [gid]: { ...g[gid], name: e.target.value } }))} />
                              <span style={{ fontSize: 11, color: "#999" }}>{gCards.length} cards</span>
                            </div>
                            {gCards.map(c => (
                              <StickyCard key={c.id} card={c} hidden={!revealed} grouped groupName={gdata.name} onGroup={() => setGroupingCard(c)} />
                            ))}
                          </div>
                        );
                      })}
                      {ungrouped.map(c => (
                        <StickyCard key={c.id} card={c} hidden={!revealed} onGroup={() => revealed && setGroupingCard(c)} />
                      ))}
                      {qCards.length === 0 && (
                        <div style={{ textAlign: "center", color: "#bbb", fontSize: 13, padding: "20px 0" }}>No responses yet</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Items Panel */}
          <div className="actions-panel" style={{ position: "sticky", top: 80, flexShrink: 0 }}>
            <div className="actions-title">✅ Action Items</div>
            {actionItems.map(item => (
              <div key={item.id} className="action-item">
                <div className={`action-check ${item.done ? "done" : ""}`} onClick={() => toggleDone(item.id)}>{item.done && "✓"}</div>
                <div className={`action-text ${item.done ? "done" : ""}`}>{item.text}</div>
                <div className="action-owner">{item.owner}</div>
                <div className="action-delete" onClick={() => deleteAction(item.id)}>×</div>
              </div>
            ))}
            <div className="add-action">
              <input placeholder="New action item..." value={newAction} onChange={e => setNewAction(e.target.value)} onKeyDown={e => e.key === "Enter" && addAction()} />
              <input placeholder="Owner" value={newOwner} onChange={e => setNewOwner(e.target.value)}
                style={{ width: 80, border: "2px solid #e8e8e8", borderRadius: 8, padding: "8px 10px", fontFamily: "DM Sans, sans-serif", fontSize: 14, outline: "none" }}
                onKeyDown={e => e.key === "Enter" && addAction()} />
              <button className="add-action-btn" onClick={addAction}>+</button>
            </div>
          </div>
        </div>

        {/* AI Suggestions Modal */}
        {showAI && (
          <div className="modal-overlay" onClick={() => setShowAI(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>✨ AI Grouping Suggestions</h2>
              <p>Based on the card content, here are suggested theme groupings for Q3:</p>
              {(AI_SUGGESTIONS[showAI] || []).map((s, i) => (
                <div key={i} className="ai-suggestion">
                  <div className="ai-suggestion-title">📁 {s.label}</div>
                  {s.cards.map((c, j) => (
                    <div key={j} className="suggestion-item"
                      onClick={() => {
                        const gid = createGroup(showAI, s.label);
                        cards.filter(card => card.qId === showAI && card.content.toLowerCase().includes(c.toLowerCase()))
                          .forEach(card => applyGroup(card.id, gid));
                        setShowAI(null);
                      }}>
                      <span>🟡</span>
                      <span>Cards mentioning <em>{c}</em></span>
                      <span className="suggestion-apply">Apply →</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="modal-btns">
                <button className="tool-btn" onClick={() => setShowAI(null)}>Close</button>
              </div>
            </div>
          </div>
        )}

        {/* Group Assignment Modal */}
        {groupingCard && (
          <div className="modal-overlay" onClick={() => setGroupingCard(null)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <h2>Group This Card</h2>
              <div className="sticky" style={{ background: groupingCard.color, marginBottom: 20 }}>
                <div className="sticky-content">{groupingCard.content}</div>
              </div>
              <p>Add to an existing group or create a new one:</p>
              {groupsForQ(groupingCard.qId).map(([gid, gdata]) => (
                <div key={gid} className="suggestion-item" style={{ border: "1px solid #eee", borderRadius: 8, marginBottom: 6 }}
                  onClick={() => { applyGroup(groupingCard.id, gid); setGroupingCard(null); }}>
                  📁 {gdata.name} <span className="suggestion-apply">Add here →</span>
                </div>
              ))}
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input className="text-input" style={{ minHeight: "unset", height: 40 }} placeholder="New group name..."
                  value={newGroupName} onChange={e => setNewGroupName(e.target.value)} />
                <button className="tool-btn primary" onClick={() => {
                  if (!newGroupName.trim()) return;
                  const gid = createGroup(groupingCard.qId, newGroupName);
                  applyGroup(groupingCard.id, gid);
                  setNewGroupName(""); setGroupingCard(null);
                }}>Create</button>
              </div>
              <div className="modal-btns">
                {groupingCard.groupId && (
                  <button className="tool-btn danger" onClick={() => { applyGroup(groupingCard.id, null); setGroupingCard(null); }}>Remove from group</button>
                )}
                <button className="tool-btn" onClick={() => setGroupingCard(null)}>Cancel</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── History View ──────────────────────────────────────────────────────────────

const PAST_SPRINTS = [
  { num: 12, date: "Feb 12, 2026", cards: 14, actions: 3, completed: 2 },
  { num: 11, date: "Jan 29, 2026", cards: 11, actions: 4, completed: 4 },
  { num: 10, date: "Jan 15, 2026", cards: 16, actions: 2, completed: 1 },
  { num: 9,  date: "Jan 1, 2026",  cards: 9,  actions: 3, completed: 3 },
];

function HistoryView({ onLoadSprint }) {
  return (
    <div className="history-wrap">
      <div className="history-title">📚 Past Retros</div>
      {PAST_SPRINTS.map(s => (
        <div key={s.num} className="history-card" onClick={() => onLoadSprint(s.num)}>
          <div className="history-sprint">Sprint {s.num}</div>
          <div className="history-meta">{s.date}</div>
          <div className="history-stats">
            <span className="stat-pill">🃏 {s.cards} cards</span>
            <span className="stat-pill">✅ {s.actions} action items</span>
            <span className="stat-pill" style={{ background: s.completed === s.actions ? "#e8f5e9" : "#fff3e0" }}>
              {s.completed === s.actions ? "🟢" : "🟡"} {s.completed}/{s.actions} completed
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────

const SETTINGS_PASSWORD = "retro2026";

const DEFAULT_SETTINGS = {
  sprintNumber: 13,
  cutoffDate: "",
  cutoffTime: "09:55",
  q3Variant: 0,
  members: ["Alex", "Sam", "Jordan", "Riley", "Casey", "Morgan"],
};

function loadSettings() {
  try {
    const s = localStorage.getItem("retrokit-settings");
    return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function saveSettings(s) {
  try { localStorage.setItem("retrokit-settings", JSON.stringify(s)); } catch {}
}

function SettingsModal({ settings, onSave, onClose }) {
  const [locked, setLocked] = useState(true);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState(false);
  const [form, setForm] = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const unlock = () => {
    if (pw === SETTINGS_PASSWORD) { setLocked(false); setPwError(false); }
    else { setPwError(true); }
  };

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1000);
  };

  const updateMember = (i, val) => {
    const m = [...form.members];
    m[i] = val;
    set("members", m);
  };

  const addMember = () => set("members", [...form.members, ""]);
  const removeMember = (i) => set("members", form.members.filter((_, j) => j !== i));

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>
        {locked ? (
          <div className="settings-lock">
            <div className="settings-lock-icon">⚙️</div>
            <h2>Settings</h2>
            <p>Enter the facilitator password to make changes.</p>
            <div className="settings-pw-row">
              <input
                className="settings-pw-input"
                type="password"
                placeholder="Password"
                value={pw}
                onChange={e => { setPw(e.target.value); setPwError(false); }}
                onKeyDown={e => e.key === "Enter" && unlock()}
                autoFocus
              />
              <button className="tool-btn primary" onClick={unlock}>Unlock</button>
            </div>
            {pwError && <div className="settings-pw-error">Incorrect password</div>}
            <div className="modal-btns" style={{ justifyContent: "center", marginTop: 16 }}>
              <button className="tool-btn" onClick={onClose}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <h2>⚙️ Settings</h2>
            <p>Changes apply immediately after saving.</p>

            <div className="settings-section">
              <div className="settings-section-title">Sprint</div>
              <div className="settings-row">
                <label className="settings-label">Sprint number</label>
                <input className="settings-input" type="number" min="1"
                  value={form.sprintNumber}
                  onChange={e => set("sprintNumber", parseInt(e.target.value) || 1)} />
              </div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Submission cutoff</div>
              <div style={{ display: "flex", gap: 10 }}>
                <div className="settings-row" style={{ flex: 2 }}>
                  <label className="settings-label">Date</label>
                  <input className="settings-input" type="date"
                    value={form.cutoffDate}
                    onChange={e => set("cutoffDate", e.target.value)} />
                </div>
                <div className="settings-row" style={{ flex: 1 }}>
                  <label className="settings-label">Time</label>
                  <input className="settings-input" type="time"
                    value={form.cutoffTime}
                    onChange={e => set("cutoffTime", e.target.value)} />
                </div>
              </div>
              <div className="settings-hint">Set to ~5 minutes before your retro starts.</div>
            </div>

            <div className="settings-section">
              <div className="settings-section-title">Rotating question (Q3)</div>
              <div className="settings-row">
                <label className="settings-label">Active variant</label>
                <select className="settings-select"
                  value={form.q3Variant}
                  onChange={e => set("q3Variant", parseInt(e.target.value))}>
                  {Q3_VARIANTS.map((q, i) => (
                    <option key={i} value={i}>{q}</option>
                  ))}
                </select>
              </div>
            </div>


            <div className="modal-btns">
              <button className="tool-btn" onClick={onClose}>Cancel</button>
              {saved
                ? <span className="settings-saved">✓ Saved!</span>
                : <button className="tool-btn primary" onClick={handleSave}>Save changes</button>
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

function JoinScreen({ sprintNumber, onJoin, joined, sprintDate }) {
  const [name, setName] = useState("");
  const [q1Val, setQ1Val] = useState("");
  const { greeting, emoji } = getTimeOfDay();

  const handleJoin = () => {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    onJoin(trimmed, q1Val);
  };

  return (
    <div className="join-wrap">
      <div className="join-card">
        <div className="join-logo"><span className="join-logo-dot" />RetroKit</div>
        <div className="join-sprint">Sprint {sprintNumber}{sprintDate ? ` · ${sprintDate}` : ""}</div>
        <div className="join-greeting">{emoji}</div>
        <div className="join-greeting-text">{greeting}! Join the retro session below.</div>
        <div className="join-title">What should we call you?</div>
        <input
          className="join-input"
          placeholder="Your name (max 20 chars)…"
          value={name}
          onChange={e => setName(e.target.value.slice(0, 20))}
          onKeyDown={e => e.key === "Enter" && handleJoin()}
          maxLength={20}
          autoFocus
        />
        {name.trim().length > 0 && (
          <div className="join-q1-section">
            <div className="join-q1-label">Optional · Q1</div>
            <div className="join-q1-prompt">Describe the sprint using an emoji or gif</div>
            <Q1Picker value={q1Val} onChange={setQ1Val} />
          </div>
        )}
        <div style={{ marginTop: 20 }}>
          <button className="join-btn" disabled={!name.trim()} onClick={handleJoin}>
            Join Session →
          </button>
        </div>
        {joined.length > 0 && (
          <div className="join-presence">
            <div className="join-presence-label">Already joined</div>
            <div className="join-avatars">
              {joined.map((p, i) => (
                <div key={i} className="join-avatar">
                  <div className="join-avatar-dot" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{p[0]}</div>
                  <span className="join-avatar-name">{p}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── App Shell ─────────────────────────────────────────────────────────────────

export default function App() {
  const [view, setView] = useState("submit");
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState(loadSettings);
  const [currentUser, setCurrentUser] = useState(() => {
    try { return localStorage.getItem("retrokit-name") || null; } catch { return null; }
  });
  const [joined, setJoined] = useState(() => {
    try { return JSON.parse(localStorage.getItem("retrokit-joined") || "[]"); } catch { return []; }
  });

  const [joinQ1, setJoinQ1] = useState("");
  const [currentVibe, setCurrentVibe] = useState("");

  const handleJoin = (name, q1Val) => {
    try { localStorage.setItem("retrokit-name", name); } catch {}
    const updatedJoined = joined.includes(name) ? joined : [...joined, name];
    try { localStorage.setItem("retrokit-joined", JSON.stringify(updatedJoined)); } catch {}
    setJoined(updatedJoined);
    setCurrentUser(name);
    if (q1Val) { setJoinQ1(q1Val); setCurrentVibe(q1Val); }
  };

  const sprintNumber = settings.sprintNumber;
  const setSprintNumber = (fn) => setSettings(s => {
    const next = { ...s, sprintNumber: typeof fn === "function" ? fn(s.sprintNumber) : fn };
    saveSettings(next);
    return next;
  });

  const handleSaveSettings = (newSettings) => {
    saveSettings(newSettings);
    setSettings(newSettings);
  };

  const cutoff = settings.cutoffDate && settings.cutoffTime
    ? new Date(`${settings.cutoffDate}T${settings.cutoffTime}`)
    : DEMO_CUTOFF;

  // Override QUESTIONS to use settings q3Variant and members
  const settingsQ3 = Q3_VARIANTS[settings.q3Variant] || Q3_VARIANTS[0];
  const questionsWithSettings = (sprintNum) => [
    { id: "q1", label: "Q1", prompt: "Describe the sprint using an emoji or gif", type: "emoji", color: "#FFD93D" },
    { id: "q2", label: "Q2", prompt: "What were our standout achievements this sprint?", type: "text", color: "#6BCB77" },
    { id: "q3", label: "Q3", prompt: settingsQ3, type: "text", color: "#FF6B6B" },
    { id: "q4", label: "Q4", prompt: "Anything else? Is there anyone you'd like to give a shout-out to?", type: "text", color: "#4D96FF" },
  ];

  if (!currentUser) {
    return (
      <>
        <style>{css}</style>
        <JoinScreen
          sprintNumber={settings.sprintNumber}
          onJoin={handleJoin}
          joined={joined}
          sprintDate={settings.cutoffDate ? new Date(settings.cutoffDate + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" }) : ""}
        />
      </>
    );
  }

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <nav className="nav">
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div className="nav-brand"><span className="nav-brand-dot" />RetroKit</div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "var(--bg-raised)", borderRadius: 20, padding: "4px 12px 4px 4px", border: "1px solid var(--border)" }}>
              <div style={{ width: 22, height: 22, borderRadius: "50%", background: "var(--or-red)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>{currentUser[0]}</div>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text)" }}>{currentUser}</span>
              <button onClick={() => { try { localStorage.removeItem("retrokit-name"); } catch {} setCurrentUser(null); }} style={{ background: "none", border: "none", color: "var(--text-dim)", cursor: "pointer", fontSize: 13, padding: 0, marginLeft: 2 }} title="Leave session">✕</button>
            </div>
            <div className="sprint-selector">
              <button onClick={() => setSprintNumber(n => Math.max(1, n - 1))}>−</button>
              <span>Sprint {sprintNumber}{settings.cutoffDate ? ` · ${new Date(settings.cutoffDate + "T12:00:00").toLocaleDateString("en-US", { month: "numeric", day: "numeric", year: "2-digit" })}` : ""}</span>
              <button onClick={() => setSprintNumber(n => n + 1)}>+</button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="nav-tabs">
              {[["submit", "📝 Submit"], ["board", "🗂 Board"], ["history", "📚 History"]].map(([v, label]) => (
                <button key={v} className={`nav-tab ${view === v ? "active" : ""}`} onClick={() => {
                  try { window.history.replaceState({}, "", window.location.href.split("?")[0]); } catch {}
                  setView(v);
                }}>{label}</button>
              ))}
            </div>
            <button className="settings-gear" onClick={() => setShowSettings(true)} title="Settings">⚙️</button>
          </div>
        </nav>
        <CountdownBar cutoff={cutoff} />
        {typeof window !== "undefined" && (window.__retroCutoff = cutoff) && null}

        {view === "submit" && <SubmitView sprintNumber={sprintNumber} questions={questionsWithSettings(sprintNumber)} currentUser={currentUser} cutoff={cutoff} joinQ1={joinQ1} />}
        {view === "board" && <BoardView sprintNumber={sprintNumber} members={joined} questions={questionsWithSettings(sprintNumber)} currentUser={currentUser} currentVibe={currentVibe || ""} />}
        {view === "history" && <HistoryView onLoadSprint={(n) => { setSprintNumber(n); setView("board"); }} />}

        {showSettings && (
          <SettingsModal
            settings={settings}
            onSave={handleSaveSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    </>
  );
}
