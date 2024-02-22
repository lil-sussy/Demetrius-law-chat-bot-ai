from django.db import models

# Create your models here.
class LawCollection(models.Model):
  collection_name = models.CharField(max_length=100)
  collection_paths = models.JSONField(default=[])