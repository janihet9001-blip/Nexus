# ai.py
# Handles all Groq / Llama 3 AI calls
# Supports: single Q&A mode, full chatbot mode, multi-language, follow-ups

import os
import json
from groq import Groq

client = None

def init_client():
    global client
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        raise ValueError("GROQ_API_KEY not found in .env file")
    client = Groq(api_key=api_key)


# ── Single Q&A mode ───────────────────────────────────

def generate_answer(question, context, language="en", language_name="English"):
    if not client:
        init_client()

    lang_instruction = ""
    if language != "en":
        lang_instruction = f"\n\nIMPORTANT: Respond entirely in {language_name}."

    system_prompt = f"""You are a precise, helpful AI assistant. Use the provided 
search context to give an accurate, well-structured answer. Be clear and thorough 
(150-250 words). Use simple language. Never make things up.{lang_instruction}"""

    user_prompt = f"""Search context:
{context or 'No web results found — use your training knowledge.'}

Question: {question}

Answer:"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt}
        ],
        temperature=0.6,
        max_tokens=1024
    )
    return response.choices[0].message.content.strip()


def verify_answer(question, context, answer):
    if not client:
        init_client()

    system_prompt = """You are a fact-checking AI. Evaluate the answer for accuracy.
Respond ONLY with valid JSON, nothing else:
{"confidence":<0-100>,"status":"confirmed|uncertain|corrected","note":"one sentence","correction":"what changed or null"}"""

    user_prompt = f"""Question: {question}
Context: {context[:800]}
Answer: {answer[:600]}"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": user_prompt}
        ],
        temperature=0.3,
        max_tokens=256
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        return json.loads(raw)
    except:
        return {"confidence": 75, "status": "uncertain",
                "note": "Verification could not be parsed.", "correction": None}


def generate_followups(question, answer, language_name="English"):
    if not client:
        init_client()

    lang_note = f" Respond in {language_name}." if language_name != "English" else ""

    system_prompt = f"""You are a helpful AI assistant.{lang_note}
Generate exactly 3 short smart follow-up questions.
Respond ONLY with a JSON array of 3 strings, no markdown:
["question 1", "question 2", "question 3"]"""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user",   "content": f"Question: {question}\nAnswer: {answer[:400]}"}
        ],
        temperature=0.7,
        max_tokens=256
    )

    raw = response.choices[0].message.content.strip()
    raw = raw.replace("```json", "").replace("```", "").strip()

    try:
        result = json.loads(raw)
        if isinstance(result, list):
            return result[:3]
    except:
        pass

    return ["Can you explain more?", "What are the key benefits?", "Any alternatives?"]


# ── Full Chatbot mode (NEW) ───────────────────────────

def chat_with_memory(messages, language="en", language_name="English"):
    """
    Full chatbot mode — Llama 3 remembers the whole conversation.

    messages = list of dicts like:
    [
        {"role": "user",      "content": "What is AI?"},
        {"role": "assistant", "content": "AI stands for..."},
        {"role": "user",      "content": "Tell me more"}
    ]
    """
    if not client:
        init_client()

    lang_instruction = ""
    if language != "en":
        lang_instruction = f" Always respond in {language_name}."

    system_prompt = f"""You are ORACLE, a helpful, friendly and knowledgeable AI assistant.{lang_instruction}

You remember the entire conversation and can refer back to previous messages.
Give clear, accurate, well-structured answers. Be conversational but informative.
If you don't know something, say so honestly. Never make things up.
Keep responses focused — 100 to 300 words unless the user asks for more detail."""

    # Build message list — system first, then last 20 messages
    groq_messages = [{"role": "system", "content": system_prompt}]
    for msg in messages[-20:]:
        groq_messages.append({
            "role":    msg["role"],
            "content": msg["content"]
        })

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=groq_messages,
        temperature=0.7,
        max_tokens=1024
    )

    return response.choices[0].message.content.strip()


def generate_chat_title(first_message):
    """Generate a short title (max 5 words) for a new chat session"""
    if not client:
        init_client()

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {
                "role": "system",
                "content": "Generate a very short title (max 5 words) for a conversation that starts with this message. Respond with ONLY the title text, nothing else, no quotes."
            },
            {"role": "user", "content": first_message}
        ],
        temperature=0.5,
        max_tokens=20
    )

    return response.choices[0].message.content.strip().strip('"').strip("'")
