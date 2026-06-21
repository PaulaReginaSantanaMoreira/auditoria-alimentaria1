// Esperar a que la página esté cargada por completo
window.addEventListener('DOMContentLoaded', function() {

    // --- Pre-seleccionar "0 - No cumple" por defecto en todas las preguntas ---
    const optionGroups = document.querySelectorAll('.btn-group-options');
    optionGroups.forEach(group => {
        const firstRadio = group.querySelector('input[type="radio"][value="0"]');
        if (firstRadio && !group.querySelector('input[type="radio"]:checked')) {
            firstRadio.checked = true;
        }
    });

    // --- Selectores principales ---
    const btnCalcular = document.getElementById('btnCalcular');
    const btnImprimir = document.getElementById('btnImprimir');
    const resultBlock = document.getElementById('resultBlock');
    
    const scoreDisplay = document.getElementById('scoreDisplay');
    const infScore = document.getElementById('infScore');
    const messageDisplay = document.getElementById('messageDisplay');
    const infDictamen = document.getElementById('infDictamen');
    const tablaDeficiencias = document.getElementById('tablaDeficiencias');
    const infFecha = document.getElementById('infFecha');
    
    // --- Selectores del Modal de Firma ---
    const signatureModal = document.getElementById('signatureModal');
    const closeModal = document.getElementById('closeModal');
    const btnCancelSignature = document.getElementById('btnCancelSignature');
    const btnConfirmSignature = document.getElementById('btnConfirmSignature');
    const canvasAuditor = document.getElementById('canvasAuditor');
    const canvasAuditado = document.getElementById('canvasAuditado');

    if (!btnCalcular) {
        console.error("⚠️ Error crítico: No se encuentra el botón 'btnCalcular' en el HTML.");
        return;
    }

    // --- Selectores del Modal de Notificación ---
    const notifModal = document.getElementById('notifModal');
    const notifIcon = document.getElementById('notifIcon');
    const notifTitle = document.getElementById('notifTitle');
    const notifMessage = document.getElementById('notifMessage');
    const btnCloseNotif = document.getElementById('btnCloseNotif');
    const closeNotifModal = document.getElementById('closeNotifModal');

    function mostrarNotificacion(titulo, mensaje, icono) {
        if (!notifModal) return;
        notifIcon.textContent = icono || '⚠️';
        notifTitle.textContent = titulo || 'Atención';
        notifMessage.textContent = mensaje || '';
        notifModal.classList.remove('hidden');
    }

    function ocultarNotificacion() {
        if (notifModal) notifModal.classList.add('hidden');
    }

    if (btnCloseNotif) btnCloseNotif.addEventListener('click', ocultarNotificacion);
    if (closeNotifModal) closeNotifModal.addEventListener('click', ocultarNotificacion);
    window.addEventListener('click', function(e) {
        if (e.target === notifModal) ocultarNotificacion();
    });

    btnCalcular.addEventListener('click', function(event) {
        event.preventDefault();
        event.stopPropagation();

        // 1. Validar campos obligatorios de datos generales
        const inputsMeta = [
            document.getElementById('empresaInput'),
            document.getElementById('cifInput'),
            document.getElementById('fechaInput'),
            document.getElementById('direccionInput')
        ];
        
        let formsValidos = true;
        
        inputsMeta.forEach(input => {
            if (!input) return;
            if (input.value.trim() === "") {
                input.classList.add('invalid-input');
                formsValidos = false;
            } else {
                input.classList.remove('invalid-input');
            }
            
            // Limpiar la advertencia visual en rojo en tiempo real cuando escriban o editen
            if (!input.dataset.hasValidationListener) {
                const limpiarWarning = () => {
                    if (input.value.trim() !== "") {
                        input.classList.remove('invalid-input');
                    }
                };
                input.addEventListener('input', limpiarWarning);
                input.addEventListener('change', limpiarWarning);
                input.dataset.hasValidationListener = "true";
            }
        });
        
        if (!formsValidos) {
            mostrarNotificacion(
                'Campos Obligatorios Incompletos',
                'Por favor, rellene todos los datos generales de la empresa marcados en rojo antes de continuar.',
                '🚫'
            );
            // Enfocar el primer input vacío
            const primerVacio = inputsMeta.find(input => input && input.value.trim() === "");
            if (primerVacio) primerVacio.focus();
            return;
        }

        try {
            const questionCards = document.querySelectorAll('.question-card');
            
            if (questionCards.length === 0) {
                mostrarNotificacion(
                    'Error de Estructura',
                    'No se encontraron tarjetas de preguntas (.question-card). Revise el HTML.',
                    '❌'
                );
                return;
            }

            let totalScore = 0;
            let maxPossibleScore = 0;
            let criticalFailTriggered = false;
            let reportRowsHTML = ""; 

            // Recorrer las 30 preguntas de control
            questionCards.forEach(card => {
                const selectedRadio = card.querySelector('input[type="radio"]:checked');
                
                const questionTextElement = card.querySelector('.question-text') || card.querySelector('p');
                const questionText = questionTextElement ? questionTextElement.innerText : "Punto de control sin texto";
                
                const obsInputElement = card.querySelector('.obs-input') || card.querySelector('textarea');
                const obsInput = obsInputElement ? obsInputElement.value.trim() : "";
                
                // Procesamiento de imágenes (fotos adjuntas)
                const fileInput = card.querySelector('.file-input') || card.querySelector('input[type="file"]');
                let imgTagHTML = "";
                
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    // Se usa el data URL ya almacenado en la vista previa para que funcione en el PDF
                    const previewContainer = card.querySelector('.preview-container');
                    const imgPreview = previewContainer ? previewContainer.querySelector('.img-preview') : null;
                    if (imgPreview && imgPreview.src && imgPreview.src.startsWith('data:')) {
                        imgTagHTML = `<img src="${imgPreview.src}" class="img-evidencia">`;
                    } else {
                        // Fallback: leer con FileReader sincronizado (la imagen aún no estará lista si no se previsualizo)
                        imgTagHTML = `<p style="color:orange; font-size:0.75rem; margin-top:5px;">📷 [Imagen adjuntada - vista previa no disponible]</p>`;
                    }
                }

                let val = 0; // Valor por defecto si no se responde es 0
                let estadoTexto = "No Cumple";
                let badgeClase = "status-nocumple";

                if (selectedRadio) {
                    val = parseInt(selectedRadio.value);
                    if (val === 2) {
                        estadoTexto = "Cumple";
                        badgeClase = "status-cumple";
                    } else if (val === 1) {
                        estadoTexto = "Parcial";
                        badgeClase = "status-parcial";
                    } else {
                        estadoTexto = "No Cumple";
                        badgeClase = "status-nocumple";
                    }
                    
                    // Comprobar si es un fallo crítico obligatorio
                    if (selectedRadio.dataset.critical === "true" && val === 0) {
                        criticalFailTriggered = true;
                    }
                }

                totalScore += val;
                maxPossibleScore += 2;

                // Añadir fila al PDF si hay un fallo (0 o 1), si hay comentarios o si hay fotos
                if (val === 0 || val === 1 || obsInput !== "" || imgTagHTML !== "" || !selectedRadio) {
                    reportRowsHTML += `
                        <tr>
                            <td><strong>${questionText}</strong></td>
                            <td style="text-align: center; vertical-align: middle;">
                                <span class="badge-status ${badgeClase}">${estadoTexto}</span>
                            </td>
                            <td>
                                <div style="margin-bottom: 5px; color: #333;">${obsInput ? obsInput : "<em>Verificado sin novedades.</em>"}</div>
                                ${imgTagHTML}
                            </td>
                        </tr>
                    `;
                }
            });

            // Cálculos finales de conformidad
            const finalPercentage = Math.round((totalScore / maxPossibleScore) * 100);
            
            let dictamenTexto = "";
            if (criticalFailTriggered || finalPercentage < 70) {
                dictamenTexto = "Auditoría Desfavorable. Riesgo sanitario o fallo crítico detectado.";
            } else if (finalPercentage >= 70 && finalPercentage <= 89) {
                dictamenTexto = "Cumplimiento Aceptable. Se requiere subsanación de desviaciones.";
            } else {
                dictamenTexto = "Excelente cumplimiento. Sistema robusto y conforme.";
            }

            // Mostrar el bloque de resultados
            if (resultBlock) {
                resultBlock.classList.remove('hidden');
            }

            // Inyectar datos calculados
            scoreDisplay.textContent = `${finalPercentage}%`;
            infScore.textContent = `${finalPercentage}%`;
            messageDisplay.textContent = dictamenTexto;
            infDictamen.textContent = dictamenTexto;
            
            // Si no hay desviaciones o evidencias
            if (reportRowsHTML === "") {
                reportRowsHTML = `
                    <tr>
                        <td colspan="3" style="text-align: center; color: #475569; padding: 15px;">
                            <em>Cumplimiento del 100% de los requisitos evaluados de campo. Sin desviaciones ni observaciones registradas.</em>
                        </td>
                    </tr>
                `;
            }
            
            tablaDeficiencias.innerHTML = reportRowsHTML;
            
            // Scroll suave hacia los resultados
            resultBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (error) {
            mostrarNotificacion(
                'Error de Procesamiento',
                'Error al procesar la auditoría: ' + error.message,
                '❌'
            );
        }
    });

    // --- 2. Lógica del Canvas para Firmas Digitales ---
    function inicializarCanvasFirma(canvas, clearBtnId) {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let dibujando = false;

        // Estilo del trazo digital (trazo profesional)
        ctx.strokeStyle = "#0f172a"; 
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        // Obtener coordenadas ajustadas al tamaño del cliente y factor de escala
        function obtenerCoordenadas(e) {
            const rect = canvas.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            // Escalar de forma proporcional según las propiedades HTML width/height del canvas
            return {
                x: (clientX - rect.left) * (canvas.width / rect.width),
                y: (clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        const iniciarTrazo = (e) => {
            dibujando = true;
            canvas.dataset.signed = "true";
            const p = obtenerCoordenadas(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            // Evitar comportamiento por defecto en móviles (scroll o pull-to-refresh)
            if (e.cancelable) e.preventDefault();
        };

        const dibujarTrazo = (e) => {
            if (!dibujando) return;
            const p = obtenerCoordenadas(e);
            ctx.lineTo(p.x, p.y);
            ctx.stroke();
            if (e.cancelable) e.preventDefault();
        };

        const finalizarTrazo = () => {
            dibujando = false;
        };

        // Eventos táctiles
        canvas.addEventListener('touchstart', iniciarTrazo, { passive: false });
        canvas.addEventListener('touchmove', dibujarTrazo, { passive: false });
        canvas.addEventListener('touchend', finalizarTrazo);
        canvas.addEventListener('touchcancel', finalizarTrazo);

        // Eventos de ratón
        canvas.addEventListener('mousedown', iniciarTrazo);
        canvas.addEventListener('mousemove', dibujarTrazo);
        window.addEventListener('mouseup', finalizarTrazo);

        // Botón de borrado
        const clearBtn = document.getElementById(clearBtnId);
        if (clearBtn) {
            clearBtn.addEventListener('click', (e) => {
                e.preventDefault();
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                canvas.dataset.signed = "false";
            });
        }

        // Estado inicial de firma vacía
        canvas.dataset.signed = "false";
    }

    // Inicializar ambos paneles de firma
    inicializarCanvasFirma(canvasAuditor, 'clearAuditor');
    inicializarCanvasFirma(canvasAuditado, 'clearAuditado');


    // --- 3. Control del Modal de Firmas ---
    if (btnImprimir) {
        btnImprimir.addEventListener('click', function(e) {
            e.preventDefault();
            // Abrir el modal mostrando la interfaz
            if (signatureModal) {
                signatureModal.classList.remove('hidden');
            }
        });
    }

    // Cerrar el modal
    function ocultarModal() {
        if (signatureModal) {
            signatureModal.classList.add('hidden');
        }
    }

    if (closeModal) closeModal.addEventListener('click', ocultarModal);
    if (btnCancelSignature) btnCancelSignature.addEventListener('click', ocultarModal);

    // Cerrar al pulsar fuera del contenido
    window.addEventListener('click', function(e) {
        if (e.target === signatureModal) {
            ocultarModal();
        }
    });

    // --- 4. Confirmación de Firmas y Generación de PDF ---
    if (btnConfirmSignature) {
        btnConfirmSignature.addEventListener('click', function(e) {
            e.preventDefault();

            const firmadoAuditor = canvasAuditor.dataset.signed === "true";
            const firmadoAuditado = canvasAuditado.dataset.signed === "true";

            // Advertencia opcional si las firmas están vacías
            if (!firmadoAuditor || !firmadoAuditado) {
                const continuar = confirm("⚠️ Al menos una de las firmas requeridas está vacía. ¿Desea proceder y generar el documento de todos modos?");
                if (!continuar) return;
            }

            try {
                // 1. Rellenar datos de cabecera generales del PDF
                const empresaVal = document.getElementById('empresaInput').value.trim();
                const cifVal = document.getElementById('cifInput').value.trim();
                const direccionVal = document.getElementById('direccionInput').value.trim();
                const fechaVal = document.getElementById('fechaInput').value;

                document.getElementById('infEmpresa').textContent = empresaVal || "Establecimiento no especificado";
                document.getElementById('infCif').textContent = cifVal || "-";
                document.getElementById('infDireccion').textContent = direccionVal || "No registrada";
                
                // Formatear fecha
                if (fechaVal) {
                    // Evitar desfase de zona horaria restando o usando parse de fecha local
                    const dateParts = fechaVal.split('-');
                    if (dateParts.length === 3) {
                        document.getElementById('infFecha').textContent = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
                    } else {
                        document.getElementById('infFecha').textContent = new Date(fechaVal).toLocaleDateString('es-ES');
                    }
                } else {
                    document.getElementById('infFecha').textContent = new Date().toLocaleDateString('es-ES');
                }

                // Observaciones finales generales
                const globalObsVal = document.getElementById('globalObsInput').value.trim();
                document.getElementById('infGlobalObs').textContent = globalObsVal || "Sin observaciones finales añadidas por el auditor.";

                // 2. Insertar las firmas dibujadas al PDF final
                const firmaAuditorPDF = document.getElementById('firmaDigitalAuditorPDF');
                const firmaAuditadoPDF = document.getElementById('firmaDigitalAuditadoPDF');

                if (firmadoAuditor) {
                    firmaAuditorPDF.innerHTML = `<img src="${canvasAuditor.toDataURL()}" alt="Firma Inspector/Auditor">`;
                } else {
                    firmaAuditorPDF.innerHTML = `<span style="color:#94a3b8; font-style:italic; font-size:0.85rem;">No firmada</span>`;
                }

                if (firmadoAuditado) {
                    firmaAuditadoPDF.innerHTML = `<img src="${canvasAuditado.toDataURL()}" alt="Firma Responsable">`;
                } else {
                    firmaAuditadoPDF.innerHTML = `<span style="color:#94a3b8; font-style:italic; font-size:0.85rem;">No firmada</span>`;
                }

                // Ocultar modal y disparar impresión limpia
                ocultarModal();
                
                // Breve retraso para asegurar que el modal se oculte visualmente antes de la llamada de impresión
                setTimeout(() => {
                    window.print();
                }, 150);

            } catch (err) {
                mostrarNotificacion(
                    'Error de Generación',
                    'Error al formatear firmas o generar la impresión: ' + err.message,
                    '❌'
                );
            }
        });
    }

    // --- 5. Manejo de vistas previas de fotos y eliminación en el formulario ---
    const fileInputs = document.querySelectorAll('.file-input');
    fileInputs.forEach(fileInput => {
        fileInput.addEventListener('change', function() {
            const card = fileInput.closest('.question-card');
            if (!card) return;

            // Buscar si ya existe un contenedor de vista previa
            let previewContainer = card.querySelector('.preview-container');

            if (fileInput.files && fileInput.files[0]) {
                const file = fileInput.files[0];
                
                // Si no existe el contenedor de vista previa, lo creamos
                if (!previewContainer) {
                    previewContainer = document.createElement('div');
                    previewContainer.className = 'preview-container';
                    previewContainer.innerHTML = `
                        <img class="img-preview" src="" alt="Vista previa">
                        <button type="button" class="btn-remove-file" title="Eliminar foto">✖</button>
                    `;
                    
                    // Insertar al final del área de evidencias
                    const evidenceInputs = card.querySelector('.evidence-inputs');
                    if (evidenceInputs) {
                        evidenceInputs.appendChild(previewContainer);
                    }
                    
                    // Añadir evento al botón de eliminación
                    const removeBtn = previewContainer.querySelector('.btn-remove-file');
                    removeBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        fileInput.value = ""; // Vaciar archivo en el input
                        previewContainer.remove(); // Quitar de pantalla
                    });
                }

                // Cargar y mostrar la miniatura de la imagen
                const reader = new FileReader();
                reader.onload = function(e) {
                    const imgPreview = previewContainer.querySelector('.img-preview');
                    if (imgPreview) {
                        imgPreview.src = e.target.result;
                    }
                };
                reader.readAsDataURL(file);
            } else {
                // Si el usuario cancela o limpia, borramos el contenedor
                if (previewContainer) {
                    previewContainer.remove();
                }
            }
        });
    });

});
