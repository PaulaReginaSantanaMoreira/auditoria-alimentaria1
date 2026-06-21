# TRABAJO DE FIN DE MÁSTER / PROYECTO DE FIN DE GRADO

**Título del Proyecto:** Desarrollo de una Aplicación Web Interactiva para Auditorías Higiénico-Sanitarias y Control del Sistema APPCC en la Industria Alimentaria.

---

## RESUMEN
El presente proyecto describe el diseño, desarrollo e implementación de una aplicación web, orientada a dispositivos móviles y tablets, destinada a la ejecución de auditorías higiénico-sanitarias in situ. La herramienta permite a los auditores e inspectores evaluar puntos de control normativos, adjuntar evidencias fotográficas, registrar observaciones, recoger firmas digitales mediante interfaz táctil y generar un informe oficial en formato PDF de manera instantánea, sin necesidad de conexión a un servidor backend.

---

## ÍNDICE
1. [Introducción](#1-introducción)
2. [Objetivos del Proyecto](#2-objetivos-del-proyecto)
3. [Marco Teórico y Normativo](#3-marco-teórico-y-normativo)
4. [Metodología y Desarrollo Técnico](#4-metodología-y-desarrollo-técnico)
5. [Estructura del Proyecto y Arquitectura](#5-estructura-del-proyecto-y-arquitectura)
6. [Resultados y Funcionamiento](#6-resultados-y-funcionamiento)
7. [Conclusiones](#7-conclusiones)
8. [Referencias y Bibliografía](#8-referencias-y-bibliografía)

---

## 1. INTRODUCCIÓN
La digitalización de los procesos de control de calidad en la industria alimentaria es una necesidad crítica. Tradicionalmente, las inspecciones higiénico-sanitarias se han realizado utilizando soportes físicos (papel), lo cual retrasa el procesamiento de datos, dificulta la trazabilidad y aumenta el margen de error. Esta aplicación surge como una solución tecnológica para estandarizar, agilizar y asegurar el rigor de las inspecciones en la industria alimentaria.

## 2. OBJETIVOS DEL PROYECTO

### Objetivo General
Desarrollar una herramienta digital autónoma e intuitiva para la realización de auditorías de calidad alimentaria que permita la evaluación automatizada y la emisión de dictámenes in situ.

### Objetivos Específicos
* Digitalizar la rúbrica de inspección higiénico-sanitaria con base en normativas europeas e internacionales.
* Implementar un sistema de cálculo dinámico para determinar el porcentaje de conformidad (Cumple, Parcial, No Cumple).
* Desarrollar un módulo de recolección de evidencias que permita la captura de fotografías en tiempo real.
* Integrar un panel de firmas digitales táctiles (Canvas API) para validar legalmente el documento por ambas partes (Auditor y Auditado).
* Garantizar la generación de un informe PDF limpio y formateado, asegurando la privacidad de los datos (procesamiento 100% en el cliente).

## 3. MARCO TEÓRICO Y NORMATIVO
El proyecto se fundamenta fuertemente en las directrices globales y europeas de seguridad alimentaria:
* **Codex Alimentarius:** Principios Generales de Higiene de los Alimentos y directrices para la aplicación del sistema APPCC (Análisis de Peligros y Puntos de Control Crítico).
* **Reglamento (CE) Nº 852/2004:** Relativo a la higiene de los productos alimenticios, que obliga a los operadores de empresas alimentarias a crear, aplicar y mantener procedimientos basados en los principios del APPCC.
* **Norma ISO 22000:** Estándar internacional para sistemas de gestión de inocuidad alimentaria.
* La rúbrica evalúa dimensiones clave: Infraestructura y Equipos, Higiene y Manipulación, y Control de Procesos (Trazabilidad, Plagas, Alérgenos).

## 4. METODOLOGÍA Y DESARROLLO TÉCNICO

### Pila Tecnológica (Tech Stack)
El desarrollo se rigió por el principio de "cero dependencias externas" (Zero-Backend) para garantizar que la aplicación funcione en entornos aislados o con conectividad limitada.
* **Frontend Estructural:** HTML5 semántico.
* **Estilos y Diseño:** CSS3 (Vanilla) con un enfoque *Mobile-First*, utilizando Flexbox/Grid y un diseño responsivo. Se incluye un sofisticado módulo `@media print` para la reestructuración del DOM al generar el PDF.
* **Lógica de Negocio:** JavaScript (Vanilla, ES6). Manejo avanzado del DOM, gestión de estados del formulario, y cálculos de cumplimiento.
* **Gestión de Archivos:** `FileReader` API para la previsualización en base64 de imágenes adjuntas en tiempo real sin subir a un servidor.
* **Firmas Digitales:** HTML `<canvas>` API con captura de eventos táctiles (`touchstart`, `touchmove`) y de ratón.

### Decisiones de Diseño y Arquitectura
* **Generación de PDF Nativo:** Tras evaluar librerías de terceros (como html2pdf.js), se optó por una solución nativa basada en la API de impresión del navegador (`window.print()`). Esta decisión (reflejada en los últimos *commits*) soluciona problemas de renderizado en blanco, optimiza el tamaño del archivo y aprovecha el motor del navegador para respetar los saltos de página (`page-break-inside`) y la calidad tipográfica del informe oficial.

## 5. ESTRUCTURA DEL PROYECTO Y ARQUITECTURA
El proyecto se compone de los siguientes archivos en la raíz:

* `index.html`: Contiene el esqueleto de la aplicación, el formulario de 30 puntos de control divididos por categorías, las ventanas modales de firma y notificaciones, y la plantilla oculta que servirá como informe final para la impresión.
* `style.css`: Estilos visuales del *Dashboard* de auditoría (colores, alertas visuales de error, tarjetas de evaluación) y reglas críticas de impresión (`@media print`, `.print-only`) que ocultan la interfaz de usuario y muestran únicamente el dictamen formal al generar el documento.
* `app.js`: Script principal que controla la validación de campos obligatorios, el despliegue del modal de firmas, la lógica de dibujo en el Canvas, el cálculo del porcentaje de idoneidad, y la inyección de datos dinámicos en la plantilla del informe antes de invocar la impresión.

## 6. RESULTADOS Y FUNCIONAMIENTO
El flujo de usuario (User Journey) establecido es:
1. **Recolección de Metadatos:** El auditor introduce Nombre, CIF, Fecha y Dirección. Si falta algún dato, el sistema bloquea el avance y marca los campos en rojo.
2. **Evaluación Continua:** Se responde a cada punto (0 - No Cumple, 1 - Parcial, 2 - Cumple). Por defecto, la app preselecciona "No Cumple" para adoptar un enfoque de precaución.
3. **Aportación de Pruebas:** Se pueden escribir observaciones y adjuntar una foto por cada punto de control.
4. **Validación:** Al presionar "Finalizar y Evaluar", el sistema calcula la nota (%).
5. **Aceptación y Firma:** Al presionar "Guardar PDF", se abre un modal para las firmas manuscritas de ambas partes.
6. **Exportación:** Se genera y formatea automáticamente un informe profesional en A4 con la conclusión, las firmas y el listado exclusivo de desviaciones y evidencias, listo para ser archivado, enviado por correo o impreso.

## 7. CONCLUSIONES
Se ha logrado desarrollar una aplicación de auditoría robusta, ágil y escalable. La decisión de utilizar tecnologías nativas web garantiza la compatibilidad universal en dispositivos móviles sin necesidad de instalación desde tiendas de aplicaciones (App Store / Google Play). La herramienta cumple con los estándares exigidos por las bancas evaluadoras tanto a nivel técnico (código limpio, manejo de APIs nativas, diseño responsivo) como a nivel funcional y legal (cumplimiento de la normativa APPCC).

## 8. REFERENCIAS Y BIBLIOGRAFÍA
1. Parlamento Europeo y Consejo de la Unión Europea. (2004). *Reglamento (CE) nº 852/2004 relativo a la higiene de los productos alimenticios.*
2. Comisión del Codex Alimentarius. (2020). *Principios Generales de Higiene de los Alimentos (CXC 1-1969).*
3. Organización Internacional de Normalización (ISO). (2018). *ISO 22000:2018. Sistemas de gestión de la inocuidad de los alimentos.*
4. Mozilla Developer Network (MDN). *Documentación sobre Canvas API y Web Print API.*
5. W3C. *Especificaciones HTML5 y CSS3 Paged Media.*

---
*Documento autogenerado en cumplimiento de los requisitos de presentación técnica, teórica y normativa del Trabajo de Fin de Máster / Proyecto de Fin de Grado.*
