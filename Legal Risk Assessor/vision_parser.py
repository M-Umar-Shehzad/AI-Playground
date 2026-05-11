import base64
import os
from groq import Groq
import groq
from settings import settings

# Initialize the Groq client using settings
client = Groq(api_key=settings.GROQ_API_KEY)

def _detect_mime_type(image_bytes: bytes) -> str:
    """Detect image MIME type from magic bytes.
    Critical fix: Streamlit camera_input returns PNG, not JPEG.
    Hardcoding 'image/jpeg' was causing the model to fail on camera images.
    """
    if image_bytes[:8] == b'\x89PNG\r\n\x1a\n':
        return "image/png"
    elif image_bytes[:3] == b'\xff\xd8\xff':
        return "image/jpeg"
    elif image_bytes[:4] == b'RIFF' and image_bytes[8:12] == b'WEBP':
        return "image/webp"
    elif image_bytes[:4] in (b'GIF8', b'GIF9'):
        return "image/gif"
    return "image/jpeg"  # safe fallback

def extract_text_from_image(image_bytes: bytes) -> str:
    """
    Extracts text from an image using Groq's Llama 4 Scout vision model.

    Args:
        image_bytes (bytes): The raw bytes of the image (e.g., from a file upload or camera).

    Returns:
        str: The raw text extracted from the image, or an error message string.
    """
    if not image_bytes:
        return "Error: Empty image data provided."

    try:
        # Groq enforces a 4MB limit for base64-encoded images
        MAX_SIZE_BYTES = 4 * 1024 * 1024
        if len(image_bytes) > MAX_SIZE_BYTES:
            return "Error: Image is too large (max 4MB). Please use a smaller or compressed image."

        mime_type = _detect_mime_type(image_bytes)
        base64_image = base64.b64encode(image_bytes).decode('utf-8')

        prompt = (
            "You are a high-accuracy OCR specialist for legal documents. "
            "Transcribe every single word from this contract image exactly as it appears. "
            "Do not summarize, interpret, or add any commentary. "
            "Return ONLY the raw text found in the image, preserving line breaks where possible."
        )

        response = client.chat.completions.create(
            model=settings.VISION_MODEL_NAME,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:{mime_type};base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_completion_tokens=4000
        )

        result_text = response.choices[0].message.content

        if not result_text or not result_text.strip():
            return "Error: The model returned an empty response. The image may be blank or too low resolution."

        return result_text.strip()

    except groq.RateLimitError:
        return "Error: Rate limit exceeded. Please check your Groq API quota."
    except groq.APIConnectionError:
        return "Error: Failed to connect to the Groq API. Check your network connection."
    except groq.APIError as e:
        return f"Error: Groq API Error: {str(e)}"
    except Exception as e:
        return f"Error: An unexpected error occurred during image transcription: {str(e)}"

if __name__ == "__main__":
    test_image_path = "test_contract.jpg"
    print(f"--- Testing Vision Parser Module with '{test_image_path}' ---")

    if not settings.GROQ_API_KEY:
        print("\n[ERROR] GROQ_API_KEY is not set in your .env file.")
    else:
        if not os.path.exists(test_image_path):
            print(f"\n[NOTICE] '{test_image_path}' not found in the current directory.")
        else:
            print("\nTranscribing image...")
            try:
                with open(test_image_path, "rb") as image_file:
                    image_bytes = image_file.read()
                result = extract_text_from_image(image_bytes)
                print("\n--- Transcription Result ---")
                print("-" * 40)
                print(result)
                print("-" * 40)
            except Exception as e:
                print(f"\n[ERROR] Could not read test image: {e}")
