# pdf_parser.py

import re
import PyPDF2
import spacy
from tqdm import tqdm


nlp = spacy.load('fr_core_news_sm')
nlp.max_length = 3*10**6

def extract_articles_from_pdf(pdf_path):
    articles = []
    articles_units = []
    with open(pdf_path, 'rb') as file:
        reader = PyPDF2.PdfReader(file)
        text = ''
        for page in reader.pages:
            text += " ".join(page.extract_text().split('\n')[:-1])
    
    # Split the text into articles
    article_pattern = re.compile(r'Article ((?:L?\d+(?:-\d+)?)|(?:\d+))([\s\S]*?)(?=Article (?:L?\d+(?:-\d+)?|\d+)|$)')
    matches = article_pattern.findall(text)
    
    for match in tqdm(matches, f"{pdf_path}"):
        article_ID = match[0]
        content = match[1].strip()
        articles.append({
            'article': article_ID,
            'content': content
        })
        sub_articles = nlp(content.replace("\n", " ").replace("-", "")).sents
        for sub_article in sub_articles:
            if sub_article.text == 'Article' or len(sub_article.text) == 0:
                continue
            articles_units.append({
                'article': article_ID,
                'content': sub_article.text
            })
    
    return articles_units, articles

# Constants and Configuration
BASE_URLS = {
    "Code de l'action sociale et des familles": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006074069/",
    "Code de l'artisanat": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006075116",
    "Code des assurances": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006073984/",
    "Code de l'aviation civile": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006074234/",
    "Code du cinéma et de l'image animée": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000020908868",
    "Code civil": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006070721/",
    "Code de la commande publique": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000037701019/",
    "Code de commerce": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000005634379/",
    "Code des communes": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006070162",
    "Code de la consommation": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069565/",
    "Code de la construction et de l'habitation": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006074096/",
    "Code de la défense": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006071307/",
    "Code de l'éducation": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006071191/",
    "Code électoral": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006070239/",
    "Code de l'énergie": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000023983208/",
    "Code de l'environnement": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006074220/",
    "Code de l'entrée et du séjour des étrangers et du droit d'asile": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006070158/",
    "Code général des collectivités territoriales": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006070633/",
    "Code général des impôts": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000006069577/",
    "Code général de la fonction publique": "https://www.legifrance.gouv.fr/codes/texte_lc/LEGITEXT000044416551"
}

import requests
from bs4 import BeautifulSoup
import re
import json
from typing import Dict, Any, List, TypedDict
from urllib.parse import urljoin
import logging
import os
from concurrent.futures import ThreadPoolExecutor, as_completed
from article_version_retriver import extract_article_version

MAIN_CONTAINER_CLASS = "code-consommation-list summary-list summary-list-headers-tag js-list-expanded folding-element with-border"
OUTPUT_DIR = "legal_codes_output"

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Custom Exceptions
class ScraperException(Exception):
    pass

# Type Definitions
class ArticleInfo(TypedDict):
    path: str
    link: str
    is_abrogated: bool

ResultDict = Dict[str, ArticleInfo]

# Helper Functions
def fetch_url(url: str) -> str:
    try:
        response = requests.get(url)
        response.raise_for_status()
        return response.text
    except requests.RequestException as e:
        raise ScraperException(f"Failed to fetch URL: {url}. Error: {str(e)}")

def parse_html(html: str) -> BeautifulSoup:
    return BeautifulSoup(html, 'html.parser')

def build_path(current_path: str, title: str) -> str:
    return f"{current_path} > {title}" if current_path else title

def normalize_url(base_url: str, relative_url: str) -> str:
    return urljoin(base_url, relative_url)

def is_article_abrogated(article_text: str) -> bool:
    return bool(re.search(r'\(abrogé\)', article_text, re.IGNORECASE))

def extract_article_info(article_link: Any, current_path: str, base_url: str, article_text: str) -> ArticleInfo:
    article_number = article_link.get('data-na', '')
    article_url = normalize_url(base_url, article_link['href'])
    article_version = extract_article_version(article_url)
    return {
        "path": current_path,
        "link": article_url,
        "is_abrogated": is_article_abrogated(article_text)
    }

def clean_title(title: str) -> str:
    # Remove the article range pattern from the end of the title
    return re.sub(r'\s*\([Aa]rticles?.*\)\s*$', '', title).strip()

def traverse_tree(element: Any, path_stack: List[str], result: ResultDict, base_url: str) -> ResultDict:
    for li in element.find_all('li', recursive=False):
        title_link = li.find('a', class_='title-link')
        if title_link:
            current_title = clean_title(title_link.text.strip())
            path_stack.append(current_title)
            current_path = " > ".join(path_stack)

            # Process articles at this level
            articles = li.find('div', class_='js-child', recursive=False)
            if articles:
                for article_link in articles.find_all('a', class_='articleLink'):
                    article_number = article_link.text.strip()
                    article_text = article_link.text
                    article = extract_article_info(article_link, current_path, base_url, article_text)
                    result[article_number] = article

            # Recursively process nested elements
            nested_elements = li.find('ul', class_='js-child', recursive=False)
            if nested_elements:
                traverse_tree(nested_elements, path_stack, result, base_url)
            path_stack.pop()

    return result

def process_legal_code(code_name: str, base_url: str) -> ResultDict:
    logging.info(f"Processing {code_name}")
    html = fetch_url(base_url)
    soup = parse_html(html)
    main_container = soup.find('ul', class_= MAIN_CONTAINER_CLASS)
    if not main_container:
        raise ScraperException(f"Main container not found for {code_name}")
    return traverse_tree(main_container, [code_name], {}, base_url)

# Validation and Output Functions
def validate_result(result: ResultDict, code_name: str) -> None:
    if not result:
        raise ScraperException(f"No articles found for {code_name}")
    logging.info(f"Total articles processed for {code_name}: {len(result)}")
    abrogated_count = sum(1 for article in result.values() if article['is_abrogated'])
    logging.info(f"Abrogated articles for {code_name}: {abrogated_count}")

def save_output(result: ResultDict, code_name: str) -> None:
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    filename = os.path.join(OUTPUT_DIR, f"{code_name.replace(' ', '_').lower()}_structure.json")
    with open(filename, 'w', encoding='utf-8') as f:
        json.dump(result, f, ensure_ascii=False, indent=2)
    logging.info(f"Output for {code_name} saved to {filename}")

# Main Execution
def process_code(code_name: str, base_url: str) -> None:
    try:
        result = process_legal_code(code_name, base_url)
        validate_result(result, code_name)
        save_output(result, code_name)
    except ScraperException as e:
        logging.error(f"Scraper error for {code_name}: {str(e)}")
    except Exception as e:
        logging.error(f"Unexpected error for {code_name}: {str(e)}")

def main() -> None:
    with ThreadPoolExecutor(max_workers=5) as executor:
        future_to_code = {executor.submit(process_code, code_name, base_url): code_name 
                          for code_name, base_url in BASE_URLS.items()}
        for future in as_completed(future_to_code):
            code_name = future_to_code[future]
            try:
                future.result()
            except Exception as e:
                logging.error(f"Error processing {code_name}: {str(e)}")

if __name__ == "__main__":
    main()