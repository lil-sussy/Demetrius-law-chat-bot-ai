# pdf_parser.py

import re
import PyPDF2
import spacy
from tqdm import tqdm


nlp = spacy.load('fr_core_news_sm')
nlp.max_length = 3*10**6

def extract_articles_from_pdf(pdf_path):
    articles = []
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
        sub_articles = nlp(content.replace("\n", " ").replace("-", "")).sents
        for sub_article in sub_articles:
            if sub_article.text == 'Article' or len(sub_article.text) == 0:
                continue
            articles.append({
                'article': article_ID,
                'content': sub_article.text
            })
    
    return articles