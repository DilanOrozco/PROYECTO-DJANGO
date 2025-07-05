from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_date
from django.contrib.auth.decorators import login_required
from datetime import datetime, timedelta
from .forms import RegistroForm
from django.contrib import messages
from .models import Cancha, Reserva, Pago
import json

# Tus views existentes...
def index(request):
    return render(request, 'index.html')

def nosotros(request):
    return render(request, 'nosotros.html')

def login(request):
    return render(request, 'login.html')

def registro(request):
    if request.method == 'POST':
        form = RegistroForm(request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, 'Usuario registrado correctamente')
            return redirect('login')
    else:
        form = RegistroForm()
    return render(request, 'signUp.html', {'form': form})

def listarCanchas(request):
    canchas = Cancha.objects.all() 
    return render(request, 'reserva.html', {'canchas': canchas})

def calendario_cancha(request, cancha_id):
    cancha = get_object_or_404(Cancha, id=cancha_id)
    return render(request, 'calendario_cancha.html', {'cancha': cancha})

def obtenerReservasCancha(request, cancha_id):
    reservas = Reserva.objects.filter(cancha_id=cancha_id)
    eventos = []
    
    for reserva in reservas:
        color = '#dc3545'  # Rojo para reservas ocupadas
        if reserva.estado == 'cancelada':
            color = '#6c757d'  # Gris para canceladas
        elif reserva.estado == 'activa':
            color = '#007bff'  # Azul para activas
        
        eventos.append({
            'id': reserva.id,
            'title': f'Reservado - {reserva.usuario.username}',
            'start': reserva.fecha_inicio.isoformat(),
            'end': reserva.fecha_fin.isoformat(),
            'backgroundColor': color,
            'borderColor': color,
            'extendedProps': {
                'usuario': reserva.usuario.username,
                'estado': reserva.estado,
                'cancha': reserva.cancha.nombre
            }
        })
    
    return JsonResponse(eventos, safe=False)

def obtenerHorariosDisponibles(request, cancha_id, fecha):
    """
    Obtiene los horarios ocupados para una fecha específica
    """
    try:
        fecha_obj = parse_date(fecha)
        if not fecha_obj:
            return JsonResponse({'error': 'Fecha inválida'}, status=400)
        
        # Obtener reservas para esa fecha
        reservas = Reserva.objects.filter(
            cancha_id=cancha_id,
            fecha_inicio__date=fecha_obj,
            estado='activa'
        )
        
        # Extraer las horas ocupadas
        ocupados = []
        for reserva in reservas:
            hora_inicio = reserva.fecha_inicio.strftime('%H:%M')
            ocupados.append(hora_inicio)
        
        return JsonResponse({
            'ocupados': ocupados,
            'fecha': fecha
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@login_required
def crearReserva(request):
    """
    Crea una nueva reserva
    """
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            
            # Validar datos
            cancha_id = data.get('cancha_id')
            fecha = data.get('fecha')
            hora_inicio = data.get('hora_inicio')
            hora_fin = data.get('hora_fin')
            
            if not all([cancha_id, fecha, hora_inicio, hora_fin]):
                return JsonResponse({'error': 'Datos incompletos'}, status=400)
            
            # Crear objetos datetime
            fecha_obj = parse_date(fecha)
            hora_inicio_obj = datetime.strptime(hora_inicio, '%H:%M').time()
            hora_fin_obj = datetime.strptime(hora_fin, '%H:%M').time()
            
            fecha_inicio = datetime.combine(fecha_obj, hora_inicio_obj)
            fecha_fin = datetime.combine(fecha_obj, hora_fin_obj)
            
            # Verificar que no haya conflictos
            conflictos = Reserva.objects.filter(
                cancha_id=cancha_id,
                fecha_inicio__date=fecha_obj,
                fecha_inicio__time=hora_inicio_obj,
                estado='activa'
            )
            
            if conflictos.exists():
                return JsonResponse({'error': 'Este horario ya está reservado'}, status=400)
            
            # Crear la reserva
            reserva = Reserva.objects.create(
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                cancha_id=cancha_id,
                usuario=request.user,
                estado='activa'
            )
            
            return JsonResponse({
                'success': True,
                'reserva_id': reserva.id,
                'message': 'Reserva creada exitosamente'
            })
            
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Método no permitido'}, status=405)