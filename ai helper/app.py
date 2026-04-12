# app.py — NEXUS GOD FILE
# Features: Q&A, Chat, PPT Builder, PDF Export, YouTube Summariser

from flask import Flask, request, jsonify, render_template, send_file
from dotenv import load_dotenv
import io, os, re, base64

load_dotenv()

from modules.search  import search_duckduckgo, search_wikipedia, build_context
from modules.histroy import load_history, add_to_history, delete_from_history, clear_all_history
from modules.voice   import get_all_languages, get_language_name

# ── Groq AI ───────────────────────────────────────────
GROQ_ENABLED = bool(os.getenv("GROQ_API_KEY", "").strip())
if GROQ_ENABLED:
    try:
        from modules.ai import generate_answer, verify_answer, generate_followups, chat_with_memory, generate_chat_title
        print("✅  Groq AI — enabled")
    except Exception as e:
        GROQ_ENABLED = False
        print(f"⚠️  Groq AI disabled: {e}")
else:
    print("⚠️  No Groq key in .env")

# ── PDF ───────────────────────────────────────────────
try:
    from modules.export import generate_pdf
    PDF_ENABLED = True
    print("✅  PDF export — enabled")
except ImportError:
    PDF_ENABLED = False

# ── PPT ───────────────────────────────────────────────
try:
    from modules.ppt_builder import build_pptx
    PPT_ENABLED = True
    print("✅  PPT builder — enabled")
except ImportError:
    PPT_ENABLED = False

# ── YouTube Summariser ────────────────────────────────
try:
    from modules.youtube_summariser import process_youtube, is_youtube_url, extract_video_id
    YT_ENABLED = True
    print("✅  YouTube summariser — enabled")
except ImportError as e:
    YT_ENABLED = False
    print(f"⚠️  YouTube summariser — disabled ({e})")

app = Flask(__name__)


# ── PPT topic detector ────────────────────────────────
def detect_ppt_topic(text):
    t = text.lower().strip()
    patterns = [
        r"make\s+a?\s*ppt\s+(?:on|about|for)?\s*(.+)",
        r"create\s+a?\s*ppt\s+(?:on|about|for)?\s*(.+)",
        r"build\s+a?\s*ppt\s+(?:on|about|for)?\s*(.+)",
        r"generate\s+a?\s*ppt\s+(?:on|about|for)?\s*(.+)",
        r"make\s+a?\s*presentation\s+(?:on|about|for)?\s*(.+)",
        r"create\s+a?\s*presentation\s+(?:on|about|for)?\s*(.+)",
        r"make\s+a?\s*powerpoint\s+(?:on|about|for)?\s*(.+)",
        r"ppt\s+(?:on|about|for)\s+(.+)",
        r"presentation\s+(?:on|about|for)\s+(.+)",
        r"slides?\s+(?:on|about|for)\s+(.+)",
    ]
    for pattern in patterns:
        match = re.search(pattern, t)
        if match:
            topic = re.sub(r'[?.!,]+$', '', match.group(1).strip())
            if topic:
                return topic.title()
    reverse = re.search(r'^(.+?)\s+(ppt|presentation|powerpoint|slides?)$', t)
    if reverse:
        stop  = {"make","a","an","the","create","build","generate","me","please","can","you","i","want"}
        topic = " ".join(w for w in reverse.group(1).split() if w not in stop).strip()
        if topic:
            return topic.title()
    return None


# ────────────────────────────────────────────────────────
# ── Pages
# ────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html",
        languages    = get_all_languages(),
        pdf_enabled  = PDF_ENABLED,
        groq_enabled = GROQ_ENABLED
    )

@app.route("/ppt")
def ppt_page():
    return render_template("ppt.html")


# ────────────────────────────────────────────────────────
# ── API: YouTube Summariser
# ────────────────────────────────────────────────────────

