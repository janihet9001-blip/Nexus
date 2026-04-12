// app.js — NEXUS Frontend
// Modes: Q&A (web search + AI) | Chat (full conversation memory)
// PPT: type "make a ppt on cricket" → auto downloads PPT

// ── Theme ─────────────────────────────────────────────
let currentTheme = localStorage.getItem('oracle_theme') || 'dark';

function applyTheme(t) {
  document.documentElement.setAttribute('data-theme', t);
  const btn = document.getElementById('themeBtn');
  if (btn) btn.textContent = t === 'dark' ? '☀️ Light' : '🌙 Dark';
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem('oracle_theme', currentTheme);
  applyTheme(currentTheme);
}

// ── Mode switching ────────────────────────────────────
let currentMode = 'qa';

function switchMode(mode) {
  currentMode = mode;
  document.getElementById('btnQA').classList.toggle('active', mode === 'qa');
  document.getElementById('btnChat').classList.toggle('active', mode === 'chat');

  const dot    = document.querySelector('.mode-dot');
  const label  = document.getElementById('modeLabel');
  const pills  = document.getElementById('sourcePills');
  const banner = document.getElementById('chatBanner');
  const input  = document.getElementById('qInput');

  if (mode === 'chat') {
    dot.className   = 'mode-dot chat-dot';
    label.textContent = 'Chat Mode — Llama 3 remembers your conversation';
    pills.innerHTML = `
      <span class="src-pill active">🦙 Llama 3.3 70B</span>
      <span class="src-pill active">🧠 Memory</span>
      <span class="free-tag">FREE</span>`;
    banner.style.display = 'flex';
    input.placeholder = 'Chat with Llama 3 — it remembers everything you say...';
  } else {
    dot.className   = 'mode-dot qa-dot';
    label.textContent = 'Q&A Mode — searches web + AI answer';
    pills.innerHTML = `
      <span class="src-pill active">🦆 DDG</span>
      <span class="src-pill active">📖 Wikipedia</span>
      <span class="src-pill active">🦙 Llama 3</span>
      <span class="free-tag">FREE</span>`;
    banner.style.display = 'none';
    input.placeholder = 'Ask anything — or click the mic to speak...';
  }
  newChat();
}

// ── Sidebar ───────────────────────────────────────────
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
  document.getElementById('overlay').classList.toggle('show');
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('overlay').classList.remove('show');
}

// ── History ───────────────────────────────────────────
async function loadHistory() {
  try {
    const res     = await fetch('/api/history');
    const history = await res.json();
    renderHistory(history);
  } catch(e) { console.error('History load failed:', e); }
}

function renderHistory(history, filter = '') {
  const list  = document.getElementById('historyList');
  const count = document.getElementById('historyCount');
  count.textContent = history.length + (history.length !== 1 ? ' chats' : ' chat');

  const filtered = filter
    ? history.filter(h => h.question.toLowerCase().includes(filter.toLowerCase()))
    : history;

  if (filtered.length === 0) {
    list.innerHTML = `<div class="history-empty">${
      filter ? 'No results for "' + esc(filter) + '"'
             : 'No history yet.<br>Ask your first question!'
    }</div>`;
    return;
  }

  list.innerHTML = filtered.map(h => `
    <div class="history-item" id="hi-${h.id}" onclick="loadItem(${h.id})">
      <div class="history-q">${esc(h.question)}</div>
      <div class="history-meta">
        <span>${h.time}</span>
        <span style="display:flex;align-items:center;gap:6px">
          <span style="color:var(--accent3)">${h.confidence}%</span>
          ${h.language && h.language !== 'en' ? `<span class="lang-flag">${h.language.toUpperCase()}</span>` : ''}
          <span class="history-del" onclick="delItem(event,${h.id})">✕</span>
        </span>
      </div>
    </div>`).join('');
}

