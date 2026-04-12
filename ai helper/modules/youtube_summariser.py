# modules/youtube_summariser.py
# Supports BOTH old and new youtube-transcript-api versions
# Old (<= 0.6): YouTubeTranscriptApi.get_transcript(video_id)
# New (>= 0.7):  YouTubeTranscriptApi().fetch(video_id)

import os
import re
import io
from datetime import datetime


def extract_video_id(url):
    """Extract YouTube video ID from any URL format."""
    patterns = [
        r'(?:v=|/v/|youtu\.be/|/embed/|/shorts/)([a-zA-Z0-9_-]{11})',
        r'^([a-zA-Z0-9_-]{11})$'
    ]
    for pattern in patterns:
        match = re.search(pattern, url.strip())
        if match:
            return match.group(1)
    return None


def is_youtube_url(text):
    """Check if text looks like a YouTube URL."""
    t = text.strip()
    return (
        'youtube.com' in t or
        'youtu.be'    in t or
        bool(re.match(r'^[a-zA-Z0-9_-]{11}$', t))
    )


def get_transcript(video_id):
    """
    Fetch transcript — works with BOTH old and new versions of the library.
    Returns (text, duration_seconds).
    """
    try:
        from youtube_transcript_api import YouTubeTranscriptApi
    except ImportError:
        raise ImportError("Run: pip install youtube-transcript-api")

    transcript_list = None
    last_error      = None

    # ── Try new API first (>= 0.7) ──
    try:
        api    = YouTubeTranscriptApi()
        fetched = api.fetch(video_id)
        # fetched is a FetchedTranscript object — iterate to get snippets
        transcript_list = [{"text": s.text, "start": s.start, "duration": getattr(s, 'duration', 0)} for s in fetched]
    except Exception as e:
        last_error = e

    # ── Try old API (<= 0.6) ──
    if not transcript_list:
        try:
            transcript_list = YouTubeTranscriptApi.get_transcript(video_id, languages=['en'])
        except Exception:
            try:
                transcript_list = YouTubeTranscriptApi.get_transcript(video_id)
            except Exception as e2:
                last_error = e2

    # ── Try new API with list_transcripts ──
    if not transcript_list:
        try:
            api         = YouTubeTranscriptApi()
            t_list      = api.list(video_id)
            # pick first available
            for t in t_list:
                fetched = t.fetch()
                transcript_list = [{"text": s.text, "start": s.start, "duration": getattr(s, 'duration', 0)} for s in fetched]
                break
        except Exception as e3:
            last_error = e3

    if not transcript_list:
        raise Exception(
            f"Could not fetch transcript. This video may not have captions. "
            f"Try a different video. (Detail: {last_error})"
        )

    text     = " ".join([t['text'] for t in transcript_list])
    duration = transcript_list[-1]['start'] + transcript_list[-1].get('duration', 0) if transcript_list else 0
    return text, duration


def get_video_title(video_id):
    """Get title and channel name — no API key needed."""
    try:
        import urllib.request, json
        url  = f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={video_id}&format=json"
        req  = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        resp = urllib.request.urlopen(req, timeout=6)
        data = json.loads(resp.read())
        return data.get('title', 'YouTube Video'), data.get('author_name', 'Unknown')
    except:
        return 'YouTube Video', 'Unknown'


def summarise_with_groq(transcript, title, duration):
    """Use Groq/Llama 3 to generate a structured summary."""
    from groq import Groq
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    if len(transcript) > 12000:
        transcript = transcript[:12000] + "... [truncated]"

    mins    = int(duration // 60)
    secs    = int(duration % 60)
    dur_str = f"{mins}m {secs}s" if duration > 0 else "Unknown"

    system = """You are an expert content summariser. Given a YouTube transcript, create a structured summary in this EXACT format:

## Overview
[2-3 sentence overview]

## Key Points
- [point 1]
- [point 2]
- [point 3]
- [point 4]
- [point 5]

## Main Topics Covered
1. [Topic with brief explanation]
2. [Topic with brief explanation]
3. [Topic with brief explanation]

## Key Takeaways
- [Most important lesson]
- [Second lesson]
- [Third lesson]

## Conclusion
[1-2 sentences wrapping up the main message]"""

    resp = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": f"Title: {title}\nDuration: {dur_str}\n\nTranscript:\n{transcript}\n\nSummarise this."}
        ],
        temperature=0.5,
        max_tokens=1500
    )
    return resp.choices[0].message.content.strip()


