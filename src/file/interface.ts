export interface DirEntry {
  name: string;
  type: "file" | "dir";
}

export interface FileStore {
  readonly root: string;
  read(filePath: string): Promise<string>;
  write(filePath: string, content: string): Promise<void>;
  resolve(filePath: string): string;
  list(dirPath?: string): Promise<DirEntry[]>;
}
