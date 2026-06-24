import streamlit as st
import tempfile
import os
import html
from document_parser import extract_text_from_pdf
from vision_parser import extract_text_from_image
from validator import is_valid_contract
from risk_assessor import analyze_contract

# 1. Core Setup
st.set_page_config(layout="wide", page_title="Legal Risk Assessor", page_icon="⚖️")

# 2. Premium Styling (CSS Injection)
custom_css = """
<style>
/* Base Theme */
.stApp {
    background-color: #050505;
}

/* Hide Header/Footer */
header {visibility: hidden;}
footer {visibility: hidden;}

/* Typography */
html, body, [class*="css"] {
    font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif !important;
    color: #F5F5F5;
}

h1, h2, h3 {
    font-weight: 300 !important;
    color: #FFFFFF !important;
    letter-spacing: -0.02em;
}

/* Custom Scrollbar */
::-webkit-scrollbar {
    width: 6px;
    height: 6px;
}
::-webkit-scrollbar-track {
    background: transparent;
}
::-webkit-scrollbar-thumb {
    background: #333333;
    border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover {
    background: #555555;
}

/* Risk Badges */
.badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-radius: 6px;
    margin-left: 12px;
    vertical-align: middle;
}
.badge-high {
    background-color: rgba(211, 47, 47, 0.15);
    color: #D32F2F;
    border: 1px solid rgba(211, 47, 47, 0.3);
}
.badge-medium {
    background-color: rgba(255, 143, 0, 0.15);
    color: #FF8F00;
    border: 1px solid rgba(255, 143, 0, 0.3);
}
.badge-low {
    background-color: rgba(29, 185, 84, 0.15);
    color: #1DB954;
    border: 1px solid rgba(29, 185, 84, 0.3);
}

/* Risk Cards */
.risk-card {
    background-color: #0d0d0d;
    border: 1px solid #262626;
    border-radius: 12px;
    padding: 1.5rem;
    margin-bottom: 1rem;
    transition: transform 0.2s ease, border-color 0.2s ease;
}
.risk-card:hover {
    border-color: #404040;
}
.risk-title-wrapper {
    display: flex;
    align-items: center;
    margin-bottom: 1rem;
}
.risk-title {
    margin: 0 !important;
    font-size: 1.2rem !important;
    font-weight: 500 !important;
}
.risk-quote {
    border-left: 2px solid #333333;
    padding-left: 1rem;
    margin-bottom: 1rem;
    color: #999999;
    font-style: italic;
    font-size: 0.95rem;
    line-height: 1.5;
}
.risk-explanation {
    margin: 0 0 1rem 0 !important;
    color: #CCCCCC;
    font-size: 1rem;
    line-height: 1.6;
}

/* Validation Error Card */
.validation-error {
    background-color: rgba(211, 47, 47, 0.05);
    border: 1px solid #D32F2F;
    border-radius: 12px;
    padding: 2rem;
    text-align: center;
    margin-top: 2rem;
}
.validation-error h3 {
    color: #D32F2F !important;
    margin-bottom: 0.5rem !important;
}
</style>
"""
st.markdown(custom_css, unsafe_allow_html=True)

# Session State Management
if "contract_text" not in st.session_state:
    st.session_state.contract_text = None
if "validation_result" not in st.session_state:
    st.session_state.validation_result = None
if "analysis_results" not in st.session_state:
    st.session_state.analysis_results = None

def reset_state():
    st.session_state.contract_text = None
    st.session_state.validation_result = None
    st.session_state.analysis_results = None

# Sidebar
with st.sidebar:
    st.markdown("<h2>Settings</h2>", unsafe_allow_html=True)
    if st.button("🔄 Start Over", use_container_width=True):
        reset_state()
        st.rerun()

# Hero Section
st.markdown("<h1 style='font-size: 3.5rem; margin-bottom: 0;'>Legal Risk Assessor</h1>", unsafe_allow_html=True)
st.markdown("<p style='color: #888888; font-size: 1.2rem; margin-bottom: 3rem;'>Instant, AI-powered contract auditing for independent professionals.</p>", unsafe_allow_html=True)

