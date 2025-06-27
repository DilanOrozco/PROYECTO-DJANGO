from django.contrib import admin
from .models import Cancha, Reserva, Pago
# Register your models here.

admin.site.register(Cancha)
admin.site.register(Reserva)
admin.site.register(Pago)