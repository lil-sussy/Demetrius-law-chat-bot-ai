import re
import requests
from bs4 import BeautifulSoup
import logging
from urllib.parse import urlparse, parse_qs
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException, NoSuchElementException, StaleElementReferenceException
from selenium.webdriver.common.action_chains import ActionChains
import time
from selenium.webdriver.remote.webelement import WebElement

# Set up logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# Configuration
WAIT_TIME = 10  # seconds
RETRY_ATTEMPTS = 3
MAX_EXPANSION_RETRIES = 3
EXPANSION_WAIT_TIME = 5  # seconds

class AccordionExpansionError(Exception):
    """Custom exception for accordion expansion errors."""
    pass

def error_handler(func):
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except Exception as e:
            logging.error(f"Error in {func.__name__}: {str(e)}")
            return None
    return wrapper

@error_handler
def initialize_webdriver():
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)
    driver.implicitly_wait(5)
    return driver

@error_handler
def navigate_to_url(driver, url):
    driver.get(url)
    return driver

@error_handler
def click_versions_button(driver):
    wait = WebDriverWait(driver, WAIT_TIME)
    buttons = wait.until(EC.presence_of_all_elements_located((By.CSS_SELECTOR, 'button.js-tab-secondary.tabs__link.ajax-load-tab-revision.tab-first-order')))
    for button in buttons:
        if button.text.strip() == "Versions":
            wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, 'button.js-tab-secondary.tabs__link.ajax-load-tab-revision.tab-first-order')))
            safe_click(driver, button)
            return True
    raise NoSuchElementException("Versions button not found")

@error_handler
def extract_data_anchor(url):
    parsed_url = urlparse(url)
    fragment = parsed_url.fragment
    return fragment if fragment else None

@error_handler
def find_target_element(driver, data_anchor):
    return driver.find_element(By.CSS_SELECTOR, f'p[data-anchor="{data_anchor}"]')

def is_button_expanded(button: WebElement) -> bool:
    """Check if the accordion button is already expanded."""
    return 'is-opened' in button.get_attribute('class') or button.get_attribute('aria-expanded') == 'true'

def safe_click(driver: webdriver.Chrome, element: WebElement) -> None:
    """Safely click an element, handling potential exceptions."""
    try:
        # Scroll element into view
        driver.execute_script("arguments[0].scrollIntoView({block: 'center'});", element)
        element.click()
    except Exception as e:
        logging.warning(f"Initial click failed: {str(e.msg)}. Trying alternative methods.")
        
        try:
            # Try clicking with JavaScript
            driver.execute_script("arguments[0].click();", element)
        except Exception:
            try:
                # Try clicking by coordinates
                actions = ActionChains(driver)
                actions.move_to_element(element).click().perform()
            except Exception:
                # As a last resort, hide overlay and click
                overlay = driver.find_element(By.ID, "stickyScrollTitre")
                driver.execute_script("arguments[0].style.display='none';", overlay)
                try:
                    element.click()
                finally:
                    driver.execute_script("arguments[0].style.display='';", overlay)

    # Wait for any animations or page updates to complete
    time.sleep(1)

def wait_for_expansion(driver: webdriver.Chrome, accordion_item: WebElement) -> None:
    """Wait for the accordion item to finish expanding."""
    try:
        WebDriverWait(driver, EXPANSION_WAIT_TIME).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, '.accordion-timeline-item-content'))
        )
    except TimeoutException:
        logging.error("Timeout waiting for accordion expansion")
        raise

def relocate_element(driver: webdriver.Chrome, by: str, value: str) -> WebElement:
    """Re-locate an element that may have become stale."""
    for _ in range(RETRY_ATTEMPTS):
        try:
            return driver.find_element(by, value)
        except StaleElementReferenceException:
            logging.warning("Stale element, retrying...")
    raise NoSuchElementException(f"Element not found after {RETRY_ATTEMPTS} attempts")

@error_handler
def expand_accordion_item(driver: webdriver.Chrome, accordion_item: WebElement) -> None:
    """Expand an accordion item if it's not already expanded."""
    try:
        button = accordion_item.find_element(By.CSS_SELECTOR, '.expandmore__button.js-expandmore-button')
        if not is_button_expanded(button):
            wait = WebDriverWait(driver, WAIT_TIME)
            wait.until(EC.element_to_be_clickable((By.CSS_SELECTOR, '.expandmore__button.js-expandmore-button')))
            safe_click(driver, button)
            time.sleep(1)
            # wait_for_expansion(driver, accordion_item)
    except Exception as e:
        logging.error(f"Error expanding accordion item: {str(e)}")
        raise AccordionExpansionError("Failed to expand accordion item")

@error_handler
def process_accordion_items(driver: webdriver.Chrome, timeline: WebElement) -> list:
    """Process all accordion items in the timeline."""
    items_data = []
    accordion_items = timeline.find_elements(By.CLASS_NAME, 'accordion-timeline-item')
    for item in accordion_items:
        try:
            expand_accordion_item(driver, item)
            item_data = process_timeline_item(item)
            if item_data:
                items_data.append(item_data)
        except AccordionExpansionError:
            logging.warning(f"Skipping accordion item due to expansion error")
        except Exception as e:
            logging.error(f"Error processing accordion item: {str(e)}")
    return items_data

@error_handler
def process_timeline_item(item: WebElement) -> dict:
    """Process a single timeline item after it has been expanded."""
    try:
        year = item.find_element(By.TAG_NAME, 'h6').text.strip()
        li = item.find_element(By.TAG_NAME, 'ul').find_element(By.TAG_NAME, 'li')
        date = li.find_element(By.TAG_NAME, 'h6').text.strip()
        p = li.find_element(By.TAG_NAME, 'p')
        try:
            law = p.find_element(By.TAG_NAME, 'a').text.strip()
        except NoSuchElementException:
            law = p.text.strip()
        return {'year': year, 'date': date, 'law': law}
    except NoSuchElementException as e:
        logging.error(f"Error processing timeline item: Might be an expected error. {str(e.msg)}")
        return None

@error_handler
def structure_data(items_data):
    result = {}
    for item in items_data:
        year = item['year']
        if year not in result:
            result[year] = {}
        result[year][item['date']] = {'date': item['date'], 'law': item['law']}
    return result

def clean_text(text):
    return re.sub(r'\s+', ' ', text).strip()

@error_handler
def extract_article_version(url):
    driver = initialize_webdriver()
    if not driver:
        return None

    try:
        navigate_to_url(driver, url)
        
        data_anchor = extract_data_anchor(url)
        if not data_anchor:
            logging.error("Data anchor not found in URL")
            return None

        article_name = find_target_element(driver, data_anchor)
        if not article_name:
            logging.error("Article ID not found on page")
            return None
        
        target_element = article_name.find_element(By.XPATH, './parent::*/parent::*')
        
        click_versions_button(driver)
        
        wait = WebDriverWait(driver, WAIT_TIME)
        timeline = wait.until(EC.presence_of_element_located((By.CLASS_NAME, 'accordion-timeline')))
        if not timeline:
            logging.error("Accordion timeline not found")
            return None

        items_data = process_accordion_items(driver, timeline)
        
        return structure_data(items_data)
    finally:
        driver.quit()

# The rest of the code remains unchanged