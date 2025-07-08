
// Variables globales
let calendar;
let modal;
let cancelarModal;
let canchaId;
let precioPorHora;
let fechaSeleccionadaGlobal = null;
let horarioSeleccionadoGlobal = null;
let reservaSeleccionada = null;

// Función principal que se ejecuta cuando se carga la página
function inicializarCalendario() {
    console.log('Inicializando calendario...');

    // Verificar que FullCalendar esté disponible
    if (typeof FullCalendar === 'undefined') {
        console.error('FullCalendar no está disponible');
        mostrarError('Error: FullCalendar no se pudo cargar. Verifica tu conexión a internet.');
        return;
    }

    // Inicializar variables
    const calendarEl = document.getElementById('calendar');

    // Verificar que los datos estén disponibles
    if (!window.canchaData) {
        console.error('Datos de cancha no disponibles');
        mostrarError('Error: No se pudieron cargar los datos de la cancha.');
        return;
    }

    canchaId = window.canchaData.id;
    precioPorHora = window.canchaData.precioHora;
    modal = document.getElementById('reservaModal');
    cancelarModal = document.getElementById('cancelarModal');

    if (!calendarEl) {
        console.error('No se encontró el elemento calendar');
        return;
    }

    // Mostrar loading
    mostrarLoading();

    try {
        // Crear el calendario
        calendar = new FullCalendar.Calendar(calendarEl, {
            initialView: 'dayGridMonth',
            locale: 'es',
            height: 'auto',

            headerToolbar: {
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,listMonth'
            },

            buttonText: {
                today: 'Hoy',
                month: 'Mes',
                week: 'Semana',
                list: 'Agenda'
            },

            // Configuración de eventos
            events: function (fetchInfo, successCallback, failureCallback) {
                console.log('Cargando eventos...');

                fetch('/api/reservas/cancha/' + canchaId + '/')
                    .then(response => {
                        if (!response.ok) {
                            throw new Error('Error en la respuesta del servidor');
                        }
                        return response.json();
                    })
                    .then(data => {
    console.log('Eventos cargados:', data);
    // Procesar eventos para agregar colores según el estado
    const eventosConColores = data.map(evento => {
        console.log('Procesando evento:', evento.title, 'con estado:', evento.estado);
        
        // Definir colores según el estado
        let color = '#007bff'; // Azul por defecto
        
        switch(evento.estado) {
            case 'activa':
                color = '#28a745'; // Verde
                break;
            case 'cancelada':
                color = '#dc3545'; // Rojo
                break;
            case 'completada':
                color = '#6c757d'; // Gris
                break;
            default:
                color = '#28a745'; // Verde por defecto si no hay estado
        }
        
        return {
            ...evento,
            backgroundColor: color,
            borderColor: color,
            className: 'fc-event-' + (evento.estado || 'activa')
        };
    });
    successCallback(eventosConColores);
})
                    .catch(error => {
                        console.error('Error al cargar eventos:', error);
                        failureCallback(error);
                        successCallback([]);
                    });
            },

            selectable: true,
            selectMirror: true,
            dayMaxEvents: true,

            // Evento al hacer clic en un día vacío
            dateClick: function (info) {
                console.log('Fecha seleccionada:', info.dateStr);
                fechaSeleccionadaGlobal = info.dateStr;
                mostrarModalReserva(info.dateStr);
            },

            // Evento al hacer clic en una reserva existente
            eventClick: function (info) {
                console.log('Evento clickeado:', info.event);
                mostrarDetallesReserva(info.event);
            },

            loading: function (bool) {
                if (bool) {
                    console.log('Cargando...');
                } else {
                    console.log('Carga completada');
                }
            },

            eventDidMount: function (info) {
                // Personalizar apariencia de eventos según el estado
                const estado = info.event.extendedProps.estado || info.event.estado; // <- Cambia esta línea
                console.log('Montando evento con estado:', estado); // <- Agrega esta línea
                if (estado) {
                    info.el.classList.add('fc-event-' + estado);
                }
            }
        });

        // Renderizar el calendario
        calendar.render();
        console.log('Calendario renderizado exitosamente');

    } catch (error) {
        console.error('Error al crear el calendario:', error);
        mostrarError('Error al inicializar el calendario: ' + error.message);
    }
}

