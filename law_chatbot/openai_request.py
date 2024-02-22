import datetime
import chromadb
import requests
from django.views import View
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from django.conf import settings
import nltk
from dotenv import load_dotenv
from chromadb.config import Settings
from nltk.corpus import stopwords
from os import walk


import sys


api_key = settings.OPENAI_TOKEN

from django.conf import settings
api_key = settings.OPENAI_TOKEN
MAX_QUERY_DOCUMENTS = settings.MAX_QUERY_DOCUMENTS

system_message_context2 = f"""
You are a conversation topic name generator.
Given a question from the user you will give a name, the topic of the conversation."""
context_messages_source_for_titles = [{"role": "system", "content": system_message_context2},
  {"role": "user", "content": "What is the meaning of life?"},
  {"role": "assistant", "content": "The meaning of life"},
  {'role': 'user', 'content': 'How many planets are in the solar system?'},
  {'role': 'assistant', 'content': 'The solar system'},
  {'role': 'user', 'content': 'What is the best way to cook a steak?'},
  {'role': 'assistant', 'content': 'Cooking a steak'},
  {'role': 'user', 'content': 'What caused World War I'},
  {'role': 'assistant', 'content': 'World War I'},
  {'role': 'user', 'content': 'How does photosynthesis work?'},
  {'role': 'assistant', 'content': 'Principe of photosynthesis'},
  {'role': 'user', 'content': 'Can you describe the art movement known as Surrealism?'},
  {'role': 'assistant', 'content': 'Movement of the surrealism'},
  {'role': 'user', 'content': 'What causes inflation?'},
  {'role': 'assistant', 'content': 'The causes of inflation'},
  {'role': 'user', 'content': 'How does the stock market work?'},
  {'role': 'assistant', 'content': 'The stock market'},
  {'role': 'user', 'content': 'What is democracy?'},
  {'role': 'assistant', 'content': 'Democracy'},
  {'role': 'user', 'content': "Could you provide a detailed comparison of the leadership styles of Julius Caesar and Alexander the Great, particularly focusing on their military strategies and administrative policies?"},
  {'role': 'assistant', 'content': 'Leadership styles of Julius Caesar and Alexander the Great'},
  {'role': 'user', 'content': "What were the key economic factors that led to the Great Depression in the 1930s, and how did different countries respond to this crisis?"},
  {'role': 'assistant', 'content': 'Economical factors of the Great Depression'},
  {'role': 'user', 'content': 'What are the geological and environmental factors that contribute to the formation of the Great Barrier Reef, and what are the major threats to its existence?'},
  {'role': 'assistant', 'content': 'Geological and environmental factors of the Great Barrier Reef'},
  {'role': 'user', 'content': 'How do the principles of quantum mechanics fundamentally differ from classical physics, and what are some real-world applications of quantum phenomena?'},
  {'role': 'assistant', 'content': 'Principles of quantum mechanics'},
  {'role': 'user', 'content': "What are the underlying causes of the 2008 financial crisis, and what measures have been implemented since then to prevent a similar occurrence?"},
  {'role': 'assistant', 'content': 'The 2008 financial crisis'},
  {'role': 'user', 'content': 'What are the latest developments in cancer research, particularly in the field of immunotherapy, and how have they changed patient outcomes?'},
  {'role': 'assistant', 'content': 'Latest developments in cancer research'},
  {'role': 'user', 'content': "What are the historical and current factors contributing to the Israeli-Palestinian conflict, and what have been some key attempts at resolving it?"},
  {'role': 'assistant', 'content': 'The Israeli-Palestinian conflict'},
  {'role': 'assistant', 'content': "What are the core principles of Stoicism, and how do they compare to other philosophical schools like Epicureanism?"},
  
]

system_message_context = f"""
You are adressing a lawyer and a law expert, as his assistant you have to assist him in analyzing the legal implications of [specific scneario or issue] based on the relevant sections of the Mauritius law. Please explain the applicable sections of the relevant laws and provide an analysis of how they apply to this situation."""

system_message_law_explained = """
You are adressing a lawyer and a law expert, As a knowledgeable legal assistant, I am seeking your expertise in explaining various sections from different Mauritius's laws concisely and understandably. Please provide detailed explanations with precisions for the following sections:
"""

empty_message = {
  "role": "",
  "content": ""
}
empty_message_node = {
  "id": "",
  "role": "",
  "content": "",
  "children": {},
}

def conversationPathing(message_node, message_path, add_system_message=False):
  # pathing in the tree
  encountered_messages = []
  node = message_node
  encountered_messages.append({"role": node['role'], "content": node['content']})
  for i in range(len(message_path)):
    node = node['children'][message_path[i]]
    if node is None:
      break
    if add_system_message and "quotes" in node.keys():
      for quote in node['quotes']:
        encountered_messages.append({"role": "system", "content": quote['text']})
    encountered_messages.append({"role": node['role'], "content": node['content']})
  return encountered_messages, node


