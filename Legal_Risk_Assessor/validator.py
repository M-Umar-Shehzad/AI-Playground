import json
import re
from pydantic import BaseModel, ValidationError
from groq import Groq
import groq
from settings import settings

def _strip_thinking(content: str) -> str:
    """Strip DeepSeek-R1 <think>...</think> reasoning blocks before JSON parsing."""
    return re.sub(r'<think>.*?</think>', '', content, flags=re.DOTALL).strip()

class ValidationResult(BaseModel):
    is_contract: bool
    confidence_score: float
    reasoning: str

# Initialize the Groq client using settings
client = Groq(api_key=settings.GROQ_API_KEY)

def is_valid_contract(text: str) -> dict:
    """
    Analyzes the provided text to determine if it is a legally binding document.
    
    Args:
        text (str): The extracted text to validate.
        
    Returns:
        dict: A dictionary containing 'is_contract' (bool), 'confidence_score' (float), 
              and 'reasoning' (str).
    """
    # Guardrail: Prevent API calls for extremely short, invalid texts
    if not text or len(text.strip()) < 100:
        return {
            "is_contract": False,
            "confidence_score": 1.0,
            "reasoning": "Text is too short to be a valid contract."
        }
        
    system_prompt = (
        "You are a legal document classifier. Your job is to analyze the provided text and "
        "determine if it is a legally binding document, an agreement, a contract, or a formal "
        "legal notice (e.g., NDA, MSA, Terms of Service, Employment Agreement).\n\n"
        "Distinguish between actual legal text and 'junk' such as recipes, personal letters, "
        "casual chat logs, or school essays.\n\n"
        "Return ONLY a JSON object that matches this schema exactly:\n"
        "{\n"
        '  "is_contract": boolean,\n'
        '  "confidence_score": float,\n'
        '  "reasoning": string\n'
        "}"
    )
    
    try:
        response = client.chat.completions.create(
            model=settings.MODEL_NAME,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": f"Please classify the following text:\n\n{text}"}
            ],
            response_format={"type": "json_object"},
        )
        
        content = response.choices[0].message.content
        if not content:
            return {
                "is_contract": False,
                "confidence_score": 0.0,
                "reasoning": "API returned an empty output."
            }
        
        content = _strip_thinking(content)
            
        try:
            result = ValidationResult.model_validate_json(content)
            return result.model_dump()
        except ValidationError as ve:
            return {
                "is_contract": False,
                "confidence_score": 0.0,
                "reasoning": f"Failed to parse JSON into expected format: {str(ve)}"
            }
            
    except groq.RateLimitError:
        return {
            "is_contract": False,
            "confidence_score": 0.0,
            "reasoning": "Rate limit exceeded. Please check your Groq API quota."
        }
    except groq.APIConnectionError:
        return {
            "is_contract": False,
            "confidence_score": 0.0,
            "reasoning": "Failed to connect to the Groq API. Check your network connection."
        }
    except groq.APIError as e:
        return {
            "is_contract": False,
            "confidence_score": 0.0,
            "reasoning": f"Groq API Error: {str(e)}"
        }
    except Exception as e:
        return {
            "is_contract": False,
            "confidence_score": 0.0,
            "reasoning": f"An unexpected error occurred during validation: {str(e)}"
        }

if __name__ == "__main__":
    print("--- Testing Validator Module ---")
    
    # We pad the test strings slightly to ensure they pass the >100 char guardrail
    test_cases = [
        {
            "name": "Valid",
            "text": "This Mutual Non-Disclosure Agreement is entered into by and between the parties listed below. The Receiving Party agrees that it will not disclose, publish, or otherwise disseminate Confidential Information to anyone other than those of its employees with a need to know, and that it will take reasonable precautions to prevent any unauthorized use, disclosure, publication, or dissemination of Confidential Information."
        },
        {
            "name": "Invalid",
            "text": "To make the best pancakes, you need 2 cups of flour and 1 cup of milk. Whisk the dry ingredients together in a large bowl. In a separate bowl, whisk the wet ingredients. Combine them together and let the batter sit for 5 minutes before cooking on a hot griddle."
        },
        {
            "name": "Ambiguous",
            "text": "I promise to give you $50 if you help me move my couch this Saturday. You have to bring your own truck though, and if you scratch the couch, you owe me a new one. Deal? We can grab some pizza and beers right after."
        }
    ]
    
    if not settings.GROQ_API_KEY:
        print("\n[ERROR] Cannot test Validator: GROQ_API_KEY is not set in your .env file.")
        print("Please add your API key to proceed with the test.")
    else:
        for tc in test_cases:
            print(f"\nEvaluating: [{tc['name']}]")
            print("-" * 40)
            result = is_valid_contract(tc['text'])
            print(json.dumps(result, indent=2))
