import { ICompanyRepository } from "@/domain/repositories/company-repository.interface";
import { Company } from "@/domain/entities/company";

export class InMemoryCompanyRepository implements ICompanyRepository {
  public items: Map<string, Company> = new Map();

  async findById(id: string): Promise<Company | null> {
    return this.items.get(id) || null;
  }

  async findByCif(cif: string): Promise<Company | null> {
    const normalized = cif.replace(/[-\s]/g, "").toUpperCase();
    return (
      Array.from(this.items.values()).find(
        (c) => c.cif.value.replace(/[-\s]/g, "").toUpperCase() === normalized
      ) || null
    );
  }

  async save(company: Company): Promise<void> {
    this.items.set(company.id, company);
  }

  async update(company: Company): Promise<void> {
    this.items.set(company.id, company);
  }
}
