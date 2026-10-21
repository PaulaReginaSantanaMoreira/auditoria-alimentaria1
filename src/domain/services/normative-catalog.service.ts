export interface NormativeStandard {
  id: string;
  codigo: string;
  titulo: string;
  ambito: "Europeo" | "Nacional" | "Internacional";
  categoria: string;
  requisitosClave: string[];
  puntosAuditable: string[];
  aplicacionPyme: string;
  palabrasClave: string[];
}

export const NORMATIVAS_SANITARIAS: NormativeStandard[] = [
  {
    id: "REGLAMENTO_178_2002",
    codigo: "Reglamento (CE) 178/2002",
    titulo:
      "Reglamento (CE) nº 178/2002 del Parlamento Europeo y del Consejo, por el que se establecen los principios y los requisitos generales de la legislación alimentaria y procedimientos relativos a la seguridad alimentaria.",
    ambito: "Europeo",
    categoria: "Controles Oficiales",
    requisitosClave: [
      "Responsabilidad primaria: Los explotadores de empresas alimentarias se asegurarán del cumplimiento en todas las etapas bajo su control (Artículo 17).",
      "Establecimiento de trazabilidad en todas las fases de producción, transformación y distribución (Artículo 18).",
      "Fundamentación de la legislación en el análisis de riesgos y base científica independiente.",
    ],
    puntosAuditable: [
      "Procedimiento documentado de trazabilidad hacia adelante y hacia atrás.",
      "Registros de materias primas entrantes y productos finales despachados con fechas y números de lote.",
      "Protocolos establecidos de retirada y recuperación de productos en caso de incidentes.",
    ],
    aplicacionPyme:
      "Aplicable a todo tipo de empresas; se reconoce la proporcionalidad sin eximir de la obligación básica de trazabilidad.",
    palabrasClave: ["responsabilidad_primaria", "trazabilidad", "analisis_de_riesgos"],
  },
  {
    id: "REGLAMENTO_852_2004",
    codigo: "Reglamento (CE) 852/2004",
    titulo:
      "Reglamento (CE) nº 852/2004 del Parlamento Europeo y del Consejo, de 29 de abril de 2004, relativo a la higiene de los productos alimenticios.",
    ambito: "Europeo",
    categoria: "Higiene",
    requisitosClave: [
      "Obligación de crear, aplicar y mantener un procedimiento permanente basado en los principios del APPCC (Artículo 5).",
      "Cumplimiento de los requisitos higiénicos generales del Anexo II para locales, equipos, suministro de agua e higiene de personal.",
      "Garantizar la formación e instrucción de los manipuladores de alimentos.",
    ],
    puntosAuditable: [
      "Manual APPCC implantado con límites críticos, vigilancia y medidas correctoras.",
      "Registros de prerrequisitos (limpieza, desinfección, control de plagas, agua potable y mantenimiento).",
      "Expedientes de formación de los manipuladores.",
    ],
    aplicacionPyme:
      "Flexibilidad que permite aplicar sistemas APPCC simplificados y guías de prácticas correctas de higiene.",
    palabrasClave: ["higiene", "appcc", "prerrequisitos", "flexibilidad"],
  },
  {
    id: "REGLAMENTO_853_2004",
    codigo: "Reglamento (CE) 853/2004",
    titulo:
      "Reglamento (CE) nº 853/2004 del Parlamento Europeo y del Consejo, de 29 de abril de 2004, por el que se establecen normas específicas de higiene de los alimentos de origen animal.",
    ambito: "Europeo",
    categoria: "Higiene",
    requisitosClave: [
      "Cumplimiento estricto de las normas específicas de higiene del Anexo III según la categoría del producto animal.",
      "Obligación de aplicar la marca de identificación (marcado sanitario) antes de que el producto salga del establecimiento.",
      "Control estricto de la temperatura de refrigeración y congelación durante almacenamiento y transporte.",
    ],
    puntosAuditable: [
      "Verificación de las instalaciones registradas o autorizadas.",
      "Registros termográficos y monitorización de temperatura continua en cámaras y expedición.",
      "Control de origen y documentación comercial de acompañamiento.",
    ],
    aplicacionPyme:
      "Ciertas excepciones para el comercio minorista local y venta directa al consumidor final.",
    palabrasClave: ["origen_animal", "marca_identificacion", "temperatura", "autorizacion"],
  },
  {
    id: "ISO_22000",
    codigo: "ISO 22000:2018",
    titulo:
      "Sistemas de gestión de la inocuidad de los alimentos — Requisitos para cualquier organización en la cadena alimentaria.",
    ambito: "Internacional",
    categoria: "Sistemas de Gestión",
    requisitosClave: [
      "Enfoque en procesos e integración con la estructura de alto nivel (HLS).",
      "Ciclo PDCA dual: gestión organizativa y principios operacionales del APPCC.",
      "Comunicación interactiva a lo largo de toda la cadena alimentaria.",
    ],
    puntosAuditable: [
      "Definición y seguimiento de Programas de Prerrequisitos (PPR).",
      "Programas de Prerrequisitos Operativos (PPRO) y Puntos de Control Crítico (PCC).",
      "Auditorías internas periódicas y revisión por la dirección.",
    ],
    aplicacionPyme:
      "Estructura escalable que puede adaptarse a pequeñas organizaciones mediante metodologías simplificadas.",
    palabrasClave: ["iso", "inocuidad", "ppro", "pcc", "mejora_continua"],
  },
];

export class NormativeCatalogService {
  public static getAll(): NormativeStandard[] {
    return NORMATIVAS_SANITARIAS;
  }

  public static getById(id: string): NormativeStandard | undefined {
    return NORMATIVAS_SANITARIAS.find((n) => n.id === id);
  }

  public static search(query: string): NormativeStandard[] {
    const q = query.toLowerCase().trim();
    if (!q) return NORMATIVAS_SANITARIAS;
    return NORMATIVAS_SANITARIAS.filter(
      (n) =>
        n.codigo.toLowerCase().includes(q) ||
        n.titulo.toLowerCase().includes(q) ||
        n.categoria.toLowerCase().includes(q) ||
        n.palabrasClave.some((kw) => kw.toLowerCase().includes(q))
    );
  }
}
