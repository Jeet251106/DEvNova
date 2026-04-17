# CYBER SECURE | AI-Based Cybersecurity Awareness Solution

Welcome to **CYBER SECURE**, an interactive, Python-backed web application designed to educate users about cybersecurity threats in real-time using real AI inference!

![Theme Preview](https://via.placeholder.com/800x400?text=Premium+Dark+Theme+Inspired+Dashboard)

## 🚀 Key Features

1.  **True AI Threat Analyzer**
    The platform leverages `FastAPI` to securely send your input data to **Groq API** (Llama3) for instantaneous, deep heuristic threat analysis. Since the script runs securely on a backend, your API keys are never exposed to the public!
    *(Note: If the backend goes offline, the frontend seamlessly degrades to a local Heuristic AI engine ensuring your project never stops working).*

2.  **File Upload parsing (OCR & PDF)**
    Supported via `Tesseract.js` and `PDF.js` right inside your browser! Drag and drop `.pdf`, `.png`, `.jpg`, and `.eml` files into the Dropzone. The browser parses text locally and then runs it against the selected threat engine.

3.  **Forward via Email**
    Instantly format and mail your Threat Scan results via your device's default mail client with the click of a button!

4.  **Dotted Surface Theme**
    Features an exquisite physics-based animated dotted wave surface utilizing `<canvas>` background animation matching the "efferd" component design, providing a 3D wave feeling underneath the Glassmorphism application cards.

## 🛠️ Tech Stack & Constraints

-   **Frontend:** HTML5, CSS3, Vanilla JS.
-   **Backend:** Python `FastAPI` & `Uvicorn`
-   **Libraries:** `pdf.js` (PDF parsing), `Tesseract.js` (OCR parsing), `Chart.js`, `jsPDF`.
-   **NO NODE.JS!** As per requirements, there is no package.json or Javascript-based build pipeline.

## 📋 Steps for Execution

To run the application and securely hide your API keys:

### 1. Setup the Groq API Key
1. Go to [console.groq.com](https://console.groq.com/keys) and create a free API Key.
2. Open the `.env` file in the root folder and replace `your_key_here` with your copied key:
   `GROQ_API_KEY=gsk_your_key_goes_here`

### 2. Start the FastAPI Server
Ensure you have Python installed. Open your terminal in this project directory:
```bash
pip install -r requirements.txt
uvicorn main:app --reload
```
The server will now be listening on `http://127.0.0.1:8000/api/analyze` for the UI!

### 3. Open the UI
Simply double-click `index.html` to open it in Chrome, Edge, or Firefox. 

---
_Designed using a high-tech "SOC Dashboard" design language, bringing the premium glassmorphism dark-theme aesthetics to life._
