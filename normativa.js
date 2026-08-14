/**
 * =============================================================================
 * MÓDULO DE CONSULTA NORMATIVA — Complemento auditoria-alimentaria1
 * =============================================================================
 * Base normativa compilada desde NotebookLM (correcciones aplicadas):
 *   - BRCGS_V9: añadida coma faltante entre aplicacionPyme y palabrasClave
 *   - RD_1086_2020: añadida coma faltante entre aplicacionPyme y palabrasClave
 * =============================================================================
 */

const NORMATIVA_AUDITORIA = [
  {
    id: "REGLAMENTO_178_2002",
    codigo: "Reglamento (CE) 178/2002",
    titulo: "Reglamento (CE) nº 178/2002 del Parlamento Europeo y del Consejo, de 28 de enero de 2002, por el que se establecen los principios y los requisitos generales de la legislación alimentaria, se crea la Autoridad Europea de Seguridad Alimentaria y se fijan procedimientos relativos a la seguridad alimentaria",
    ambito: "Europeo",
    categoria: "Controles Oficiales",
    requisitosClave: [
      "Responsabilidad primaria: Los explotadores de empresas alimentarias se asegurarán del cumplimiento de la legislación alimentaria en todas las etapas bajo su control (Artículo 17).",
      "Establecimiento de trazabilidad en todas las fases de producción, transformación y distribución (Artículo 18).",
      "Fundamentación de la legislación y la toma de decisiones en el análisis de riesgos, apoyado en bases científicas independientes (Artículo 5 y 6)."
    ],
    puntosAuditable: [
      "Procedimiento documentado de trazabilidad ascendente y descendente (proveedores directos y clientes directos).",
      "Registros de materias primas entrantes y productos finales despachados con fechas y números de lote.",
      "Protocolos establecidos de retirada y recuperación de productos en caso de incidentes de inocuidad alimentaria."
    ],
    aplicacionPyme: "Aplicable a todo tipo de empresas; se reconoce la proporcionalidad pero no se exime de la obligación básica de garantizar la trazabilidad y la inocuidad alimentaria.",
    palabrasClave: ["responsabilidad_primaria", "trazabilidad", "analisis_de_riesgos"]
  },
  {
    id: "REGLAMENTO_852_2004",
    codigo: "Reglamento (CE) 852/2004",
    titulo: "Reglamento (CE) nº 852/2004 del Parlamento Europeo y del Consejo, de 29 de abril de 2004, relativo a la higiene de los productos alimenticios",
    ambito: "Europeo",
    categoria: "Higiene",
    requisitosClave: [
      "Obligación de crear, aplicar y mantener un procedimiento permanente basado en los principios del APPCC en fases posteriores a la producción primaria (Artículo 5).",
      "Cumplimiento de los requisitos higiénicos generales del Anexo II para locales, equipos, suministro de agua, higiene de personal y formación.",
      "Garantizar la formación e instrucción de los manipuladores en cuestiones de higiene de acuerdo con su puesto."
    ],
    puntosAuditable: [
      "Manual APPCC implantado con definición de límites críticos, procedimientos de vigilancia y medidas correctoras.",
      "Registros escritos del control de los prerrequisitos (limpieza, desinfección, plagas, agua y mantenimiento).",
      "Expedientes de formación de los manipuladores con registro de contenidos y fechas."
    ],
    aplicacionPyme: "Alta flexibilidad que permite aplicar sistemas APPCC simplificados y usar guías sectoriales de prácticas correctas en lugar de controles instrumentales de PCC.",
    palabrasClave: ["higiene", "appcc", "prerrequisitos", "flexibilidad"]
  },
  {
    id: "REGLAMENTO_853_2004",
    codigo: "Reglamento (CE) 853/2004",
    titulo: "Reglamento (CE) nº 853/2004 del Parlamento Europeo y del Consejo, de 29 de abril de 2004, por el que se establecen normas específicas de higiene de los alimentos de origen animal",
    ambito: "Europeo",
    categoria: "Higiene",
    requisitosClave: [
      "Cumplimiento estricto de las normas específicas de higiene contenidas en el Anexo III según la categoría del producto animal.",
      "Obligación de aplicar la marca de identificación (o marcado sanitario) antes de que el producto salga del establecimiento de origen.",
      "Control estricto de la temperatura de refrigeración y congelación durante el almacenamiento y el transporte."
    ],
    puntosAuditable: [
      "Verificación visual de la marca de identificación en las canales o envasados expedidos.",
      "Registros de control de temperatura de las cámaras frigoríficas y túneles de congelación según límites establecidos.",
      "Comprobación de la Información sobre la Cadena Alimentaria (ICA) que acompaña a los animales vivos en mataderos."
    ],
    aplicacionPyme: "Permite exclusiones de su ámbito de aplicación para el suministro directo por el productor de pequeñas cantidades de productos primarios al consumidor o al comercio minorista local.",
    palabrasClave: ["origen_animal", "marca_identificacion", "temperatura"]
  },
  {
    id: "REGLAMENTO_1169_2011",
    codigo: "Reglamento (UE) 1169/2011",
    titulo: "Reglamento (UE) nº 1169/2011 del Parlamento Europeo y del Consejo, de 25 de octubre de 2011, sobre la información alimentaria facilitada al consumidor",
    ambito: "Europeo",
    categoria: "Etiquetado",
    requisitosClave: [
      "Declaración obligatoria de toda sustancia o coadyuvante causante de alergias o intolerancias que figure en el Anexo II (Artículo 9.1.c).",
      "Destacado tipográfico inequívoco de los alérgenos en la lista de ingredientes (mediante fuente, estilo o color de fondo) (Artículo 21.1.b).",
      "Obligatoriedad de proporcionar información de alérgenos también para alimentos no envasados o presentados para la venta sin envasar (Artículo 44)."
    ],
    puntosAuditable: [
      "Inspección de las etiquetas físicas de productos para comprobar el resaltado correcto de los ingredientes alergénicos.",
      "Verificación de las fichas técnicas de composición y correspondencia exacta con las etiquetas finales.",
      "Presencia de cartelería o herramientas de información escrita sobre alérgenos en las zonas de exposición y venta al por menor."
    ],
    aplicacionPyme: "Los Estados miembros pueden regular medidas nacionales sobre los medios para facilitar la información obligatoria de alérgenos en alimentos no envasados, permitiendo flexibilidad administrativa.",
    palabrasClave: ["etiquetado", "alergenos", "informacion_consumidor"]
  },
  {
    id: "RD_1021_2022",
    codigo: "Real Decreto 1021/2022",
    titulo: "Real Decreto 1021/2022, de 13 de diciembre, por el que se regulan determinados requisitos en materia de higiene de la producción y comercialización de los productos alimenticios en establecimientos de comercio al por menor",
    ambito: "Nacional",
    categoria: "Higiene",
    requisitosClave: [
      "Establecimiento de las temperaturas obligatorias de conservación de alimentos para el comercio al por menor en España.",
      "Requisitos higiénicos específicos para la preparación y control de carne picada, preparados de carne y productos cárnicos elaborados in situ.",
      "Obligación de mantener un procedimiento de autocontrol APPCC que puede aplicarse de manera simplificada."
    ],
    puntosAuditable: [
      "Comprobación de temperaturas de almacenamiento (ej. carne picada <= 2ºC; preparados de carne <= 4ºC).",
      "Evidencia documental o registros de cantidades de alimentos, fechas y datos de establecimientos minoristas suministrados en el marco de la actividad marginal.",
      "Verificación de que los recipientes reutilizables aportados por consumidores cumplen con las condiciones de limpieza e idoneidad."
    ],
    aplicacionPyme: "Diseñado para flexibilizar la normativa europea en el pequeño comercio, permitiendo el uso de Guías de Prácticas Correctas de Higiene y un APPCC simplificado adaptado a minoristas.",
    palabrasClave: ["comercio_minorista", "temperaturas_refrigeracion", "appcc_simplificado"]
  },
  {
    id: "RD_562_2025",
    codigo: "Real Decreto 562/2025",
    titulo: "Real Decreto 562/2025, de 1 de julio, relativo a los controles y otras actividades oficiales realizados sobre la cadena agroalimentaria y operaciones relacionadas",
    ambito: "Nacional",
    categoria: "Controles Oficiales",
    requisitosClave: [
      "Regulación de las facultades de los agentes de control oficial, incluyendo la entrada sin previa notificación y acceso a sistemas informatizados de los operadores.",
      "Requisitos formales para el contenido y validez probatoria de los registros escritos y actas de los controles oficiales realizados.",
      "Procedimiento formal para la toma de muestras, conservación, transporte y revisión documental analítica."
    ],
    puntosAuditable: [
      "Contenido de las actas de toma de muestras (identificación del precinto, lote, fecha caducidad, temperatura de conservación).",
      "Comprobación de la acreditación y designación oficial del laboratorio que realiza los análisis para el control oficial.",
      "Verificación de la aplicación de inmovilizaciones cautelares oficiales o intensificación de controles ante sospechas fundadas de riesgo alimentario."
    ],
    aplicacionPyme: "Establece salvaguardas y derechos para los operadores (incluidas PYMEs), como la revisión documental o el derecho a un segundo análisis contradictorio en caso de resultados no conformes.",
    palabrasClave: ["controles_oficiales", "toma_de_muestras", "acta_inspeccion"]
  },
  {
    id: "ISO_22000_2018",
    codigo: "ISO 22000:2018",
    titulo: "Sistemas de gestión de la inocuidad de los alimentos — Requisitos para cualquier organización en la cadena alimentaria",
    ambito: "Internacional",
    categoria: "ISO",
    requisitosClave: [
      "Estructura basada en el ciclo PHVA en dos niveles: uno organizativo (sistema de gestión) y otro operativo (principios del HACCP).",
      "Planificación y realización del análisis de peligros combinando Programas de Prerrequisitos (PPR) con planes de control de peligros (HACCP/PPRO).",
      "Obligación de validación de las medidas de control antes de su implementación y verificación periódica del sistema de gestión (SGIA)."
    ],
    puntosAuditable: [
      "Comprensión del contexto de la organización e identificación de necesidades de partes interesadas como información documentada.",
      "Registros de validación de límites críticos y capacidad de las medidas de control definidas para los PCC.",
      "Evidencias de la calibración de equipos de seguimiento y medición con trazabilidad nacional o internacional.",
      "Resultados y actas de las auditorías internas del SGIA y de las revisiones por la dirección."
    ],
    aplicacionPyme: "Permite a pequeñas organizaciones utilizar elementos desarrollados externamente (ej. planes de análisis de peligros generados por asociaciones sectoriales) bajo estricto control de idoneidad.",
    palabrasClave: ["sgia", "procesos", "phva", "haccp"]
  },
  {
    id: "ISO_9001_2015",
    codigo: "ISO 9001:2015",
    titulo: "Sistemas de gestión de la calidad — Requisitos",
    ambito: "Internacional",
    categoria: "ISO",
    requisitosClave: [
      "Orientación estratégica orientada a aumentar la satisfacción del cliente y asegurar el cumplimiento de los requisitos legales aplicables (Sección 1).",
      "Enfoque basado en procesos para determinar la secuencia, interacción, recursos e indicadores de desempeño de la calidad (Sección 4.4).",
      "Pensamiento basado en riesgos para la determinación, evaluación y tratamiento de riesgos y oportunidades que afecten al sistema."
    ],
    puntosAuditable: [
      "Existencia de información documentada controlada (disponible, protegida, revisada y aprobada).",
      "Fichas de perfiles de puesto y registros que demuestren la competencia y formación del personal (Sección 7.2).",
      "Evidencias de calibración periódica de los instrumentos de medición con patrones trazables.",
      "Informes de auditorías internas planificadas y actas de las revisiones anuales por la alta dirección."
    ],
    aplicacionPyme: "No establece exclusiones predeterminadas pero es altamente flexible; permite justificar la no aplicabilidad de requisitos que no comprometan la conformidad del producto (ej. Diseño y Desarrollo si no aplica).",
    palabrasClave: ["sgc", "enfoque_a_procesos", "pensamiento_basado_en_riesgos", "mejora_continua"]
  },
  {
    id: "BRCGS_V9",
    codigo: "Norma BRCGS Versión 9",
    titulo: "BRCGS Norma Mundial de Seguridad Alimentaria (9.ª Edición)",
    ambito: "Internacional",
    categoria: "ISO",
    requisitosClave: [
      "Compromiso real de la gerencia sénior y establecimiento de un programa mensual para plantear incidencias de calidad y seguridad alimentaria (Requisito Fundamental 1.1).",
      "Desarrollo e implantación de un plan de inocuidad de alimentos basado en los principios HACCP de la Comisión del Codex Alimentarius (Sección 2).",
      "Establecimiento de un programa de auditorías internas sistemáticas que abarque al menos cuatro fechas distintas a lo largo del año (Requisito Fundamental 3.4)."
    ],
    puntosAuditable: [
      "Evidencias del Plan de Cultura de Seguridad y Calidad Alimentaria y registros de su medición de desempeño.",
      "Manual APPCC operativo con diagramas de flujo verificados in situ e identificación de PCC.",
      "Resultados del ejercicio de trazabilidad y prueba documentada de balance de masas realizada al menos cada seis meses.",
      "Registros del control operacional de alérgenos y etiquetado para evitar contaminación cruzada."
    ],
    aplicacionPyme: "Es una norma comercial muy rigurosa con base en GFSI; no posee flexibilizaciones especiales de cumplimiento, pero admite auditorías remotas combinadas e integra auditorías simplificadas según el tipo de producto.",
    palabrasClave: ["brcgs", "gfsi", "cultura_de_inocuidad", "auditorias_internas"]
  },
  {
    id: "IFS_FOOD_V8",
    codigo: "Norma IFS Food Versión 8",
    titulo: "IFS Food Versión 8: Norma para realizar auditorías de calidad y seguridad alimentaria en productos alimenticios",
    ambito: "Internacional",
    categoria: "ISO",
    requisitosClave: [
      "Cumplimiento obligatorio de los 10 requisitos esenciales denominados Knock-Out (KO) de la norma.",
      "Compromiso de la dirección y establecimiento de una política corporativa que aborde la cultura de seguridad alimentaria y sostenibilidad.",
      "Garantizar que todo el personal con influencia en la seguridad alimentaria posea las competencias necesarias mediante un plan estructurado de formación."
    ],
    puntosAuditable: [
      "Verificación in situ de los requisitos KO: KO 1 (Compromiso de la Dirección) y KO 2 (Sistema de Vigilancia de PCC).",
      "Comprobación documental del plan de acción para subsanar desviaciones y no conformidades detectadas en auditorías previas.",
      "Revisión de especificaciones de materias primas (mínimo 5) y de productos finales (mínimo 2).",
      "Evaluación in situ de los flujos de personal, aire y materiales para evitar contaminación cruzada por alérgenos o cuerpos extraños."
    ],
    aplicacionPyme: "Enfocado en evaluaciones de proceso y planta; permite la auditoría multi-localización y centralizada cuando se dispone de una oficina central que gestiona el sistema administrativo.",
    palabrasClave: ["ifs", "requisitos_ko", "seguridad_alimentaria", "auditoria_vertical"]
  },
  {
    id: "ISO_19011_2018",
    codigo: "ISO 19011:2018",
    titulo: "Directrices para la auditoría de los sistemas de gestión",
    ambito: "Internacional",
    categoria: "ISO",
    requisitosClave: [
      "Establecimiento y gestión de un programa de auditoría coherente con los objetivos de la organización y sus partes interesadas.",
      "Definición clara de los criterios de auditoría como el conjunto de requisitos de referencia para evaluar las evidencias objetivas.",
      "Determinación de la competencia y evaluación del desempeño de los auditores y de los miembros del equipo auditor."
    ],
    puntosAuditable: [
      "Programa de auditoría documentado con la planificación de frecuencias, procesos y métodos asociados.",
      "Registros escritos del plan de auditoría, incluyendo el alcance, duración y composición del equipo auditor.",
      "Registros de hallazgos que documenten conformidades, no conformidades y oportunidades de mejora identificadas.",
      "Fichas de evaluación de la competencia de los auditores internos involucrados."
    ],
    aplicacionPyme: "Altamente flexible; la escala de la auditoría y la complejidad del programa deben ajustarse directamente al tamaño, la naturaleza y los riesgos del auditado.",
    palabrasClave: ["auditoria_interna", "criterios_de_auditoria", "competencia_del_auditor"]
  },
  {
    id: "CODEX_CAC_RCP_1_1969",
    codigo: "Codex Alimentarius CAC/RCP 1-1969",
    titulo: "Código Internacional de Prácticas Recomendado - Principios Generales de Higiene de los Alimentos",
    ambito: "Internacional",
    categoria: "APPCC",
    requisitosClave: [
      "Aplicación sistemática de las buenas prácticas de higiene (BPH) como la base de prerrequisitos indispensables para la seguridad alimentaria.",
      "Estructuración del sistema APPCC mediante los 5 pasos previos y la aplicación de los 7 principios metodológicos clásicos.",
      "Definición y validación científica de límites críticos que permitan diferenciar la aceptabilidad de la inaceptabilidad del proceso."
    ],
    puntosAuditable: [
      "Plan de inocuidad documentado que acredite las 12 etapas lógicas de implementación.",
      "Diagrama de flujo del proceso verificado in situ por el equipo APPCC.",
      "Árbol de decisiones documentado para justificar técnicamente qué fases del proceso se designan como PCC.",
      "Registros diarios de la vigilancia de los límites críticos firmados por el operario responsable."
    ],
    aplicacionPyme: "Contempla expresamente la necesidad de flexibilidad, reconociendo que en pequeñas empresas el control mediante prácticas correctas de higiene puede reemplazar la monitorización compleja de PCC.",
    palabrasClave: ["codex_alimentarius", "higiene_de_alimentos", "principios_appcc"]
  },
  {
    id: "RD_140_2003",
    codigo: "Real Decreto 140/2003",
    titulo: "Real Decreto 140/2003, de 7 de febrero, por el que se establecen los criterios sanitarios de la calidad del agua de consumo humano",
    ambito: "Nacional",
    categoria: "Prerrequisitos",
    requisitosClave: [
      "Garantizar que el agua utilizada en la preparación de alimentos y limpieza de instalaciones sea potable según los límites microbiológicos y químicos.",
      "Obligación del operador de la empresa alimentaria de autocontrolar la calidad del agua consumida o integrada en el producto.",
      "Mantenimiento óptimo de las redes de distribución interna y depósitos de almacenamiento del establecimiento."
    ],
    puntosAuditable: [
      "Boletines analíticos periódicos del agua de grifo realizados por un laboratorio de control autorizado.",
      "Registros de la vigilancia diaria del nivel de cloro residual libre del agua de entrada.",
      "Plan de limpieza y desinfección documentado para depósitos de almacenamiento de agua."
    ],
    aplicacionPyme: "Los análisis obligatorios se adaptan a la escala; si el agua procede de una red de distribución municipal, el control se simplifica al análisis periódico de parámetros en los puntos de grifo.",
    palabrasClave: ["agua_de_consumo", "cloro_residual", "potabilidad"]
  },
  {
    id: "REGLAMENTO_2073_2005",
    codigo: "Reglamento (CE) 2073/2005",
    titulo: "Reglamento (CE) nº 2073/2005 de la Comisión, de 15 de noviembre de 2005, relativo a los criterios microbiológicos aplicables a los productos alimenticios",
    ambito: "Europeo",
    categoria: "Criterios Microbiológicos",
    requisitosClave: [
      "Cumplimiento de los criterios microbiológicos obligatorios que determinan la aceptabilidad de los productos y la higiene de sus procesos.",
      "Establecer planes de muestreo microbiológico periódico tanto en el producto final como en las superficies de trabajo y equipos.",
      "Adopción de medidas correctoras inmediatas ante resultados insatisfactorios o desviaciones de los límites establecidos."
    ],
    puntosAuditable: [
      "Registros de ensayos analíticos periódicos (Salmonella, Listeria monocytogenes, E. coli, enterobacterias según la especie).",
      "Verificación de que el muestreo microbiológico de superficies sigue metodologías validadas y frecuencias adecuadas.",
      "Procedimiento documentado de actuación y destrucción o reproceso de lotes no conformes."
    ],
    aplicacionPyme: "Permite la flexibilidad en las frecuencias de muestreo en pequeños establecimientos de venta al por menor y carnicerías, basándose en la evaluación del riesgo histórico de proceso.",
    palabrasClave: ["criterios_microbiologicos", "muestreo_superficies", "listeria_monocytogenes"]
  },
  {
    id: "RD_1086_2020",
    codigo: "Real Decreto 1086/2020",
    titulo: "Real Decreto 1086/2020, de 9 de diciembre, por el que se regulan y flexibilizan determinadas condiciones de aplicación de las disposiciones de la Unión Europea en materia de higiene de la producción y comercialización de los productos alimenticios y se regulan actividades excluidas de su ámbito de aplicación",
    ambito: "Nacional",
    categoria: "Prerrequisitos",
    requisitosClave: [
      "Establecer medidas nacionales de flexibilización del paquete de higiene para producciones tradicionales y de pequeña escala.",
      "Regulación de los requisitos para el suministro local y directo de pequeñas cantidades de alimentos por parte del productor primario.",
      "Coordinación de exclusiones del Registro General Sanitario (RGSEAA) para pequeños operadores comerciales minoristas."
    ],
    puntosAuditable: [
      "Acreditación de la autorización excepcional para la aplicación de adaptaciones estructurales en instalaciones pequeñas.",
      "Comprobación de que el suministro a colectividades locales cumple con la definición de actividad marginal, localizada y restringida.",
      "Registros de origen y volumen de productos de artesanía alimentaria tradicionales comercializados."
    ],
    aplicacionPyme: "Norma expresamente creada para facilitar la viabilidad de pequeñas empresas agroalimentarias en España mediante la simplificación de requisitos de diseño estructural y flexibilidad de implantación del APPCC.",
    palabrasClave: ["flexibilizacion", "artesanal", "pequeña_escala"]
  },
  {
    id: "REGLAMENTO_931_2011",
    codigo: "Reglamento de Ejecución (UE) 931/2011",
    titulo: "Reglamento de Ejecución (UE) nº 931/2011 de la Comisión, de 19 de septiembre de 2011, relativo a los requisitos en materia de trazabilidad establecidos por el Reglamento (CE) nº 178/2002 del Parlamento Europeo y del Consejo para los alimentos de origen animal",
    ambito: "Europeo",
    categoria: "Prerrequisitos",
    requisitosClave: [
      "Obligación del suministro sistemático de información de trazabilidad detallada para cada lote de alimentos de origen animal.",
      "Transmitir al operador de destino datos obligatorios como: descripción de alimentos, volumen, lote, expedidor, destinatario y fecha exacta de envío.",
      "Actualizar diariamente los datos de trazabilidad y tenerlos disponibles de forma clara e inequívoca para las autoridades competentes."
    ],
    puntosAuditable: [
      "Revisión de albaranes de entrega y facturas que incluyan de manera explícita los códigos de lote y fechas.",
      "Prueba de trazabilidad ascendente y descendente iniciada in situ en un tiempo máximo establecido.",
      "Verificación de que las canales de carne de vacuno u ovinos disponen del etiquetado y correspondencia exacta con el documento de movimiento animal."
    ],
    aplicacionPyme: "De aplicación uniforme y obligatoria para todos los operadores de la cadena alimentaria de origen animal; no existe flexibilidad en la omisión de los campos básicos de información para garantizar la seguridad rápida en alertas.",
    palabrasClave: ["trazabilidad_obligatoria", "origen_animal", "lote_de_produccion"]
  }
];

