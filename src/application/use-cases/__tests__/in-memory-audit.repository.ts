import { IAuditRepository } from "../../../domain/repositories/audit-repository.interface";
import { Audit } from "../../../domain/entities/audit";

export class InMemoryAuditRepository implements IAuditRepository {
  public items: Map<string, Audit> = new Map();

  async findById(id: string): Promise<Audit | null> {
    return this.items.get(id) || null;
  }

  async findByAuditorId(auditorId: string): Promise<Audit[]> {
    return Array.from(this.items.values()).filter((a) => a.auditor.id === auditorId);
  }

  async save(audit: Audit): Promise<void> {
    this.items.set(audit.id, audit);
  }

  async update(audit: Audit): Promise<void> {
    this.items.set(audit.id, audit);
  }

  async delete(id: string): Promise<void> {
    this.items.delete(id);
  }
}
