const DATABASE_NAME = 'control3d-local-assets';
const DATABASE_VERSION = 1;
const MAX_STL_BYTES = 50 * 1024 * 1024;
const MAX_VIDEO_BYTES = 40 * 1024 * 1024;

export interface StoredStl {
  modelId: number;
  name: string;
  blob: Blob;
  updatedAt: number;
}

interface StoredWallpaperVideo {
  id: string;
  name: string;
  blob: Blob;
}

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') return Promise.reject(new Error('Este navegador não oferece armazenamento local de arquivos.'));
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains('model-stl')) database.createObjectStore('model-stl', { keyPath: 'modelId' });
      if (!database.objectStoreNames.contains('wallpaper-videos')) database.createObjectStore('wallpaper-videos', { keyPath: 'id' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      databasePromise = null;
      reject(new Error('Não foi possível abrir o armazenamento local de arquivos.'));
    };
    request.onblocked = () => {
      databasePromise = null;
      reject(new Error('Feche outras abas do app e tente novamente para atualizar o armazenamento local.'));
    };
  });
  return databasePromise;
}

async function storeRecord<T>(storeName: string, value: T): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Não foi possível salvar o arquivo neste navegador.'));
    transaction.onabort = () => reject(new Error('O navegador cancelou o salvamento do arquivo. Confira o espaço disponível.'));
  });
}

async function readRecord<T>(storeName: string, key: IDBValidKey): Promise<T | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readonly');
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(new Error('Não foi possível carregar o arquivo salvo neste navegador.'));
  });
}

async function deleteRecord(storeName: string, key: IDBValidKey): Promise<void> {
  const database = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(storeName, 'readwrite');
    transaction.objectStore(storeName).delete(key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(new Error('Não foi possível remover o arquivo salvo neste navegador.'));
    transaction.onabort = () => reject(new Error('O navegador cancelou a remoção do arquivo.'));
  });
}

export async function saveModelStl(modelId: number, file: File): Promise<void> {
  if (!file.name.toLowerCase().endsWith('.stl')) throw new Error('Selecione um arquivo STL.');
  if (file.size === 0 || file.size > MAX_STL_BYTES) throw new Error('O STL deve ter entre 1 byte e 50 MB.');
  await storeRecord<StoredStl>('model-stl', { modelId, name: file.name, blob: file, updatedAt: Date.now() });
}

export function getModelStl(modelId: number): Promise<StoredStl | null> {
  return readRecord<StoredStl>('model-stl', modelId);
}

export function removeModelStl(modelId: number): Promise<void> {
  return deleteRecord('model-stl', modelId);
}

export async function saveWallpaperVideo(id: string, file: File): Promise<void> {
  if (!/\.(mp4|webm)$/i.test(file.name)) throw new Error('Selecione um vídeo MP4 ou WebM.');
  if (file.size === 0 || file.size > MAX_VIDEO_BYTES) throw new Error('O vídeo deve ter entre 1 byte e 40 MB.');
  await storeRecord<StoredWallpaperVideo>('wallpaper-videos', { id, name: file.name, blob: file });
}

export function getWallpaperVideo(id: string): Promise<StoredWallpaperVideo | null> {
  return readRecord<StoredWallpaperVideo>('wallpaper-videos', id);
}

export function removeWallpaperVideo(id: string): Promise<void> {
  return deleteRecord('wallpaper-videos', id);
}
