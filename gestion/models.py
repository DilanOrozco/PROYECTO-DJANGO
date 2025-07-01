from django.db import models
from django.contrib.auth.models import User

# Create your models here.

class Cancha (models.Model):
    tipo_cancha = [
        ('futbol', 'Fútbol'),
        ('basket', 'Baloncesto'),
        ('tenis', 'Tenis'),
    ]
    
    nombre = models.CharField(max_length=100)
    ubicacion = models.CharField(max_length=150)
    tipo = models.CharField(max_length=20, choices=tipo_cancha )
    imagen = models.ImageField(upload_to='imagenes/', blank=True, null=True)
    disponible = models.BooleanField(default=True)
    
    def __str__(self):
        return f"{self.nombre} ({self.tipo})"

class Reserva (models.Model):
    tipo_estado = [
        ('activa', 'Activa'),
        ('cancelada', 'Cancelada'), 
        ('finalizada', 'Finalizada'),
    ]
    fechaInico = models.DateField()
    fechaFin = models.DateTimeField()
    cancha = models.ForeignKey(Cancha, on_delete=models.CASCADE)
    usuario = models.ForeignKey(User, on_delete=models.CASCADE)
    estado = models.CharField(max_length=20, choices=tipo_estado)
    
    def __str__(self):
        return f"Reserva de {self.cancha} por {self.usuario.username} - {self.fecha_inicio}"

class Pago (models.Model):
    tipo_pago = [
        ('efectivo', 'Efectivo'),
        ('tarjeta', 'Tarjeta'),
        ('transferencia', 'Transferencia'),
    ]
    fecha = models.DateTimeField()
    reserva = models.OneToOneField(Reserva, on_delete=models.CASCADE)
    monto = models.DecimalField(max_digits=8, decimal_places=2)
    metodoPago = models.CharField(max_length=20, choices=tipo_pago)
    
    def __str__(self):
        return f"Factura #{self.id} - {self.reserva.usuario.username} - ${self.monto}"