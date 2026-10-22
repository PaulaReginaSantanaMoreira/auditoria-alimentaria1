import { SupabaseClient } from "@supabase/supabase-js";
import { ICompanyRepository } from "@/domain/repositories/company-repository.interface";
import { Company } from "@/domain/entities/company";
import { Cif } from "@/domain/value-objects/cif";

export class CompanyRepository implements ICompanyRepository {
  constructor(private readonly dbClient: SupabaseClient) {}

  public async findById(id: string): Promise<Company | null> {
    const { data, error } = await this.dbClient
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;

    return this.mapToEntity(data);
  }

  public async findByCif(cif: string): Promise<Company | null> {
    const normalizedCif = cif.replace(/[-\s]/g, "").toUpperCase();

    const { data, error } = await this.dbClient
      .from("companies")
      .select("*")
      .eq("cif", normalizedCif)
      .maybeSingle();

    if (error || !data) return null;

    return this.mapToEntity(data);
  }

  public async save(company: Company): Promise<void> {
    const { error } = await this.dbClient.from("companies").upsert({
      id: company.id,
      name: company.name,
      cif: company.cif.value,
      address: company.address,
      sanitary_registry_number: company.sanitaryRegistryNumber,
      created_at: company.createdAt.toISOString(),
    });

    if (error) {
      throw new Error(`Erro ao salvar empresa no banco: ${error.message}`);
    }
  }

  public async update(company: Company): Promise<void> {
    const { error } = await this.dbClient
      .from("companies")
      .update({
        name: company.name,
        cif: company.cif.value,
        address: company.address,
        sanitary_registry_number: company.sanitaryRegistryNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id);

    if (error) {
      throw new Error(`Erro ao atualizar empresa no banco: ${error.message}`);
    }
  }

  private mapToEntity(row: any): Company {
    return new Company({
      id: row.id,
      name: row.name,
      cif: new Cif(row.cif),
      address: row.address,
      sanitaryRegistryNumber: row.sanitary_registry_number,
      createdAt: new Date(row.created_at),
    });
  }
}

export const SupabaseCompanyRepository = CompanyRepository;
