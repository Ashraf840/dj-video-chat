from django.urls import path
from chat import views


app_name = 'chatApp'

urlpatterns = [
    path('', views.index, name='chat_home'),
]
