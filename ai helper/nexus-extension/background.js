// background.js — NEXUS Chrome Extension
// Handles all browser automation commands

// ── Site shortcuts ────────────────────────────────────
const SITES = {
  // Social
  'youtube':    'https://www.youtube.com',
  'yt':         'https://www.youtube.com',
  'google':     'https://www.google.com',
  'gmail':      'https://mail.google.com',
  'facebook':   'https://www.facebook.com',
  'fb':         'https://www.facebook.com',
  'instagram':  'https://www.instagram.com',
  'twitter':    'https://www.twitter.com',
  'whatsapp':   'https://web.whatsapp.com',
  'reddit':     'https://www.reddit.com',
  'linkedin':   'https://www.linkedin.com',
  // Dev
  'github':     'https://www.github.com',
  'stackoverflow': 'https://stackoverflow.com',
  'codepen':    'https://codepen.io',
  'replit':     'https://replit.com',
  'vercel':     'https://vercel.com',
  'netlify':    'https://netlify.com',
  // Learning
  'udemy':      'https://www.udemy.com',
  'coursera':   'https://www.coursera.org',
  'wikipedia':  'https://www.wikipedia.org',
  'khan':       'https://www.khanacademy.org',
  // Productivity
  'notion':     'https://www.notion.so',
  'drive':      'https://drive.google.com',
  'docs':       'https://docs.google.com',
  'sheets':     'https://sheets.google.com',
  'slides':     'https://slides.google.com',
  'calendar':   'https://calendar.google.com',
  'maps':       'https://maps.google.com',
  'translate':  'https://translate.google.com',
  // News
  'news':       'https://news.google.com',
  'bbc':        'https://www.bbc.com',
  'cnn':        'https://www.cnn.com',
  // Shopping
  'amazon':     'https://www.amazon.in',
  'flipkart':   'https://www.flipkart.com',
  // Dev tools
  'chatgpt':    'https://chat.openai.com',
  'claude':     'https://claude.ai',
  'nexus':      'http://localhost:5000',
};


// ── Command parser ────────────────────────────────────

function parseCommand(input) {
  const raw = input.trim();
  const t   = raw.toLowerCase();

  // ── Open URL directly ──
  if (t.startsWith('http://') || t.startsWith('https://') || t.startsWith('www.')) {
    const url = t.startsWith('www.') ? 'https://' + raw : raw;
    return { action: 'open_url', url };
  }

  // ── Play / search YouTube ──
  // "play cricket highlights"
  // "youtube cricket match"
  // "search youtube for python tutorial"
  const ytPatterns = [
    /^play\s+(.+)/i,
    /^youtube\s+(?:search\s+)?(.+)/i,
    /^yt\s+(.+)/i,
    /^search\s+youtube\s+(?:for\s+)?(.+)/i,
    /^watch\s+(.+)/i,
  ];
  for (const p of ytPatterns) {
    const m = raw.match(p);
    if (m) {
      const query = m[1].trim();
      return {
        action: 'youtube_search',
        query,
        url: `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}&autoplay=1`
      };
    }
  }

  // ── Open specific site ──
  // "open youtube" / "go to github" / "take me to gmail"
  const openPatterns = [
    /^(?:open|go to|take me to|launch|visit|navigate to)\s+(.+)/i,
    /^(.+)\s+(?:open|website|site)$/i,
  ];
  for (const p of openPatterns) {
    const m = raw.match(p);
    if (m) {
      const site = m[1].trim().toLowerCase().replace(/\s+/g, '');
      if (SITES[site]) {
        return { action: 'open_url', url: SITES[site], siteName: m[1].trim() };
      }
      // Try as a domain
      if (site.includes('.')) {
        return { action: 'open_url', url: `https://${site}` };
      }
      // Try search
      return { action: 'google_search', query: m[1].trim() };
    }
  }

  // ── Close current tab ──
  if (/^close(\s+tab)?$/i.test(t)) {
    return { action: 'close_tab' };
  }

  // ── New tab ──
  if (/^new tab$/i.test(t)) {
    return { action: 'new_tab' };
  }

  // ── Go back ──
  if (/^(go\s+)?back$/i.test(t)) {
    return { action: 'go_back' };
  }

  // ── Reload ──
  if (/^(reload|refresh)$/i.test(t)) {
    return { action: 'reload' };
  }

  // ── Scroll ──
  if (/^scroll\s+down$/i.test(t)) return { action: 'scroll', dir: 'down' };
  if (/^scroll\s+up$/i.test(t))   return { action: 'scroll', dir: 'up' };
  if (/^scroll\s+top$/i.test(t))  return { action: 'scroll', dir: 'top' };

  // ── Google search ──
  // "search python tutorial" / "google how to make pizza"
  const searchPatterns = [
    /^(?:search|google|find|look up|lookup)\s+(?:for\s+)?(.+)/i,
  ];
  for (const p of searchPatterns) {
    const m = raw.match(p);
    if (m) {
      const query = m[1].trim();
      return {
        action: 'google_search',
        query,
        url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
      };
    }
  }

  // ── Direct site name match (no verb) ──
  const directSite = SITES[t.replace(/\s+/g, '')];
  if (directSite) {
    return { action: 'open_url', url: directSite, siteName: t };
  }

  // ── AI question — send to NEXUS ──
  return { action: 'ask_nexus', query: raw };
}