async function loadItem(id) {
  try {
    const res     = await fetch('/api/history');
    const history = await res.json();
    const item    = history.find(h => h.id === id);
    if (!item) return;

    document.getElementById('emptyState')?.remove();
    document.getElementById('messages').innerHTML = '';
    document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
    document.getElementById('hi-' + id)?.classList.add('active');

    const msgs = document.getElementById('messages');
    const uDiv = document.createElement('div');
    uDiv.className   = 'msg-user';
    uDiv.textContent = item.question;
    msgs.appendChild(uDiv);

    const aiDiv = document.createElement('div');
    aiDiv.className = 'msg-ai';
    aiDiv.innerHTML = buildFinalCard(item.question, item.answer, item.confidence, [], []);
    msgs.appendChild(aiDiv);

    closeSidebar();
    aiDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
  } catch(e) { console.error('loadItem error:', e); }
}

async function delItem(e, id) {
  e.stopPropagation();
  await fetch(`/api/history/${id}`, { method: 'DELETE' });
  loadHistory();
  showToast('Deleted from history');
}

async function clearAll() {
  if (!confirm('Clear all history? This cannot be undone.')) return;
  await fetch('/api/history/clear', { method: 'DELETE' });
  loadHistory();
  showToast('History cleared');
}

function filterHistory() {
  const q = document.getElementById('searchInput').value;
  fetch('/api/history').then(r => r.json()).then(h => renderHistory(h, q));
}

function newChat() {
  document.getElementById('messages').innerHTML = emptyStateHTML();
  document.querySelectorAll('.history-item').forEach(el => el.classList.remove('active'));
  chatMessages = [];
  document.getElementById('qInput').focus();
  closeSidebar();
}

function emptyStateHTML() {
  return `<div class="empty" id="emptyState">
    <div class="empty-icon" style="display:none"></div>
    <h3>What would you like to know?</h3>
    <p>
      <strong>Q&A mode</strong> searches the web and verifies answers.<br>
      <strong>Chat mode</strong> gives you a full AI conversation with memory.<br>
      Type <strong>"make a ppt on [topic]"</strong> to build a PowerPoint.<br>
      Paste a <strong>YouTube link</strong> to get a summary + PDF instantly!
    </p>
    <div class="suggestions">
      <div class="sug" onclick="fill('What is quantum entanglement?')">quantum entanglement</div>
      <div class="sug" onclick="fill('How does the immune system work?')">immune system</div>
      <div class="sug" onclick="fill('What is machine learning?')">machine learning</div>
      <div class="sug" onclick="fill('How does Bitcoin work?')">Bitcoin</div>
      <div class="sug" onclick="fill('make a ppt on cricket')">📊 ppt on cricket</div>
      <div class="sug" onclick="fill('make a ppt on climate change')">📊 ppt on climate</div>
      <div class="sug" onclick="fill('https://www.youtube.com/watch?v=dQw4w9WgXcQ')">📺 YouTube summary</div>
    </div>
  </div>`;
}

// ── PPT Detection & Handler ───────────────────────────
function isPPTRequest(text) {
  const t = text.toLowerCase();
  return (
    /make\s+a?\s*ppt/.test(t) ||
    /create\s+a?\s*ppt/.test(t) ||
    /build\s+a?\s*ppt/.test(t) ||
    /generate\s+a?\s*ppt/.test(t) ||
    /make\s+a?\s*presentation/.test(t) ||
    /create\s+a?\s*presentation/.test(t) ||
    /make\s+a?\s*powerpoint/.test(t) ||
    /ppt\s+(on|about|for)\s+/.test(t) ||
    /presentation\s+(on|about|for)\s+/.test(t) ||
    /slides?\s+(on|about|for)\s+/.test(t) ||
    /\b(ppt|presentation|powerpoint)\s*$/.test(t)
  );
}

