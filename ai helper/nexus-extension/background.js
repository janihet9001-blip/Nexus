// background.js — NEXUS AI v2.0
// Fixed: YouTube auto-play first result + volume + brightness via scripting.executeScript

// ── Site registry ─────────────────────────────────────────────────────────────
const SITES = {
  'claude':        'https://claude.ai/new',
  'chatgpt':       'https://chat.openai.com',
  'gemini':        'https://gemini.google.com',
  'perplexity':    'https://www.perplexity.ai',
  'copilot':       'https://copilot.microsoft.com',
  'youtube':       'https://www.youtube.com',
  'yt':            'https://www.youtube.com',
  'google':        'https://www.google.com',
  'gmail':         'https://mail.google.com',
  'facebook':      'https://www.facebook.com',
  'fb':            'https://www.facebook.com',
  'instagram':     'https://www.instagram.com',
  'twitter':       'https://www.twitter.com',
  'whatsapp':      'https://web.whatsapp.com',
  'reddit':        'https://www.reddit.com',
  'linkedin':      'https://www.linkedin.com',
  'discord':       'https://discord.com/app',
  'telegram':      'https://web.telegram.org',
  'github':        'https://www.github.com',
  'stackoverflow': 'https://stackoverflow.com',
  'codepen':       'https://codepen.io',
  'replit':        'https://replit.com',
  'vercel':        'https://vercel.com',
  'netlify':       'https://netlify.com',
  'supabase':      'https://supabase.com',
  'figma':         'https://figma.com',
  'udemy':         'https://www.udemy.com',
  'coursera':      'https://www.coursera.org',
  'wikipedia':     'https://www.wikipedia.org',
  'notion':        'https://www.notion.so',
  'drive':         'https://drive.google.com',
  'docs':          'https://docs.google.com',
  'sheets':        'https://sheets.google.com',
  'calendar':      'https://calendar.google.com',
  'maps':          'https://maps.google.com',
  'translate':     'https://translate.google.com',
  'news':          'https://news.google.com',
  'bbc':           'https://www.bbc.com',
  'amazon':        'https://www.amazon.in',
  'flipkart':      'https://www.flipkart.com',
  'spotify':       'https://open.spotify.com',
  'nexus':         'http://localhost:5000',
};

const AI_SITES = {
  'claude':     { url: 'https://claude.ai/new',        selector: 'div[contenteditable="true"]', type: 'contenteditable' },
  'chatgpt':    { url: 'https://chat.openai.com',       selector: '#prompt-textarea',            type: 'textarea' },
  'gemini':     { url: 'https://gemini.google.com',     selector: 'div[contenteditable="true"]', type: 'contenteditable' },
  'perplexity': { url: 'https://www.perplexity.ai',     selector: 'textarea',                    type: 'textarea' },
  'copilot':    { url: 'https://copilot.microsoft.com', selector: 'textarea',                    type: 'textarea' },
};

