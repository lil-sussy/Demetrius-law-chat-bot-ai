import chromadb
from django.core.management.base import BaseCommand
import os
from os.path import isfile, join
from law_chatbot.openai_request import embed_file
from django.conf import settings

class Command(BaseCommand):
  help = 'Import all laws from the pdf files in the folder ./database/textlaws_files/'
  
  # def add_arguments(self, parser):
  #   parser.add_argument('pdf_file', type=str, help='The path to the PDF file containing the laws')
  
  """_summary_
    All the files in the folder ./database/textlaws_files/ are imported into the database. A collection is created for each top file or folder of the directory. That way, the laws are grouped by their type (e.g. "Companies Act", "Constitution", etc.)
    Documents smaller than 3 pages are not chunkified and are stored embedded as a single document.
    Each file is split into chunks, each chunk is a section of the law. The chunks are embedded and stored in the database.
    Stop words from chunks are removed before embedding.
  """
  def handle(self, *args, **kwargs):
    law_folder = "./database/textlaws_files/"
    client = chromadb.PersistentClient(path=settings.LAW_COLLECTIONS_DB)
    for i, folder in enumerate(os.listdir(law_folder)):
      if i not in []:
        print(f'\n{i}')
        collection_name = folder.strip().replace(" ", "_").replace("-", "_")
        collection = client.get_or_create_collection(name=collection_name)
        client.delete_collection(name=collection_name)
        collection = client.get_or_create_collection(name=collection_name)
        if isfile(law_folder + folder):
          file = folder
          embed_file(collection, law_folder + file)
        else:
          for file in os.listdir(law_folder + folder):
            embed_file(collection, law_folder + folder + '/' + file)

