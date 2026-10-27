
const DB_NAME = "project-one-media";
const STORE_NAME = "media-files";
const DB_VERSION = 1;

function openMediaDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      reject(new Error("Your browser does not support IndexedDB."));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;

      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error ?? new Error("Could not open media storage."));
  });
}

export async function saveMedia(
  id: string,
  file: File
): Promise<void> {
  const database = await openMediaDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");

      transaction.objectStore(STORE_NAME).put(file, id);

      transaction.oncomplete = () => resolve();
      transaction.onerror = () =>
        reject(transaction.error ?? new Error("Could not save media."));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error("Media saving was cancelled."));
    });
  } finally {
    database.close();
  }
}

export async function getMedia(
  id: string
): Promise<Blob | null> {
  const database = await openMediaDatabase();

  try {
    return await new Promise<Blob | null>((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(id);

      request.onsuccess = () => {
        const result = request.result;
        resolve(result instanceof Blob ? result : null);
      };

      request.onerror = () =>
        reject(request.error ?? new Error("Could not load media."));
    });
  } finally {
    database.close();
  }
}