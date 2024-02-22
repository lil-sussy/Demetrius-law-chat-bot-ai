from functools import wraps
from django.http import JsonResponse
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework.exceptions import AuthenticationFailed
import json

def jwt_required(f):
    @wraps(f)
    def decorated_function(request, *args, **kwargs):
        authentication = JWTAuthentication()

        try:
            # This will internally handle the extraction and validation of token
            token = request.headers['X-Requested-With']
            validated_token = authentication.get_validated_token(token)
            user = authentication.get_user(validated_token)

            if user is not None:
                request.user = user
            else:
                return JsonResponse({'message': 'Unauthorized connexion'}, status=401)

        except AuthenticationFailed as e:
            return JsonResponse({'message': str(e)}, status=401)

        return f(request, *args, **kwargs)
    return decorated_function
