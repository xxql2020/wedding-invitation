const LOCAL_SHARE_PREFIX = 'wedding_short_';
const LOCAL_SHARE_DB_NAME = 'wedding-invitation-local-share';
const LOCAL_SHARE_STORE_NAME = 'shares';
const LOCAL_SHARE_DB_VERSION = 1;

interface LocalShareRecord {
  payload: unknown;
  createdAt: number;
}

const getLocalShareStorageKey = (shortCode: string): string => `${LOCAL_SHARE_PREFIX}${shortCode}`;

const openLocalShareDatabase = (): Promise<IDBDatabase> => new Promise((resolve, reject) => {
  if (typeof window === 'undefined' || typeof window.indexedDB === 'undefined') {
    reject(new Error('当前环境不支持 IndexedDB'));
    return;
  }

  const request = window.indexedDB.open(LOCAL_SHARE_DB_NAME, LOCAL_SHARE_DB_VERSION);

  request.onupgradeneeded = () => {
    const database = request.result;
    if (!database.objectStoreNames.contains(LOCAL_SHARE_STORE_NAME)) {
      database.createObjectStore(LOCAL_SHARE_STORE_NAME);
    }
  };

  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error ?? new Error('打开本地分享数据库失败'));
});

export const saveLocalSharePayload = async (shortCode: string, payload: unknown): Promise<void> => {
  if (typeof window === 'undefined') {
    throw new Error('当前环境无法保存本地分享数据');
  }

  if (typeof window.indexedDB === 'undefined') {
    window.localStorage.setItem(getLocalShareStorageKey(shortCode), JSON.stringify(payload));
    return;
  }

  const database = await openLocalShareDatabase();

  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = database.transaction(LOCAL_SHARE_STORE_NAME, 'readwrite');
      const store = transaction.objectStore(LOCAL_SHARE_STORE_NAME);
      const record: LocalShareRecord = {
        payload,
        createdAt: Date.now()
      };

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error ?? new Error('写入本地分享数据失败'));
      transaction.onabort = () => reject(transaction.error ?? new Error('写入本地分享数据失败'));

      store.put(record, shortCode);
    });
  } finally {
    database.close();
  }
};

export const loadLocalSharePayload = async (shortCode: string): Promise<unknown | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  if (typeof window.indexedDB !== 'undefined') {
    const database = await openLocalShareDatabase();

    try {
      const record = await new Promise<LocalShareRecord | undefined>((resolve, reject) => {
        const transaction = database.transaction(LOCAL_SHARE_STORE_NAME, 'readonly');
        const store = transaction.objectStore(LOCAL_SHARE_STORE_NAME);
        const request = store.get(shortCode);

        request.onsuccess = () => resolve(request.result as LocalShareRecord | undefined);
        request.onerror = () => reject(request.error ?? new Error('读取本地分享数据失败'));
      });

      if (record?.payload != null) {
        return record.payload;
      }
    } finally {
      database.close();
    }
  }

  const legacyPayload = window.localStorage.getItem(getLocalShareStorageKey(shortCode));
  if (!legacyPayload) {
    return null;
  }

  try {
    return JSON.parse(legacyPayload);
  } catch (error) {
    console.error('Failed to parse legacy local share payload:', error);
    return null;
  }
};

export { LOCAL_SHARE_PREFIX, getLocalShareStorageKey };
