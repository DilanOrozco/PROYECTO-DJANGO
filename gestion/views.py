from django.shortcuts import render, redirect
from .forms import RegistroForm
from django.contrib import messages
# Create your views here.

def index (request):
    return render(request, 'index.html')

def login (request):
    return render(request, 'login.html')


def registro(request):
    if request.method == 'POST':
        form = RegistroForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Usuario registrado correctamente')
            return redirect('login')  # o a donde quieras redirigir
    else:
        form = RegistroForm()
    return render(request, 'signUp.html', {'form': form})