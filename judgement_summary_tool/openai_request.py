
from ast import Num
from math import floor
from django.conf import settings
from langchain.schema import Document
from langchain.document_loaders import PyPDFLoader
import tiktoken
from langchain.chat_models import ChatOpenAI
from langchain.chains.question_answering import load_qa_chain
from langchain.callbacks import get_openai_callback
from law_chatbot.openai_request import embedding_request


# Create your models here.

prompt = """
You are a lawyer.
Write a concise summary within 500 words, stating the issue identified by the court,the section,code,article,regulation,or gn and the judgements cited in the judgement you are ask to summarize
You must develop all legal arguments stating the case of each party and the finding of the court. Use as many technical legal terms as possible including french technical legal terms
State the ratio of the case.
The format should be:

*SUMMARY:
"""
import os
llm = ChatOpenAI(
    # model_name='gpt-3.5-turbo-16k',
    model_name='gpt-4-1106-preview',
    temperature=0,
    max_retries=5,
    openai_api_key = os.getenv("OPENAI_KEY", default=None)#bulk but we need to remove
)
chain = load_qa_chain(llm=llm, chain_type="stuff")
    
def numTokensFromMessages(messages):
    """Return the number of tokens used by a list of messages."""
    encoding = tiktoken.encoding_for_model("gpt-3.5-turbo")
    num_tokens = 0
    tokens_per_message =3
    for message in messages:
        num_tokens += tokens_per_message
        num_tokens += len(encoding.encode(message))
        num_tokens += 3  # every reply is primed with <|start|>assistant<|message|>
    return num_tokens

def splittedDocumentSummary(docs,num_of_tokens,prompt,chain):
    nb_of_chunks = floor(num_of_tokens/15000)
    entire_text = ""
    splittedtext = []
    summaries = []
    #get the entire text
    for pages in docs:
        entire_text += pages.page_content
    for i in range(nb_of_chunks):
        splittedtext.append(entire_text[i*60000:(i+1)*60000])
    splittedtext.append(entire_text[nb_of_chunks*60000:len(entire_text)-1])
    #summaries every chunk
    for chunk in splittedtext:
        summaries.append(chain.run(input_documents = [Document(page_content = chunk)],question = prompt))
    with get_openai_callback() as cb:
      summary = chain.run(input_documents = [Document(page_content = summary) for summary in summaries],question=prompt)
      pricing = settings.OUTPUT_TOKEN_PRICING * cb.completion_tokens/1000 + settings.INPUT_TOKEN_PRICING * cb.prompt_tokens/1000
    return summary, pricing

from PyPDF2 import PdfReader 
from django.shortcuts import render
from django.core.files.storage import FileSystemStorage
import io
import os
def getSummary(pdf_path, prompt, chain):
  reader = PdfReader(pdf_path)
  docs = []
  # Create a list of langhcain documents
  for page_index, page in enumerate(reader.pages):
    text = page.extract_text()
    docs.append(Document(page_content=text))
  num_of_tokens = numTokensFromMessages([pages.page_content for pages in docs])
  if(num_of_tokens <= 15000):
    with get_openai_callback() as cb:
      summary = chain.run(input_documents=docs, question=prompt)
      pricing = settings.OUTPUT_TOKEN_PRICING * cb.completion_tokens/1000 + settings.INPUT_TOKEN_PRICING * cb.prompt_tokens/1000
  else:
      summary, pricing = splittedDocumentSummary(docs, num_of_tokens, prompt, chain)
  return summary, pricing

def summary_and_embeddings_request(pdf_file):
  summary, pricing = getSummary(pdf_file, prompt, chain)
  embeddings = embedding_request(summary)  # Pricing ignored, really small
  return summary, embeddings, pricing


def uploadPDF(pdf_file):
    """uploadPDF

    Args:
        pdf_file (str): file from POST request. example : request.FILES['myfiles']
    Returns:
        str: local path to the pdf
    """
    folder='database'+os.sep+'judgments_files'+os.sep 
    fs = FileSystemStorage(location=folder)   
    filename = fs.save(pdf_file.name, pdf_file)
    if (filename):
        return folder + os.sep + filename


