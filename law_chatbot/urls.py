"""
URL configuration for demetrius project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from law_chatbot import views as law_chatbot
import users.views as users
from django.urls import include
from . import consumers
from channels.routing import ProtocolTypeRouter, URLRouter
from django.urls import path
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application

urlpatterns = [
  path('', law_chatbot.chat_endpoint, name='chat_endpoint'),
  path('edit_message/', law_chatbot.chat_edit_message_endpoint, name='chat_edit_message_endpoint'),
  path('regenerate/', law_chatbot.chat_regenerate_message_endpoint, name='chat_regenerate_message_endpoint'),
  path('list/', law_chatbot.chat_list_user_endpoint, name='chat_list_user_endpoint'),
  path('remove/', law_chatbot.remove_chat_endpoint, name='remove_chat_endpoint'),
  path('law/list/', law_chatbot.get_law_collection_list_endpoint, name='get_law_collection_list_endpoint'),
  path('law/list/files/', law_chatbot.law_collection_files_list_endpoint, name='law_collection_files_list_endpoint'),
  path('law/create/file/<str:collection_name>/<str:file_name>/', law_chatbot.add_law_colletion_file, name='add_law_colletion_file'),
  path('law/create/', law_chatbot.add_law_collection_endpoint, name='add_law_collection_endpoint'),
  path('law/edit/', law_chatbot.edit_law_collection_endpoint, name='edit_law_collection_endpoint'),
  path('law/delete/', law_chatbot.delete_law_collection_endpoint, name='delete_law_collection_endpoint'),
  path('law/files/delete/', law_chatbot.delete_law_collection_file_endpoint, name='delete_law_collection_file_endpoint'),
  
]