def chat_request(gigachad_user_query, message_node, message_path: list[str], selected_laws, gpt_model, must_generate_title=False, context_redondance=True):
  client = chromadb.PersistentClient(path=settings.LAW_COLLECTIONS_DB)
  context_messages, last_node = conversationPathing(message_node, message_path, settings.ENLARGE_CONTEXT_WITH_QUOTES)
  queried_documents = query_documents_from_laws(context_messages, gigachad_user_query, selected_laws, client)
  if context_messages == []:
    context_messages = [{"role": "system", "content": system_message_context}]
  documents_messages = [{"role": "system", "content": system_message_law_explained}]
  for (i, document) in enumerate(queried_documents):
    documents_messages.append({"role": "system", "content": f'section : {document["metadata"]["part_title"]} of law document "{document["metadata"]["document_name"]}"\n{document["text"]}'})
  response = chatgpt_request(documents_messages, "gpt-4-1106-preview")
  response_content = response['choices'][0]['message']['content']
  # context_messages = [context_messages[0]] + documents_messages + documents_messages[1:]
  context_messages.append({"role": "system", "content": response_content})
  if not context_redondance and settings.ENLARGE_CONTEXT_WITH_QUOTES:
    context_messages = remove_redondancy(context_messages)
  context_messages_for_titles  = context_messages_source_for_titles + [{"role": "user", "content": gigachad_user_query}]
  conversation_title = ''
  try:
    response = chatgpt_request(context_messages, gpt_model)
    response_content = response['choices'][0]['message']['content']
    pricing = response['usage']['completion_tokens'] * settings.OUTPUT_TOKEN_PRICING/1000 + response['usage']['prompt_tokens'] * settings.INPUT_TOKEN_PRICING/1000
    if must_generate_title:
      conversation_title = chatgpt_request(context_messages_for_titles, 'gpt-3.5-turbo')['choices'][0]['message']['content']
  except ConnectionError as e:
    try:
      context_messages = delete_fifth_firsts_system_messages(context_messages)
      response = chatgpt_request(context_messages, gpt_model)
      response_content = response['choices'][0]['message']['content']
      pricing = response['usage']['completion_tokens'] * settings.OUTPUT_TOKEN_PRICING/1000 + response['usage']['prompt_tokens'] * settings.INPUT_TOKEN_PRICING/1000
    except ConnectionError as e:
      raise ConnectionError(f"Unexpected error, failed to generate gpt 3.5 response: {e}")
  assistant_message_id = str(hash(datetime.datetime.now().isoformat()))  # Hopefully this is executed 1ms after :D
  last_node['children'] = last_node['children'] | {assistant_message_id: {
    "id": assistant_message_id,
    "role": "assistant",
    "content": response_content,
    "quotes": queried_documents,
    "children": {},
  }}
  last_node = last_node['children'][assistant_message_id]
  message_path.append(assistant_message_id)
  return response_content, conversation_title, message_node, message_path, pricing

def delete_fifth_firsts_system_messages(context_messages: list[dict]) -> list[dict]:
  uwu = []
  for (i, document) in enumerate(context_messages[1:6]):
    if document['role'] != "system":
      uwu.append(document)
  return [context_messages[0]] + uwu + context_messages[6:]

def remove_redondancy(context_messages):
  new_context_messages = []
  counters = {}
  for i, message in enumerate(context_messages):
    if message['role'] == 'system':
      new_context_messages.append(message)
      for already_added_message in new_context_messages[:-1]:
        if len(already_added_message['content']) == len(message['content']):
          if len(message['content']) not in counters.keys():
            counters[len(message['content'])] = 1
            already_added_message['content'] = f'The following document has been quoted {counters[len(message["content"])]} time(s) in the conversation:\n\n{already_added_message["content"]}'
          else:
            counters[len(message['content'])] += 1
            index = len('The following document has been quoted')
            already_added_message['content'] = already_added_message['content'][:index] + str(counters[len(message['content'])]) + ' ' + already_added_message['content'][index+2:]
          del new_context_messages[-1]
          break
    else:
      new_context_messages.append(message)
  return new_context_messages