async function handlePPTRequest(question, msgs) {
  // User bubble
  const uDiv = document.createElement('div');
  uDiv.className = 'msg-user';
  uDiv.textContent = question;
  msgs.appendChild(uDiv);

  // Building card
  const buildId  = 'ppt-' + Date.now();
  const buildDiv = document.createElement('div');
  buildDiv.className = 'msg-ai';
  buildDiv.id = buildId;
  buildDiv.innerHTML = `
    <div class="chat-bubble">
      <div class="chat-bubble-header">
        <span class="chat-who">📊 PPT Builder</span>
      </div>
      <div class="chat-bubble-body" style="display:flex;align-items:center;gap:14px">
        <div class="spinner"></div>
        <div>
          <div style="font-size:13px;color:var(--text);margin-bottom:4px">Building your presentation...</div>
          <div style="font-size:11px;color:var(--muted);font-family:'Fira Code',monospace">Generating slides · Applying design · Creating .pptx file</div>
        </div>
      </div>
    </div>`;
  msgs.appendChild(buildDiv);
  buildDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

  try {
    const res = await fetch('/api/chat-ppt', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ message: question, theme: 'midnight' })
    });

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('presentationml') || (res.ok && !contentType.includes('json'))) {
      // Download PPT file
      const blob     = await res.blob();
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement('a');
      const rawTopic = question.replace(/make\s+a?\s*(ppt|presentation|powerpoint)\s*(on|about|for)?/gi,'').trim();
      const safeName = rawTopic.slice(0,30).replace(/[^a-z0-9]/gi,'-').toLowerCase();
      a.href         = url;
      a.download     = `nexus-${safeName}.pptx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      document.getElementById(buildId)?.remove();

      const successDiv = document.createElement('div');
      successDiv.className = 'msg-ai';
      successDiv.innerHTML = `
        <div class="final-card" style="margin-top:0">
          <div class="final-header">
            <div class="final-header-left">📊 PPT ready — ${esc(rawTopic)}</div>
          </div>
          <div class="final-body">
            ✅ Your PowerPoint on <strong style="color:var(--accent)">${esc(rawTopic)}</strong> has been downloaded!<br><br>
            📂 Open it in <strong>Microsoft PowerPoint</strong> or upload to <strong>Google Slides</strong>.<br><br>
            💡 Want another? Type <em>"make a ppt on [any topic]"</em>
          </div>
        </div>`;
      msgs.appendChild(successDiv);
      successDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
      showToast('✅ PPT downloaded!');

    } else {
      const data = await res.json();
      document.getElementById(buildId)?.remove();
      const errDiv = document.createElement('div');
      errDiv.className = 'msg-ai';
      errDiv.innerHTML = `<div class="err-card">
        <strong>PPT Error:</strong> ${esc(data.error || 'Unknown error')}<br><br>
        Make sure:<br>
        1. Node.js is installed<br>
        2. You ran <code>npm install pptxgenjs</code> in your project folder<br>
        3. <code>generate_ppt.js</code> exists in your project folder
      </div>`;
      msgs.appendChild(errDiv);
    }

  } catch(err) {
    document.getElementById(buildId)?.remove();
    const errDiv = document.createElement('div');
    errDiv.className = 'msg-ai';
    errDiv.innerHTML = `<div class="err-card"><strong>Error:</strong> ${esc(err.message)}</div>`;
    msgs.appendChild(errDiv);
  }
}

// ── YouTube Summariser ────────────────────────────────
function isYouTubeURL(text) {
  const t = text.trim();
  return t.includes('youtube.com') || t.includes('youtu.be') ||
         /^[a-zA-Z0-9_-]{11}$/.test(t);
}

async function handleYouTubeRequest(url, msgs) {
  // User bubble
  const uDiv = document.createElement('div');
  uDiv.className = 'msg-user';
  uDiv.textContent = url;
  msgs.appendChild(uDiv);

  // Building card
  const buildId  = 'yt-' + Date.now();
  const buildDiv = document.createElement('div');
  buildDiv.className = 'msg-ai';
  buildDiv.id = buildId;
  buildDiv.innerHTML = `
    <div class="chat-bubble">
      <div class="chat-bubble-header">
        <span class="chat-who">📺 YouTube Summariser</span>
      </div>
      <div class="chat-bubble-body" style="display:flex;align-items:center;gap:14px">
        <div class="spinner"></div>
        <div>
          <div style="font-size:13px;color:var(--text);margin-bottom:4px">Fetching video transcript...</div>
          <div style="font-size:11px;color:var(--muted);font-family:'Fira Code',monospace">Getting captions · Summarising with AI · Generating PDF</div>
        </div>
      </div>
    </div>`;
  msgs.appendChild(buildDiv);
  buildDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

  try {
    const res  = await fetch('/api/youtube', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ url })
    });
    const data = await res.json();

    document.getElementById(buildId)?.remove();

    if (!res.ok || data.error) {
      throw new Error(data.error || 'Failed to summarise video');
    }

    // Format duration
    const mins = Math.floor(data.duration / 60);
    const secs = Math.floor(data.duration % 60);
    const dur  = data.duration > 0 ? `${mins}m ${secs}s` : '';

    // Show summary card
    const summaryDiv = document.createElement('div');
    summaryDiv.className = 'msg-ai';
    summaryDiv.innerHTML = `
      <div class="final-card" style="margin-top:0">
        <div class="final-header">
          <div class="final-header-left">📺 ${esc(data.title)} ${dur ? '· ' + dur : ''}</div>
          <div class="final-actions">
            <button class="action-btn" onclick="copyAnswer(this, ${JSON.stringify(data.summary)})">📋 Copy</button>
            <button class="action-btn" id="pdf-btn-${buildId}" onclick="downloadYTPDF('${buildId}', ${JSON.stringify(data.pdf_b64)}, ${JSON.stringify(data.title)})">📄 Download PDF</button>
          </div>
        </div>
        <div style="padding:10px 18px;background:rgba(34,211,238,0.04);border-bottom:1px solid var(--border)">
          <span style="font-family:'Fira Code',monospace;font-size:10px;color:var(--muted)">
            📺 ${esc(data.author)} &nbsp;·&nbsp; 📝 ${data.word_count} words in transcript &nbsp;·&nbsp;
            <a href="${esc(data.video_url)}" target="_blank" style="color:var(--accent)">Watch video →</a>
          </span>
        </div>
        <div class="final-body" style="white-space:pre-wrap">${esc(data.summary)}</div>
      </div>`;
    msgs.appendChild(summaryDiv);
    summaryDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

    showToast('✅ YouTube summary ready!');
    loadHistory();

  } catch(err) {
    document.getElementById(buildId)?.remove();
    const errDiv = document.createElement('div');
    errDiv.className = 'msg-ai';
    errDiv.innerHTML = `<div class="err-card">
      <strong>YouTube Error:</strong> ${esc(err.message)}<br><br>
      Common reasons:<br>
      • Video has no captions / subtitles enabled<br>
      • Private or age-restricted video<br>
      • Run: <code>pip install youtube-transcript-api</code>
    </div>`;
    msgs.appendChild(errDiv);
  }
}

function downloadYTPDF(id, pdfB64, title) {
  try {
    const byteChars = atob(pdfB64);
    const byteArr   = new Uint8Array(byteChars.length);
    for (let i = 0; i < byteChars.length; i++) byteArr[i] = byteChars.charCodeAt(i);
    const blob    = new Blob([byteArr], { type: 'application/pdf' });
    const url     = URL.createObjectURL(blob);
    const a       = document.createElement('a');
    const safeName = title.slice(0,40).replace(/[^a-z0-9]/gi, '-').toLowerCase();
    a.href     = url;
    a.download = `nexus-yt-${safeName}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch(e) {
    showToast('❌ PDF download failed: ' + e.message);
  }
}

