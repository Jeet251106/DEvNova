from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
import re
import tldextract
from groq import Groq
from dotenv import load_dotenv
from fastapi.responses import FileResponse

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Expanded Trust List (Root Domains)
TRUSTED_DOMAINS = {
    "google.com", "microsoft.com", "apple.com", "amazon.com", "meta.com", "facebook.com", "instagram.com", "whatsapp.com",
    "github.com", "gitlab.com", "bitbucket.org", "stackoverflow.com", "reddit.com", "linkedin.com", "twitter.com", "x.com",
    "gmail.com", "outlook.com", "hotmail.com", "icloud.com", "yahoo.com", "proton.me", "protonmail.com", "dropbox.com",
    "slack.com", "discord.com", "zoom.us", "salesforce.com", "paypal.com", "stripe.com", "visa.com", "mastercard.com",
    "netflix.com", "spotify.com", "youtube.com", "wikipedia.org", "bing.com", "duckduckgo.com",
    "onrender.com", "vercel.app", "netlify.app", "github.io"
}

def get_root_domain(text: str):
    extracted = tldextract.extract(text)
    if not extracted.domain or not extracted.suffix:
        return None
    return f"{extracted.domain}.{extracted.suffix}".lower()

def levenshtein_distance(s1, s2):
    if len(s1) < len(s2):
        return levenshtein_distance(s2, s1)
    if len(s2) == 0:
        return len(s1)
    previous_row = range(len(s2) + 1)
    for i, c1 in enumerate(s1):
        current_row = [i + 1]
        for j, c2 in enumerate(s2):
            insertions = previous_row[j + 1] + 1
            deletions = current_row[j] + 1
            substitutions = previous_row[j] + (c1 != c2)
            current_row.append(min(insertions, deletions, substitutions))
        previous_row = current_row
    return previous_row[-1]

def find_lookalike(domain: str):
    if not domain: return None
    for trusted in TRUSTED_DOMAINS:
        dist = levenshtein_distance(domain, trusted)
        # If it's 1 or 2 edits away, it's likely a look-alike
        if 0 < dist <= 2:
            return trusted
    return None

class AnalyzeRequest(BaseModel):
    text: str

@app.post("/api/analyze")
async def analyze_text(request: AnalyzeRequest):
    load_dotenv(override=True)
    key = os.environ.get("GROQ_API_KEY", "").strip()
    if not key or key == "your_key_here":
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured securely in .env")
    
    content = request.text.strip()
    content_lower = content.lower()
    
    # 1. BARE URL WHITELIST & TYPO CHECK
    root = get_root_domain(content_lower)
    if root and len(content.split()) == 1:
        if root in TRUSTED_DOMAINS:
            return {
                "category": "Safe",
                "severity": "SAFE",
                "explanation": f"The domain '{root}' is a verified high-reputation service. Bare access is safe.",
                "recommendations": ["No action required. This service is trusted."]
            }
        
        # Check for Look-alikes (e.g. linkdin.com)
        lookalike = find_lookalike(root)
        if lookalike:
            return {
                "category": "Phishing",
                "severity": "HIGH",
                "explanation": f"CRITICAL: The domain '{root}' is a look-alike of the trusted service '{lookalike}'. This is a high-risk typosquatting technique.",
                "recommendations": ["DO NOT enter credentials.", "Close this page immediately.", "Always check the URL carefully."]
            }
    
    # 2. EMAIL SENDER HEURISTIC
    email_domains = re.findall(r"@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})", content_lower)
    trusted_sender = any(get_root_domain(d) in TRUSTED_DOMAINS for d in email_domains)
    
    # Check if any email domain is a look-alike
    sender_lookalike = None
    for d in email_domains:
        root_d = get_root_domain(d)
        if root_d:
            sender_lookalike = find_lookalike(root_d)
            if sender_lookalike: break

    # Extract all URLs to see if there's a mismatch
    all_urls = re.findall(r'(https?://[^\s<>"]+|www\.[^\s<>"]+)', content_lower)
    malicious_links_found = False
    link_lookalike = None
    
    for url in all_urls:
        url_root = get_root_domain(url)
        if url_root:
            if url_root not in TRUSTED_DOMAINS:
                if trusted_sender:
                     malicious_links_found = True
                
                # Check link itself for look-alike
                found = find_lookalike(url_root)
                if found:
                    link_lookalike = found

    client = Groq(api_key=key)
    
    prompt = f"""
You are the intelligence engine of 'Cyber Secure'. Classify content based on security signals.

SYSTEM DATA:
- Trusted Root Domains: {", ".join(list(TRUSTED_DOMAINS)[:15])}...
- Sender appears trusted: {"YES" if trusted_sender else "NO"}
- Sender looks like a fake version of: {sender_lookalike or "None"}
- Untrusted links found: {"YES" if malicious_links_found else "NO"}
- Links found to look-alike domains: {link_lookalike or "None"}

CLASSIFICATION PHILOSOPHY:
- BENIGN-BY-DEFAULT: Legitimate services send security alerts. If it's from the OFFICIAL domain, it is SAFE.
- PHISHING: FLAG DECEPTION. Look-alike domains (e.g., linkdin.com, g00gle.com) are CRITICAL PHISHING signals.

EXAMPLES:
1. "Your Google Account signed in." Sender: @google.com -> SAFE.
2. "Urgent: LinkedIn account locked. Login here: linkdin.com" -> PHISHING (HIGH).

CONTENT TO ANALYZE:
\"\"\"{request.text}\"\"\"

Output STRICTLY JSON:
{{
  "category": "Phishing" | "Social Engineering" | "Suspicious" | "Unusual" | "Safe",
  "severity": "HIGH" | "MEDIUM" | "LOW" | "SAFE",
  "signals": ["Signal 1", "Signal 2"],
  "explanation": "Brief explanation. Mention if look-alikes or trusted senders were detected.",
  "recommendations": ["Action item"]
}}
"""
    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.0,
            response_format={"type": "json_object"}
        )
        response_content = completion.choices[0].message.content
        return json.loads(response_content)
    except Exception as e:
        print(e)
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/")
def serve_index():
    return FileResponse("index.html")

@app.get("/styles.css")
def serve_css():
    return FileResponse("styles.css")

@app.get("/script.js")
def serve_js():
    return FileResponse("script.js")
