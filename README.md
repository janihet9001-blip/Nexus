# NEXUS AI 

> **Control your browser and get AI answers — by voice or text.**
> A Chrome extension + Flask web app powered by Llama 3.3 via Groq.

---

## What is NEXUS?

NEXUS is a dual-mode AI assistant:

- **Chrome Extension** — a command bar you summon with `Ctrl+Shift+N` to control your browser, open AI tools, play YouTube, search the web, and ask quick questions — all by voice or text.
- **Web App (Flask)** — a full-featured AI Q&A interface with search-augmented answers, a chatbot with memory, YouTube video summariser, PowerPoint generator, and PDF export.

Both are powered by **Llama 3.3 70B** via the [Groq](https://groq.com) API (free tier available).

---

## Features

### Chrome Extension
| Command | Example |
|---|---|
| Open any site | `open github` / `open youtube` |
| Open AI with a prompt | `claude explain recursion` |
| Play YouTube | `play lofi hip hop` |
| Set volume | `volume 60` |
| Set brightness | `brightness 40` |
| Browser controls | `new tab`, `close tab`, `go back`, `scroll down` |
| Ask AI anything | Any question → Llama 3.3 answers in the popup |
| Voice input | Click 🎤 and speak |

### Web App
- **Q&A Mode** — asks DuckDuckGo + Wikipedia for context, then Llama 3.3 generates a verified answer with follow-up questions
- **Chat Mode** — full conversational memory (last 20 messages), named sessions
- **YouTube Summariser** — paste a YouTube URL, get a structured summary + downloadable PDF
- **PPT Builder** — type "make a ppt on black holes" and download a `.pptx` file
- **PDF Export** — export any answer as a branded PDF
- **History** — last 50 Q&A entries, searchable and deletable
- **Multi-language** — answers in Hindi, Spanish, French, Arabic, and more

---

## Project Structure

```
Nexus/
│
├── Old-Version/                # Previous version 
│
├── modules/                    # Flask backend modules
│   ├── ai.py                   # Groq/Llama3 — Q&A, chat, follow-ups, titles
│   ├── search.py               # DuckDuckGo + Wikipedia search
│   ├── export.py               # PDF generation (ReportLab)
│   ├── ppt_builder.py          # PowerPoint generation (Node.js)
│   ├── youtube_summariser.py   # YouTube transcript + summary + PDF
│   ├── histroy.py              # JSON-based history store
│   └── voice.py                # Supported language registry
│
├── nexus-extension/            # Chrome Extension
│   ├── manifest.json           # Extension config (MV3)
│   ├── background.js           # Command parser + browser automation
│   ├── popup.html              # Extension UI
│   ├── popup.js                # Tab switching, voice, history, settings
│   └── config.js               # Your Groq API key (gitignored)
│
├── static/                     # Frontend assets (CSS, JS, images)
├── templates/                  # Flask HTML templates
│
├── app.py                      # Flask app — all API routes
├── generate_ppt.js             # Node.js script for .pptx generation
├── history.json                # Local Q&A history store
├── package.json                # Node dependencies (pptxgenjs)
├── requirements.txt            # Python dependencies
├── .env                        # GROQ_API_KEY goes here (never commit this)
└── .gitignore
```

---

## Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/janihet9001-blip/Nexus.git
cd Nexus
```

### 2. Set up the Flask web app

```bash
pip install flask python-dotenv groq reportlab youtube-transcript-api
```

Create a `.env` file in the root:

```
GROQ_API_KEY=your_key_here
```

Run the app:

```bash
python app.py
```

Open [http://localhost:5000](http://localhost:5000)

### 3. Install the Chrome Extension

1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `nexus-extension/` folder
4. Open the extension, go to **Settings**, and paste your Groq API key

> You can get a free Groq API key at [console.groq.com](https://console.groq.com)

---

## PPT Builder Setup (optional)

The PPT builder uses Node.js to generate `.pptx` files:

```bash
npm install pptxgenjs
```

If no Groq key is set, it falls back to a built-in rule-based slide generator — no AI needed.

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/ask` | Q&A with search + AI answer |
| `POST` | `/api/chat` | Chat with memory |
| `POST` | `/api/youtube` | Summarise a YouTube video |
| `POST` | `/api/chat-ppt` | Generate a PowerPoint |
| `POST` | `/api/export-pdf` | Export answer to PDF |
| `GET` | `/api/history` | Get Q&A history |
| `DELETE` | `/api/history/<id>` | Delete a history item |
| `DELETE` | `/api/history/clear` | Clear all history |
| `GET` | `/api/status` | Check which features are enabled |

---

## Extension Keyboard Shortcut

Press `Ctrl+Shift+N` (or `Cmd+Shift+N` on Mac) to open the NEXUS command bar from any tab.

---

## Requirements

**Python**
- `flask`
- `python-dotenv`
- `groq`
- `reportlab` (for PDF export)
- `youtube-transcript-api` (for YouTube summariser)

**Node.js** (optional, for PPT export)
- `pptxgenjs`

**Browser**
- Chrome or any Chromium-based browser (Edge, Brave, Arc)

---

## Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key — get one free at [console.groq.com](https://console.groq.com) |

---

## Notes

- `config.js` and `.env` contain your API key — **never commit these to GitHub**. Add both to your `.gitignore`.
- The extension stores your key in `chrome.storage.local`, not in plain files.
- History is stored locally in `history.json`. It is not sent anywhere.
- YouTube summarisation requires the video to have captions/subtitles enabled.

---

## License

MIT — free to use, modify, and distribute.