def query_documents_from_laws(context_messages, gigachad_user_query: str, selected_laws, client) -> list[dict]:
  query_to_embed = ''
  for message in context_messages:
    if message['role'] != 'system':
      query_to_embed += f'"{message["content"]}"\n\n'
  query_to_embed += f'Message:\nRole : "User"; content : "{gigachad_user_query}"'
  queried_documents = []
  empty_document = {
    'text': '',
    'metadata': {
      'part_title': '',
      'document_name': '',
      'begin_page': 0,
      'end_page': 0
    },
    'distance': 100,
  }    
  def document_distance(document):
    return document['distance']
  user_query_with_context_embedding = embedding_request(query_to_embed)
  user_query_embedding = embedding_request(gigachad_user_query)
  for law in selected_laws:
    collection = client.get_collection(name=law)
    collection_query = collection.query(n_results=settings.MAX_QUERY_DOCUMENTS, query_embeddings=[user_query_embedding])
    collection_query_with_context = collection.query(n_results=settings.MAX_QUERY_DOCUMENTS, query_embeddings=[user_query_with_context_embedding])
    for query in [collection_query, collection_query_with_context]:
      if query['documents']  == None or query['metadatas'] == None or query['distances'] == None:
        raise Exception("Unlikely error: no documents found for query")
      for (i, document) in enumerate(query['documents'][0]):
        if query['distances'][0][i] < settings.DISTANCE_THRESHOLD:
          queried_documents.append({
            'text': document,
            'metadata': query['metadatas'][0][i],
            'distance': query['distances'][0][i],
          })
    queried_documents.sort(key=document_distance)
    queried_documents = queried_documents[:MAX_QUERY_DOCUMENTS]
  if len(queried_documents) == 0:
    empty_document['text'] = f'No relevant documents were with the user query and the context, you must warn the user that you are now answering their question without any legal basis with unkwon source.'
    queried_documents.append(empty_document)
  return queried_documents
  

def embedding_request(text_chunk):
  """
  Call OpenAI ADA002 API to get embedding for a text chunk.
  
  :param text_chunk: str, a chunk of text to embed
  :return: list, embedding
  """
  # NOTE: Replace the following API endpoint and headers as per actual OpenAI ADA002 API documentation
  api_endpoint = "https://api.openai.com/v1/embeddings"
  headers = {"Authorization": "Bearer "+api_key, "Content-Type": "application/json", "Accept": "application/json"}
  filtered_chunk_text = [word for word in text_chunk.split(' ') if word not in stopwords.words('english')]
  filtered_chunk_text = ' '.join(filtered_chunk_text)
  data = {"input": filtered_chunk_text, "model": "text-embedding-ada-002"}
  response = requests.post(api_endpoint, json=data, headers=headers)
  if response.status_code == 200:
    return response.json()['data'][0]['embedding']
  else:
    return False

def chatgpt_request(messages, gpt_model):
  api_endpoint = "https://api.openai.com/v1/chat/completions"
  headers = {"Authorization": "Bearer "+api_key, "Content-Type": "application/json", "Accept": "application/json"}
  # data = {"messages": messages, "model": "gpt-3.5-turbo-16k"}
  data = {"messages": messages, "model": gpt_model, "temperature": 0}
  response = requests.post(api_endpoint, json=data, headers=headers)
  if response.status_code == 200:
    return response.json()
  else:
    raise ConnectionError(f"Failed to generate gpt 3.5 response: {response.text}")

