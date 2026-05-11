# ⚖️ Legal Risk Assessor

> **AI-powered contract auditing for freelancers — know your risks before you sign.**

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io)

---

## 🎯 The Mission

Freelancers often lack the resources to hire expensive legal counsel to review every contract they sign. The **Legal Risk Assessor** levels the playing field — an AI-driven tool that empowers independent professionals by automatically auditing legal documents, identifying potential risks, and generating professional pushback emails before you sign on the dotted line.

---

## 🏗️ Architecture

| Module | Role |
|---|---|
| `document_parser.py` | Extracts text from PDF contracts via PyMuPDF |
| `vision_parser.py` | Processes camera-captured contract images via Groq Vision |
| `validator.py` | Gatekeeper — verifies the document is actually a legal contract |
| `risk_assessor.py` | Deep risk analysis and negotiation email generation via Groq |
| `settings.py` | Centralized environment & model configuration |
| `app.py` | Swiss Minimalist Streamlit UI |

**AI Stack:** [Groq](https://groq.com) — `openai/gpt-oss-120b` (reasoning) + `meta-llama/llama-4-scout-17b-16e-instruct` (vision)

---

## 🚀 Local Setup

### 1. Clone the repository
```bash
git clone https://github.com/M-Umar-Shehzad/legal-risk-assessor.git
cd legal-risk-assessor
```

### 2. Create a virtual environment
```bash
python -m venv venv
source venv/bin/activate   # Windows: venv\Scripts\activate
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure environment variables
```bash
cp .env.example .env
# Open .env and add your Groq API key:
# GROQ_API_KEY=your_groq_api_key_here
```

Get your free Groq API key at → [console.groq.com](https://console.groq.com)

### 5. Run the app
```bash
streamlit run app.py
```

---

## ☁️ Deploy on Streamlit Community Cloud

1. Fork or push this repo to your GitHub account
2. Go to [share.streamlit.io](https://share.streamlit.io) and sign in with GitHub
3. Click **"New app"** → select this repo → set `app.py` as the entry point
4. Under **Advanced settings → Secrets**, add:
   ```toml
   GROQ_API_KEY = "your_groq_api_key_here"
   ```
5. Click **Deploy** — your app will be live in ~60 seconds 🚀

---

## 🔐 Security

- **Never commit your `.env` file** — it is gitignored
- Use `.env.example` as a template; fill in real values locally only
- On Streamlit Cloud, inject secrets via the Secrets manager (never hardcode)
- Rotate your API key immediately if it is ever exposed

---

## 📄 License

MIT — use freely, audit safely.
