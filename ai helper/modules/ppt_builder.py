# modules/ppt_builder.py
# Generates PPT slide content from a prompt
# Works with custom brain OR Groq AI

import json
import os
import re
import subprocess
import tempfile

GROQ_ENABLED = bool(os.getenv("GROQ_API_KEY", "").strip())

# ── Slide content generator ───────────────────────────

def generate_slides_with_groq(prompt, num_slides=6, theme="midnight"):
    """Use Groq/Llama3 to generate slide content"""
    from groq import Groq
    client = Groq(api_key=os.getenv("GROQ_API_KEY"))

    system_prompt = f"""You are a professional presentation designer.
Generate a complete PowerPoint presentation structure as JSON.
The JSON must have this exact format — no extra text, no markdown, just valid JSON:

{{
  "topic": "Main Topic",
  "theme": "{theme}",
  "slides": [
    {{
      "type": "title",
      "title": "Main Title",
      "subtitle": "Subtitle text",
      "label": "Category"
    }},
    {{
      "type": "content",
      "title": "Slide Title",
      "bullets": ["Point 1", "Point 2", "Point 3", "Point 4"],
      "note": "Optional footnote"
    }},
    {{
      "type": "two_col",
      "title": "Comparison Slide",
      "leftTitle": "Left Column",
      "left": ["Point A", "Point B", "Point C"],
      "rightTitle": "Right Column",
      "right": ["Point X", "Point Y", "Point Z"]
    }},
    {{
      "type": "stats",
      "title": "Key Numbers",
      "stats": [
        {{"value": "95%", "label": "Stat Label", "desc": "Short description"}},
        {{"value": "2M+", "label": "Stat Label", "desc": "Short description"}},
        {{"value": "#1", "label": "Stat Label", "desc": "Short description"}}
      ]
    }},
    {{
      "type": "quote",
      "quote": "An inspiring quote related to the topic.",
      "author": "Author Name"
    }},
    {{
      "type": "closing",
      "title": "Thank You",
      "subtitle": "Closing message",
      "label": "Topic Name"
    }}
  ]
}}

Rules:
- Generate exactly {num_slides} slides total
- Always start with type "title" and end with type "closing"
- Mix content types: use content, two_col, stats, quote slides in between
- Each content slide should have 4-6 bullet points
- Keep bullet points concise — max 10 words each
- Make it professional and informative
- Return ONLY the JSON, nothing else"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": f"Create a {num_slides}-slide presentation about: {prompt}"}
        ],
        temperature=0.7,
        max_tokens=3000
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()
    return json.loads(raw)


def generate_slides_with_brain(prompt, num_slides=6, theme="midnight"):
    """
    Rule-based slide generator — no AI needed!
    Generates a structured presentation from any topic.
    """
    topic = prompt.strip()

    # Extract key topic words
    stop_words = {"a","an","the","is","are","was","were","be","been","being",
                  "about","make","create","ppt","presentation","slides","on","for","of"}
    words = [w for w in re.sub(r'[^a-z0-9 ]', '', topic.lower()).split()
             if w not in stop_words]
    key_topic = " ".join(words[:4]).title() if words else topic

    slides = [
        # Title slide
        {
            "type":     "title",
            "title":    key_topic,
            "subtitle": f"A comprehensive overview of {topic}",
            "label":    "NEXUS Presentation"
        },

        # Introduction
        {
            "type":    "content",
            "title":   f"Introduction to {key_topic}",
            "bullets": [
                f"{key_topic} is an important topic in today's world",
                "Understanding the basics helps build a strong foundation",
                "This presentation covers key concepts and insights",
                "We will explore both theory and practical applications",
                "By the end, you will have a clear understanding"
            ]
        },

        # Key concepts — two column
        {
            "type":       "two_col",
            "title":      "Key Concepts",
            "leftTitle":  "Core Ideas",
            "left":  [
                "Fundamental principles and definitions",
                "Historical background and evolution",
                "Core components and structure",
                "How it works in practice"
            ],
            "rightTitle": "Why It Matters",
            "right": [
                "Real-world applications and use cases",
                "Impact on modern life and industry",
                "Future trends and developments",
                "Opportunities and challenges ahead"
            ]
        },

        # Main content
        {
            "type":    "content",
            "title":   f"How {key_topic} Works",
            "bullets": [
                "The process begins with a clear foundation of principles",
                "Multiple components work together as a system",
                "Data and information flow through defined pathways",
                "Outputs are measured and continuously improved",
                "Feedback loops ensure accuracy and efficiency",
                "The cycle repeats for consistent results"
            ],
            "note": f"Understanding the mechanism behind {key_topic} is crucial for success"
        },

        # Benefits
        {
            "type":    "content",
            "title":   f"Benefits of {key_topic}",
            "bullets": [
                "Increases efficiency and reduces time spent on tasks",
                "Improves quality of outcomes and decision-making",
                "Enables scalability and long-term growth",
                "Reduces costs and optimizes resource usage",
                "Creates new opportunities for innovation"
            ]
        },

        # Closing
        {
            "type":     "closing",
            "title":    "Thank You",
            "subtitle": f"Questions about {key_topic}? Let's discuss!",
            "label":    "NEXUS Presentation"
        }
    ]

    # Trim or pad to requested slide count
    if num_slides < len(slides):
        # Keep title + closing, trim middle
        middle = slides[1:-1][:num_slides - 2]
        slides = [slides[0]] + middle + [slides[-1]]

    return {
        "topic":  key_topic,
        "theme":  theme,
        "slides": slides[:num_slides]
    }


# ── PPTX file generator ───────────────────────────────

def build_pptx(prompt, num_slides=6, theme="midnight"):
    """
    Main function: generate slide content + create PPTX file.
    Returns path to the generated PPTX file.
    """
    # Step 1: Generate slide content
    if GROQ_ENABLED:
        try:
            slide_data = generate_slides_with_groq(prompt, num_slides, theme)
        except Exception as e:
            print(f"Groq failed, using brain: {e}")
            slide_data = generate_slides_with_brain(prompt, num_slides, theme)
    else:
        slide_data = generate_slides_with_brain(prompt, num_slides, theme)

    # Step 2: Write slide data to temp JSON file
    tmp_dir    = tempfile.gettempdir()
    json_path  = os.path.join(tmp_dir, "nexus_slides.json")
    pptx_path  = os.path.join(tmp_dir, "nexus_output.pptx")

    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(slide_data, f, ensure_ascii=False, indent=2)

    # Step 3: Call Node.js to generate the PPTX
    script_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    js_script  = os.path.join(script_dir, "generate_ppt.js")

    result = subprocess.run(
        ["node", js_script, json_path, pptx_path],
        capture_output=True, text=True, timeout=30
    )

    if result.returncode != 0:
        raise RuntimeError(f"PPT generation failed: {result.stderr or result.stdout}")

    if not os.path.exists(pptx_path):
        raise RuntimeError("PPTX file was not created")

    return pptx_path, slide_data


def get_slide_preview(slide_data):
    """Return a summary of generated slides for the UI."""
    slides = slide_data.get("slides", [])
    return [
        {
            "index": i + 1,
            "type":  s.get("type", "content"),
            "title": s.get("title", f"Slide {i+1}")
        }
        for i, s in enumerate(slides)
    ]