// ── Execute command ───────────────────────────────────

async function executeCommand(command) {
  switch (command.action) {

    case 'open_url':
      await chrome.tabs.create({ url: command.url });
      return { success: true, message: `✅ Opened ${command.siteName || command.url}` };

    case 'youtube_search':
      await chrome.tabs.create({ url: command.url });
      return { success: true, message: `▶️ Searching YouTube for "${command.query}"` };

    case 'google_search':
      await chrome.tabs.create({ url: command.url || `https://www.google.com/search?q=${encodeURIComponent(command.query)}` });
      return { success: true, message: `🔍 Searching Google for "${command.query}"` };

    case 'close_tab': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await chrome.tabs.remove(tab.id);
      return { success: true, message: '✅ Tab closed' };
    }

    case 'new_tab':
      await chrome.tabs.create({});
      return { success: true, message: '✅ New tab opened' };

    case 'go_back': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func:   () => window.history.back()
      });
      return { success: true, message: '✅ Went back' };
    }

    case 'reload': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await chrome.tabs.reload(tab.id);
      return { success: true, message: '✅ Page reloaded' };
    }

    case 'scroll': {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab) await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (dir) => {
          if (dir === 'down') window.scrollBy(0, 400);
          else if (dir === 'up') window.scrollBy(0, -400);
          else if (dir === 'top') window.scrollTo(0, 0);
        },
        args: [command.dir]
      });
      return { success: true, message: `✅ Scrolled ${command.dir}` };
    }

    case 'ask_nexus':
      return { success: true, action: 'ask_nexus', query: command.query };

    default:
      return { success: false, message: '❓ Unknown command' };
  }
}


// ── Message listener (from popup) ────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'EXECUTE_COMMAND') {
    const command = parseCommand(message.input);
    executeCommand(command).then(result => {
      sendResponse({ ...result, command });
    });
    return true; // keep channel open for async
  }
  chrome.runtime.onInstalled.addListener(loadConfigKey);
chrome.runtime.onStartup.addListener(loadConfigKey);

function loadConfigKey() {
  fetch(chrome.runtime.getURL('config.js'))
    .then(r => r.text())
    .then(text => {
      const match = text.match(/groq_key\s*:\s*["']([^"']+)["']/);
      if (match && match[1] !== 'PASTE_YOUR_KEY_HERE') {
        chrome.storage.local.set({ groq_key: match[1] });
      }
    })
    .catch(() => {});
}
});