// ── Voice Input ───────────────────────────────────────
let recognition = null;
let isListening = false;

function initVoice() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { showToast('⚠️ Voice not supported. Use Chrome.'); return false; }

  recognition = new SR();
  recognition.continuous     = false;
  recognition.interimResults = true;

  const langMap = {
    'en':'en-US','hi':'hi-IN','es':'es-ES','fr':'fr-FR','ar':'ar-SA',
    'de':'de-DE','zh':'zh-CN','ja':'ja-JP','pt':'pt-BR','ru':'ru-RU'
  };
  const code = document.getElementById('langSelect')?.value || 'en';
  recognition.lang = langMap[code] || 'en-US';

  recognition.onstart  = () => {
    isListening = true;
    const btn = document.getElementById('voiceBtn');
    if (btn) { btn.textContent = '🔴 Stop'; btn.classList.add('listening'); }
    showToast('🎤 Listening... speak now!');
  };

  recognition.onresult = (e) => {
    let t = '';
    for (let i = e.resultIndex; i < e.results.length; i++) t += e.results[i][0].transcript;
    document.getElementById('qInput').value = t;
  };

  recognition.onerror  = (e) => {
    stopVoice();
    showToast(e.error === 'not-allowed' ? '❌ Mic blocked' : '❌ Voice error: ' + e.error);
  };

  recognition.onend = () => {
    stopVoice();
    const q = document.getElementById('qInput').value.trim();
    if (q) { showToast('✓ Got it! Sending...'); setTimeout(handleAsk, 600); }
  };

  return true;
}