@app.route("/api/youtube", methods=["POST"])
def youtube_summarise():
    """
    Summarise a YouTube video and return summary + PDF.
    Request:  { "url": "https://youtube.com/watch?v=..." }
    Response: { "summary": "...", "title": "...", "pdf_b64": "..." }
    """
    if not YT_ENABLED:
        return jsonify({"error": "YouTube summariser not available. Run: pip install youtube-transcript-api"}), 503

    if not GROQ_ENABLED:
        return jsonify({"error": "Groq API key required for YouTube summariser. Add GROQ_API_KEY to your .env file."}), 503

    data = request.json
    url  = data.get("url", "").strip()

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    try:
        result = process_youtube(url)

        # Encode PDF as base64 so it can be sent in JSON
        pdf_b64 = base64.b64encode(result["pdf_bytes"]).decode("utf-8")

        # Save to history
        add_to_history(
            question   = f"YouTube: {result['title']}",
            answer     = result["summary"][:500] + "...",
            confidence = 90,
            language   = "en"
        )

        return jsonify({
            "success":    True,
            "title":      result["title"],
            "author":     result["author"],
            "video_url":  result["video_url"],
            "duration":   result["duration"],
            "word_count": result["word_count"],
            "summary":    result["summary"],
            "pdf_b64":    pdf_b64
        })

    except Exception as e:
        print(f"❌ YouTube error: {e}")
        return jsonify({"error": str(e)}), 500


# ────────────────────────────────────────────────────────
# ── API: PPT from chat
# ────────────────────────────────────────────────────────

