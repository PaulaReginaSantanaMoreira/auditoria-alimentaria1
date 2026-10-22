import { SupabaseClient } from "@supabase/supabase-js";
import { IStorageRepository, UploadResult } from "@/domain/repositories/storage-repository.interface";

/**
 * Repositório de armazenamento de evidências e assinaturas digitais.
 * Implementa IStorageRepository desacoplado de dependências nominais.
 */
export class StorageRepository implements IStorageRepository {
  private readonly bucketName = "bioaudit-evidencias";

  constructor(private readonly supabase: SupabaseClient) {}

  public async uploadPhoto(file: Blob | Buffer, path: string): Promise<UploadResult> {
    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, file, {
        upsert: true,
        contentType: "image/jpeg",
      });

    if (error) {
      throw new Error(`Erro ao enviar foto para armazenamento: ${error.message}`);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);

    return {
      url: publicUrlData.publicUrl,
      key: data.path,
    };
  }

  public async uploadSignature(base64Data: string, path: string): Promise<UploadResult> {
    const base64Prefix = /^data:image\/\w+;base64,/;
    const pureBase64 = base64Data.replace(base64Prefix, "");
    const buffer = Buffer.from(pureBase64, "base64");

    const { data, error } = await this.supabase.storage
      .from(this.bucketName)
      .upload(path, buffer, {
        upsert: true,
        contentType: "image/png",
      });

    if (error) {
      throw new Error(`Erro ao enviar assinatura para armazenamento: ${error.message}`);
    }

    const { data: publicUrlData } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(data.path);

    return {
      url: publicUrlData.publicUrl,
      key: data.path,
    };
  }

  public async deleteFile(path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(this.bucketName).remove([path]);
    if (error) {
      throw new Error(`Erro ao remover arquivo de armazenamento: ${error.message}`);
    }
  }
}

// Alias de compatibilidade retroativa
export const SupabaseStorageRepository = StorageRepository;