function toggleVoice() {
  if (isListening) { stopVoice(); return; }
  if (!recognition && !initVoice()) return;
  try { recognition.start(); }
  catch(e) { recognition = null; if (initVoice()) recognition.start(); }
}

function stopVoice() {
  isListening = false;
  const btn = document.getElementById('voiceBtn');
  if (btn) { btn.textContent = '🎤'; btn.classList.remove('listening'); }
  if (recognition) { try { recognition.stop(); } catch(e) {} }
}

// ── PDF Export ────────────────────────────────────────
async function exportPDF(question, answer, confidence, sourcesJson) {
  let sources = [];
  try { sources = typeof sourcesJson === 'string' ? JSON.parse(sourcesJson) : sourcesJson; }
  catch(e) { sources = []; }

  showToast('📄 Generating PDF...');
  try {
    const res = await fetch('/api/export-pdf', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ question, answer, confidence, sources })
    });
    const ct = res.headers.get('content-type') || '';
    if (!res.ok || ct.includes('application/json')) {
      const err = await res.json();
      throw new Error(err.error || 'PDF failed');
    }
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'nexus-answer.pdf';
    document.body.appendChild(a); a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast('✅ PDF downloaded!');
  } catch(e) { showToast('❌ ' + e.message); }
}

// ── Copy & Share ──────────────────────────────────────
function copyAnswer(btn, text) {
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.textContent;
    btn.textContent = '✓ Copied!'; btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
    showToast('Copied to clipboard!');
  });
}

function shareAnswer(question, answer) {
  const text = `❓ Question:\n${question}\n\n💡 Answer (via NEXUS):\n${answer}\n\n─────\nPowered by NEXUS AI`;
  document.getElementById('shareText').value = text;
  document.getElementById('shareModal').classList.add('show');
}

function closeShare() { document.getElementById('shareModal').classList.remove('show'); }

function copyShareText() {
  navigator.clipboard.writeText(document.getElementById('shareText').value).then(() => {
    showToast('Copied! Ready to share 🎉'); closeShare();
  });
}

// ── Toast ─────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg; t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Stage UI ──────────────────────────────────────────
let currentSessId = '';

function addStage(id, num, title) {
  const p = document.getElementById('pipeline-' + currentSessId);
  if (!p) return;
  const d = document.createElement('div');
  d.className = 'stage'; d.id = 'stage-' + id;
  d.innerHTML = `
    <div class="stage-header" id="sh-${id}" onclick="toggleStage('${id}')">
      <div class="stage-num" id="sn-${id}">${num}</div>
      <div class="stage-title">${title}</div>
      <div class="stage-status"><div class="spinner"></div> working...</div>
      <div class="toggle" id="tog-${id}">▼</div>
    </div>
    <div class="stage-body" id="sb-${id}"></div>`;
  p.appendChild(d);
  d.scrollIntoView({ behavior: 'smooth', block: 'end' });
}

function setStageBody(id, html, open) {
  const b = document.getElementById('sb-' + id);
  if (!b) return;
  b.innerHTML = html;
  if (open) {
    b.classList.add('open');
    document.getElementById('sh-' + id)?.classList.add('open');
    document.getElementById('tog-' + id)?.classList.add('open');
  }
}

function setStatus(id, text, done) {
  const stage = document.getElementById('stage-' + id);
  if (!stage) return;
  const s = stage.querySelector('.stage-status');
  const n = document.getElementById('sn-' + id);
  if (s) s.innerHTML = done
    ? `<span style="color:var(--accent3)">✓</span> ${text}`
    : `<div class="spinner"></div> ${text}`;
  if (done && n) { n.className = 'stage-num done'; n.textContent = '✓'; }
}

function toggleStage(id) {
  document.getElementById('sb-'  + id)?.classList.toggle('open');
  document.getElementById('tog-' + id)?.classList.toggle('open');
  document.getElementById('sh-'  + id)?.classList.toggle('open');
}

