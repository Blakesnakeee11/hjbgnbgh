import {
  documentDirectory,
  getInfoAsync,
  readDirectoryAsync,
  makeDirectoryAsync,
  moveAsync,
  deleteAsync,
  getFreeDiskStorageAsync,
  getTotalDiskCapacityAsync,
} from 'expo-file-system/legacy';
import { FileItem } from '../types';

const JARVIS_DIR = (documentDirectory || '') + 'JarvisFiles/';

async function ensureJarvisDir(): Promise<void> {
  const info = await getInfoAsync(JARVIS_DIR);
  if (!info.exists) {
    await makeDirectoryAsync(JARVIS_DIR, { intermediates: true });
  }
}

export async function listFiles(dirPath?: string): Promise<FileItem[]> {
  await ensureJarvisDir();
  const targetDir = dirPath || JARVIS_DIR;

  try {
    const files = await readDirectoryAsync(targetDir);
    const items: FileItem[] = [];

    for (const file of files) {
      const fullPath = targetDir + file;
      const info = await getInfoAsync(fullPath);
      items.push({
        name: file,
        path: fullPath,
        isDirectory: info.isDirectory || false,
        size: info.exists ? (info as any).size : undefined,
        modifiedTime: info.exists && (info as any).modificationTime
          ? new Date((info as any).modificationTime * 1000).toISOString()
          : undefined,
      });
    }

    return items;
  } catch {
    return [];
  }
}

export async function createFolder(name: string): Promise<string> {
  await ensureJarvisDir();
  const folderPath = JARVIS_DIR + name + '/';
  const info = await getInfoAsync(folderPath);

  if (info.exists) {
    return `Folder "${name}" already exists, sir.`;
  }

  await makeDirectoryAsync(folderPath, { intermediates: true });
  return `Done. I've created the folder "${name}" for you.`;
}

export async function organizeFiles(): Promise<string> {
  await ensureJarvisDir();
  const files = await listFiles();

  if (files.length === 0) {
    return "Your files directory is clean, sir. Nothing to organize.";
  }

  const categories: Record<string, string[]> = {
    Images: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'],
    Documents: ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.xlsx', '.csv'],
    Videos: ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.webm'],
    Audio: ['.mp3', '.wav', '.aac', '.flac', '.ogg', '.m4a'],
    Archives: ['.zip', '.rar', '.7z', '.tar', '.gz'],
    Code: ['.js', '.ts', '.py', '.java', '.html', '.css', '.json'],
  };

  let movedCount = 0;

  for (const [category, extensions] of Object.entries(categories)) {
    const matchingFiles = files.filter(f => {
      if (f.isDirectory) return false;
      const ext = '.' + f.name.split('.').pop()?.toLowerCase();
      return extensions.includes(ext);
    });

    if (matchingFiles.length > 0) {
      const categoryDir = JARVIS_DIR + category + '/';
      const info = await getInfoAsync(categoryDir);
      if (!info.exists) {
        await makeDirectoryAsync(categoryDir, { intermediates: true });
      }

      for (const file of matchingFiles) {
        const newPath = categoryDir + file.name;
        await moveAsync({ from: file.path, to: newPath });
        movedCount++;
      }
    }
  }

  if (movedCount === 0) {
    return "Everything's already organized, sir. Your files are in order.";
  }

  return `All done. I've organized ${movedCount} file${movedCount !== 1 ? 's' : ''} into their proper categories.`;
}

export async function deleteFile(name: string): Promise<string> {
  const filePath = JARVIS_DIR + name;
  const info = await getInfoAsync(filePath);

  if (!info.exists) {
    return `I couldn't find "${name}" in your files, sir.`;
  }

  await deleteAsync(filePath);
  return `"${name}" has been removed, sir.`;
}

export async function getStorageInfo(): Promise<string> {
  const free = await getFreeDiskStorageAsync();
  const total = await getTotalDiskCapacityAsync();

  const freeGB = (free / (1024 * 1024 * 1024)).toFixed(1);
  const totalGB = (total / (1024 * 1024 * 1024)).toFixed(1);
  const usedGB = ((total - free) / (1024 * 1024 * 1024)).toFixed(1);

  return `Storage status: ${usedGB} GB used out of ${totalGB} GB total. You have ${freeGB} GB remaining, sir.`;
}
