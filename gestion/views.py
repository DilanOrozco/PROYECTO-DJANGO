from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.utils.dateparse import parse_date
from django.contrib.auth.decorators import login_required
from datetime import datetime, date, time
from .forms import RegistroForm
from django.contrib import messages
from .models import Cancha, Reserva, Pago
import json
from django.views.decorators.http import require_http_methods
from django.utils import timezone
from decimal import Decimal
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
    """
    Obtiene todas las reservas de una cancha específica
    Incluye información de la factura (monto)
    """
    try:
        # Obtener todas las reservas de la cancha
        reservas = Reserva.objects.filter(cancha_id=cancha_id).select_related('usuario', 'cancha')
        
        eventos = []
        for reserva in reservas:
            # Obtener la factura asociada si existe
            try:
                factura = Pago.objects.get(reserva=reserva)
                monto = float(factura.monto)
            except Pago.DoesNotExist:
                monto = float(reserva.cancha.precioHora) if reserva.cancha.precioHora else 0.0
            
            evento = {
                'id': reserva.id,
                'title': f'Reserva - {reserva.usuario.username}',
                'start': reserva.fecha_inicio.isoformat(),
                'end': reserva.fecha_fin.isoformat(),
                'estado': reserva.estado,
                'usuario': reserva.usuario.username,
                'costo': monto,  # Incluir el monto de la factura
                'monto': monto,  # Duplicar para compatibilidad
                'className': f'fc-event-{reserva.estado}'
            }
            eventos.append(evento)
        
        return JsonResponse(eventos, safe=False)
        
    except Exception as e:
        print(f"Error al obtener reservas: {str(e)}")  # Debug
        return JsonResponse({'error': str(e)}, status=500)

def obtenerHorariosDisponibles(request, cancha_id, fecha):
    """
    Obtiene los horarios ocupados para una fecha específica
    """
    try:
        fecha_obj = parse_date(fecha)
        if not fecha_obj:
            return JsonResponse({'error': 'Fecha inválida'}, status=400)
        
        # NUEVA VALIDACIÓN: Verificar si la fecha es hoy para filtrar horas pasadas
        ahora = timezone.now()
        es_hoy = fecha_obj == ahora.date()
        hora_actual = ahora.time()
        
        # Obtener reservas para esa fecha
        reservas = Reserva.objects.filter(
            cancha_id=cancha_id,
            fecha_inicio__date=fecha_obj,
            estado='activa'
        )
        
        # Extraer las horas ocupadas
        ocupados = []
        for reserva in reservas:
            # Convierte a zona horaria local
            local_dt = timezone.localtime(reserva.fecha_inicio)
            hora_inicio = local_dt.strftime('%H:%M')
            ocupados.append(hora_inicio)
        
        # NUEVA FUNCIONALIDAD: Agregar horas pasadas si es hoy
        horas_pasadas = []
        if es_hoy:
            # Generar todas las horas del día
            for hora in range(0, 24):
                hora_str = f"{hora:02d}:00"
                hora_obj = time(hora, 0)
                
                # Si la hora ya pasó, agregarla a ocupados
                if hora_obj <= hora_actual:
                    horas_pasadas.append(hora_str)
        
        return JsonResponse({
            'ocupados': ocupados,
            'horas_pasadas': horas_pasadas,  # Nuevo campo
            'fecha': fecha,
            'es_hoy': es_hoy
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=500)

@csrf_exempt
@login_required
def crearReserva(request):
    """
    Crea una nueva reserva y genera automáticamente la factura
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
            
            # Obtener la cancha para calcular el costo
            try:
                cancha = Cancha.objects.get(id=cancha_id)
            except Cancha.DoesNotExist:
                return JsonResponse({'error': 'Cancha no encontrada'}, status=404)
            
            # Crear objetos datetime
            fecha_obj = parse_date(fecha)
            hora_inicio_obj = datetime.strptime(hora_inicio, '%H:%M').time()
            hora_fin_obj = datetime.strptime(hora_fin, '%H:%M').time()
            
            fecha_inicio = datetime.combine(fecha_obj, hora_inicio_obj)
            fecha_fin = datetime.combine(fecha_obj, hora_fin_obj)
            
            # NUEVA VALIDACIÓN: Verificar que no sea en el pasado
            ahora = timezone.now()
            
            # Hacer timezone-aware si es necesario
            if timezone.is_naive(fecha_inicio):
                fecha_inicio = timezone.make_aware(fecha_inicio)
            if timezone.is_naive(fecha_fin):
                fecha_fin = timezone.make_aware(fecha_fin)
            
            # Validar que la fecha/hora no sea en el pasado
            if fecha_inicio <= ahora:
                return JsonResponse({
                    'error': 'No se pueden hacer reservas en fechas u horarios que ya pasaron'
                }, status=400)
            
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
                cancha=cancha,
                usuario=request.user,
                estado='activa'
            )
            
            # CORRECCIÓN: Generar factura automáticamente
            try:
                # Calcular el monto correctamente
                precio_hora = cancha.precioHora or 0.0
                monto = Decimal(str(precio_hora))  # Convertir a Decimal para evitar problemas de precisión
                
                # Crear la factura
                factura = Pago.objects.create(
                    fecha=timezone.now(),
                    reserva=reserva,
                    monto=monto,
                    metodoPago='pendiente'  # Valor por defecto
                )
                
                print(f"Factura creada: ID={factura.id}, Monto={monto}")  # Debug
                
                return JsonResponse({
                    'success': True,
                    'reserva_id': reserva.id,
                    'factura_id': factura.id,
                    'message': 'Reserva creada exitosamente y factura generada',
                    'monto': float(monto),
                    'precio_hora': precio_hora
                })
                
            except Exception as e:
                print(f"Error al crear factura: {str(e)}")  # Debug
                # Si falla la creación de la factura, eliminar la reserva
                reserva.delete()
                return JsonResponse({
                    'error': f'Error al generar la factura: {str(e)}'
                }, status=500)
            
        except Exception as e:
            print(f"Error general: {str(e)}")  # Debug
            return JsonResponse({'error': str(e)}, status=500)
    
    return JsonResponse({'error': 'Método no permitido'}, status=405)


@require_http_methods(["POST"])
@login_required
def cancelar_reserva(request, reserva_id):
    try:
        # Obtener la reserva
        reserva = Reserva.objects.get(id=reserva_id)
        
        # Verificar que el usuario puede cancelar esta reserva
        # (solo el dueño de la reserva o un admin)
        if reserva.usuario != request.user and not request.user.is_staff:
            return JsonResponse({
                'success': False,
                'error': 'No tienes permisos para cancelar esta reserva'
            }, status=403)
        
        # Verificar que la reserva esté activa
        if reserva.estado != 'activa':
            return JsonResponse({
                'success': False,
                'error': 'Solo se pueden cancelar reservas activas'
            }, status=400)
        
        # Cambiar el estado a cancelada
        reserva.estado = 'cancelada'
        reserva.save()
        
        return JsonResponse({
            'success': True,
            'message': 'Reserva cancelada exitosamente'
        })
        
    except Reserva.DoesNotExist:
        return JsonResponse({
            'success': False,
            'error': 'Reserva no encontrada'
        }, status=404)
    except Exception as e:
        return JsonResponse({
            'success': False,
            'error': str(e)
        }, status=500)