// Función para mostrar loading
function mostrarLoading() {
    const calendarEl = document.getElementById('calendar');
    calendarEl.innerHTML = '<div class="loading">Cargando calendario...</div>';
}

// Función para mostrar error
function mostrarError(mensaje) {
    const calendarEl = document.getElementById('calendar');
    calendarEl.innerHTML = '<div class="error">' + mensaje + '</div>';
}

// Función para mostrar el modal de reserva
function mostrarModalReserva(fecha) {
    if (!modal) {
        console.error('Modal no encontrado');
        return;
    }

    document.getElementById('fechaSeleccionada').value = formatearFecha(fecha);
    cargarHorariosDisponibles(fecha);
    modal.style.display = 'block';
}

// Función para mostrar detalles de reserva en el panel lateral
// Función para mostrar detalles de reserva en el panel lateral (corregida)
function mostrarDetallesReserva(event) {
    const panel = document.getElementById('infoPanel');
    const reservaInfo = document.getElementById('reservaInfo');

    // Verificar que los elementos existan
    if (!panel || !reservaInfo) {
        console.error('Panel o contenedor de información no encontrado');
        return;
    }

    // Información de la reserva
    const inicio = event.start.toLocaleString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    const fin = event.end ? event.end.toLocaleString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
    }) : 'No especificado';

    const estado = event.extendedProps.estado || 'activa';
    const usuario = event.extendedProps.usuario || 'No especificado';
    
    // CORRECCIÓN: Obtener el costo de la factura o usar el precio por hora
    const costo = event.extendedProps.costo || event.extendedProps.monto || precioPorHora || 'No especificado';

    // Guardar reserva seleccionada para posibles acciones
    reservaSeleccionada = {
        id: event.id,
        title: event.title,
        estado: estado,
        usuario: usuario,
        inicio: inicio,
        fin: fin,
        costo: costo,
        // Agregar propiedades adicionales para debugging
        eventObj: event
    };

    console.log('Reserva seleccionada:', reservaSeleccionada);
    console.log('Event extendedProps:', event.extendedProps); // Debug

    reservaInfo.innerHTML = `
        <h4>Detalles de la Reserva</h4>
        <p><strong>Título:</strong> ${event.title}</p>
        <p><strong>Usuario:</strong> ${usuario}</p>
        <p><strong>Inicio:</strong> ${inicio}</p>
        <p><strong>Fin:</strong> ${fin}</p>
        <p><strong>Costo:</strong> $${costo}</p>
        <p><strong>Estado:</strong> <span class="estado-badge estado-${estado}">${estado.charAt(0).toUpperCase() + estado.slice(1)}</span></p>
        ${estado === 'activa' ? '<button class="btn-cancelar" onclick="mostrarModalCancelar()">Cancelar Reserva</button>' : ''}
    `;

    // Mostrar panel
    panel.classList.remove('hidden');
}

// Función para mostrar modal de cancelación
function mostrarModalCancelar() {
    console.log('Intentando mostrar modal de cancelación');

    if (!cancelarModal) {
        console.error('Modal de cancelación no encontrado');
        alert('Error: Modal de cancelación no disponible');
        return;
    }

    if (!reservaSeleccionada) {
        console.error('No hay reserva seleccionada');
        alert('Error: No hay reserva seleccionada');
        return;
    }

    const reservaCancelarInfo = document.getElementById('reservaCancelarInfo');
    if (!reservaCancelarInfo) {
        console.error('Elemento reservaCancelarInfo no encontrado');
        alert('Error: Elemento de información no encontrado');
        return;
    }

    reservaCancelarInfo.innerHTML = `
        <div style="background: #f8f9fa; padding: 15px; border-radius: 4px; margin: 10px 0;">
            <p><strong>Reserva:</strong> ${reservaSeleccionada.title}</p>
            <p><strong>Fecha y hora:</strong> ${reservaSeleccionada.inicio}</p>
            <p><strong>Usuario:</strong> ${reservaSeleccionada.usuario}</p>
            <p><strong>Costo:</strong> $${reservaSeleccionada.costo}</p>
        </div>
    `;

    cancelarModal.style.display = 'block';
    console.log('Modal de cancelación mostrado');
}

