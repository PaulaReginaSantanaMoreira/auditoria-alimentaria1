import { ControlPointCategory } from "../entities/control-point";

export interface ControlPointTemplate {
  code: string;
  category: ControlPointCategory;
  categoryLabel: string;
  number: string;
  title: string;
  isCriticalCcp: boolean;
  legalReference: string;
}

export const DEFAULT_CONTROL_POINTS: ControlPointTemplate[] = [
  // SECCIÓN 1: Infraestructura y Equipos (RD 852/2004, ISO 22000)
  {
    code: "q1_1",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.1",
    title:
      "El diseño, distribución y dimensiones de los locales permiten un mantenimiento, limpieza y desinfección adecuados, evitando la contaminación cruzada.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. I",
  },
  {
    code: "q1_2",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.2",
    title:
      "Las superficies de suelos, paredes y techos son de materiales impermeables, no absorbentes, lavables, no tóxicos y sin grietas.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. II",
  },
  {
    code: "q1_3",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.3",
    title:
      "Las ventanas, huecos y puertas exteriores disponen de pantallas de protección contra insectos y plagas fácilmente desmontables y limpiables.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. II",
  },
  {
    code: "q1_4",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.4",
    title:
      "Los sistemas de drenaje, desagües y canalizaciones tienen la capacidad adecuada, disponen de rejillas y evitan reflujos u olores.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. I",
  },
  {
    code: "q1_5",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.5",
    title:
      "Existe ventilación suficiente (natural o mecánica) para evitar el calor excesivo, la condensación de vapor y la acumulación de polvo.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. I",
  },
  {
    code: "q1_6",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.6",
    title:
      "Las instalaciones de iluminación proporcionan luz adecuada y los focos/luminarias cuentan con pantallas de protección antirotura.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. I",
  },
  {
    code: "q1_7",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.7",
    title:
      "El suministro de agua potable es continuo, con presión suficiente y cumple estrictamente los parámetros sanitarios legales.",
    isCriticalCcp: true,
    legalReference: "RD 852/2004 Anexo II Cap. VII & RD 3/2023",
  },
  {
    code: "q1_8",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.8",
    title:
      "Los lavamanos para el personal son de accionamiento no manual, con agua fría/caliente, jabón desinfectante y secado higiénico monofásico.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. I",
  },
  {
    code: "q1_9",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.9",
    title:
      "Los contenedores e instalaciones para el almacenamiento de residuos están aislados de la producción, son estancos y señalizados.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. VI",
  },
  {
    code: "q1_10",
    category: "INFRAESTRUCTURA",
    categoryLabel: "Infraestructura y Equipos",
    number: "1.10",
    title:
      "Las herramientas, superficies de trabajo y maquinaria en contacto directo con el alimento son de acero inoxidable o materiales inertes aprobados.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. V",
  },

  // SECCIÓN 2: Higiene y Manipulación (Codex Alimentarius, RD 1021/2022)
  {
    code: "q2_1",
    category: "HIGIENE_PERSONAL",
    categoryLabel: "Higiene y Manipulación",
    number: "2.1",
    title:
      "El personal viste ropa protectora de color claro y exclusiva para las tareas de trabajo, cubrecabezas eficaz y calzado limpio.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. VIII",
  },
  {
    code: "q2_2",
    category: "HIGIENE_PERSONAL",
    categoryLabel: "Higiene y Manipulación",
    number: "2.2",
    title:
      "Se constata un lavado de manos sistemático y pautado antes del inicio de labores, cambios de puesto o tras ir al aseo.",
    isCriticalCcp: false,
    legalReference: "Codex Alimentarius CXC 1-1969",
  },
  {
    code: "q2_3",
    category: "HIGIENE_PERSONAL",
    categoryLabel: "Higiene y Manipulación",
    number: "2.3",
    title:
      "Las heridas o cortes corporales están cubiertos con apósitos impermeables de color visible (azul) y fijados de forma segura.",
    isCriticalCcp: false,
    legalReference: "Codex Alimentarius Cap. VII",
  },
  {
    code: "q2_4",
    category: "HIGIENE_PERSONAL",
    categoryLabel: "Higiene y Manipulación",
    number: "2.4",
    title:
      "Los operarios no portan objetos personales de riesgo (anillos, pendientes, relojes, pulseras) en las salas de procesado.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. VIII",
  },
  {
    code: "q2_5",
    category: "HIGIENE_PERSONAL",
    categoryLabel: "Higiene y Manipulación",
    number: "2.5",
    title:
      "Existe una política estricta de control y exclusión inmediata de operarios con sintomatología infecciosa o digestiva transmisible.",
    isCriticalCcp: true,
    legalReference: "RD 852/2004 Anexo II Cap. VIII Art. 1",
  },
  {
    code: "q2_6",
    category: "HIGIENE_PERSONAL",
    categoryLabel: "Higiene y Manipulación",
    number: "2.6",
    title:
      "Se respeta la prohibición estricta de comer, fumar, mascar chicle o almacenar comida personal en los recintos de procesado.",
    isCriticalCcp: false,
    legalReference: "Codex Alimentarius CXC 1-1969",
  },
  {
    code: "q2_7",
    category: "HIGIENE_PERSONAL",
    categoryLabel: "Higiene y Manipulación",
    number: "2.7",
    title:
      "Los visitantes ajenos a la producción e inspectores externos cumplen con idénticas medidas higiénicas y de vestimenta que los operarios.",
    isCriticalCcp: false,
    legalReference: "IFS Food Standard v8",
  },
  {
    code: "q2_8",
    category: "HIGIENE_PERSONAL",
    categoryLabel: "Higiene y Manipulación",
    number: "2.8",
    title:
      "Existen registros que avalen la capacitación periódica y actualizada en seguridad alimentaria de todos los manipuladores del centro.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. XII",
  },
  {
    code: "q2_9",
    category: "HIGIENE_PERSONAL",
    categoryLabel: "Higiene y Manipulación",
    number: "2.9",
    title:
      "Se evita el contacto de manos desnudas con el alimento libre, empleando de modo correcto pinzas, guantes o utensilios limpios.",
    isCriticalCcp: false,
    legalReference: "RD 1021/2022",
  },
  {
    code: "q2_10",
    category: "HIGIENE_PERSONAL",
    categoryLabel: "Higiene y Manipulación",
    number: "2.10",
    title:
      "Las taquillas de vestuarios garantizan la separación física e higiénica total entre ropa de calle y ropa de trabajo limpia.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. I",
  },

  // SECCIÓN 3: Plan de Prerrequisitos y APPCC (APPCC, RD 562/2025, IFS)
  {
    code: "q3_1",
    category: "APPCC_FRIO_PROCESOS",
    categoryLabel: "APPCC, Frío y Procesos",
    number: "3.1",
    title:
      "Se vigilan y registran las temperaturas críticas de almacenamiento de los productos refrigerados y congelados (Cadena de Frío).",
    isCriticalCcp: true,
    legalReference: "RD 852/2004 Art. 5 & Codex Alimentarius",
  },
  {
    code: "q3_2",
    category: "APPCC_FRIO_PROCESOS",
    categoryLabel: "APPCC, Frío y Procesos",
    number: "3.2",
    title:
      "El Plan de Limpieza y Desinfección (L+D) se ejecuta de forma rigurosa y cuenta con registros de verificación firmados al día.",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. V",
  },
  {
    code: "q3_3",
    category: "APPCC_FRIO_PROCESOS",
    categoryLabel: "APPCC, Frío y Procesos",
    number: "3.3",
    title:
      "Los productos químicos (detergentes y biocidas) cuentan con ficha técnica y de seguridad, guardándose fuera de producción bajo llave.",
    isCriticalCcp: false,
    legalReference: "Reglamento (CE) 1907/2006 REACH",
  },
  {
    code: "q3_4",
    category: "APPCC_FRIO_PROCESOS",
    categoryLabel: "APPCC, Frío y Procesos",
    number: "3.4",
    title:
      "El Plan de Control de Plagas presenta un plano de cebaderos al día, registros de monitorización e informes de empresa autorizada (DDD).",
    isCriticalCcp: false,
    legalReference: "RD 852/2004 Anexo II Cap. IX",
  },
  {
    code: "q3_5",
    category: "APPCC_FRIO_PROCESOS",
    categoryLabel: "APPCC, Frío y Procesos",
    number: "3.5",
    title:
      "El sistema garantiza la trazabilidad bidireccional completa (materias primas, interna y producto final) con registros claros.",
    isCriticalCcp: false,
    legalReference: "Reglamento (CE) 178/2002 Art. 18",
  },
  {
    code: "q3_6",
    category: "APPCC_FRIO_PROCESOS",
    categoryLabel: "APPCC, Frío y Procesos",
    number: "3.6",
    title:
      "Existen fichas técnicas detalladas de materias primas y se gestionan rigurosamente las declaraciones de alérgenos.",
    isCriticalCcp: false,
    legalReference: "Reglamento (UE) 1169/2011",
  },
  {
    code: "q3_7",
    category: "APPCC_FRIO_PROCESOS",
    categoryLabel: "APPCC, Frío y Procesos",
    number: "3.7",
    title:
      "El Plan de Mantenimiento Preventivo recoge la calibración, contraste y revisión de termómetros, sondas y básculas de pesado.",
    isCriticalCcp: false,
    legalReference: "ISO 22000 Cláusula 8.7",
  },
  {
    code: "q3_8",
    category: "APPCC_FRIO_PROCESOS",
    categoryLabel: "APPCC, Frío y Procesos",
    number: "3.8",
    title:
      "Se aplican medidas efectivas para prevenir la contaminación cruzada por alérgenos (utensilios codificados o líneas exclusivas).",
    isCriticalCcp: false,
    legalReference: "Reglamento (UE) 2021/382",
  },
  {
    code: "q3_9",
    category: "APPCC_FRIO_PROCESOS",
    categoryLabel: "APPCC, Frío y Procesos",
    number: "3.9",
    title:
      "Se dispone de un protocolo ágil documentado para la gestión de alertas alimentarias y retirada veloz de lotes (Recall).",
    isCriticalCcp: false,
    legalReference: "Reglamento (CE) 178/2002 Art. 19",
  },
  {
    code: "q3_10",
    category: "APPCC_FRIO_PROCESOS",
    categoryLabel: "APPCC, Frío y Procesos",
    number: "3.10",
    title:
      "Se planifican auditorías internas periódicas y la dirección evalúa el sistema para impulsar la mejora continua del APPCC.",
    isCriticalCcp: false,
    legalReference: "ISO 22000 Cláusula 9.2",
  },
];
