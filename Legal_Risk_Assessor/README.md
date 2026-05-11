# ⚖️ Legal_Risk_Assessor

> **AI-powered contract auditing for freelancers — know your risks before you sign.**

[![Streamlit App](https://static.streamlit.io/badges/streamlit_badge_black_white.svg)](https://share.streamlit.io)

---

## 🎯 The Mission

Freelancers often lack the resources to hire expensive legal counsel to review every contract they sign. The **Legal_Risk_Assessor** levels the playing field — an AI-driven tool that empowers independent professionals by automatically auditing legal documents, identifying potential risks, and generating professional pushback emails before you sign on the dotted line.

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
