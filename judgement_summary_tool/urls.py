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
from judgement_summary_tool import views as jst
from django.urls import include

urlpatterns = [
  path('get/', jst.getAllJudgments, name='getAllJudgments'),
  path('get/file/<str:reference>/', jst.getPDFFile, name='getpdf'),
  # path('insert/file/', jst.insertNewJudgmentFile, name='insertNewJudgmentFile'),
  path('insert/file/<str:reference>/', jst.insertNewJudgmentFile, name='insertNewJudgmentFile'),
  path('insert/', jst.insertNewJudgment, name='insertNewJudgment'),
  path('update/', jst.updateJudgment, name='updateJudgment'),
  path('delete/', jst.deleteJudgments, name='deleteJudgments'),
]