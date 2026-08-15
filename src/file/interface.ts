export interface FileStore {
  read(filePath: string): Promise<string>;
  write(filePath: string, content: string): Promise<void>;
}