// ── Build Q&A final card ──────────────────────────────
function buildFinalCard(question, answer, confidence, wikiArticles, followups) {
  const sourcesEncoded = encodeURIComponent(JSON.stringify(wikiArticles || []));

  let sources = '';
  if (wikiArticles && wikiArticles.length) {
    sources = `<div class="final-sources">📖 Sources: ${
      wikiArticles.map(a => `<a href="${a.url}" target="_blank">${esc(a.title)}</a>`).join('')
    }</div>`;
  }

  let followupHTML = '';
  if (followups && followups.length) {
    followupHTML = `
      <div class="followups">
        <div class="followup-label">💬 Follow-up questions</div>
        <div class="followup-list">
          ${followups.map(f => `<div class="followup-item" onclick="fill('${esc(f)}')">${esc(f)}</div>`).join('')}
        </div>
      </div>`;
  }

  return `
    <div class="final-card">
      <div class="final-header">
        <div class="final-header-left">⚡ verified · ${confidence}% · llama 3.3 70b</div>
        <div class="final-actions">
          <button class="action-btn" onclick="copyAnswer(this, ${JSON.stringify(answer)})">📋 Copy</button>
          <button class="action-btn" onclick="shareAnswer(${JSON.stringify(question)}, ${JSON.stringify(answer)})">📤 Share</button>
          <button class="action-btn" onclick="exportPDF(${JSON.stringify(question)}, ${JSON.stringify(answer)}, ${confidence}, decodeURIComponent('${sourcesEncoded}'))">📄 PDF</button>
        </div>
      </div>
      <div class="final-body">${esc(answer)}</div>
      ${sources}
      ${followupHTML}
    </div>`;
}

// ── Chat bubble ───────────────────────────────────────
function buildChatBubble(role, content) {
  if (role === 'user') {
    return `<div class="msg-user">${esc(content)}</div>`;
  }
  return `
    <div class="msg-ai">
      <div class="chat-bubble">
        <div class="chat-bubble-header">
          <span class="chat-who">🔭 NEXUS</span>
          <button class="action-btn" style="font-size:10px;padding:2px 8px"
            onclick="copyAnswer(this, ${JSON.stringify(content)})">📋 Copy</button>
        </div>
        <div class="chat-bubble-body">${esc(content)}</div>
      </div>
    </div>`;
}

// ── Helpers ───────────────────────────────────────────
function fill(t) {
  const inp = document.getElementById('qInput');
  inp.value = t; inp.focus();
  inp.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function handleKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleAsk(); }
}

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function handleAsk() {
  if (currentMode === 'chat') runChatPipeline();
  else runQAPipeline();
}

// ────────────────────────────────────────────────────────
// ── Q&A Pipeline
// ────────────────────────────────────────────────────────
let busyQA = false;

