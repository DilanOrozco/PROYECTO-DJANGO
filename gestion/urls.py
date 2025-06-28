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
    path('reserva/', views.reserva_cancha, name='reserva'),
]