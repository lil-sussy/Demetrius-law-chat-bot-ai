from django.contrib.auth.models import User
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from django.conf import settings
from users.decorators.authenticate import jwt_required
from django.contrib.auth import get_user_model

@jwt_required
@csrf_exempt
def createUserEndoint(request):
  if request.method == 'POST':
    if request.user.role != 'admin':
      return JsonResponse({'message': 'You need admin privileges to perform this action'}, status=status.HTTP_401_UNAUTHORIZED)
    account = json.loads(request.body)['account']
    User = get_user_model()
    user = User.objects.create_user(username=account['username'], password=account['password'], role=account['privileges'])
    user.save()
    return JsonResponse({'message': 'Account succesfully created!'}, status=200)
  return JsonResponse({'message': 'Wrong method'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

@jwt_required
@csrf_exempt
def updateUserEndpoint(request):
  if request.method == 'POST':
    if request.user.role != 'admin':
      return JsonResponse({'message': 'You need admin privileges to perform this action'}, status=status.HTTP_401_UNAUTHORIZED)
    id_ = json.loads(request.body)['oldaccount']['id']
    account = json.loads(request.body)['newaccount']
    User = get_user_model()
    if account['password'] != '':
      User.objects.filter(id=id_).update(username=account['username'], password=account['password'], role=account['privileges'])
    else:
      User.objects.filter(id=id_).update(username=account['username'], role=account['privileges'])
    return JsonResponse({'message': 'Account succesfully updated!'}, status=200)
  return JsonResponse({'message': 'Wrong method'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

@jwt_required
@csrf_exempt
def deleteAccountEndpoint(request):
  if request.method == 'POST':
    if request.user.role != 'admin':
      return JsonResponse({'message': 'You need admin privileges to perform this action'}, status=status.HTTP_401_UNAUTHORIZED)
    id_ = json.loads(request.body)['account']['id']
    User = get_user_model()
    User.objects.filter(id=id_).delete()
    return JsonResponse({'message': 'Account succesfully deleted!'}, status=200)
  return JsonResponse({'message': 'Wrong method'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

@csrf_exempt
def loginEndpoint(request):
  data = json.loads(request.body)
  username = data.get('username', '')
  password = data.get('password', '')
  user = authenticate(username=username, password=password)
  if user is not None:
    refresh_token = RefreshToken.for_user(user)
    if user is not None and refresh_token is not None:
      access_token = refresh_token.access_token
      response = JsonResponse(data={
        'message': 'User logged in successfully.',
        'refresh_token': str(refresh_token),
        'access_token': str(access_token),
        'user': { 'username': user.username, 'id': user.id, 'privileges': user.role },
        'expires_in': settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
      }, status=200)
      response.set_cookie(
        key = settings.SIMPLE_JWT['AUTH_COOKIE'], 
        value = access_token,
        expires = settings.SIMPLE_JWT['ACCESS_TOKEN_LIFETIME'],
        secure = settings.SIMPLE_JWT['AUTH_COOKIE_SECURE'],
        httponly = settings.SIMPLE_JWT['AUTH_COOKIE_HTTP_ONLY'],
        samesite = settings.SIMPLE_JWT['AUTH_COOKIE_SAMESITE']
      )
      return response
    return Response({'error': 'Invalid username or password.'}, status=status.HTTP_401_UNAUTHORIZED)
  else:
      return Response({'error': 'Invalid username or password.'}, status=status.HTTP_400_BAD_REQUEST)

import json

@jwt_required
@csrf_exempt
def verify_token(request):
  account = {
    'username': request.user.username,
    'id': request.user.id,
    'privileges': request.user.role,
  }
  return JsonResponse({'message': 'Token verified successfully.', 'user': account}, status=200)

@jwt_required
@csrf_exempt
def listUsersEndpoint(request):
  if request.method == 'GET':
    User = get_user_model()
    users = User.objects.all()
    users_list = []
    for user in users:
      users_list.append({
        'username': user.username,
        'id': user.id,
        'privileges': user.role,
      })
    return JsonResponse({'users': users_list}, status=200)
  return JsonResponse({'message': 'Wrong method'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)