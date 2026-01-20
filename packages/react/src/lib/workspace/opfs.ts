export abstract class OPFS {
  abstract id: string;
  protected dir: FileSystemDirectoryHandle | null = null;

  async initOPFS(files: Record<string, string>) {
    const root = await navigator.storage.getDirectory();
    this.dir = await root.getDirectoryHandle(this.id, { create: true });

    await Promise.all(Object.entries(files).map(([path, content]) => this.writeToOPFS(path, content)));
  }

  protected async writeToOPFS(path: string, content: string) {
    const handle = await this.getFileHandle(path);
    if (!handle) return;

    const writable = await handle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  protected async getFileHandle(path: string) {
    if (!this.dir) return null;
    const parts = path.split('/').filter(Boolean);
    const fileName = parts.pop()!;
    let current = this.dir;

    for (const part of parts) {
      current = await current.getDirectoryHandle(part, { create: true });
    }

    return current.getFileHandle(fileName, { create: true });
  }
}
