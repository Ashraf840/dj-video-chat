from django.shortcuts import render

# Create your views here.


def index(request):
    context = {
        'title': 'Chat App',
    }
    return render(request, 'chat/chat.html', context)