def generate_summary_pdf(title, url, author, summary, duration):
    """Generate a clean PDF of the summary."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
    from reportlab.lib.enums import TA_LEFT, TA_CENTER

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4,
        rightMargin=2*cm, leftMargin=2*cm,
        topMargin=2*cm,   bottomMargin=2*cm)

    styles = getSampleStyleSheet()

    def S(name, **kw):
        return ParagraphStyle(name, parent=styles['Normal'], **kw)

    st = {
        'brand':   S('brand',   fontSize=10, fontName='Helvetica-Bold', textColor=colors.HexColor('#22d3ee'), spaceAfter=4),
        'title':   S('title',   fontSize=20, fontName='Helvetica-Bold', textColor=colors.HexColor('#0891b2'), spaceAfter=6),
        'meta':    S('meta',    fontSize=9,  fontName='Helvetica',      textColor=colors.HexColor('#64748b'), spaceAfter=3),
        'heading': S('heading', fontSize=13, fontName='Helvetica-Bold', textColor=colors.HexColor('#0e7490'), spaceBefore=14, spaceAfter=6),
        'body':    S('body',    fontSize=11, fontName='Helvetica',      textColor=colors.HexColor('#1e293b'), spaceAfter=5,  leading=16),
        'bullet':  S('bullet',  fontSize=11, fontName='Helvetica',      textColor=colors.HexColor('#1e293b'), spaceAfter=4,  leading=15, leftIndent=16),
        'footer':  S('footer',  fontSize=8,  fontName='Helvetica',      textColor=colors.HexColor('#94a3b8'), spaceBefore=16, alignment=TA_CENTER),
    }

    story = []
    story.append(Paragraph("NEXUS AI", st['brand']))
    story.append(Paragraph("YouTube Video Summary", st['title']))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#22d3ee'), spaceAfter=10))

    now = datetime.now().strftime("%d %B %Y, %I:%M %p")
    story.append(Paragraph(f"<b>Title:</b> {title}", st['meta']))
    story.append(Paragraph(f"<b>Channel:</b> {author}", st['meta']))
    if duration > 0:
        m, s = int(duration // 60), int(duration % 60)
        story.append(Paragraph(f"<b>Duration:</b> {m}m {s}s", st['meta']))
    story.append(Paragraph(f"<b>URL:</b> {url}", st['meta']))
    story.append(Paragraph(f"<b>Summarised on:</b> {now}", st['meta']))
    story.append(Spacer(1, 12))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e2e8f0'), spaceAfter=10))

    for line in summary.split('\n'):
        line = line.strip()
        if not line:
            story.append(Spacer(1, 4))
        elif line.startswith('## '):
            story.append(Paragraph(line[3:], st['heading']))
        elif line.startswith('- ') or line.startswith('* '):
            story.append(Paragraph(f"• {line[2:]}", st['bullet']))
        elif re.match(r'^\d+\.', line):
            story.append(Paragraph(line, st['bullet']))
        elif line.startswith('#'):
            story.append(Paragraph(re.sub(r'^#+\s*', '', line), st['heading']))
        else:
            story.append(Paragraph(line, st['body']))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor('#e2e8f0')))
    story.append(Paragraph("Generated by NEXUS AI · YouTube Summariser · Powered by Llama 3.3 via Groq", st['footer']))

    doc.build(story)
    buf.seek(0)
    return buf.read()


def process_youtube(url):
    """Full pipeline: URL → transcript → summary → PDF."""
    video_id = extract_video_id(url)
    if not video_id:
        raise Exception("Invalid YouTube URL. Please paste a proper link.")

    video_url        = f"https://www.youtube.com/watch?v={video_id}"
    title, author    = get_video_title(video_id)
    transcript, dur  = get_transcript(video_id)

    if len(transcript.strip()) < 50:
        raise Exception("Transcript is too short. This video may not have captions enabled.")

    summary   = summarise_with_groq(transcript, title, dur)
    pdf_bytes = generate_summary_pdf(title, video_url, author, summary, dur)

    return {
        "video_id":   video_id,
        "video_url":  video_url,
        "title":      title,
        "author":     author,
        "duration":   dur,
        "word_count": len(transcript.split()),
        "summary":    summary,
        "pdf_bytes":  pdf_bytes
    }
