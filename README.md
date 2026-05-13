````md
# NEXUS AI

![Python](https://img.shields.io/badge/Python-3.10-blue)
![Flask](https://img.shields.io/badge/Flask-Backend-black)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-green)
![AI Powered](https://img.shields.io/badge/AI-Llama_3.3-orange)
![License](https://img.shields.io/badge/License-MIT-yellow)
Control your browser and get AI answers by voice or text.

NEXUS is a Chrome extension and Flask web application powered by Llama 3.3 through the Groq API.

---

# Overview

NEXUS is a dual-mode AI assistant designed for productivity, browser automation, AI search, and content generation.

The project includes:

- A Chrome extension for browser control and voice commands
- A Flask web app for AI chat, Q&A, YouTube summarisation, PowerPoint generation, and PDF export

---

# Features

## Chrome Extension

| Feature | Example |
|---|---|
| Open websites | `open github` |
| Open AI tools | `claude explain recursion` |
| Play YouTube | `play lofi music` |
| Browser controls | `new tab`, `close tab`, `scroll down` |
| Voice commands | Speak directly using microphone |
| AI Q&A | Ask anything directly from popup |

---

## Web Application

- AI-powered Q&A system
- Conversational chatbot with memory
- YouTube video summariser
- PowerPoint presentation generator
- PDF export functionality
- Multi-language support
- Searchable history
- AI-generated follow-up questions

---

# Tech Stack

## Frontend
- HTML5
- CSS3
- JavaScript
- Chrome Extension APIs

## Backend
- Python
- Flask

## AI and APIs
- Groq API
- Llama 3.3 70B
- DuckDuckGo Search
- Wikipedia API

## Libraries and Tools
- ReportLab
- youtube-transcript-api
- pptxgenjs
- python-dotenv

## Browser Support
- Google Chrome
- Microsoft Edge
- Brave Browser
- Arc Browser

---

# Project Structure

```bash
Nexus/
│
├── Old-Version/
│
├── modules/
│   ├── ai.py
│   ├── search.py
│   ├── export.py
│   ├── ppt_builder.py
│   ├── youtube_summariser.py
│   ├── history.py
│   └── voice.py
│
├── nexus-extension/
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html
│   ├── popup.js
│   └── config.js
│
├── static/
├── templates/
│
├── app.py
├── generate_ppt.js
├── history.json
├── package.json
├── requirements.txt
├── .env
└── .gitignore
```

---

# Screenshots

## Chrome Extension

![Extension UI](screenshots/extension.png)

## Web Application

![Web App](screenshots/webapp.png)

## YouTube Summariser

![YouTube Summary](screenshots/youtube.png)

---

# Installation

## 1. Clone the Repository

```bash
git clone https://github.com/janihet9001-blip/Nexus.git
cd Nexus
```

---

## 2. Install Python Dependencies

```bash
pip install flask python-dotenv groq reportlab youtube-transcript-api
```

---

## 3. Create Environment File

Create a `.env` file in the root directory.

```env
GROQ_API_KEY=your_key_here
```

---

## 4. Run Flask Application

```bash
python app.py
```

Open:

```text
http://localhost:5000
```

---

# Chrome Extension Setup

1. Open Chrome
2. Go to:

```text
chrome://extensions
```

3. Enable Developer Mode
4. Click "Load Unpacked"
5. Select the `nexus-extension/` folder
6. Open extension settings and paste your Groq API key

Get a free API key:

https://console.groq.com

---

# PPT Builder Setup

Install the required Node.js package:

```bash
npm install pptxgenjs
```

---

# API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/ask` | AI Q&A |
| POST | `/api/chat` | Chat with memory |
| POST | `/api/youtube` | YouTube summariser |
| POST | `/api/chat-ppt` | Generate PowerPoint |
| POST | `/api/export-pdf` | Export PDF |
| GET | `/api/history` | Get history |
| DELETE | `/api/history/<id>` | Delete history item |
| DELETE | `/api/history/clear` | Clear all history |
| GET | `/api/status` | Feature status |

---

# Keyboard Shortcut

| Action | Shortcut |
|---|---|
| Open NEXUS Command Bar | `Ctrl + Shift + N` |

---

# Requirements

## Python Packages
- flask
- python-dotenv
- groq
- reportlab
- youtube-transcript-api

## Node.js Packages
- pptxgenjs

---

# Environment Variables

| Variable | Description |
|---|---|
| `GROQ_API_KEY` | Your Groq API key |

---

# Future Improvements

- Dark mode support
- Voice output
- AI browser agents
- Mobile application
- Cloud chat sync
- Real-time collaboration
- AI workflow automation

---

# Demo Video

Add your demo video link here.

```text
https://youtube.com/
```

---

# Contributing

Contributions are welcome.

Steps to contribute:

1. Fork the repository
2. Create a new branch
3. Commit your changes
4. Push changes
5. Open a pull request

---

# Security Notes

- Never upload `.env`
- Never upload `config.js`
- API keys should remain private
- History is stored locally only

---

# Author

Het Jani

GitHub:
https://github.com/janihet9001-blip

---

# License

MIT License

Free to use, modify, and distribute.
````

