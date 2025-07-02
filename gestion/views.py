from django.shortcuts import render, redirect
from .forms import RegistroForm
from django.contrib import messages
from .models import Cancha, Reserva, Pago
# Create your views here.

def index (request):
    return render(request, 'index.html')

def nosotros (request):
    return render(request, 'nosotros.html')


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

def listarCanchas(request):
    canchas = Cancha.objects.all() 
    return render(request, 'reserva.html', {'canchas' : canchas})