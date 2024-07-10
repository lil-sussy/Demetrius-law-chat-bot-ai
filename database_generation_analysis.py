# main.py
import yake
import os
import logging
from law_pdf_parser import extract_articles_from_pdf
from dotenv import load_dotenv 
from tqdm import tqdm
load_dotenv() 


# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def extract_keywords_from_article(text, num_keywords):
    kw_extractor = yake.KeywordExtractor(lan="en", n=3, dedupLim=0.9, top=num_keywords)
    keywords = kw_extractor.extract_keywords(text)
    return [kw[0] for kw in keywords]

def generate_markdown(articles, document_name, output_dir):
    """Generate a markdown file containing all articles from a document."""
    output_filename = f"{document_name}-articles.md"
    output_path = os.path.join(output_dir, output_filename)
    
    with open(output_path, 'w', encoding='utf-8') as f:
        for article in tqdm(articles, f"Saving {output_filename}"):
            f.write(f"\n### Article {article['article']}\n>{article['content']}\n---\n\n")
    
    logger.info(f"Generated markdown file: {output_filename}")

def process_document(pdf_path, output_dir):
    """Process a single PDF document."""
    document_name = os.path.splitext(os.path.basename(pdf_path))[0]
    
    try:
        articles = extract_articles_from_pdf(pdf_path)
        
        # Extract keywords for each article
        for article in articles:
            num_keywords = max(int(len(article['content']) * 0.05), 1)
            keywords = extract_keywords_from_article(article['content'], num_keywords)
            article['keywords'] = keywords
        
        # Generate markdown file
        generate_markdown(articles, document_name, output_dir)
        
        logger.info(f"Processed {document_name}")
    except Exception as e:
        logger.error(f"Error processing {document_name}: {str(e)}")

def main():
    # Load configuration
    
    # Create output directory if it doesn't exist
    output_dir = "./database/outputs/"
    os.makedirs(output_dir, exist_ok=True)
    
    # Process each PDF in the input directory
    input_dir = "./database/laws/"
    for filename in os.listdir(input_dir):
        if filename.endswith('.pdf'):
            pdf_path = os.path.join(input_dir, filename)
            process_document(pdf_path, output_dir)

if __name__ == "__main__":
    main()