# 3. Two-Way Input Logic
if not st.session_state.contract_text and not st.session_state.validation_result:
    input_method = st.radio("Select Input Method", ["Upload PDF", "Capture Photo"], horizontal=True)
    
    raw_text = None
    
    if input_method == "Upload PDF":
        uploaded_file = st.file_uploader("Upload Contract (PDF)", type=["pdf"])
        if uploaded_file and st.button("Process Document", type="primary"):
            with st.status("Reading PDF Document...", expanded=True) as status:
                st.write("Extracting text via document parser...")
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(uploaded_file.getvalue())
                    tmp_path = tmp.name
                try:
                    raw_text = extract_text_from_pdf(tmp_path)
                finally:
                    if os.path.exists(tmp_path):
                        os.unlink(tmp_path)
                status.update(label="PDF Processed", state="complete")
                
    elif input_method == "Capture Photo":
        camera_photo = st.camera_input("Capture Contract Photo")
        if camera_photo and st.button("Process Image", type="primary"):
            with st.status("Analyzing Image...", expanded=True) as status:
                st.write("Sending image to Vision AI for OCR...")
                image_bytes = camera_photo.getvalue()
                raw_text = extract_text_from_image(image_bytes)
                status.update(label="Image Processed", state="complete")

    # 4. The Integrated Pipeline
    if raw_text:
        if raw_text.startswith("Error:") or raw_text.startswith("ERROR:"):
            st.error(f"Extraction Failed: {raw_text}")
        else:
            with st.status("Consulting the digital lawyer...", expanded=True) as status:
                st.write("Running gatekeeper validation...")
                validation = is_valid_contract(raw_text)
                
                if not validation.get("is_contract", False):
                    status.update(label="Validation Failed", state="error")
                    st.session_state.validation_result = validation
                else:
                    st.write("Analyzing clauses for IP traps and liabilities...")
                    analysis = analyze_contract(raw_text)
                    st.session_state.contract_text = raw_text
                    st.session_state.validation_result = validation
                    st.session_state.analysis_results = analysis
                    status.update(label="Audit Complete", state="complete")
            st.rerun()

# Display Validation Error State
if st.session_state.validation_result and not st.session_state.validation_result.get("is_contract", False):
    reason = st.session_state.validation_result.get("reasoning", "Unknown reason.")
    st.markdown(f"""
    <div class="validation-error">
        <h3>Non-Legal Document Detected</h3>
        <p style="color: #F5F5F5; font-size: 1.1rem; margin-top: 1rem;">{reason}</p>
        <p style="color: #888888; font-size: 0.9rem; margin-top: 1rem;">Please upload a valid contract, agreement, or legal notice.</p>
    </div>
    """, unsafe_allow_html=True)

# 5. The Dashboard Layout (Split View)
elif st.session_state.contract_text and st.session_state.analysis_results:
    st.markdown("<br>", unsafe_allow_html=True)
    col1, col2 = st.columns([0.4, 0.6], gap="large")
    
    with col1:
        st.markdown("<h3 style='margin-bottom: 1rem;'>Original Document Text</h3>", unsafe_allow_html=True)
        with st.container(height=800):
            safe_text = html.escape(st.session_state.contract_text)
            st.markdown(
                f"<div style='white-space: pre-wrap; font-size: 0.85rem; line-height: 1.6; color: #999999;'>{safe_text}</div>", 
                unsafe_allow_html=True
            )
            
    with col2:
        st.markdown("<h3 style='margin-bottom: 1rem;'>Risk Feed</h3>", unsafe_allow_html=True)
        results = st.session_state.analysis_results
        
        if "error" in results and not results.get("risks"):
            st.error(results["error"])
        elif not results.get("risks"):
            st.success("No critical risks identified. The contract appears safe based on our parameters.")
        else:
            for risk in results["risks"]:
                level = risk.get("risk_level", "Medium").lower()
                badge_class = f"badge-{level}"
                title = html.escape(risk.get("clause_title", "Risk Item"))
                quote = html.escape(risk.get("original_text", ""))
                explanation = html.escape(risk.get("plain_english", ""))
                pushback = risk.get("pushback_email", "No pushback text provided.")
                
                card_html = f"""
                <div class="risk-card">
                    <div class="risk-title-wrapper">
                        <h4 class="risk-title">{title}</h4>
                        <span class="badge {badge_class}">{level.upper()} RISK</span>
                    </div>
                    <div class="risk-quote">"{quote}"</div>
                    <p class="risk-explanation">{explanation}</p>
                </div>
                """
                st.markdown(card_html, unsafe_allow_html=True)
                
                st.markdown("<p style='color: #888888; font-size: 0.85rem; margin-bottom: 0.3rem; text-transform: uppercase; letter-spacing: 0.05em;'>Suggested Pushback Email</p>", unsafe_allow_html=True)
                st.code(pushback, language="text")
                st.markdown("<div style='margin-bottom: 2rem;'></div>", unsafe_allow_html=True)
