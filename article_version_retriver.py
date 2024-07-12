import re
from dataclasses import dataclass, asdict, field
from typing import List, Optional, Tuple
from datetime import datetime
from bs4 import BeautifulSoup
import json
import logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

FRENCH_MONTHS = {
    'janvier': 1, 'février': 2, 'mars': 3, 'avril': 4, 'mai': 5, 'juin': 6,
    'juillet': 7, 'août': 8, 'septembre': 9, 'octobre': 10, 'novembre': 11, 'décembre': 12
}

class Config:
    def __init__(self):
        self.date_format = "%d %B %Y"
        self.text_cleaning_rules = [
            (r'\s+', ' '),  # Replace multiple spaces with a single space
            (r'^\s+|\s+$', '')  # Remove leading and trailing spaces
        ]
        self.extraction_patterns = {
            'article_id': r'Article (.*) du code (.*)',
            'date_range': r'\d{2} \w+ \d{4}'
        }
        self.french_months = {
            'janvier': 'January',
            'février': 'February',
            'mars': 'March',
            'avril': 'April',
            'mai': 'May',
            'juin': 'June',
            'juillet': 'July',
            'août': 'August',
            'septembre': 'September',
            'octobre': 'October',
            'novembre': 'November',
            'décembre': 'December'
        }

    def load_from_file(self, config_file):
        # Implementation for loading configuration from a file
        pass

@dataclass
class LegalReference:
    type: str
    number: str
    date: Optional[datetime] = None
    article: Optional[str] = None

    @classmethod
    def from_string(cls, reference_string: str) -> 'LegalReference':
        # Implementation of parsing logic for legal references
        # This is a simplified version and may need to be expanded
        parts = reference_string.split()
        return cls(
            type=parts[0],
            number=parts[1] if len(parts) > 1 else "",
            date=parse_date(parts[2]) if len(parts) > 2 else None,
            article=parts[3] if len(parts) > 3 else None
        )

@dataclass
class Version:
    status: str
    effective_period: Tuple[datetime, Optional[datetime]]
    created_by: Optional[LegalReference] = None
    abrogated_by: Optional[LegalReference] = None
    source: Optional[str] = None

@dataclass
class Article:
    id: str
    code_name: str
    versions: List[Version] = field(default_factory=list)
    codification: Optional[LegalReference] = None
    replacement: Optional[dict] = None

class ArticleExtractor:
    def __init__(self, config: Config):
        self.config = config

    def extract_article_info(self, html_content: str) -> Article:
        soup = BeautifulSoup(html_content, 'html.parser')
        header = soup.find('div', class_='action')
        article_id, code_name = self.extract_article_header(header)
        
        article = Article(id=article_id, code_name=code_name)
        
        timeline = soup.find('div', class_='accordion-timeline')
        article.versions = self.extract_versions(timeline)
        
        codification_element = soup.find('li', id='codification')
        if codification_element:
            article.codification = self.extract_codification(codification_element)
        
        replacement_element = soup.find('h5', string=re.compile("Nouveau\(x\) texte\(s\)"))
        if replacement_element:
            article.replacement = self.extract_replacement(replacement_element.find_next('li'))
        
        return article

    def extract_article_header(self, header_element) -> Tuple[str, str]:
        title = header_element.find('h5', class_='title-section').text.strip()
        match = re.match(r'Article (.*) du code (.*)', title)
        return match.group(1), match.group(2)

    def extract_versions(self, timeline_element) -> List[Version]:
        versions = []
        for item in timeline_element.find_all('div', class_='accordion-timeline-item'):
            versions.extend(self.extract_version_info(item))
        return versions

    def extract_version_info(self, version_element) -> List[Version]:
        versions = []
        year = version_element.find('button').text.strip().split()[0]
        for li in version_element.find_all('li'):
            status = 'current' if 'current-version' in li.get('class', []) else 'previous'
            version_text = li.find('h6').text if li.find('h6') else ''
            effective_period = self.extract_date_range(version_text)
            
            if effective_period[0] is None:
                logging.warning(f"Unable to parse effective date for version: {version_text}")
                continue
            
            version = Version(status=status, effective_period=effective_period)
            
            creation_info = li.find('span', string=re.compile("Créé par"))
            if creation_info:
                version.created_by = LegalReference.from_string(creation_info.find_next('span').text)
            
            abrogation_info = li.find('span', string=re.compile("Abrogé par"))
            if abrogation_info:
                version.abrogated_by = LegalReference.from_string(abrogation_info.find_next('span').text)
            
            versions.append(version)
        
        return versions

    def extract_date_range(self, text: str) -> Tuple[datetime, Optional[datetime]]:
        date_matches = re.findall(r'\d{2} \w+ \d{4}', text)
        start_date = parse_date(date_matches[0])
        end_date = parse_date(date_matches[1]) if len(date_matches) > 1 else None
        return start_date, end_date

    def extract_codification(self, codification_element) -> LegalReference:
        codification_text = codification_element.find('div', class_='edit').text.strip()
        return LegalReference.from_string(codification_text.replace('Codifié par', '').strip())

    def extract_replacement(self, replacement_element) -> dict:
        replacement_text = replacement_element.find('h6').text.strip()
        parts = replacement_text.split(' - ')
        return {
            'code': parts[0],
            'article': parts[1].split()[1],
            'effective_date': parse_date(replacement_element.find('p').text.strip())
        }

def parse_date(date_string: str) -> Optional[datetime]:
    try:
        # Try to match the date pattern
        match = re.search(r'(\d{1,2})\s*(\w+)\s*(\d{4})', date_string)
        if match:
            day, month, year = match.groups()
            month_num = FRENCH_MONTHS.get(month.lower())
            if month_num:
                return datetime(int(year), month_num, int(day))
        
        # If the above fails, try a more flexible approach
        numbers = re.findall(r'\d+', date_string)
        if len(numbers) == 3:
            day, month, year = map(int, numbers)
            return datetime(year, month, day)
        elif len(numbers) == 1 and len(numbers[0]) == 8:  # Format: YYYYMMDD
            year, month, day = int(numbers[0][:4]), int(numbers[0][4:6]), int(numbers[0][6:])
            return datetime(year, month, day)
        
        logging.warning(f"Unable to parse date string: {date_string}")
        return None
    except ValueError as e:
        logging.error(f"Error parsing date '{date_string}': {str(e)}")
        return None

def clean_text(text: str) -> str:
    return ' '.join(text.split())

def to_json(article: Article) -> str:
    return json.dumps(asdict(article), default=str, ensure_ascii=False, indent=2)

config = Config()
def parse_html_to_article_versions_info(html):
    extractor = ArticleExtractor(config)
    
    article = extractor.extract_article_info(html)
    return article