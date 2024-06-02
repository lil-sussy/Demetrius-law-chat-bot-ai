import chromadb
from django.db import models

from demetriusapp import settings
from law_chatbot.openai_request import embedding_request

# Create your models here.


class Summary: 
  client = chromadb.PersistentClient(path=settings.JUDGMENT_COLLECTIONS_DB)
  if settings.DEBUG:
    collection = client.get_or_create_collection("judgments_debug")
  else:
    collection = client.get_or_create_collection("judgments")

def update(id_, newjudgment, embeddings)-> None:
  summary = newjudgment['summary']
  del newjudgment['summary']
  if embeddings == None:
    embeddings = embedding_request(summary)
  Summary.collection.update(embeddings=embeddings, 
      documents = [summary],
      metadatas = [newjudgment],
      ids = [id_]
  )

def delete(id_)-> None:
  """_summary_

  Args:
      reference (string): Reference of the judgment
  """
  Summary.collection.delete(ids = [id_])
    
def getSummaryByDate(year,week):
  return Summary.collection.get(where={"$and":[{"week":week},{"year":year}]},include =["metadatas","documents"])

def getSummaryByRef(reference):
  return Summary.collection.get(ids=reference,include=["metadatas","documents"])

def search(query):
  collection = Summary.collection.query(query_embeddings=embedding_request(query), n_results=min(Summary.collection.count(), 50))
  judgments = []
  for i, id_ in enumerate(collection['ids'][0]):
    judgment = {}
    judgment['id'] = id_
    if collection['metadatas'] and collection['documents']:
      judgment['reference'] = str(collection['metadatas'][0][i]['reference'])
      judgment['name'] = str(collection['metadatas'][0][i]['name'])
      judgment['jurisdiction'] = str(collection['metadatas'][0][i]['jurisdiction'])
      judgment['judges'] = str(collection['metadatas'][0][i]['judges'])
      judgment['pdf_path'] = str(collection['metadatas'][0][i]['pdf_path'])
      judgment['summary'] = str(collection['documents'][0][i])
      if 'pricing' in collection['metadatas'][0][i].keys():
        judgment['pricing'] = str(collection['metadatas'][0][i]['pricing'])
      # judgment['relevance'] = str(collection['distances'][0][i])
      judgments.append(judgment)
  return judgments

def getAllJudgments():
  collection = Summary.collection.get()
  judgments = []
  for i, id_ in enumerate(collection['ids']):
    judgment = {}
    judgment['id'] = id_
    if collection['metadatas'] and collection['documents']:
      judgment['reference'] = str(collection['metadatas'][i]['reference'])
      judgment['name'] = str(collection['metadatas'][i]['name'])
      judgment['jurisdiction'] = str(collection['metadatas'][i]['jurisdiction'])
      judgment['judges'] = str(collection['metadatas'][i]['judges'])
      judgment['pdf_path'] = str(collection['metadatas'][i]['pdf_path'])
      judgment['summary'] = str(collection['documents'][i])
      if 'pricing' in collection['metadatas'][i].keys():
        judgment['pricing'] = str(collection['metadatas'][i]['pricing'])
      judgments.append(judgment)
  return judgments    
    