// ── Command parser ────────────────────────────────────────────────────────────
function parseCommand(input) {
  const raw = input.trim();
  const t   = raw.toLowerCase();

  if (t.startsWith('http') || t.startsWith('www.')) {
    return { action: 'open_url', url: t.startsWith('www.') ? 'https://' + raw : raw };
  }

  // Open AI site with prompt
  const aiM = raw.match(/^(?:open\s+)?(claude|chatgpt|gemini|perplexity|copilot)\s+(?:and\s+)?(?:ask|say|type|tell|write|send|with|:)?\s*(.+)/i);
  if (aiM) {
    const aiName = aiM[1].toLowerCase();
    const prompt = aiM[2].trim();
    if (AI_SITES[aiName] && prompt) return { action: 'open_ai_with_prompt', aiName, prompt, ...AI_SITES[aiName] };
  }

  // YouTube play
  const ytM = raw.match(/^(?:open\s+youtube\s+(?:and\s+)?)?(?:play|watch|yt\s+|youtube\s+)(.+)/i);
  if (ytM) {
    let query      = ytM[1].trim();
    let volume     = null;
    let brightness = null;

    const vM = query.match(/(\d+)\s*(?:volume|vol\b)|(?:volume|vol)\s*(?:to\s*)?(\d+)/i);
    if (vM) { volume = Math.min(100, Math.max(0, parseInt(vM[1] || vM[2]))); query = query.replace(vM[0], '').trim(); }

    const bM = query.match(/(\d+)\s*(?:brightness|bright\b)|(?:brightness|bright)\s*(?:to\s*)?(\d+)/i);
    if (bM) { brightness = Math.min(100, Math.max(0, parseInt(bM[1] || bM[2]))); query = query.replace(bM[0], '').trim(); }

    query = query.replace(/\s*on\s+youtube\s*$/i,'').replace(/\band\b/gi,'').replace(/\bat\b\s*$/i,'').replace(/\s{2,}/g,' ').trim();
    return { action: 'youtube_play', query, volume, brightness };
  }

  const setVol = raw.match(/^(?:set\s+)?(?:volume|vol)\s+(?:to\s+)?(\d+)/i);
  if (setVol) return { action: 'set_volume', volume: Math.min(100, parseInt(setVol[1])) };

  const setBri = raw.match(/^(?:set\s+)?brightness\s+(?:to\s+)?(\d+)/i);
  if (setBri) return { action: 'set_brightness', brightness: Math.min(100, parseInt(setBri[1])) };

  const openM = raw.match(/^(?:open|go to|take me to|launch|visit)\s+(.+)/i);
  if (openM) {
    const key = openM[1].trim().toLowerCase().replace(/\s+/g,'');
    if (SITES[key]) return { action: 'open_url', url: SITES[key], siteName: openM[1].trim() };
    if (key.includes('.')) return { action: 'open_url', url: `https://${key}` };
    return { action: 'google_search', query: openM[1].trim() };
  }

  if (/^close(\s+tab)?$/i.test(t))     return { action: 'close_tab' };
  if (/^new\s+tab$/i.test(t))          return { action: 'new_tab' };
  if (/^(go\s+)?back$/i.test(t))       return { action: 'go_back' };
  if (/^(reload|refresh)$/i.test(t))   return { action: 'reload' };
  if (/^scroll\s+down$/i.test(t))      return { action: 'scroll', dir: 'down' };
  if (/^scroll\s+up$/i.test(t))        return { action: 'scroll', dir: 'up' };
  if (/^scroll\s+top$/i.test(t))       return { action: 'scroll', dir: 'top' };
  if (/^close\s+all\s+tabs$/i.test(t)) return { action: 'close_all_tabs' };
  if (/^mute(\s+tab)?$/i.test(t))      return { action: 'mute_tab' };
  if (/^unmute(\s+tab)?$/i.test(t))    return { action: 'unmute_tab' };

  const searchM = raw.match(/^(?:search|google|find|look up)\s+(?:for\s+)?(.+)/i);
  if (searchM) return { action: 'google_search', query: searchM[1].trim() };

  const directSite = SITES[t.replace(/\s+/g,'')];
  if (directSite) return { action: 'open_url', url: directSite, siteName: t };

  return { action: 'ask_nexus', query: raw };
}

