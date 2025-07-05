from django.urls import path 
from . import views
from django.contrib.auth import views as auth_views
from django.contrib.auth.views import LogoutView

urlpatterns = [
    path('', views.index, name='index'),
    path('login/', auth_views.LoginView.as_view(template_name='login.html'), name='login'),
    path('signUp/', views.registro, name='signUp'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('nosotros/', views.nosotros, name='nosotros'),
    path('reserva/', views.listarCanchas, name='listarCanchas'),
    path('calendario/cancha/<int:cancha_id>/', views.calendario_cancha, name='calendario_cancha'),
    path('api/reservas/cancha/<int:cancha_id>/', views.obtenerReservasCancha, name='api_reservas_cancha'),
    path('api/horarios-disponibles/<int:cancha_id>/<str:fecha>/', views.obtenerHorariosDisponibles, name='api_horarios_disponibles'),
    path('api/reservas/crear/', views.crearReserva, name='api_crear_reserva'),
]