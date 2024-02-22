import copy
import datetime
from threading import Thread
from django.shortcuts import render
from django.http import JsonResponse
import json
from django.http import JsonResponse
from numpy import bool_, kaiser
from demetriusapp import settings
from law_chatbot import openai_request
from law_chatbot.openai_request import chat_request, conversationPathing
from django.views.decorators.csrf import csrf_exempt
from users.decorators.authenticate import jwt_required
from django.contrib.auth import get_user_model
import chromadb
from django.db import models
from law_chatbot.models import LawCollection
import os, shutil
from rest_framework import permissions, status
from . import consumers
import asyncio
from datetime import datetime, tzinfo, timedelta


progress_consumer = consumers.TaskProgressConsumer()
def socketThread():
  asyncio.run(consumers.runserver(progress_consumer))

thread = Thread(target=socketThread, args=())
thread.start()

class simple_utc(tzinfo):
  def tzname(self,**kwargs):
    return "UTC"
  def utcoffset(self, dt):
    return timedelta(0)


@jwt_required
@csrf_exempt
def chat_endpoint(request):
  if request.method == "POST": 
    data = json.loads(request.body)
    current_chat:dict = data['chat']
    gigachad_user_query:str = data['user_query']
    selected_laws:list[str] = data['selected_laws']
    gpt_model:str = data['gpt_model']
    context_redondancy:bool = data['context_redondancy']
    message_path:list[str] = data['message_path']
    is_new_chat:bool = current_chat['id'] == ""
    messages = current_chat['messages']
    user_message_id = str(hash(datetime.now().isoformat()))
    if not is_new_chat:
      selected_laws = current_chat['selected_laws']
      context_messages, last_node = conversationPathing(messages[message_path[0]], message_path[1:], False)
      last_node['children'] = last_node['children'] | {user_message_id: {
        "id": user_message_id,
        "role": "user",
        "content": gigachad_user_query,
        "children": {},
      }}
    else:
      messages = {user_message_id: {
        "id": user_message_id,
        "role": "user",
        "content": gigachad_user_query,
        "children": {},
      }}
      message_path = []
    message_path.append(user_message_id)
    User = get_user_model()
    user_chats: dict = request.user.chats
    response, conversation_title, message_node, new_message_path, pricing = chat_request(gigachad_user_query, messages[message_path[0]], message_path[1:], selected_laws, gpt_model, is_new_chat, context_redondancy)
    new_message_path = [message_path[0]] + new_message_path 
    if is_new_chat:
      current_chat = {'id': str(hash(datetime.now().isoformat())), 'creation_date': datetime.utcnow().replace(tzinfo=simple_utc()).isoformat(), 'pricing': pricing, 'name': conversation_title, 'messages': messages, 'selected_laws': selected_laws, 'gpt_model': gpt_model, 'context_redondancy': context_redondancy, "message_path": new_message_path}
    else:
      current_chat = {'id': current_chat['id'], 'pricing': pricing + current_chat['pricing'], 'creation_date':current_chat['creation_date'], 'name': current_chat['name'], 'messages': messages, 'selected_laws': selected_laws, 'gpt_model': gpt_model, 'context_redondancy': context_redondancy, "message_path": new_message_path}
    user_chats[current_chat['id']] = current_chat
    request.user.save()
    # User.objects.filter(id=request.user.id).update(chats=user_chats)
    return JsonResponse({'response' : response, 'message_path': new_message_path, 'chats': user_chats}, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def chat_edit_message_endpoint(request):
  if request.method == "POST": 
    data = json.loads(request.body)
    current_chat:dict = data['chat']
    gigachad_user_query:str = data['edited_message']
    message_id:str = data['message_id']
    gpt_model:str = data['gpt_model']
    context_redondancy:bool = data['context_redondancy']
    message_path:list[str] = data['message_path']
    is_new_chat:bool = current_chat['id'] == ""
    messages = current_chat['messages']
    user_message_id = str(hash(datetime.now().isoformat()))
    new_path = []
    message_node = {}
    for id_ in message_path:
      if id_ == message_id:
        if new_path == []:
          message_node = {
            "id": user_message_id,
            "role": "user",
            "content": gigachad_user_query,
            "children": {},
          }
          messages[user_message_id] = message_node
          new_path.append(user_message_id)
          break
        else:
          cringe, message_node = conversationPathing(messages[new_path[0]], new_path[1:], False)
          message_node['children'] = message_node['children'] | {user_message_id: {
            "id": user_message_id,
            "role": "user",
            "content": gigachad_user_query,
            "children": {},
          }}
          new_path.append(user_message_id)
          break
      else:
        new_path.append(id_)
    if message_node == {}:
      return JsonResponse(status=406, data={"message": 'Something went wrong when editing the message'})
    User = get_user_model()
    user_chats: dict = request.user.chats
    response, conversation_title, message_node, new_message_path, pricing = chat_request(gigachad_user_query, messages[new_path[0]], new_path[1:], current_chat['selected_laws'], gpt_model, is_new_chat, context_redondancy)
    new_message_path = [new_path[0]] + new_message_path 
    if is_new_chat:
      current_chat = {'id': str(hash(datetime.now().isoformat())), 'creation_date': datetime.utcnow().replace(tzinfo=simple_utc()).isoformat(), 'pricing': pricing, 'name': conversation_title, 'messages': messages, 'selected_laws': current_chat['selected_laws'], 'gpt_model': gpt_model, 'context_redondancy': context_redondancy, "message_path": new_message_path}
    else:
      current_chat = {'id': current_chat['id'], 'pricing': pricing + current_chat['pricing'], 'creation_date':current_chat['creation_date'], 'name': current_chat['name'], 'messages': messages, 'selected_laws': current_chat['selected_laws'], 'gpt_model': gpt_model, 'context_redondancy': context_redondancy, "message_path": new_message_path}
    user_chats[current_chat['id']] = current_chat
    request.user.save()
    return JsonResponse({'response' : response, 'message_path': new_message_path, 'chats': user_chats}, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def chat_regenerate_message_endpoint(request):
  if request.method == "POST": 
    data = json.loads(request.body)
    current_chat:dict = data['chat']
    message_id:str = data['message_id'] 
    gpt_model:str = data['gpt_model']
    context_redondancy:bool = data['context_redondancy']
    message_path:list[str] = data['message_path']
    is_new_chat:bool = current_chat['id'] == ""
    messages = current_chat['messages']
    user_message_id = str(hash(datetime.now().isoformat()))
    path_before_with_user = []
    last_user_message_node = {}
    for id_ in message_path:
      if id_ == message_id:
        cringe, last_user_message_node = conversationPathing(messages[path_before_with_user[0]], path_before_with_user[1:], False)
        break
      else:
        path_before_with_user.append(id_)
    if last_user_message_node == {}:
      return JsonResponse(status=406, data={"message": 'Something went wrong when editing the message'})
    gigachad_user_query = last_user_message_node['content']
    User = get_user_model()
    user_chats: dict = request.user.chats
    response, conversation_title, last_user_message_node, new_message_path, pricing = chat_request(gigachad_user_query, messages[path_before_with_user[0]], path_before_with_user[1:], current_chat['selected_laws'], gpt_model, is_new_chat, context_redondancy)
    new_message_path = [path_before_with_user[0]] + new_message_path 
    if is_new_chat:
      current_chat = {'id': str(hash(datetime.now().isoformat())), 'creation_date': datetime.utcnow().replace(tzinfo=simple_utc()).isoformat(), 'pricing': pricing, 'name': conversation_title, 'messages': messages, 'selected_laws': current_chat['selected_laws'], 'gpt_model': gpt_model, 'context_redondancy': context_redondancy, "message_path": new_message_path}
    else:
      current_chat = {'id': current_chat['id'], 'pricing': pricing + current_chat['pricing'], 'creation_date':current_chat['creation_date'], 'name': current_chat['name'], 'messages': messages, 'selected_laws': current_chat['selected_laws'], 'gpt_model': gpt_model, 'context_redondancy': context_redondancy, "message_path": new_message_path}
    user_chats[current_chat['id']] = current_chat
    request.user.save()
    return JsonResponse({'response' : response, 'message_path': new_message_path, 'chats': user_chats}, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def chat_list_user_endpoint(request):
  if request.method == "GET":
    return JsonResponse({'chats': request.user.chats}, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def remove_chat_endpoint(request):
  if request.method == "POST":
    chat_toremove = json.loads(request.body)['chat']
    del request.user.chats[str(chat_toremove['id'])]
    request.user.save()
    return JsonResponse({'message': 'chat succesfully deleted', 'chats': request.user.chats}, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def get_law_collection_list_endpoint(request):
  if request.method == "GET":
    if request.user.role != 'admin' and request.user.role != 'editor_user':
      return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    client = chromadb.PersistentClient(path=settings.LAW_COLLECTIONS_DB)
    collections = client.list_collections()
    collection_names = []
    for collection in collections:
      collection_names.append(collection.name)
    return JsonResponse(data={ 'collections' : collection_names }, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def law_collection_files_list_endpoint(request):
  if request.method == "GET":
    if request.user.role != 'admin' and request.user.role != 'editor_user':
      return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    paths = {}
    for folder in os.listdir('./database/laws/'):
      paths[folder] = []
      for file in os.listdir('./database/laws/'+folder):
        paths[folder].append(file)
    return JsonResponse(data={'collections': paths}, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def add_law_collection_endpoint(request):
  if request.method == "POST":
    if request.user.role != 'admin' and request.user.role != 'editor_user':
      return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    data = json.loads(request.body)
    collection_name = data['collection_name']
    client = chromadb.PersistentClient(path=settings.LAW_COLLECTIONS_DB)
    try:
      client.get_collection(name=collection_name)
      return JsonResponse(data={'message': 'Collection with this name already exists'}, status=status.HTTP_409_CONFLICT)
    except ValueError:
      pass
    client.create_collection(name=collection_name)
    os.mkdir('./database/laws/'+collection_name.strip())
    return JsonResponse(data={'message': 'collection succesfully created'}, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def edit_law_collection_endpoint(request):
  if request.method == "POST":
    if request.user.role != 'admin' and request.user.role != 'editor_user':
      return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    data = json.loads(request.body)
    collection_old_name = data['collection_old_name']
    collection_new_name = data['collection_new_name']
    if collection_old_name == collection_new_name:
      return JsonResponse(data={'message': ''}, status=200)
    client = chromadb.PersistentClient(path=settings.LAW_COLLECTIONS_DB)
    collection = client.get_collection(name=collection_old_name)
    try:
      client.get_collection(name=collection_new_name)
      return JsonResponse(data={'message': 'Collection with this name already exists'}, status=status.HTTP_409_CONFLICT)
    except ValueError:
      pass
    collection.modify(name=collection_new_name)
    old_folder_name = './database/laws/'+collection_old_name.strip()
    new_folder_name = './database/laws/'+collection_new_name.strip()
    os.rename(old_folder_name, new_folder_name)
    client = chromadb.PersistentClient(path=settings.LAW_COLLECTIONS_DB)
    collection = client.get_collection(name=collection_new_name)
    for filename in os.listdir(new_folder_name):
      new_pdf_path = new_folder_name+'/'+filename.strip()
      old_pdf_path = old_folder_name+'/'+filename.strip()
      ids = collection.get(where={'document_path': old_pdf_path})['ids']
      for document_id in ids:
        collection.update(ids=[document_id], metadatas=[{'document_path': new_pdf_path}])
    return JsonResponse(data={'message': 'collection succesfully created'}, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def add_law_colletion_file(request, collection_name, file_name):
  if request.method == "POST":
    if request.user.role != 'admin' and request.user.role != 'editor_user':
      return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    pdf_path = './database/laws/'+collection_name.strip()+'/'+file_name.strip()
    f = open(pdf_path, 'wb')
    f.write(request.body)
    f.close()
    client = chromadb.PersistentClient(path=settings.LAW_COLLECTIONS_DB)
    collection = client.get_collection(name=collection_name)
    thread = Thread(target=openai_request.embed_file, args=(collection, pdf_path, progress_consumer))
    thread.start()
    return JsonResponse(data={'message': f'File {file_name} embedding in collection {collection_name} has started'}, status=200)
  else:
    return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def delete_law_collection_file_endpoint(request):
  if request.method == "POST":
    if request.user.role != 'admin' and request.user.role != 'editor_user':
      return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    data = json.loads(request.body)
    collection_name = data['collection_name']
    file_name = data['file_name']
    client = chromadb.PersistentClient(path=settings.LAW_COLLECTIONS_DB)
    collection = client.get_collection(name=collection_name)
    pdf_path = './database/laws/'+collection_name.strip()+'/'+file_name.strip()
    ids = collection.get(where={'document_path': pdf_path})['ids']
    for document_id in ids:
      collection.delete(ids=[document_id])
    os.remove(pdf_path)
    return JsonResponse(data={'message': 'file succesfully deleted'}, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@jwt_required
@csrf_exempt
def delete_law_collection_endpoint(request):
  if request.method == "POST":
    if request.user.role != 'admin' and request.user.role != 'editor_user':
      return JsonResponse(status=status.HTTP_403_FORBIDDEN, data={"message": 'Forbidden operation, requires privileges'})
    data = json.loads(request.body)
    collection_name = data['collection_name']
    client = chromadb.PersistentClient(path=settings.LAW_COLLECTIONS_DB)
    client.delete_collection(name=collection_name)
    folder_name = './database/laws/'+collection_name.strip()
    for filename in os.listdir(folder_name):
      file_path = os.path.join(folder_name, filename)
      if os.path.isfile(file_path) or os.path.islink(file_path):
        os.unlink(file_path)
      elif os.path.isdir(file_path):
        shutil.rmtree(file_path)
    os.rmdir(folder_name)
    return JsonResponse(data={'message': 'collection succesfully deleted'}, status=200)
  return JsonResponse(status=405, data={"message": 'Method not allowed'})

@csrf_exempt
def index(request):
  context = {"context": ''}
  return render(request, "index.html", context)