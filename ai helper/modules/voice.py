# voice.py
# Voice input is handled in the browser using the Web Speech API
# This file handles any server-side voice processing if needed in future

SUPPORTED_LANGUAGES = {
    "en": "English",
    "hi": "Hindi",
    "es": "Spanish",
    "fr": "French",
    "ar": "Arabic",
    "de": "German",
    "zh": "Chinese",
    "ja": "Japanese",
    "pt": "Portuguese",
    "ru": "Russian",
}

def get_language_name(code):
    return SUPPORTED_LANGUAGES.get(code, "English")

def get_all_languages():
    return SUPPORTED_LANGUAGES
