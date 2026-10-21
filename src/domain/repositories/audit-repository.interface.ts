import { Audit } from "../entities/audit";

export interface IAuditRepository {
  findById(id: string): Promise<Audit | null>;
  findByAuditorId(auditorId: string): Promise<Audit[]>;
  save(audit: Audit): Promise<void>;
  update(audit: Audit): Promise<void>;
  delete(id: string): Promise<void>;
}