// Función para confirmar cancelación
function confirmarCancelacion() {
    console.log('Confirmando cancelación...');

    if (!reservaSeleccionada) {
        console.error('No hay reserva seleccionada para cancelar');
        alert('No hay reserva seleccionada para cancelar');
        return;
    }

    // Verificar que tenemos un ID válido
    if (!reservaSeleccionada.id) {
        console.error('ID de reserva no válido:', reservaSeleccionada.id);
        alert('Error: ID de reserva no válido');
        return;
    }

    // Verificar que tenemos el token CSRF
    if (!window.canchaData || !window.canchaData.csrfToken) {
        console.error('Token CSRF no disponible');
        alert('Error: Token de seguridad no disponible');
        return;
    }

    // Mostrar loading
    const btnConfirmar = document.querySelector('#cancelarModal .btn-confirmar-cancelar');
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Cancelando...';
    }

    console.log('Enviando petición de cancelación para reserva ID:', reservaSeleccionada.id);

    fetch('/api/reservas/cancelar/' + reservaSeleccionada.id + '/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.canchaData.csrfToken
        },
        body: JSON.stringify({
            motivo: 'Cancelación desde calendario'
        })
    })
        .then(response => {
            console.log('Respuesta del servidor:', response);

            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status} ${response.statusText}`);
            }

            return response.json();
        })
        .then(data => {
            console.log('Respuesta de cancelación:', data);

            if (data.success) {
                alert('Reserva cancelada exitosamente');

                // Actualizar calendario
                if (calendar) {
                    calendar.refetchEvents();
                }

                // Cerrar modales y panel
                cerrarModalCancelar();
                cerrarPanel();

            } else {
                throw new Error(data.error || 'Error desconocido al cancelar la reserva');
            }
        })
        .catch(error => {
            console.error('Error al cancelar reserva:', error);
            alert('Error al cancelar la reserva: ' + error.message);
        })
        .finally(() => {
            // Restaurar botón
            if (btnConfirmar) {
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = 'Confirmar Cancelación';
            }
        });
}

// Función para cerrar modal de cancelación
function cerrarModalCancelar() {
    if (cancelarModal) {
        cancelarModal.style.display = 'none';
        console.log('Modal de cancelación cerrado');
    }
}

// Función para cerrar panel lateral
function cerrarPanel() {
    const panel = document.getElementById('infoPanel');
    if (panel) {
        panel.classList.add('hidden');
    }
    reservaSeleccionada = null;
    console.log('Panel cerrado y reserva deseleccionada');
}

// Función para cargar horarios disponibles
function cargarHorariosDisponibles(fecha) {
    const container = document.getElementById('horariosDisponibles');
    container.innerHTML = '<div class="loading">Cargando horarios...</div>';

    // Generar horarios de 6 AM a 11 PM
    const horarios = [];
    for (let i = 6; i <= 22; i++) {
        const horaInicio = i.toString().padStart(2, '0') + ':00';
        const horaFin = (i + 1).toString().padStart(2, '0') + ':00';
        horarios.push({
            inicio: horaInicio,
            fin: horaFin,
            display: horaInicio + ' - ' + horaFin
        });
    }

    // Verificar disponibilidad
    fetch('/api/horarios-disponibles/' + canchaId + '/' + fecha + '/')
        .then(response => response.json())
        .then(data => {
            container.innerHTML = '';
            
            console.log('Datos recibidos:', data); // Para debugging
            
            horarios.forEach(horario => {
                const slot = document.createElement('div');
                slot.className = 'horario-slot';
                slot.textContent = horario.display;
                slot.dataset.inicio = horario.inicio;
                slot.dataset.fin = horario.fin;

                // Verificar si está ocupado
                const estaOcupado = data.ocupados && data.ocupados.includes(horario.inicio);
                
                // NUEVA VALIDACIÓN: Verificar si ya pasó la hora
                const horaPasada = data.horas_pasadas && data.horas_pasadas.includes(horario.inicio);
                
                if (estaOcupado) {
                    slot.classList.add('ocupado');
                    slot.title = 'Horario ya reservado';
                } else if (horaPasada) {
                    slot.classList.add('pasado'); // Nueva clase CSS
                    slot.title = 'Horario ya pasado';
                } else {
                    slot.addEventListener('click', function () {
                        seleccionarHorario(this, horario);
                    });
                }

                container.appendChild(slot);
            });
        })
        .catch(error => {
            console.error('Error al cargar horarios:', error);
            container.innerHTML = '';
            horarios.forEach(horario => {
                const slot = document.createElement('div');
                slot.className = 'horario-slot';
                slot.textContent = horario.display;
                slot.dataset.inicio = horario.inicio;
                slot.dataset.fin = horario.fin;
                
                // Solo permitir selección si no es una fecha pasada
                if (!esFechaPasada(fecha, horario.inicio)) {
                    slot.addEventListener('click', function () {
                        seleccionarHorario(this, horario);
                    });
                } else {
                    slot.classList.add('pasado');
                    slot.title = 'Horario ya pasado';
                }
                
                container.appendChild(slot);
            });
        });
}

// Nueva función para verificar si una fecha/hora ya pasó
function esFechaPasada(fecha, hora) {
    const ahora = new Date();
    const fechaHora = new Date(fecha + 'T' + hora);
    return fechaHora <= ahora;
}

// Función actualizada para mostrar el modal de reserva
function mostrarModalReserva(fecha) {
    if (!modal) {
        console.error('Modal no encontrado');
        return;
    }

    // NUEVA VALIDACIÓN: Verificar si la fecha seleccionada ya pasó
    const fechaSeleccionada = new Date(fecha);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0); // Resetear la hora para comparar solo fechas
    
    if (fechaSeleccionada < hoy) {
        alert('No se pueden hacer reservas en fechas pasadas');
        return;
    }

    document.getElementById('fechaSeleccionada').value = formatearFecha(fecha);
    cargarHorariosDisponibles(fecha);
    modal.style.display = 'block';
}

// Función actualizada para seleccionar horario
function seleccionarHorario(elemento, horario) {
    // Verificar si el horario está ocupado o ya pasó
    if (elemento.classList.contains('ocupado') || elemento.classList.contains('pasado')) {
        return;
    }

    // Remover selección anterior
    document.querySelectorAll('.horario-slot.selected').forEach(slot => {
        slot.classList.remove('selected');
    });

    // Agregar selección actual
    elemento.classList.add('selected');
    horarioSeleccionadoGlobal = horario;

    // Actualizar campos
    document.getElementById('horarioSeleccionado').value = horario.display;
    document.getElementById('costoTotal').value = '$' + precioPorHora.toFixed(2);
}

// Actualizar la configuración del calendario para evitar fechas pasadas
// Esta función debe reemplazar el dateClick actual en inicializarCalendario()
function actualizarDateClick() {
    return function(info) {
        console.log('Fecha seleccionada:', info.dateStr);
        
        // NUEVA VALIDACIÓN: Verificar si la fecha ya pasó
        const fechaSeleccionada = new Date(info.dateStr);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        
        if (fechaSeleccionada < hoy) {
            alert('No se pueden hacer reservas en fechas pasadas');
            return;
        }
        
        fechaSeleccionadaGlobal = info.dateStr;
        mostrarModalReserva(info.dateStr);
    };
}

// Función para seleccionar horario
function seleccionarHorario(elemento, horario) {
    if (elemento.classList.contains('ocupado')) return;

    // Remover selección anterior
    document.querySelectorAll('.horario-slot.selected').forEach(slot => {
        slot.classList.remove('selected');
    });

    // Agregar selección actual
    elemento.classList.add('selected');
    horarioSeleccionadoGlobal = horario;

    // Actualizar campos
    document.getElementById('horarioSeleccionado').value = horario.display;
    document.getElementById('costoTotal').value = '$' + precioPorHora.toFixed(2);
}

// Función para formatear fecha
function formatearFecha(fecha) {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Función para confirmar reserva
// Función para confirmar reserva (versión corregida)
function confirmarReserva() {
    if (!horarioSeleccionadoGlobal) {
        alert('Por favor, selecciona un horario');
        return;
    }

    // CORRECCIÓN: No enviar el campo 'costo', se calcula en el backend
    const reservaData = {
        cancha_id: canchaId,
        fecha: fechaSeleccionadaGlobal,
        hora_inicio: horarioSeleccionadoGlobal.inicio,
        hora_fin: horarioSeleccionadoGlobal.fin
        // Removido: costo: precioPorHora
    };

    console.log('Datos a enviar:', reservaData); // Debug

    // Mostrar loading en el botón
    const btnConfirmar = document.querySelector('#reservaModal .btn-primary');
    if (btnConfirmar) {
        btnConfirmar.disabled = true;
        btnConfirmar.textContent = 'Creando reserva...';
    }

    // Enviar reserva al servidor
    fetch('/api/reservas/crear/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': window.canchaData.csrfToken
        },
        body: JSON.stringify(reservaData)
    })
        .then(response => {
            console.log('Respuesta del servidor:', response); // Debug
            if (!response.ok) {
                throw new Error(`Error HTTP: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log('Datos recibidos:', data); // Debug
            if (data.success) {
                // Mostrar mensaje con información de la factura
                const mensaje = `¡Reserva creada exitosamente!\n\nDetalles:\n- Reserva ID: ${data.reserva_id}\n- Factura ID: ${data.factura_id}\n- Monto: $${data.monto}\n\nLa factura ha sido generada automáticamente.`;
                alert(mensaje);
                
                if (calendar) {
                    calendar.refetchEvents();
                }
                cerrarModal();
            } else {
                alert('Error al crear la reserva: ' + data.error);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error al crear la reserva: ' + error.message);
        })
        .finally(() => {
            // Restaurar botón
            if (btnConfirmar) {
                btnConfirmar.disabled = false;
                btnConfirmar.textContent = 'Confirmar Reserva';
            }
        });
}

// Función para cerrar modal
function cerrarModal() {
    if (modal) {
        modal.style.display = 'none';
    }
    horarioSeleccionadoGlobal = null;
    fechaSeleccionadaGlobal = null;
}

// Event listeners
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM cargado, esperando FullCalendar...');
    setTimeout(inicializarCalendario, 100);
});

// Cerrar modal al hacer clic fuera
window.onclick = function (event) {
    if (event.target == modal) {
        cerrarModal();
    }
    if (event.target == cancelarModal) {
        cerrarModalCancelar();
    }
};

// Cerrar modal con la X
document.addEventListener('DOMContentLoaded', function () {
    const closeButtons = document.querySelectorAll('.close');
    closeButtons.forEach(button => {
        button.onclick = function () {
            const modal = this.closest('.modal');
            if (modal) {
                modal.style.display = 'none';
            }
        };
    });
});

// Función de utilidad para debugging
function debugReservaSeleccionada() {
    console.log('Estado actual de reservaSeleccionada:', reservaSeleccionada);
    console.log('Modal de cancelación:', cancelarModal);
    console.log('Window.canchaData:', window.canchaData);
}