import requests

def search_duckduckgo(query):
    """Search DuckDuckGo Instant Answer API — no key needed"""
    try:
        url = "https://api.duckduckgo.com/"
        params = {
            "q": query,
            "format": "json",
            "no_html": 1,
            "skip_disambig": 1
        }
        # Use allorigins proxy to avoid CORS (server-side so direct is fine)
        resp = requests.get(url, params=params, timeout=8)
        data = resp.json()
        
        results = []
        if data.get("AbstractText"):
            results.append({"text": data["AbstractText"], "type": "abstract"})
        if data.get("Answer"):
            results.append({"text": data["Answer"], "type": "answer"})
        for topic in data.get("RelatedTopics", [])[:4]:
            if isinstance(topic, dict) and topic.get("Text"):
                results.append({"text": topic["Text"], "type": "related"})
        
        return results
    except Exception as e:
        print(f"DDG search error: {e}")
        return []


def search_wikipedia(query):
    """Search Wikipedia API — no key needed"""
    try:
        # Step 1: find article titles
        search_url = "https://en.wikipedia.org/w/api.php"
        search_params = {
            "action": "query",
            "list": "search",
            "srsearch": query,
            "format": "json",
            "srlimit": 3
        }
        sr = requests.get(search_url, params=search_params, timeout=8)
        sd = sr.json()
        titles = [r["title"] for r in sd.get("query", {}).get("search", [])][:2]
        
        if not titles:
            return []
        
        # Step 2: get article extracts
        extract_params = {
            "action": "query",
            "titles": "|".join(titles),
            "prop": "extracts",
            "exintro": True,
            "explaintext": True,
            "format": "json",
            "exsentences": 6
        }
        er = requests.get(search_url, params=extract_params, timeout=8)
        ed = er.json()
        
        articles = []
        for page in ed.get("query", {}).get("pages", {}).values():
            if page.get("extract") and page.get("pageid", -1) > 0:
                articles.append({
                    "title": page["title"],
                    "text": page["extract"].strip(),
                    "url": f"https://en.wikipedia.org/wiki/{page['title'].replace(' ', '_')}"
                })
        return articles
    
    except Exception as e:
        print(f"Wikipedia search error: {e}")
        return []


def build_context(ddg_results, wiki_articles):
    """Combine DDG and Wikipedia results into one context string for AI"""
    parts = []
    for i, r in enumerate(ddg_results):
        parts.append(f"[DDG-{i+1}] {r['text']}")
    for i, a in enumerate(wiki_articles):
        parts.append(f"[WIKI-{i+1}] {a['text']}")
    return "\n\n".join(parts)