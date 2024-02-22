import chromadb
from chromadb.config import Settings

from django.core.management.base import BaseCommand
from dotenv import load_dotenv
import os
from law_chatbot.openai_request import generate_new_law_chat

from django.conf import settings
api_key = settings.OPENAI_TOKEN
# Import necessary modules and functions
# ...

class Command(BaseCommand):
    help = 'Ask a question to demetrius'
    
    def add_arguments(self, parser):
        parser.add_argument('user_query', type=str, help='The question to ask to demetrius')
    
    def handle(self, *args, **kwargs):
        # Load the .env settings
        load_dotenv()
        user_query = kwargs['user_query']
        response = generate_new_law_chat(user_query)
        print(response)