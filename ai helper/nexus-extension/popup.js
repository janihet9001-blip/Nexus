// popup.js — NEXUS AI v2.0
// Handles: command execution, voice input, Groq AI Q&A, history, settings

const MAX_HISTORY = 12;
let recognition = null;
let isListening  = false;

// ── DOM refs ──────────────────────────────────────────────────────────────────
const cmdIn    = () => document.getElementById('cmdIn');
const aiIn     = () => document.getElementById('aiIn');
const msgEl    = () => document.getElementById('msg');
const msgAiEl  = () => document.getElementById('msgAi');
const spinEl   = () => document.getElementById('spin');
const spinAiEl = () => document.getElementById('spinAi');
const voiceBar = () => document.getElementById('voiceBar');
const aiInfo   = () => document.getElementById('aiInfo');

// ── Tab switching ─────────────────────────────────────────────────────────────
function showTab(name) {
  ['cmd','ai','set'].forEach(id => {
    document.getElementById('pg-'  + id).classList.toggle('on', id === name);
    document.getElementById('t-'   + id).classList.toggle('on', id === name);
  });
}

// ── Run a command (from input or quick button) ────────────────────────────────
function runCmd() {
  const input = cmdIn().value.trim();
  if (!input) return;
  setMsg('', '');
  aiInfo().classList.remove('on');
  showSpin(true, 'Running command…');
  saveHistory(input);

  chrome.runtime.sendMessage({ type: 'EXECUTE_COMMAND', input }, (res) => {
    showSpin(false);
    if (!res) {
      setMsg('err', '⚠️ Extension error. Try reloading.');
      return;
    }
    // If background wants us to ask Groq
    if (res.action === 'ask_nexus') {
      askGroq(res.query, 'cmd');
      return;
    }
    // If we opened an AI site with a prompt, show the injected prompt
    if (res.command?.action === 'open_ai_with_prompt') {
      const ai    = res.command.aiName;
      const p     = res.command.prompt;
      aiInfo().textContent = `💬 Prompt injected into ${ai.charAt(0).toUpperCase()+ai.slice(1)}:\n"${p}"`;
      aiInfo().classList.add('on');
    }
    setMsg(res.success ? 'ok' : 'err', res.message || '');
    if (res.success) cmdIn().value = '';
  });
}

// ── Set input value and immediately run ───────────────────────────────────────
function setAndRun(cmd) {
  cmdIn().value = cmd;
  runCmd();
}

// ── Run AI question (Groq) ────────────────────────────────────────────────────
function runAI() {
  const query = aiIn().value.trim();
  if (!query) return;
  askGroq(query, 'ai');
  saveHistory('ask: ' + query);
}

function setAI(q) {
  aiIn().value = q;
  runAI();
}

// ── Ask Groq via background ───────────────────────────────────────────────────
function askGroq(query, tab) {
  const sp  = tab === 'ai' ? spinAiEl() : spinEl();
  const msg = tab === 'ai' ? msgAiEl()  : msgEl();

  showSpinEl(sp, true, 'Asking Llama 3.3…');
  setMsgEl(msg, '', '');

  chrome.runtime.sendMessage({ type: 'ASK_GROQ', query }, (res) => {
    showSpinEl(sp, false);
    if (!res) {
      setMsgEl(msg, 'err', '⚠️ No response. Check your API key.');
      return;
    }
    if (res.success) {
      setMsgEl(msg, 'ans', res.answer);
    } else {
      setMsgEl(msg, 'err', res.message || '⚠️ Error.');
    }
  });
}

