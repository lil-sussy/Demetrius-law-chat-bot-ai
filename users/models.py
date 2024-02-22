from django.db import models

# Create your models here.
from django.db import models

# Create your models here.
from django.contrib.auth.models import User
 
from django.contrib.auth.models import AbstractUser
from django.db import models

class Profile(AbstractUser):
  ROLES = [
    ('reader_user', 'Reader User'),
    ('editor_user', 'Editor User'),
    ('admin', 'Admin'),
  ]
  role = models.CharField(max_length=15, choices=ROLES, default='reader_user')
  chats = models.JSONField(default=[])