// ── Execute command ───────────────────────────────────────────────────────────
async function executeCommand(command) {
  switch (command.action) {

    case 'open_url':
      await chrome.tabs.create({ url: command.url });
      return { success: true, message: `Opened ${command.siteName || command.url}` };

    case 'open_ai_with_prompt': {
      const tab = await chrome.tabs.create({ url: command.url });
      const ok  = await waitThenInjectPrompt(tab.id, command.selector, command.type, command.prompt);
      return { success: true, message: ok ? `Opened ${command.aiName} — prompt typed in` : `Opened ${command.aiName} — copy your prompt: "${command.prompt}"` };
    }

    case 'youtube_play': {
      const { query, volume, brightness } = command;

      // Fetch first video ID from YouTube search HTML
      let watchUrl = null;
      try {
        const r    = await fetch(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
        const html = await r.text();
        const m    = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
        if (m) watchUrl = `https://www.youtube.com/watch?v=${m[1]}&autoplay=1`;
      } catch (e) {}

      if (!watchUrl) watchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;

      const tab = await chrome.tabs.create({ url: watchUrl });

      if (volume !== null || brightness !== null) {
        await applyOnYouTubeReady(tab.id, volume, brightness);
      }

      let msg = `Playing "${query}" on YouTube`;
      if (volume !== null)     msg += ` · Volume ${volume}%`;
      if (brightness !== null) msg += ` · Brightness ${brightness}%`;
      return { success: true, message: msg };
    }

    case 'set_volume': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await injectVolume(tab.id, command.volume);
      return { success: true, message: `Volume set to ${command.volume}%` };
    }
    case 'set_brightness': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await injectBrightness(tab.id, command.brightness);
      return { success: true, message: `Brightness set to ${command.brightness}%` };
    }
    case 'google_search': {
      await chrome.tabs.create({ url: `https://www.google.com/search?q=${encodeURIComponent(command.query)}` });
      return { success: true, message: `Searching for "${command.query}"` };
    }
    case 'close_tab': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await chrome.tabs.remove(tab.id);
      return { success: true, message: 'Tab closed' };
    }
    case 'close_all_tabs': {
      const tabs = await chrome.tabs.query({ currentWindow: true });
      await chrome.tabs.remove(tabs.map(t => t.id));
      await chrome.tabs.create({});
      return { success: true, message: 'All tabs closed' };
    }
    case 'new_tab':
      await chrome.tabs.create({});
      return { success: true, message: 'New tab opened' };
    case 'go_back': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await chrome.scripting.executeScript({ target: { tabId: tab.id }, func: () => history.back() });
      return { success: true, message: 'Went back' };
    }
    case 'reload': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await chrome.tabs.reload(tab.id);
      return { success: true, message: 'Page reloaded' };
    }
    case 'scroll': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (d) => { if(d==='down') window.scrollBy({top:500,behavior:'smooth'}); else if(d==='up') window.scrollBy({top:-500,behavior:'smooth'}); else window.scrollTo({top:0,behavior:'smooth'}); },
        args: [command.dir]
      });
      return { success: true, message: `Scrolled ${command.dir}` };
    }
    case 'mute_tab': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await chrome.tabs.update(tab.id, { muted: true });
      return { success: true, message: 'Tab muted' };
    }
    case 'unmute_tab': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await chrome.tabs.update(tab.id, { muted: false });
      return { success: true, message: 'Tab unmuted' };
    }
    case 'ask_nexus':
      return { success: true, action: 'ask_nexus', query: command.query };
    default:
      return { success: false, message: 'Unknown command' };
  }
}

// ── Poll until YouTube watch page is loaded, then inject vol + brightness ─────
function applyOnYouTubeReady(tabId, volume, brightness) {
  return new Promise((resolve) => {
    const giveUp = setTimeout(resolve, 25000);
    let polls    = 0;

    function poll() {
      chrome.tabs.get(tabId, (tab) => {
        if (chrome.runtime.lastError || !tab) { clearTimeout(giveUp); resolve(); return; }
        const onWatch = tab.url && tab.url.includes('youtube.com/watch');
        if (onWatch && tab.status === 'complete') {
          clearTimeout(giveUp);
          setTimeout(async () => {
            if (volume !== null)     await injectVolume(tabId, volume);
            if (brightness !== null) await injectBrightness(tabId, brightness);
            resolve();
          }, 2000); // 2s buffer for YouTube player JS to boot
        } else if (polls++ < 40) {
          setTimeout(poll, 600);
        } else {
          clearTimeout(giveUp); resolve();
        }
      });
    }
    setTimeout(poll, 1200);
  });
}

