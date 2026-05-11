import json
import re
from typing import Literal
from pydantic import BaseModel, ValidationError
from groq import Groq
import groq
from settings import settings

def _strip_thinking(content: str) -> str:
    """Strip DeepSeek-R1 <think>...</think> reasoning blocks before JSON parsing."""
    return re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()

# 1. Pydantic Schema Definition
class RiskItem(BaseModel):
    clause_title: str
    original_text: str
    plain_english: str
    risk_level: Literal["High", "Medium", "Low"]
    pushback_email: str

class ContractAnalysis(BaseModel):
    risks: list[RiskItem]

# Initialize the Groq client
# It will use the key loaded into settings.py (which uses os.getenv)
client = Groq(api_key=settings.GROQ_API_KEY)

def analyze_contract(contract_text: str) -> dict:
    """
    Analyzes contract text using Groq to identify risks for freelancers.
    
    Args:
        contract_text (str): The extracted text from the legal document.
        
    Returns:
        dict: A dictionary containing the structured analysis results (list of risks),
              or a structured error response if the API call fails.
    """
    if not contract_text.strip():
        return {"error": "The provided contract text is empty.", "risks": []}
        
    system_prompt = (
        "You are a senior, aggressive contract lawyer reviewing documents on behalf of freelancers "
        "and startup founders (the 'little guy'). Your job is to find any clause that could hurt them "
        "financially, legally, or operationally (e.g., Net-90 terms, IP traps, infinite revisions, "
        "one-sided termination). Do not be conservative. Flag the risks clearly. Provide actionable, "
        "professional pushback emails they can copy-paste to negotiate better terms.\n\n"
        "Return ONLY a JSON object that matches this schema exactly:\n"
        "{\n"
        '  "risks": [\n'
        "    {\n"
        '      "clause_title": string,\n'
        '      "original_text": string,\n'
        '      "plain_english": string,\n'
        '      "risk_level": "High" | "Medium" | "Low",\n'
        '      "pushback_email": string\n'
        "    }\n"
        "  ]\n"
        "}"
    )
    
    try:
        response = client.chat.completions.create(
            model=settings.MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Please review the following contract text:\n\n{contract_text}"}
            ],
            response_format={"type": "json_object"},
        )
        
        content = response.choices[0].message.content
        if not content:
            return {"error": "Failed to parse the contract correctly. API returned empty output.", "risks": []}
        
        content = _strip_thinking(content)
            
        try:
            analysis = ContractAnalysis.model_validate_json(content)
            return analysis.model_dump()
        except ValidationError as ve:
            return {"error": f"Failed to parse JSON into expected format: {str(ve)}", "risks": []}
            
    except groq.RateLimitError:
        return {"error": "Rate limit exceeded. Please check your Groq API quota.", "risks": []}
    except groq.APIConnectionError:
        return {"error": "Failed to connect to the Groq API. Check your network connection.", "risks": []}
    except groq.APIError as e:
        return {"error": f"Groq API Error: {str(e)}", "risks": []}
    except Exception as e:
        return {"error": f"An unexpected error occurred during analysis: {str(e)}", "risks": []}

if __name__ == "__main__":
    # Test block to verify the LLM logic
    test_clause = (
        "Contractor agrees to Net-90 payment terms and grants Client exclusive, "
        "irrevocable ownership of all background IP. Client may request unlimited "
        "revisions until satisfied."
    )
    
    print("--- Testing Risk Assessor Module ---")
    print("\nInput Clause:")
    print("-" * 40)
    print(test_clause)
    print("-" * 40)
    
    if not settings.GROQ_API_KEY:
        print("\n[ERROR] Cannot test Risk Assessor: GROQ_API_KEY is not set in your .env file.")
        print("Please add your API key to proceed with the test.")
    else:
        print("\nAnalyzing contract... (This may take a few seconds)")
        result = analyze_contract(test_clause)
        
        print("\n--- Analysis Result ---")
        print(json.dumps(result, indent=2))
