# histroy.py (keeping your filename with typo to match your project)
# Saves chat history to a local JSON file

import json
import os
from datetime import datetime

HISTORY_FILE = "history.json"


def load_history():
    """Load all history from JSON file"""
    if not os.path.exists(HISTORY_FILE):
        return []
    try:
        with open(HISTORY_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return []


def save_history(history):
    """Save history list to JSON file"""
    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)


def add_to_history(question, answer, confidence, language="en"):
    """Add a new item to history and return it"""
    history = load_history()
    item = {
        "id":         int(datetime.now().timestamp() * 1000),
        "question":   question,
        "answer":     answer,
        "confidence": confidence,
        "language":   language,
        "time":       datetime.now().strftime("%d %b %Y, %I:%M %p")
    }
    history.insert(0, item)
    history = history[:50]  # keep last 50 only
    save_history(history)
    return item


def delete_from_history(item_id):
    """Delete one item by id"""
    history = load_history()
    history = [h for h in history if h["id"] != item_id]
    save_history(history)


def clear_all_history():
    """Wipe everything"""
    save_history([])