// ── Inject volume ─────────────────────────────────────────────────────────────
async function injectVolume(tabId, pct) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (vol) => {
        // YouTube player API
        const player = document.getElementById('movie_player');
        if (player && typeof player.setVolume === 'function') {
          player.setVolume(vol);
          if (typeof player.isMuted === 'function' && player.isMuted()) player.unMute();
        }
        // Direct <video> element
        const vid = document.querySelector('video');
        if (vid) { vid.volume = vol / 100; vid.muted = false; }
      },
      args: [pct]
    });
  } catch (e) {}
}

// ── Inject brightness overlay ─────────────────────────────────────────────────
async function injectBrightness(tabId, pct) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (brightness) => {
        const ID = '__nexus_bright__';
        let ov   = document.getElementById(ID);
        if (!ov) {
          ov = document.createElement('div');
          ov.id = ID;
          ov.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;pointer-events:none;z-index:2147483646;transition:background .4s ease;';
          (document.body || document.documentElement).appendChild(ov);
        }
        ov.style.background = brightness >= 100 ? 'transparent' : `rgba(0,0,0,${((1 - brightness/100)*0.80).toFixed(2)})`;
      },
      args: [pct]
    });
  } catch (e) {}
}

// ── Wait for tab load then inject AI prompt ───────────────────────────────────
function waitThenInjectPrompt(tabId, selector, type, prompt) {
  return new Promise((resolve) => {
    const giveUp = setTimeout(() => resolve(false), 18000);
    const listener = (id, info) => {
      if (id !== tabId || info.status !== 'complete') return;
      chrome.tabs.onUpdated.removeListener(listener);
      clearTimeout(giveUp);
      setTimeout(async () => {
        try {
          await chrome.scripting.executeScript({ target: { tabId }, func: injectPrompt, args: [selector, type, prompt] });
          resolve(true);
        } catch (e) { resolve(false); }
      }, 2200);
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

function injectPrompt(selector, type, text) {
  let tries = 0;
  (function attempt() {
    const el = document.querySelector(selector);
    if (!el) { if (tries++ < 15) setTimeout(attempt, 600); return; }
    if (type === 'contenteditable') {
      el.focus(); el.innerHTML = '';
      const p = document.createElement('p'); p.textContent = text; el.appendChild(p);
      el.dispatchEvent(new InputEvent('input', { bubbles: true, data: text }));
    } else {
      const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value').set;
      setter.call(el, text);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.focus();
    }
  })();
}

// ── Message listener ──────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'EXECUTE_COMMAND') {
    const cmd = parseCommand(msg.input);
    executeCommand(cmd).then(r => sendResponse({ ...r, command: cmd }));
    return true;
  }
  if (msg.type === 'ASK_GROQ') {
    chrome.storage.local.get('groq_key', async ({ groq_key }) => {
      if (!groq_key || groq_key === 'PASTE_YOUR_GROQ_KEY_HERE') {
        sendResponse({ success: false, message: 'Groq API key not set in Settings.' });
        return;
      }
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groq_key}` },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: 'You are NEXUS, a concise AI browser assistant. Answer in 1-3 sentences unless detail is asked.' },
              { role: 'user', content: msg.query }
            ],
            max_tokens: 300, temperature: 0.6
          })
        });
        const data = await res.json();
        sendResponse({ success: true, answer: data?.choices?.[0]?.message?.content || 'No response.' });
      } catch (e) { sendResponse({ success: false, message: e.message }); }
    });
    return true;
  }
});

// ── Load API key from config.js ───────────────────────────────────────────────
function loadConfigKey() {
  fetch(chrome.runtime.getURL('config.js')).then(r => r.text()).then(text => {
    const m = text.match(/groq_key\s*:\s*["']([^"']+)["']/);
    if (m && m[1] !== 'PASTE_YOUR_GROQ_KEY_HERE') chrome.storage.local.set({ groq_key: m[1] });
  }).catch(() => {});
}
chrome.runtime.onInstalled.addListener(loadConfigKey);
chrome.runtime.onStartup.addListener(loadConfigKey);
