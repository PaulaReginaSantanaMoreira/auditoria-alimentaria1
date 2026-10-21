export interface UploadResult {
  url: string;
  key: string;
}

export interface IStorageRepository {
  uploadPhoto(file: Blob | Buffer, path: string): Promise<UploadResult>;
  uploadSignature(base64Data: string, path: string): Promise<UploadResult>;
  deleteFile(path: string): Promise<void>;
}