async function runQAPipeline() {
  if (busyQA) return;
  const q = document.getElementById('qInput').value.trim();
  if (!q) return;

  // ── PPT check ──
  if (isPPTRequest(q)) {
    busyQA = true;
    document.getElementById('askBtn').disabled = true;
    document.getElementById('qInput').value = '';
    document.getElementById('emptyState')?.remove();
    await handlePPTRequest(q, document.getElementById('messages'));
    busyQA = false;
    document.getElementById('askBtn').disabled = false;
    return;
  }

  // ── YouTube check ──
  if (isYouTubeURL(q)) {
    busyQA = true;
    document.getElementById('askBtn').disabled = true;
    document.getElementById('qInput').value = '';
    document.getElementById('emptyState')?.remove();
    await handleYouTubeRequest(q, document.getElementById('messages'));
    busyQA = false;
    document.getElementById('askBtn').disabled = false;
    return;
  }

  const langSelect = document.getElementById('langSelect');
  const language   = langSelect ? langSelect.value : 'en';
  const langName   = langSelect ? langSelect.options[langSelect.selectedIndex].text : 'English';

  busyQA = true;
  document.getElementById('askBtn').disabled = true;
  document.getElementById('qInput').value = '';
  document.getElementById('emptyState')?.remove();

  const msgs = document.getElementById('messages');

  const uDiv = document.createElement('div');
  uDiv.className = 'msg-user';
  uDiv.innerHTML = esc(q) + (language !== 'en' ? ` <span class="lang-flag">${language.toUpperCase()}</span>` : '');
  msgs.appendChild(uDiv);

  const aiDiv = document.createElement('div');
  aiDiv.className = 'msg-ai';
  const sessId = 'sess' + Date.now();
  currentSessId = sessId;
  aiDiv.innerHTML = `<div class="pipeline" id="pipeline-${sessId}"></div>`;
  msgs.appendChild(aiDiv);

  addStage('ddg'  + sessId, '1', '🦆 DuckDuckGo — live web search');
  addStage('wiki' + sessId, '2', '📖 Wikipedia — knowledge search');
  addStage('gen'  + sessId, '3', `🦙 Llama 3.3 70B — answer in ${langName}`);
  addStage('ver'  + sessId, '4', '✅ Fact checking');

  try {
    const res  = await fetch('/api/ask', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ question: q, language })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Server error');

    const { ddg_results, wiki_articles, answer, verification, followups, language_name } = data;

    // Stage 1
    if (ddg_results && ddg_results.length) {
      let html = '<div class="src-list">';
      ddg_results.slice(0,4).forEach(r => {
        html += `<div class="src-item"><span class="src-badge ddg">DDG</span><span class="src-text">${esc(r.text.slice(0,220))}</span></div>`;
      });
      html += '</div>';
      setStageBody('ddg' + sessId, html, false);
      setStatus('ddg' + sessId, `${ddg_results.length} results`, true);
    } else {
      setStageBody('ddg' + sessId, '<span style="color:var(--muted)">No instant answers.</span>', false);
      setStatus('ddg' + sessId, 'no results', true);
    }

    // Stage 2
    if (wiki_articles && wiki_articles.length) {
      let html = '<div class="src-list">';
      wiki_articles.forEach(a => {
        html += `<div class="src-item"><span class="src-badge wiki">WIKI</span><span class="src-text">
          <strong style="color:var(--accent2);display:block;margin-bottom:3px">${esc(a.title)}</strong>
          ${esc(a.text.slice(0,260))}…
          <a href="${a.url}" target="_blank" style="color:var(--accent);font-size:10px;display:block;margin-top:4px">Read full →</a>
        </span></div>`;
      });
      html += '</div>';
      setStageBody('wiki' + sessId, html, true);
      setStatus('wiki' + sessId, `${wiki_articles.length} article(s)`, true);
    } else {
      setStageBody('wiki' + sessId, '<span style="color:var(--muted)">No Wikipedia articles found.</span>', false);
      setStatus('wiki' + sessId, 'no articles', true);
    }

    // Stage 3
    setStageBody('gen' + sessId, `<div style="font-size:12px;color:var(--muted);line-height:1.6">${esc(answer.slice(0,200))}…</div>`, false);
    setStatus('gen' + sessId, `ready in ${language_name || langName}`, true);

    // Stage 4
    const { confidence=75, status='confirmed', note='', correction=null } = verification || {};
    const badgeCls   = status==='confirmed'?'ok': status==='corrected'?'fix':'warn';
    const badgeLabel = status==='confirmed'?'✓ confirmed': status==='corrected'?'⚠ corrected':'~ uncertain';
    let vhtml = `<div class="badge-row"><span class="badge ${badgeCls}">${badgeLabel}</span></div>`;
    vhtml += `<div class="conf-row"><span class="conf-label">confidence</span><div class="conf-track"><div class="conf-fill" style="width:${confidence}%"></div></div><span class="conf-val">${confidence}%</span></div>`;
    if (note)       vhtml += `<div style="margin-top:8px;font-size:12px;color:var(--muted)">${esc(note)}</div>`;
    if (correction) vhtml += `<div style="margin-top:6px;font-size:12px;color:#f87171">${esc(correction)}</div>`;
    setStageBody('ver' + sessId, vhtml, false);
    setStatus('ver' + sessId, `${confidence}% confidence`, true);

    const pipeline = document.getElementById('pipeline-' + sessId);
    const finalDiv = document.createElement('div');
    finalDiv.style.marginTop = '8px';
    finalDiv.innerHTML = buildFinalCard(q, answer, confidence, wiki_articles||[], followups||[]);
    pipeline.appendChild(finalDiv);
    finalDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });
    loadHistory();

  } catch(err) {
    const pipeline = document.getElementById('pipeline-' + sessId);
    const errDiv = document.createElement('div');
    errDiv.className = 'err-card';
    errDiv.innerHTML = `<strong>Error:</strong> ${esc(err.message)}`;
    pipeline?.appendChild(errDiv);
  }

  busyQA = false;
  document.getElementById('askBtn').disabled = false;
}