// =============================================================================
// MÓDULO NORMATIVA CONSULTOR
// =============================================================================

(function () {
  'use strict';

  // --- Configuración de categorías con iconos y colores ---
  const CATEGORIAS_CONFIG = {
    'Todos':                   { icono: '📋', color: '#475569', bg: '#f1f5f9' },
    'Higiene':                 { icono: '🧼', color: '#0369a1', bg: '#e0f2fe' },
    'APPCC':                   { icono: '⚙️', color: '#065f46', bg: '#d1fae5' },
    'ISO':                     { icono: '🏅', color: '#7c3aed', bg: '#ede9fe' },
    'Etiquetado':              { icono: '🏷️', color: '#b45309', bg: '#fef3c7' },
    'Prerrequisitos':          { icono: '🔧', color: '#9f1239', bg: '#ffe4e6' },
    'Controles Oficiales':     { icono: '🔍', color: '#1e3a5f', bg: '#dbeafe' },
    'Criterios Microbiológicos': { icono: '🔬', color: '#166534', bg: '#dcfce7' }
  };

  const AMBITO_CONFIG = {
    'Europeo':       { icono: '🇪🇺', color: '#1d4ed8' },
    'Nacional':      { icono: '🇪🇸', color: '#dc2626' },
    'Internacional': { icono: '🌍', color: '#059669' }
  };

  // --- Estado del módulo ---
  let estadoModulo = {
    panelAbierto: false,
    filtroCategoria: 'Todos',
    terminoBusqueda: '',
    normativaSeleccionada: null,
    acordeonesAbiertos: new Set()
  };

  // --- Inicialización ---
  function init() {
    inyectarHTML();
    inyectarEventos();
    renderizarTarjetas();
  }

  // --- Inyección del HTML del módulo ---
  function inyectarHTML() {
    const contenedor = document.createElement('div');
    contenedor.id = 'normativa-modulo';
    contenedor.innerHTML = `
      <!-- Botón FAB -->
      <button id="norm-fab" class="norm-fab" title="Consulta de Normativa" aria-label="Abrir consulta normativa">
        <span class="norm-fab-icono">📚</span>
        <span class="norm-fab-texto">Normativa</span>
      </button>

      <!-- Overlay de fondo -->
      <div id="norm-overlay" class="norm-overlay hidden" aria-hidden="true"></div>

      <!-- Panel lateral -->
      <div id="norm-panel" class="norm-panel hidden" role="dialog" aria-labelledby="norm-panel-titulo" aria-modal="true">
        <div class="norm-panel-header">
          <div class="norm-panel-header-left">
            <span class="norm-panel-icono">📚</span>
            <div>
              <h2 id="norm-panel-titulo" class="norm-panel-titulo">Consulta Normativa</h2>
              <p class="norm-panel-subtitulo">Codex · APPCC · IFS · BRCGS · Legislación UE/ES</p>
            </div>
          </div>
          <button id="norm-panel-cerrar" class="norm-panel-cerrar" aria-label="Cerrar panel">✕</button>
        </div>

        <!-- Buscador -->
        <div class="norm-buscador-wrapper">
          <span class="norm-buscador-icono">🔍</span>
          <input
            type="search"
            id="norm-buscador"
            class="norm-buscador"
            placeholder="Buscar reglamento, requisito, término..."
            autocomplete="off"
            aria-label="Buscar normativa"
          >
          <button id="norm-buscador-limpiar" class="norm-buscador-limpiar hidden" aria-label="Limpiar búsqueda">✕</button>
        </div>

        <!-- Filtros de categoría -->
        <div class="norm-filtros" role="group" aria-label="Filtrar por categoría">
          ${Object.keys(CATEGORIAS_CONFIG).map(cat => `
            <button
              class="norm-filtro-btn ${cat === 'Todos' ? 'activo' : ''}"
              data-categoria="${cat}"
              aria-pressed="${cat === 'Todos'}"
            >
              ${CATEGORIAS_CONFIG[cat].icono} ${cat}
            </button>
          `).join('')}
        </div>

        <!-- Contador de resultados -->
        <div class="norm-contador" id="norm-contador" aria-live="polite">
          Mostrando <strong id="norm-contador-num">16</strong> normativas
        </div>

        <!-- Lista de tarjetas -->
        <div id="norm-lista" class="norm-lista" role="list">
          <!-- Tarjetas generadas dinámicamente -->
        </div>
      </div>

      <!-- Modal de detalle -->
      <div id="norm-modal" class="norm-modal hidden" role="dialog" aria-labelledby="norm-modal-titulo" aria-modal="true">
        <div class="norm-modal-content">
          <button id="norm-modal-cerrar" class="norm-modal-cerrar" aria-label="Cerrar detalle">✕</button>
          <div id="norm-modal-body">
            <!-- Contenido inyectado dinámicamente -->
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(contenedor);
  }

  // --- Renderizar tarjetas filtradas ---
  function renderizarTarjetas() {
    const lista = document.getElementById('norm-lista');
    const contador = document.getElementById('norm-contador-num');
    if (!lista) return;

    const { filtroCategoria, terminoBusqueda } = estadoModulo;
    const termino = terminoBusqueda.toLowerCase().trim();

    const normativasFiltradas = NORMATIVA_AUDITORIA.filter(norm => {
      const categoriaOk = filtroCategoria === 'Todos' || norm.categoria === filtroCategoria;
      if (!categoriaOk) return false;
      if (!termino) return true;

      const enCodigo = norm.codigo.toLowerCase().includes(termino);
      const enTitulo = norm.titulo.toLowerCase().includes(termino);
      const enRequisitos = norm.requisitosClave.some(r => r.toLowerCase().includes(termino));
      const enPuntos = norm.puntosAuditable.some(p => p.toLowerCase().includes(termino));
      const enPalabras = norm.palabrasClave.some(p => p.toLowerCase().includes(termino));
      const enPyme = norm.aplicacionPyme.toLowerCase().includes(termino);

      return enCodigo || enTitulo || enRequisitos || enPuntos || enPalabras || enPyme;
    });

    contador.textContent = normativasFiltradas.length;

    if (normativasFiltradas.length === 0) {
      lista.innerHTML = `
        <div class="norm-sin-resultados">
          <span>🔍</span>
          <p>No se encontraron normativas para <strong>"${terminoBusqueda}"</strong></p>
          <button onclick="document.getElementById('norm-buscador').value=''; window._normLimpiarBusqueda();">
            Limpiar búsqueda
          </button>
        </div>
      `;
      return;
    }

    lista.innerHTML = normativasFiltradas.map(norm => {
      const cat = CATEGORIAS_CONFIG[norm.categoria] || CATEGORIAS_CONFIG['Todos'];
      const amb = AMBITO_CONFIG[norm.ambito] || AMBITO_CONFIG['Internacional'];
      const tituloCorto = norm.titulo.length > 80
        ? norm.titulo.substring(0, 80) + '...'
        : norm.titulo;

      return `
        <div class="norm-tarjeta" role="listitem" data-id="${norm.id}">
          <div class="norm-tarjeta-header">
            <span class="norm-tarjeta-codigo">${norm.codigo}</span>
            <div class="norm-tarjeta-badges">
              <span class="norm-badge norm-badge-ambito" style="color:${amb.color}">
                ${amb.icono} ${norm.ambito}
              </span>
              <span class="norm-badge norm-badge-cat" style="color:${cat.color}; background:${cat.bg}">
                ${cat.icono} ${norm.categoria}
              </span>
            </div>
          </div>
          <p class="norm-tarjeta-titulo">${tituloCorto}</p>
          <div class="norm-tarjeta-footer">
            <span class="norm-tarjeta-requisitos-count">
              📋 ${norm.requisitosClave.length} requisitos · 🔍 ${norm.puntosAuditable.length} puntos
            </span>
            <button
              class="norm-btn-ver"
              data-id="${norm.id}"
              aria-label="Ver detalle de ${norm.codigo}"
            >
              Ver detalle →
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Eventos en los botones de ver detalle
    lista.querySelectorAll('.norm-btn-ver').forEach(btn => {
      btn.addEventListener('click', function () {
        abrirDetalle(this.dataset.id);
      });
    });
  }

  // --- Abrir modal de detalle ---
  function abrirDetalle(id) {
    const norm = NORMATIVA_AUDITORIA.find(n => n.id === id);
    if (!norm) return;

    estadoModulo.normativaSeleccionada = id;
    estadoModulo.acordeonesAbiertos.clear();
    estadoModulo.acordeonesAbiertos.add('requisitos'); // Abierto por defecto

    const cat = CATEGORIAS_CONFIG[norm.categoria] || CATEGORIAS_CONFIG['Todos'];
    const amb = AMBITO_CONFIG[norm.ambito] || AMBITO_CONFIG['Internacional'];

    const body = document.getElementById('norm-modal-body');
    body.innerHTML = `
      <div class="norm-detalle-header">
        <div class="norm-detalle-badges">
          <span class="norm-badge norm-badge-ambito" style="color:${amb.color}">
            ${amb.icono} ${norm.ambito}
          </span>
          <span class="norm-badge norm-badge-cat" style="color:${cat.color}; background:${cat.bg}">
            ${cat.icono} ${norm.categoria}
          </span>
        </div>
        <h3 class="norm-detalle-codigo">${norm.codigo}</h3>
        <p class="norm-detalle-titulo-completo">${norm.titulo}</p>
      </div>

      <!-- Palabras clave -->
      <div class="norm-keywords">
        ${norm.palabrasClave.map(k =>
          `<span class="norm-keyword">${k.replace(/_/g, ' ')}</span>`
        ).join('')}
      </div>

      <!-- Acordeón: Requisitos Clave -->
      ${renderAcordeon(
        'requisitos',
        '📋 Requisitos Clave',
        `<ul class="norm-lista-items">${norm.requisitosClave.map(r => `<li>${r}</li>`).join('')}</ul>`,
        true
      )}

      <!-- Acordeón: Puntos Auditables -->
      ${renderAcordeon(
        'puntos',
        '🔍 Puntos Auditables',
        `<ul class="norm-lista-items norm-lista-auditables">${norm.puntosAuditable.map(p => `<li>${p}</li>`).join('')}</ul>`,
        false
      )}

      <!-- Acordeón: Aplicación PyME -->
      ${renderAcordeon(
        'pyme',
        '🏪 Aplicación a PyME',
        `<p class="norm-pyme-text">${norm.aplicacionPyme}</p>`,
        false
      )}
    `;

    // Eventos de acordeón
    body.querySelectorAll('.norm-acordeon-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        toggleAcordeon(this.dataset.acord);
      });
    });

    const modal = document.getElementById('norm-modal');
    modal.classList.remove('hidden');
    modal.querySelector('.norm-modal-content').scrollTop = 0;
    document.body.style.overflow = 'hidden';
  }

  function renderAcordeon(id, titulo, contenido, abierto) {
    return `
      <div class="norm-acordeon" data-acord="${id}">
        <button class="norm-acordeon-btn ${abierto ? 'abierto' : ''}" data-acord="${id}" aria-expanded="${abierto}">
          <span>${titulo}</span>
          <span class="norm-acordeon-icono">${abierto ? '▲' : '▼'}</span>
        </button>
        <div class="norm-acordeon-body ${abierto ? 'visible' : ''}">
          ${contenido}
        </div>
      </div>
    `;
  }

  function toggleAcordeon(id) {
    const btn = document.querySelector(`.norm-acordeon-btn[data-acord="${id}"]`);
    const body = btn ? btn.nextElementSibling : null;
    if (!btn || !body) return;

    const estaAbierto = btn.classList.contains('abierto');
    btn.classList.toggle('abierto', !estaAbierto);
    btn.setAttribute('aria-expanded', !estaAbierto);
    body.classList.toggle('visible', !estaAbierto);
    btn.querySelector('.norm-acordeon-icono').textContent = estaAbierto ? '▼' : '▲';
  }

  // --- Eventos del módulo ---
  function inyectarEventos() {
    // FAB — abrir panel
    document.getElementById('norm-fab').addEventListener('click', togglePanel);

    // Cerrar panel
    document.getElementById('norm-panel-cerrar').addEventListener('click', cerrarPanel);
    document.getElementById('norm-overlay').addEventListener('click', cerrarTodo);

    // Cerrar modal
    document.getElementById('norm-modal-cerrar').addEventListener('click', cerrarModal);
    document.getElementById('norm-modal').addEventListener('click', function (e) {
      if (e.target === this) cerrarModal();
    });

    // Buscador
    const buscador = document.getElementById('norm-buscador');
    const limpiarBtn = document.getElementById('norm-buscador-limpiar');

    buscador.addEventListener('input', function () {
      estadoModulo.terminoBusqueda = this.value;
      limpiarBtn.classList.toggle('hidden', !this.value);
      renderizarTarjetas();
    });

    window._normLimpiarBusqueda = function () {
      buscador.value = '';
      estadoModulo.terminoBusqueda = '';
      limpiarBtn.classList.add('hidden');
      renderizarTarjetas();
    };

    limpiarBtn.addEventListener('click', window._normLimpiarBusqueda);

    // Filtros de categoría
    document.querySelectorAll('.norm-filtro-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.norm-filtro-btn').forEach(b => {
          b.classList.remove('activo');
          b.setAttribute('aria-pressed', 'false');
        });
        this.classList.add('activo');
        this.setAttribute('aria-pressed', 'true');
        estadoModulo.filtroCategoria = this.dataset.categoria;
        renderizarTarjetas();
      });
    });

    // Teclado: Escape cierra modales
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (!document.getElementById('norm-modal').classList.contains('hidden')) {
          cerrarModal();
        } else if (estadoModulo.panelAbierto) {
          cerrarPanel();
        }
      }
    });
  }

  function togglePanel() {
    if (estadoModulo.panelAbierto) {
      cerrarPanel();
    } else {
      abrirPanel();
    }
  }

  function abrirPanel() {
    estadoModulo.panelAbierto = true;
    document.getElementById('norm-panel').classList.remove('hidden');
    document.getElementById('norm-overlay').classList.remove('hidden');
    document.getElementById('norm-buscador').focus();
    document.getElementById('norm-fab').classList.add('activo');
  }

  function cerrarPanel() {
    estadoModulo.panelAbierto = false;
    document.getElementById('norm-panel').classList.add('hidden');
    document.getElementById('norm-overlay').classList.add('hidden');
    document.getElementById('norm-fab').classList.remove('activo');
  }

  function cerrarModal() {
    document.getElementById('norm-modal').classList.add('hidden');
    document.body.style.overflow = '';
  }

  function cerrarTodo() {
    cerrarModal();
    cerrarPanel();
  }

  // --- Arrancar cuando el DOM esté listo ---
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
