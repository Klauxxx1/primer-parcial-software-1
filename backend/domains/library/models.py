from django.db import models

class User(models.Model):
    id = models.AutoField(primary_key=True)
    username = models.CharField(max_length=150)
    email = models.CharField(max_length=255)
    class Meta:
        db_table = 'users'
    def __str__(self):
        return str(self.id)

class Profile(models.Model):
    id = models.AutoField(primary_key=True)
    user_id = models.ForeignKey('User', on_delete=models.CASCADE)
    full_name = models.CharField(max_length=200)
    age = models.IntegerField()
    class Meta:
        db_table = 'profiles'
    def __str__(self):
        return str(self.id)

class Product(models.Model):
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=255)
    price = models.FloatField()
    is_available = models.BooleanField()
    class Meta:
        db_table = 'products'
    def __str__(self):
        return str(self.id)



