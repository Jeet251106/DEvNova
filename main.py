from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
import json
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

class AnalyzeRequest(BaseModel):
    text: str

@app.post("/api/analyze")
async def analyze_text(request: AnalyzeRequest):
    load_dotenv(override=True)
    key = os.environ.get("GROQ_API_KEY", "").strip()
    if not key or key == "your_key_here":
        raise HTTPException(status_code=500, detail="GROQ_API_KEY not configured securely in .env")
    
    client = Groq(api_key=key)
    
    prompt = f"""
You are the core intelligence engine of 'Cyber Secure', a hyper-advanced real-time threat detection cybersecurity system.
Your goal is to parse user-provided content and strictly classify it based on security indicators.

RULES FOR EVALUATION:
1. If the text appears to be a normal conversation, standard business email, or benign message without suspicious links or credential requests, MUST classify severity as "SAFE".
2. If the text uses extreme urgency (e.g. "locked account", "action required immediately") and contains suspicious links or asks for passwords, MUST classify severity as "HIGH" and category as "Phishing".
3. If the text offers free prizes, unsolicited gifts, or asks for a small shipping fee to claim a prize, MUST classify severity as "MEDIUM" and category as "Social Engineering".
4. If there are minor anomalies but no direct threat or payload, classify as "LOW".

Output STRICTLY valid JSON with this exact schema (no markdown formatting, no code blocks):
{{
  "category": "Phishing" | "Social Engineering" | "Suspicious" | "Unusual" | "Safe",
  "severity": "HIGH" | "MEDIUM" | "LOW" | "SAFE",
  "explanation": "A single fluent sentence explaining exactly why this classification was chosen based on the rules.",
  "recommendations": ["Action item 1", "Action item 2"]
}}

CONTENT TO ANALYZE:
\"\"\"{request.text}\"\"\"
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