// ── Voice input ───────────────────────────────────────────────────────────────
function initVoice(inputEl, barEl, micBtnEl) {
  if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
    micBtnEl.title = 'Voice not supported in this browser';
    micBtnEl.style.opacity = '0.3';
    return;
  }

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  const rec = new SR();
  rec.continuous    = false;
  rec.interimResults = true;
  rec.lang          = 'en-IN'; // works for Indian English + Hindi accent

  rec.onstart = () => {
    isListening = true;
    micBtnEl.classList.add('listening');
    barEl.classList.add('on');
  };

  rec.onresult = (e) => {
    let interim = '';
    let final   = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) final += t;
      else interim += t;
    }
    inputEl.value = final || interim;
  };

  rec.onend = () => {
    isListening = false;
    micBtnEl.classList.remove('listening');
    barEl.classList.remove('on');
    // Auto-run if there's a value
    if (inputEl.value.trim()) {
      if (inputEl.id === 'cmdIn') runCmd();
      else if (inputEl.id === 'aiIn') runAI();
    }
  };

  rec.onerror = (e) => {
    isListening = false;
    micBtnEl.classList.remove('listening');
    barEl.classList.remove('on');
    if (e.error !== 'aborted' && e.error !== 'no-speech') {
      if (inputEl.id === 'cmdIn') setMsg('err', `🎤 Voice error: ${e.error}`);
    }
  };

  micBtnEl.addEventListener('click', () => {
    if (isListening) {
      rec.stop();
    } else {
      try { rec.start(); } catch (e) {}
    }
  });
}

// ── History ───────────────────────────────────────────────────────────────────
function saveHistory(cmd) {
  chrome.storage.local.get({ history: [] }, ({ history }) => {
    history = [cmd, ...history.filter(h => h !== cmd)].slice(0, MAX_HISTORY);
    chrome.storage.local.set({ history }, renderHistory);
  });
}

function loadHistory() {
  chrome.storage.local.get({ history: [] }, ({ history }) => renderHistory(history));
}

function renderHistory(histOrData) {
  const list = typeof histOrData === 'object' && histOrData.history
    ? histOrData.history
    : (Array.isArray(histOrData) ? histOrData : []);
  const sec  = document.getElementById('hSec');
  const ul   = document.getElementById('hList');
  if (!list.length) { sec.style.display = 'none'; return; }
  sec.style.display = 'block';
  ul.innerHTML = list.map(h =>
    `<div class="hitem" onclick="setAndRun(${JSON.stringify(h)})">${h}</div>`
  ).join('');
}

function clearHist() {
  chrome.storage.local.set({ history: [] }, () => {
    document.getElementById('hSec').style.display = 'none';
    document.getElementById('hList').innerHTML = '';
  });
}

// ── Settings ──────────────────────────────────────────────────────────────────
function saveKey() {
  const key = document.getElementById('keyInput').value.trim();
  if (!key) return;
  chrome.storage.local.set({ groq_key: key }, () => {
    const el = document.getElementById('keySaved');
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 2500);
  });
}

function loadKey() {
  chrome.storage.local.get('groq_key', ({ groq_key }) => {
    if (groq_key && groq_key !== 'PASTE_YOUR_GROQ_KEY_HERE') {
      document.getElementById('keyInput').value = groq_key;
    }
  });
}

// ── UI helpers ────────────────────────────────────────────────────────────────
function setMsg(type, text) { setMsgEl(msgEl(), type, text); }

function setMsgEl(el, type, text) {
  el.className = 'msg' + (type ? ' ' + type : '');
  el.textContent = text;
}

function showSpin(on, txt) { showSpinEl(spinEl(), on, txt); }

function showSpinEl(el, on, txt) {
  el.classList.toggle('on', on);
  if (txt) el.querySelector('span') && (el.querySelector('span').textContent = txt);
}

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
document.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const active = document.querySelector('.pg.on')?.id;
    if (active === 'pg-cmd') runCmd();
    if (active === 'pg-ai')  runAI();
  }
  if (e.key === 'Escape') {
    cmdIn().value = '';
    aiIn().value  = '';
    setMsg('', '');
  }
});

// ── Init ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadHistory();
  loadKey();
  cmdIn().focus();

  // Voice for command tab
  initVoice(
    cmdIn(),
    voiceBar(),
    document.getElementById('micBtn')
  );

  // Voice for AI tab
  initVoice(
    aiIn(),
    document.getElementById('voiceBarAi'),
    document.getElementById('micBtnAi')
  );
});