// ────────────────────────────────────────────────────────
// ── Chat Pipeline
// ────────────────────────────────────────────────────────
let busyChat     = false;
let chatMessages = [];

function clearChatHistory() {
  chatMessages = [];
  newChat();
  showToast('💬 New conversation started');
}

async function runChatPipeline() {
  if (busyChat) return;
  const q = document.getElementById('qInput').value.trim();
  if (!q) return;

  // ── PPT check ──
  if (isPPTRequest(q)) {
    busyChat = true;
    document.getElementById('askBtn').disabled = true;
    document.getElementById('qInput').value = '';
    document.getElementById('emptyState')?.remove();
    await handlePPTRequest(q, document.getElementById('messages'));
    busyChat = false;
    document.getElementById('askBtn').disabled = false;
    document.getElementById('qInput').focus();
    return;
  }

  // ── YouTube check ──
  if (isYouTubeURL(q)) {
    busyChat = true;
    document.getElementById('askBtn').disabled = true;
    document.getElementById('qInput').value = '';
    document.getElementById('emptyState')?.remove();
    await handleYouTubeRequest(q, document.getElementById('messages'));
    busyChat = false;
    document.getElementById('askBtn').disabled = false;
    document.getElementById('qInput').focus();
    return;
  }

  const langSelect = document.getElementById('langSelect');
  const language   = langSelect ? langSelect.value : 'en';

  busyChat = true;
  document.getElementById('askBtn').disabled = true;
  document.getElementById('qInput').value = '';
  document.getElementById('emptyState')?.remove();

  const msgs = document.getElementById('messages');

  const uDiv = document.createElement('div');
  uDiv.innerHTML = buildChatBubble('user', q);
  msgs.appendChild(uDiv.firstElementChild);

  chatMessages.push({ role: 'user', content: q });

  const typingDiv = document.createElement('div');
  typingDiv.className = 'msg-ai';
  typingDiv.id = 'typing-indicator';
  typingDiv.innerHTML = `
    <div class="chat-bubble">
      <div class="chat-bubble-header"><span class="chat-who">🔭 NEXUS</span></div>
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`;
  msgs.appendChild(typingDiv);
  typingDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

  try {
    const res  = await fetch('/api/chat', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ messages: chatMessages, language })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Chat error');

    const { reply, title } = data;
    document.getElementById('typing-indicator')?.remove();

    const replyDiv = document.createElement('div');
    replyDiv.innerHTML = buildChatBubble('assistant', reply);
    msgs.appendChild(replyDiv.firstElementChild);

    chatMessages.push({ role: 'assistant', content: reply });
    if (title && chatMessages.length <= 2) document.title = `NEXUS — ${title}`;
    replyDiv.scrollIntoView({ behavior: 'smooth', block: 'end' });

  } catch(err) {
    document.getElementById('typing-indicator')?.remove();
    const errDiv = document.createElement('div');
    errDiv.className = 'msg-ai';
    errDiv.innerHTML = `<div class="err-card"><strong>Error:</strong> ${esc(err.message)}</div>`;
    msgs.appendChild(errDiv);
    chatMessages.pop();
  }

  busyChat = false;
  document.getElementById('askBtn').disabled = false;
  document.getElementById('qInput').focus();
}

// ── Boot ──────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  applyTheme(currentTheme);
  loadHistory();

  const langSelect = document.getElementById('langSelect');
  if (langSelect) {
    langSelect.addEventListener('change', function() {
      const badge = document.getElementById('langBadge');
      if (badge) badge.textContent = this.value.toUpperCase();
      recognition = null;
    });
  }
});