@app.route("/api/chat-ppt", methods=["POST"])
def chat_ppt():
    data    = request.json
    message = data.get("message", "").strip()
    theme   = data.get("theme", "midnight")

    if not message:
        return jsonify({"error": "No message provided"}), 400

    topic = detect_ppt_topic(message)
    if not topic:
        return jsonify({"error": "Could not detect topic"}), 400

    if not PPT_ENABLED:
        return jsonify({"error": "PPT builder not available. Check ppt_builder.py and run: npm install pptxgenjs"}), 503

    try:
        pptx_path, slide_data = build_pptx(topic, num_slides=6, theme=theme)
        safe_name = "".join(c for c in topic[:30] if c.isalnum() or c in " -_").strip().replace(" ", "-")
        filename  = f"nexus-{safe_name}.pptx" if safe_name else "nexus-presentation.pptx"
        return send_file(pptx_path,
            mimetype="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            as_attachment=True, download_name=filename)
    except Exception as e:
        print(f"❌ Chat PPT error: {e}")
        return jsonify({"error": str(e)}), 500


# ────────────────────────────────────────────────────────
# ── API: Q&A mode
# ────────────────────────────────────────────────────────

@app.route("/api/ask", methods=["POST"])
def ask():
    data      = request.json
    question  = data.get("question", "").strip()
    language  = data.get("language", "en")
    lang_name = get_language_name(language)

    if not question:
        return jsonify({"error": "No question provided"}), 400

    # PPT detection
    ppt_topic = detect_ppt_topic(question)
    if ppt_topic:
        return jsonify({
            "success": True, "is_ppt": True, "ppt_topic": ppt_topic,
            "answer": f"Building your PPT on **{ppt_topic}**...",
            "verification": {"confidence": 99, "status": "confirmed", "note": "PPT request", "correction": None},
            "followups": [], "ddg_results": [], "wiki_articles": [],
            "language": language, "language_name": lang_name, "pdf_enabled": PDF_ENABLED
        })

    # YouTube detection
    if YT_ENABLED and is_youtube_url(question):
        return jsonify({
            "success": True, "is_youtube": True,
            "answer": "Fetching YouTube video summary...",
            "verification": {"confidence": 99, "status": "confirmed", "note": "YouTube URL detected", "correction": None},
            "followups": [], "ddg_results": [], "wiki_articles": [],
            "language": language, "language_name": lang_name, "pdf_enabled": PDF_ENABLED
        })

    try:
        ddg_results   = search_duckduckgo(question)
        wiki_articles = search_wikipedia(question)
        context       = build_context(ddg_results, wiki_articles)

        if GROQ_ENABLED:
            answer       = generate_answer(question, context, language, lang_name)
            verification = verify_answer(question, context, answer)
            followups    = generate_followups(question, answer, lang_name)
        else:
            answer       = wiki_articles[0]['text'][:600] if wiki_articles else (ddg_results[0]['text'] if ddg_results else "No answer found. Please add GROQ_API_KEY to .env")
            verification = {"confidence": 60, "status": "uncertain", "note": "No AI key — raw search results.", "correction": None}
            followups    = []

        history_item = add_to_history(question, answer, verification.get("confidence", 75), language=language)

        return jsonify({
            "success": True, "is_ppt": False, "is_youtube": False,
            "ddg_results": ddg_results, "wiki_articles": wiki_articles,
            "answer": answer, "verification": verification, "followups": followups,
            "history_id": history_item["id"], "language": language,
            "language_name": lang_name, "pdf_enabled": PDF_ENABLED
        })

    except Exception as e:
        print(f"❌ /api/ask error: {e}")
        return jsonify({"error": str(e)}), 500


# ────────────────────────────────────────────────────────
# ── API: Chat mode
# ────────────────────────────────────────────────────────

@app.route("/api/chat", methods=["POST"])
def chat():
    data      = request.json
    messages  = data.get("messages", [])
    language  = data.get("language", "en")
    lang_name = get_language_name(language)

    if not messages:
        return jsonify({"error": "No messages provided"}), 400

    try:
        last_message = messages[-1]["content"] if messages else ""

        if GROQ_ENABLED:
            reply = chat_with_memory(messages, language, lang_name)
            title = None
            if len(messages) <= 2:
                try:    title = generate_chat_title(last_message)
                except: title = last_message[:40]
        else:
            reply = "Please add your GROQ_API_KEY to the .env file to use chat mode."
            title = last_message[:40] if len(messages) <= 2 else None

        return jsonify({"success": True, "reply": reply, "title": title, "language": language})

    except Exception as e:
        print(f"❌ /api/chat error: {e}")
        return jsonify({"error": str(e)}), 500


# ────────────────────────────────────────────────────────
# ── API: PDF Export
# ────────────────────────────────────────────────────────

@app.route("/api/export-pdf", methods=["POST"])
def export_pdf():
    if not PDF_ENABLED:
        return jsonify({"error": "PDF disabled. Run: pip install reportlab"}), 503

    data       = request.json
    question   = data.get("question", "")
    answer     = data.get("answer",   "")
    confidence = data.get("confidence", 75)
    sources    = data.get("sources", [])

    if not question or not answer:
        return jsonify({"error": "Question and answer required"}), 400

    try:
        pdf_bytes = generate_pdf(question, answer, confidence, sources)
        safe_name = "".join(c for c in question[:30] if c.isalnum() or c in " -_").strip().replace(" ", "-")
        filename  = f"nexus-{safe_name}.pdf" if safe_name else "nexus-answer.pdf"
        return send_file(io.BytesIO(pdf_bytes), mimetype="application/pdf",
            as_attachment=True, download_name=filename)
    except Exception as e:
        return jsonify({"error": f"PDF failed: {str(e)}"}), 500


# ────────────────────────────────────────────────────────
# ── API: History
# ────────────────────────────────────────────────────────

@app.route("/api/history",               methods=["GET"])
def get_history(): return jsonify(load_history())

@app.route("/api/history/<int:item_id>", methods=["DELETE"])
def delete_history(item_id):
    delete_from_history(item_id); return jsonify({"success": True})

@app.route("/api/history/clear", methods=["DELETE"])
def clear_history():
    clear_all_history(); return jsonify({"success": True})


# ────────────────────────────────────────────────────────
# ── API: Status
# ────────────────────────────────────────────────────────

@app.route("/api/status", methods=["GET"])
def status():
    return jsonify({
        "status":       "running",
        "groq_enabled": GROQ_ENABLED,
        "pdf_enabled":  PDF_ENABLED,
        "ppt_enabled":  PPT_ENABLED,
        "yt_enabled":   YT_ENABLED,
        "history":      len(load_history())
    })


# ────────────────────────────────────────────────────────
# ── Run
# ────────────────────────────────────────────────────────

if __name__ == "__main__":
    print("\n" + "="*50)
    print("  NEXUS — AI Assistant")
    print("="*50)
    print(f"  {'✅' if GROQ_ENABLED else '❌'}  Groq AI         — {'on' if GROQ_ENABLED else 'add key to .env'}")
    print(f"  {'✅' if PDF_ENABLED  else '⚠️'}  PDF export      — {'ready' if PDF_ENABLED else 'pip install reportlab'}")
    print(f"  {'✅' if PPT_ENABLED  else '⚠️'}  PPT builder     — {'ready' if PPT_ENABLED else 'check ppt_builder.py'}")
    print(f"  {'✅' if YT_ENABLED   else '⚠️'}  YouTube summary — {'ready' if YT_ENABLED else 'pip install youtube-transcript-api'}")
    print("="*50)
    print("  👉  http://localhost:5000")
    print("="*50 + "\n")
    app.run(debug=True, port=5000)
