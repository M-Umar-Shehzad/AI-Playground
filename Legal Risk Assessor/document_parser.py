import fitz  # PyMuPDF
import re
import os

def clean_text(text: str) -> str:
    """
    Cleans the extracted text by normalizing whitespace and ensuring valid encoding.
    
    Args:
        text (str): The raw extracted text from the PDF.
        
    Returns:
        str: The cleaned, normalized string with preserved paragraph structures.
    """
    # Ensure text is clean by encoding and decoding, dropping characters that cannot be UTF-8 encoded
    text = text.encode("utf-8", "ignore").decode("utf-8")
    
    # Replace 3 or more newlines with exactly 2 newlines to preserve paragraphs
    # but remove excessive vertical whitespace
    cleaned_text = re.sub(r'\n{3,}', '\n\n', text)
    
    return cleaned_text.strip()

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts and concatenates text from all pages of a given PDF file.
    
    Args:
        file_path (str): The path to the PDF file to be processed.
        
    Returns:
        str: The extracted and cleaned text from the PDF.
             Returns an error message string if the file is encrypted or unreadable.
    """
    try:
        # Open the PDF document
        doc = fitz.open(file_path)
        
        # Check if the document is encrypted
        if doc.is_encrypted:
            return "Error: The provided PDF is encrypted and cannot be read."
            
        full_text = []
        # Iterate through every page
        for page_num in range(len(doc)):
            page = doc[page_num]
            # Extract text from the page
            page_text = page.get_text()
            full_text.append(page_text)
            
        doc.close()
        
        # Concatenate all pages
        raw_text = "\n".join(full_text)
        
        # Clean the concatenated text
        return clean_text(raw_text)
        
    except fitz.FileDataError:
        return "Error: The file is not a valid PDF or is corrupted."
    except FileNotFoundError:
        return f"Error: The file '{file_path}' was not found."
    except Exception as e:
        return f"Error: An unexpected error occurred while reading the PDF: {str(e)}"

if __name__ == "__main__":
    # Test block to verify the document parser
    test_pdf_path = "test_contract.pdf"
    
    print(f"--- Testing Document Parser with '{test_pdf_path}' ---")
    
    # For testing purposes, if the file does not exist, let's create a dummy one
    if not os.path.exists(test_pdf_path):
        print(f"Notice: '{test_pdf_path}' not found. Creating a dummy PDF for verification...")
        try:
            doc = fitz.open()
            page = doc.new_page()
            page.insert_text((50, 50), "This is a dummy test contract.\n\nIt has multiple paragraphs.\n\nHere is the second clause.")
            doc.save(test_pdf_path)
            doc.close()
            print("Dummy PDF created successfully.\n")
        except Exception as e:
            print(f"Could not create dummy PDF: {e}")

    print("Extracting text...")
    extracted_text = extract_text_from_pdf(test_pdf_path)
    
    if extracted_text.startswith("Error:"):
        print(extracted_text)
    else:
        char_count = len(extracted_text)
        print(f"\n--- Extraction Successful ---")
        print(f"Total Character Count: {char_count}")
        print("\nFirst 500 characters:\n")
        print("-" * 40)
        # Slicing safely, even if string is shorter than 500 chars
        print(extracted_text[:500])
        print("-" * 40)
