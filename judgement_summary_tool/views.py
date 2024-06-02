from django.shortcuts import render
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
import json
import judgement_summary_tool.openai_request as openai_request
import judgement_summary_tool.models as models
from law_chatbot.openai_request import embedding_request
from users.decorators.authenticate import jwt_required
from PyPDF2 import PdfReader
import os
from rest_framework import permissions, status

# Create your views here.
@csrf_exempt
def insertNewJudgmentFile(request, reference):
  if request.method == "POST":
    # if request.user.role != 'admin' and request.user.role != 'editor_user':
    #   return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    pdf_path = './database/judgment_files/'+reference.strip()+'.pdf'
    f = open(pdf_path, 'wb')
    f.write(request.body)
    f.close()
    summary, embeddings, pricing = openai_request.summary_and_embeddings_request(pdf_file=pdf_path)
    collection = models.Summary.collection.get(where={'reference': reference})
    id_:str = collection['ids'][0]
    if collection['metadatas'] == None:
      return JsonResponse(status=401, data={"message": 'Judgment not found'})
    newjudgment = {}
    newjudgment['reference'] = str(collection['metadatas'][0]['reference'])
    newjudgment['name'] = str(collection['metadatas'][0]['name'])
    newjudgment['jurisdiction'] = str(collection['metadatas'][0]['jurisdiction'])
    newjudgment['judges'] = str(collection['metadatas'][0]['judges'])
    newjudgment['pricing'] = str(pricing)
    newjudgment['pdf_path'] = pdf_path
    newjudgment['summary'] = summary
    models.update(id_, newjudgment, embeddings)
    return JsonResponse(status=200, data={"message": "Judgment successfully inserted", "summary": summary, "pdf_path": pdf_path[1:]})
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@csrf_exempt
def getPDFFile(request, reference):
  f = open('./database/judgment_files/'+reference+'.pdf', 'rb')
  pdf_contents = f.read()
  f.close()
  response = HttpResponse(pdf_contents, content_type='application/pdf')
  response['X-Frame-Options'] = 'ALLOW-FROM http://localhost:3000'
  response['Content-Disposition'] = f'inline; filename="{reference}.pdf"'
  return response

@jwt_required
@csrf_exempt
def insertNewJudgment(request):
  if request.method == "POST":
    if request.user.role != 'admin' and request.user.role != 'editor_user':
      return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    judgment = json.loads(request.body)['judgment']
    judgment['reference'] = judgment['reference'].strip()
    try:
      models.Summary.collection.get(where={'reference': judgment['reference']})['metadatas'][0]['reference']
      return JsonResponse(status=406, data={"message": 'A document with the same reference already exists'})
    except Exception as e:
      #PDF -> Embedding -> LangChain -> OpenAI -> Summary (str)
      embeddings = embedding_request('cringex dddddd')
      models.Summary.collection.add(
        documents = [''],
        metadatas = [{'reference':judgment.get("reference"), "name":judgment.get("name"), "jurisdiction":judgment.get("jurisdiction"), "judges":judgment.get("judges"), "summary":'',"pdf_path":''}],
        ids = [str(len(models.Summary.collection.get()['ids']))],
        embeddings = [embeddings]
      )
      return JsonResponse(status=200, data={"message" : "Judgment successfully imported"})
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def updateJudgment(request):
  if request.method == "POST":
    if request.user.role != 'admin' and request.user.role != 'editor_user':
      return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    newjudgment = json.loads(request.body)['newjudgment']
    oldreference = json.loads(request.body)['oldjudgment']['reference']
    newjudgment['reference'] = newjudgment['reference'].strip()
    try:
      models.Summary.collection.get(where={'reference': newjudgment['reference']})['metadatas'][0]['reference']
      if newjudgment['reference'] == oldreference:
        should_continue = True
      else:
        return JsonResponse(status=401, data={"message": 'A document with this new reference already exists'})
    except Exception as e:
      should_continue = True
    if should_continue:
      id_ = models.Summary.collection.get(where={'reference': oldreference})['ids'][0]
      models.update(id_, newjudgment, None)
      return JsonResponse(status=200, data={"message" : f"Judgment {newjudgment['reference']} successfully updated"})
  return JsonResponse(status=405, data={"message": 'Method not allowed'})


@jwt_required
@csrf_exempt
def deleteJudgments(request):
  if request.method == "POST":
    if request.user.role != 'admin' and request.user.role != 'editor_user':
      return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    data = json.loads(request.body)
    judgments = data.get("judgments")
    references = []
    for judgment in judgments:
      judgment['reference'] = judgment['reference'].strip()
      references.append(judgment.get("reference"))
    try:
      ids = []
      for ref in references:
        os.remove('./database/judgment_files/'+ref+'.pdf')
        ids += models.Summary.collection.get(where={'reference': ref})['ids']
      models.Summary.collection.delete(ids=ids)
      return JsonResponse({"message" : f"Judgments successfully deleted"})
    except Exception as e:
      return JsonResponse(status=402, data={"message": f"Judgments don't exist"})
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def getAllJudgments(request):
  if request.method == "POST":
    judgments = models.getAllJudgments()
    search_query = json.loads(request.body)['search_query']

    if search_query != '':
      judgments = models.search(search_query)
    for judgment in judgments:
      del judgment['id']
    return JsonResponse({"judgments": judgments})
  return JsonResponse(status=405, data={"message": 'Method not allowed'})
    
    
    

        