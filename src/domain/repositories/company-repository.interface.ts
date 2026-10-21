import { Company } from "../entities/company";

export interface ICompanyRepository {
  findById(id: string): Promise<Company | null>;
  findByCif(cif: string): Promise<Company | null>;
  save(company: Company): Promise<void>;
  update(company: Company): Promise<void>;
}