from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import time
def embed_file(collection, pdf_path, progress_consumer):
  nltk.download('stopwords')
  collection_name = collection.name
  async_to_sync(progress_consumer.create_channel)('embedd_progress_consumer')
  if pdf_path.endswith(".pdf"):
    chunks, title = general_textlaw_pdf_chunkifier(pdf_path)
    id_ = 1
    sys.stdout.write('\n')
    print(collection_name+', File : '+title)
    n = len(chunks)
    progress = 0
    for chunk in chunks:
      # if len(chunk['text']) < 100:
      #   print(chunk)
      sys.stdout.write('\r')
      progress_bar = f"[%-{50}s] %d%%"
      sys.stdout.write(progress_bar % ('='*int(progress/n*50), (100/n)*progress))
      sys.stdout.flush()
      progress += 1
      async_to_sync(progress_consumer.send_progress_update)("embedd_progress_consumer", collection_name, (100/n)*progress)
      id_ += 1
      title_to_embed = f'section : {chunk["metadata"]["part_title"]} of law document "{chunk["metadata"]["document_name"]}"\n\n'
      filtered_chunk_text = [word for word in chunk['text'].split(' ') if word not in stopwords.words('english')]
      chunk['text'] = ' '.join(filtered_chunk_text)
      title_embedding = embedding_request(title_to_embed)
      chunk_embedding = False
      split_factor = 1
      while not chunk_embedding:
        text = chunk['text'][:len(chunk['text'])//split_factor]
        chunk_embedding = embedding_request(text)
        split_factor += 1
      
      if split_factor != 1:
        for i in range(split_factor):
          begin_index = i*len(chunk['text'])//split_factor
          ending_index = (i+1)*len(chunk['text'])//split_factor
          chunk_embedding = embedding_request(chunk['text'][begin_index:ending_index])
          id_ += 1
          document = 'From '+title_to_embed+':\n\n'+chunk['text']
          collection.upsert(ids=['id'+str(id_)], documents=[document], embeddings=chunk_embedding, metadatas=[chunk['metadata']])
      else:
        collection.upsert(ids=['id'+str(id_)], documents=[chunk['text']], embeddings=chunk_embedding, metadatas=[chunk['metadata']])
      collection.upsert(ids=['id'+str(id_)], documents=[chunk['text']], embeddings=title_embedding, metadatas=[chunk['metadata']])
  async_to_sync(progress_consumer.send_ending_message)("embedd_progress_consumer", collection_name, 'Embbeding finished')
        
from PyPDF2 import PdfReader 
import re
import copy

empty_chunk = {
  "text": "",
  "metadata": {
    "document_name": "",
    "document_path": "",
    "part_title": "",
    "section_number": "",
    "begin_page": ""
  }
}

def general_textlaw_pdf_chunkifier(pdf_file_path):
  reader = PdfReader(pdf_file_path) 
  document_name = reader.pages[0].extract_text().split("\n")[0].strip()
  if len(reader.pages) < 3:
    return [{"text": reader.pages[0].extract_text(), "metadata": {"document_name": document_name , "document_path": pdf_file_path, "part_title": document_name , "section_number": "<all>", "begin_page": 1}}], pdf_file_path

  section_title_pattern = re.compile("\\d\\d*([A-Z]|)[.][ ]*((\\w)|[']|[\"]|[ ]|[(]|[)])+")  # Matches "1. Title of the section"
  part_title_pattern = re.compile("PART ([I]|[V]|[X])* ([-]|[–]) ((\\w)|[']|[\"]|[ ]|[(]|[)])+")
  begin_page_index, begin_line_index = skip_table_of_content(reader.pages, section_title_pattern, part_title_pattern)
  page = reader.pages[begin_page_index]
  page_text = page.extract_text().split("\n")
  chunks = []
  page_text = page_text[begin_line_index:]
  part_title = page_text[0]
  chunk = copy.deepcopy(empty_chunk)
  
  digit_pattern = re.compile("\\d\\d*")  # Matches "1. Title of the section"
  for page_index, page in enumerate(reader.pages[2:]):
    for line in page_text:
      if part_title_pattern.match(line):
        part_title = line
      else:  # Part names arent incluced in sections
        if section_title_pattern.match(line):  # If begining of new section# ...
          if chunk["text"] != "" and chunk['text'] != "\n" and chunk['text'] != "\n\n" and chunk['text'] != " \n" and chunk['text'] != " \n":
            chunks.append(chunk)  # append last chunk, begining of new chunk
          chunk = copy.deepcopy(empty_chunk)
          chunk["metadata"]["part_title"] = f'"{line.strip()}"' + f' in document part "{part_title.strip()}"' if part_title != "" else ""
          chunk["metadata"]["document_name"] = document_name
          chunk["metadata"]["document_path"] = pdf_file_path
          chunk["metadata"]["begin_page"] = page_index + 1
          chunk["metadata"]["section_number"] = digit_pattern.search(line)[0]
        else:
          if len(line) > 1:
            chunk["text"] += line + "\n"
    page_text = page.extract_text().split("\n")
  chunks.append(chunk)  # Last chunk wasnt appended
  del chunks[0]  # Usually only contaning the title and shit
  return chunks, document_name

def skip_table_of_content(pages, section_title_pattern, part_title_pattern) -> tuple[int, int]:
  first_section_pattern = re.compile("[1]([A-Z]|)[.][ ]*((\\w)|[']|[\"]|[ ]|[(]|[)])+")
  for page_index, page in enumerate(pages):
    while True:
      page_text = page.extract_text().split("\n")
      next_page_text = pages[page_index+1].extract_text().split("\n")
      lines = page_text + next_page_text
      begin_page_index = None
      begin_line_index = None
      for line_index, line in enumerate(page_text):        
        if first_section_pattern.match(line):
            begin_page_index = page_index
            begin_line_index = line_index
        if section_title_pattern.match(line):
          if section_title_pattern.match(next_wordy_line(lines, line_index+1)):
            continue
          else:  # If name of section is followed by another section name, skip
            if begin_page_index != None and begin_line_index != None:
              return begin_page_index, begin_line_index
  raise ConnectionError('This error will never be raised xd')

def next_wordy_line(lines, index):
  word_pattern = re.compile("\\w+")
  i = index
  while(not word_pattern.match(lines[i].strip())):
    i += 1
  return lines[i]