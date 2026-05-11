import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings:
    """Application configuration and environment management."""
    GROQ_API_KEY = os.getenv("GROQ_API_KEY")
    MODEL_NAME = "openai/gpt-oss-120b"                            # 120B reasoning model — flagship quality
    VISION_MODEL_NAME = "meta-llama/llama-4-scout-17b-16e-instruct"  # Vision model on Groq

    @classmethod
    def validate(cls):
        if not cls.GROQ_API_KEY:
            print("Warning: GROQ_API_KEY is not set in the .env file. Please add your API key.")

# Instantiate and validate settings upon import
settings = Settings()
settings.validate()

if __name__ == "__main__":
    # Test block to verify environment is loaded correctly
    print("--- Settings Verification ---")
    print(f"Model Name: {settings.MODEL_NAME}")
    print(f"Vision Model Name: {settings.VISION_MODEL_NAME}")
    if settings.GROQ_API_KEY:
        print("API Key: Loaded (Hidden for security)")
    else:
        print("API Key: Missing")
    print("---------------------------")
