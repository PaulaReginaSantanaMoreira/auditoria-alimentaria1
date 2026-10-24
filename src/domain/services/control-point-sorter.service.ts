/**
 * Servicio de Dominio para la ordenación secuencial y correlativa natural de puntos de control sanitarios.
 * Sigue los principios de Clean Architecture (Capa de Dominio pura, sin dependencias de infraestructura ni frameworks).
 *
 * Garantiza que la secuencia regulatoria oficial (ej: 1.1, 1.2, ..., 1.9, 1.10, 2.1...)
 * mantenga su jerarquía numérica de secciones y no sea alterada por ordenamiento lexicográfico/alfabético de cadenas.
 */
export class ControlPointSorterService {
  /**
   * Extrae la tupla numérica [sección, subpunto] de cualquier identificador oficial (ej: '1.10', 'q1_10', 'cp_10').
   */
  public static parseCodeTuple(identifier?: string | null): [number, number] {
    if (!identifier) return [0, 0];
    const clean = identifier.replace(/^[^\d]*/, "");
    const parts = clean.split(/[._]/);
    const section = parseInt(parts[0], 10) || 0;
    const item = parseInt(parts[1], 10) || 0;
    return [section, item];
  }

  /**
   * Compara dos elementos de inspección según su valor numérico natural de sección y subpunto.
   */
  public static compare(
    a: { number?: string; code?: string; control_point_code?: string },
    b: { number?: string; code?: string; control_point_code?: string }
  ): number {
    const idA = a.number || a.code || a.control_point_code;
    const idB = b.number || b.code || b.control_point_code;
    const [secA, itemA] = ControlPointSorterService.parseCodeTuple(idA);
    const [secB, itemB] = ControlPointSorterService.parseCodeTuple(idB);
    if (secA !== secB) return secA - secB;
    return itemA - itemB;
  }

  /**
   * Ordena de forma inmutable una lista de puntos de control, plantillas o evaluaciones
   * respetando la secuencia numérica natural.
   */
  public static sortNaturally<T extends { number?: string; code?: string; control_point_code?: string }>(items: T[]): T[] {
    return [...items].sort(ControlPointSorterService.compare);
  }
}
