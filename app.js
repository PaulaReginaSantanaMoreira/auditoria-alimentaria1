// Forzar que el código espere a que la página esté cargada del todo en el móvil
window.addEventListener('DOMContentLoaded', function() {

    const btnCalcular = document.getElementById('btnCalcular');
    
    if (!btnCalcular) {
        alert("⚠️ Error crítico: No se encuentra el botón 'btnCalcular' en el HTML.");
        return;
    }

    btnCalcular.addEventListener('click', function(event) {
        // Bloquear cualquier comportamiento raro del navegador del móvil
        event.preventDefault();
        event.stopPropagation();

        try {
            // Buscamos todas las tarjetas de preguntas
            const questionCards = document.querySelectorAll('.question-card');
            
            if (questionCards.length === 0) {
                alert("⚠️ Error: No se encontraron tarjetas con la clase '.question-card'. Revisa tu HTML.");
                return;
            }

            let totalScore = 0;
            let maxPossibleScore = 0;
            let criticalFailTriggered = false;
            let reportRowsHTML = ""; 

            // Recorremos las 30 preguntas de forma ultra-segura
            questionCards.forEach(card => {
                const selectedRadio = card.querySelector('input[type="radio"]:checked');
                
                // Usamos selectores genéricos para evitar fallos si cambian los textos del HTML
                const questionTextElement = card.querySelector('.question-text') || card.querySelector('p');
                const questionText = questionTextElement ? questionTextElement.innerText : "Punto de control sin texto";
                
                const obsInputElement = card.querySelector('.obs-input') || card.querySelector('textarea');
                const obsInput = obsInputElement ? obsInputElement.value.trim() : "";
                
                // Procesar imágenes evitando bloqueos de memoria del teléfono
                const fileInput = card.querySelector('.file-input') || card.querySelector('input[type="file"]');
                let imgTagHTML = "";
                
                if (fileInput && fileInput.files && fileInput.files[0]) {
                    try {
                        const imgURL = URL.createObjectURL(fileInput.files[0]);
                        imgTagHTML = `<img src="${imgURL}" class="img-evidencia" style="max-width: 100%; max-height: 180px; display: block; margin-top: 8px; border-radius: 4px; border: 1px solid #cbd5e1;">`;
                    } catch (e) {
                        imgTagHTML = `<p style="color:red; font-size:0.8rem;">⚠️ [Imagen acoplada]</p>`;
                    }
                }

                let val = 0; // Si no está marcado, cuenta como 0 por seguridad
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
                    
                    if (selectedRadio.dataset.critical === "true" && val === 0) {
                        criticalFailTriggered = true;
                    }
                }

                totalScore += val;
                maxPossibleScore += 2;

                // Añadir fila si hay fallos (0 o 1), fotos o comentarios escritos
                if (val === 0 || val === 1 || obsInput !== "" || imgTagHTML !== "" || !selectedRadio) {
                    reportRowsHTML += `
                        <tr>
                            <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 0.85rem; line-height: 1.4;"><strong>${questionText}</strong></td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1; text-align: center; vertical-align: middle;">
                                <span class="badge-status ${badgeClase}" style="padding:4px 8px; font-weight:bold; border-radius:4px; font-size:0.75rem;">${estadoTexto}</span>
                            </td>
                            <td style="padding: 10px; border: 1px solid #cbd5e1; font-size: 0.85rem;">
                                <div style="margin-bottom: 5px; color: #333;">${obsInput ? obsInput : "<em>Verificado sin novedades.</em>"}</div>
                                ${imgTagHTML}
                            </td>
                        </tr>
                    `;
                }
            });

            // Cálculos finales
            const finalPercentage = Math.round((totalScore / maxPossibleScore) * 100);
            
            let dictamenTexto = "";
            if (criticalFailTriggered || finalPercentage < 70) {
                dictamenTexto = "Auditoría Desfavorable. Riesgo sanitario o fallo crítico detectado.";
            } else if (finalPercentage >= 70 && finalPercentage <= 89) {
                dictamenTexto = "Cumplimiento Aceptable. Se requiere subsanación de desviaciones.";
            } else {
                dictamenTexto = "Excelente cumplimiento. Sistema robusto y conforme.";
            }

            // =======================================================
            // SOLUCIÓN MÓVIL: FORZAR MOSTRAR EL BLOQUE ELIMINANDO LA CLASE CSS HIDDEN
            // =======================================================
            const resultBlock = document.getElementById('resultBlock');
            if (resultBlock) {
                // Borramos las clases viejas y forzamos de manera nativa que aparezca en pantalla
                resultBlock.removeAttribute('class'); 
                resultBlock.setAttribute('class', 'result-card'); 
                resultBlock.style.display = "block"; 
                resultBlock.style.visibility = "visible";
                resultBlock.style.opacity = "1";
            }

            // Inyectar los datos en los textos correspondientes
            document.getElementById('scoreDisplay').textContent = `Puntuación: ${finalPercentage}%`;
            document.getElementById('infScore').textContent = `${finalPercentage}%`;
            document.getElementById('messageDisplay').textContent = dictamenTexto;
            document.getElementById('infDictamen').textContent = dictamenTexto;
            
            // Volcar las filas del informe final
            document.getElementById('tablaDeficiencias').innerHTML = reportRowsHTML;
            document.getElementById('infFecha').textContent = new Date().toLocaleDateString('es-ES');

            // Scroll automático para que el móvil baje solo hasta los resultados
            resultBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });

        } catch (errorGeneral) {
            alert("Ocurrió un contratiempo técnico al procesar el botón: " + errorGeneral.message);
        }
    });

    // Evento del botón de Imprimir / Generar PDF
    const btnImprimir = document.getElementById('btnImprimir');
    if (btnImprimir) {
        btnImprimir.addEventListener('click', function() {
            const globalObsInput = document.getElementById('globalObsInput');
            const globalObsValue = globalObsInput ? globalObsInput.value.trim() : "";
            document.getElementById('infGlobalObs').textContent = globalObsValue ? globalObsValue : "Sin observaciones o conclusiones finales añadidas por el auditor.";
            window.print();
        });
    }
});
