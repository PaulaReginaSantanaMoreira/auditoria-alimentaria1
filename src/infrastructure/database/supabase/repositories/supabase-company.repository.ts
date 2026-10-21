import { SupabaseClient } from "@supabase/supabase-js";
import { ICompanyRepository } from "../../../../domain/repositories/company-repository.interface";
import { Company } from "../../../../domain/entities/company";
import { Cif } from "../../../../domain/value-objects/cif";

export class SupabaseCompanyRepository implements ICompanyRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  public async findById(id: string): Promise<Company | null> {
    const { data, error } = await this.supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) return null;

    return new Company({
      id: data.id,
      name: data.name,
      cif: new Cif(data.cif),
      address: data.address,
      sanitaryRegistryNumber: data.sanitary_registry_number,
      createdAt: new Date(data.created_at),
    });
  }

  public async findByCif(cif: string): Promise<Company | null> {
    const sanitized = cif.trim().toUpperCase().replace(/[\s-]/g, "");
    const { data, error } = await this.supabase
      .from("companies")
      .select("*")
      .eq("cif", sanitized)
      .maybeSingle();

    if (error || !data) return null;

    return new Company({
      id: data.id,
      name: data.name,
      cif: new Cif(data.cif),
      address: data.address,
      sanitaryRegistryNumber: data.sanitary_registry_number,
      createdAt: new Date(data.created_at),
    });
  }

  public async save(company: Company): Promise<void> {
    const { error } = await this.supabase.from("companies").insert({
      id: company.id,
      name: company.name,
      cif: company.cif.value,
      address: company.address,
      sanitary_registry_number: company.sanitaryRegistryNumber,
      created_at: company.createdAt.toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) {
      throw new Error(`Erro ao salvar empresa no Supabase: ${error.message}`);
    }
  }

  public async update(company: Company): Promise<void> {
    const { error } = await this.supabase
      .from("companies")
      .update({
        name: company.name,
        address: company.address,
        sanitary_registry_number: company.sanitaryRegistryNumber,
        updated_at: new Date().toISOString(),
      })
      .eq("id", company.id);

    if (error) {
      throw new Error(`Erro ao atualizar empresa no Supabase: ${error.message}`);
    }
  }
}
