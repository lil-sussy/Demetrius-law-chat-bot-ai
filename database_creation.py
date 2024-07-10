import yake

def extract_keywords_from_article(text, num_keywords):
    kw_extractor = yake.KeywordExtractor(lan="en", n=3, dedupLim=0.9, top=num_keywords)
    keywords = kw_extractor.extract_keywords(text)
    return [kw[0] for kw in keywords]

def generate_embeddings(text):
  return [0.0] * 768


import os
import logging
from law_pdf_parser import extract_articles_from_pdf
from database_interfaces import ChromaDBInterface
from database_interfaces import Neo4jInterface
from tqdm import tqdm
from dotenv import load_dotenv 
load_dotenv() 

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def process_article(article, document_name, chroma_db, neo4j_db):
    """Process a single article."""
    # Generate embeddings
    article_embedding = generate_embeddings(article['content'])
    
    # Extract keywords
    num_keywords = max(int(len(article['content']) * 0.05), 1)
    keywords = extract_keywords_from_article(article['content'], num_keywords)
    
    # Store in ChromaDB
    chroma_db.store_article(document_name, article['number'], article['content'], article_embedding)
    
    # Store in Neo4j
    neo4j_db.store_article(document_name, article['number'], article['content'])
    
    logger.info(f"Processed Article {article['number']} from {document_name}")
    return keywords

def main():
    chroma_db = ChromaDBInterface(os.environ.get('CHROMA_DB_PATH'))
    chroma_db.clear()
    # neo4j_db = Neo4jInterface(os.environ.get('NEO4J_URI'), os.environ.get('NEO4J_USER'), os.environ.get('NEO4J_PASSWORD'))
    
    # Process each PDF in the input directory
    input_dir = "database/laws/"
    for filename in tqdm(os.listdir(input_dir), desc="Processing files"):
        if filename.endswith('.pdf'):
            pdf_path = os.path.join(input_dir, filename)
            document_name = os.path.splitext(filename)[0]
            
            logger.info(f"Processing {filename}")
            
            articles = extract_articles_from_pdf(pdf_path)
            keywords = set()
            for article in articles:
                new_keywords = process_article(article, document_name, chroma_db, neo4j_db)
                keywords.update(new_keywords)
                print()
            chroma_db.store_keywords(document_name, article['number'], list(keywords))        
            logger.info(f"Completed processing {filename}")
    
    # Close database connections
    chroma_db.close()
    # neo4j_db.close()

if __name__ == "__main__":
    main()