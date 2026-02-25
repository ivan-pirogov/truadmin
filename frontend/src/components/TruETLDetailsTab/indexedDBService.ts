import {
  IndexedDBService,
  IndexedDBDatabase,
  IndexedDBTable,
  IndexedDBField,
} from './types';

const DB_NAME = 'truetl-cache';
const DB_VERSION = 1;

class TruETLIndexedDBService {
  private db: IDBDatabase | null = null;

  // Инициализация базы данных
  async init(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Создание ObjectStore для services
        if (!db.objectStoreNames.contains('services')) {
          const servicesStore = db.createObjectStore('services', {
            keyPath: 'id',
            autoIncrement: true,
          });
          servicesStore.createIndex('service_name_original', 'service_name_original', {
            unique: false,
          });
        }

        // Создание ObjectStore для databases
        if (!db.objectStoreNames.contains('databases')) {
          const databasesStore = db.createObjectStore('databases', {
            keyPath: 'id',
            autoIncrement: true,
          });
          databasesStore.createIndex('service_id', 'service_id', { unique: false });
          databasesStore.createIndex('source_db_name_original', 'source_db_name_original', {
            unique: false,
          });
        }

        // Создание ObjectStore для tables
        if (!db.objectStoreNames.contains('tables')) {
          const tablesStore = db.createObjectStore('tables', {
            keyPath: 'id',
            autoIncrement: true,
          });
          tablesStore.createIndex('database_id', 'database_id', { unique: false });
          tablesStore.createIndex('source_table_name_original', 'source_table_name_original', {
            unique: false,
          });
        }

        // Создание ObjectStore для fields
        if (!db.objectStoreNames.contains('fields')) {
          const fieldsStore = db.createObjectStore('fields', {
            keyPath: 'id',
          });
          fieldsStore.createIndex('table_id', 'table_id', { unique: false });
          fieldsStore.createIndex('row_num', 'row_num', { unique: false });
        }
      };
    });
  }

  // Services
  async getAllServices(): Promise<IndexedDBService[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readonly');
      const store = tx.objectStore('services');
      const request = store.getAll();

      request.onsuccess = () => {
        // Фильтруем записи со статусом deleted
        const services = request.result.filter(
          (s: IndexedDBService) => s.status !== 'deleted'
        );
        resolve(services);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async getServiceById(id: number): Promise<IndexedDBService | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readonly');
      const store = tx.objectStore('services');
      const request = store.get(id);

      request.onsuccess = () => {
        const service = request.result;
        resolve(service && service.status !== 'deleted' ? service : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addService(service: Omit<IndexedDBService, 'id'>): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readwrite');
      const store = tx.objectStore('services');
      const request = store.add(service);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async updateService(id: number, updates: Partial<IndexedDBService>): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readwrite');
      const store = tx.objectStore('services');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const service = getRequest.result;
        if (service) {
          const updated = { ...service, ...updates };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Service not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getServiceByNameAndType(
    serviceName: string,
    targetDbType: string
  ): Promise<IndexedDBService | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readonly');
      const store = tx.objectStore('services');
      const request = store.getAll();

      request.onsuccess = () => {
        const services = request.result.filter(
          (s: IndexedDBService) =>
            s.status !== 'deleted' &&
            s.service_name === serviceName &&
            s.target_db_type === targetDbType
        );
        resolve(services.length > 0 ? services[0] : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Databases
  async getDatabasesByServiceId(serviceId: number): Promise<IndexedDBDatabase[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('databases', 'readonly');
      const store = tx.objectStore('databases');
      const index = store.index('service_id');
      const request = index.getAll(serviceId);

      request.onsuccess = () => {
        const databases = request.result.filter(
          (d: IndexedDBDatabase) => d.status !== 'deleted'
        );
        resolve(databases);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addDatabase(database: Omit<IndexedDBDatabase, 'id'>): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('databases', 'readwrite');
      const store = tx.objectStore('databases');
      const request = store.add(database);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getDatabaseById(id: number): Promise<IndexedDBDatabase | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('databases', 'readonly');
      const store = tx.objectStore('databases');
      const request = store.get(id);

      request.onsuccess = () => {
        const database = request.result;
        resolve(database && database.status !== 'deleted' ? database : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateDatabase(id: number, updates: Partial<IndexedDBDatabase>): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('databases', 'readwrite');
      const store = tx.objectStore('databases');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const database = getRequest.result;
        if (database) {
          const updated = { ...database, ...updates };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Database not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getDatabaseByServiceIdAndName(
    serviceId: number,
    sourceDbName: string
  ): Promise<IndexedDBDatabase | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('databases', 'readonly');
      const store = tx.objectStore('databases');
      const index = store.index('service_id');
      const request = index.getAll(serviceId);

      request.onsuccess = () => {
        const databases = request.result.filter(
          (d: IndexedDBDatabase) =>
            d.status !== 'deleted' && d.source_db_name === sourceDbName
        );
        resolve(databases.length > 0 ? databases[0] : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Tables
  async getTablesByDatabaseId(databaseId: number): Promise<IndexedDBTable[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tables', 'readonly');
      const store = tx.objectStore('tables');
      const index = store.index('database_id');
      const request = index.getAll(databaseId);

      request.onsuccess = () => {
        const tables = request.result.filter(
          (t: IndexedDBTable) => t.status !== 'deleted'
        );
        resolve(tables);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addTable(table: Omit<IndexedDBTable, 'id'>): Promise<number> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tables', 'readwrite');
      const store = tx.objectStore('tables');
      const request = store.add(table);

      request.onsuccess = () => resolve(request.result as number);
      request.onerror = () => reject(request.error);
    });
  }

  async getTableById(id: number): Promise<IndexedDBTable | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tables', 'readonly');
      const store = tx.objectStore('tables');
      const request = store.get(id);

      request.onsuccess = () => {
        const table = request.result;
        resolve(table && table.status !== 'deleted' ? table : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async updateTable(id: number, updates: Partial<IndexedDBTable>): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tables', 'readwrite');
      const store = tx.objectStore('tables');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const table = getRequest.result;
        if (table) {
          const updated = { ...table, ...updates };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Table not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  async getTableByDatabaseIdAndNames(
    databaseId: number,
    sourceTableName: string
  ): Promise<IndexedDBTable | null> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tables', 'readonly');
      const store = tx.objectStore('tables');
      const index = store.index('database_id');
      const request = index.getAll(databaseId);

      request.onsuccess = () => {
        const tables = request.result.filter(
          (t: IndexedDBTable) =>
            t.status !== 'deleted' && t.source_table_name === sourceTableName
        );
        resolve(tables.length > 0 ? tables[0] : null);
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Fields
  async getFieldsByTableId(tableId: number): Promise<IndexedDBField[]> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fields', 'readonly');
      const store = tx.objectStore('fields');
      const index = store.index('table_id');
      const request = index.getAll(tableId);

      request.onsuccess = () => {
        const fields = request.result.filter(
          (f: IndexedDBField) => f.status !== 'deleted'
        );
        // Сортировка по row_num
        fields.sort((a: IndexedDBField, b: IndexedDBField) => a.row_num - b.row_num);
        resolve(fields);
      };
      request.onerror = () => reject(request.error);
    });
  }

  async addField(field: IndexedDBField): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fields', 'readwrite');
      const store = tx.objectStore('fields');
      const request = store.put(field);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async updateField(id: number, updates: Partial<IndexedDBField>): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fields', 'readwrite');
      const store = tx.objectStore('fields');
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const field = getRequest.result;
        if (field) {
          const updated = { ...field, ...updates };
          const putRequest = store.put(updated);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = () => reject(putRequest.error);
        } else {
          reject(new Error('Field not found'));
        }
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
  }

  // Physical delete methods (for cascading deletes)
  async deleteFieldPhysically(id: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fields', 'readwrite');
      const store = tx.objectStore('fields');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteFieldsByTableId(tableId: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('fields', 'readwrite');
      const store = tx.objectStore('fields');
      const index = store.index('table_id');
      const request = index.getAll(tableId);

      request.onsuccess = () => {
        const fields = request.result;
        let deleted = 0;
        const total = fields.length;

        if (total === 0) {
          resolve();
          return;
        }

        fields.forEach((field: IndexedDBField) => {
          const deleteRequest = store.delete(field.id);
          deleteRequest.onsuccess = () => {
            deleted++;
            if (deleted === total) {
              resolve();
            }
          };
          deleteRequest.onerror = () => {
            reject(deleteRequest.error);
          };
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTablePhysically(id: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tables', 'readwrite');
      const store = tx.objectStore('tables');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteTablesByDatabaseId(databaseId: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('tables', 'readwrite');
      const store = tx.objectStore('tables');
      const index = store.index('database_id');
      const request = index.getAll(databaseId);

      request.onsuccess = () => {
        const tables = request.result;
        let deleted = 0;
        const total = tables.length;

        if (total === 0) {
          resolve();
          return;
        }

        tables.forEach((table: IndexedDBTable) => {
          const deleteRequest = store.delete(table.id!);
          deleteRequest.onsuccess = () => {
            deleted++;
            if (deleted === total) {
              resolve();
            }
          };
          deleteRequest.onerror = () => {
            reject(deleteRequest.error);
          };
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDatabasePhysically(id: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('databases', 'readwrite');
      const store = tx.objectStore('databases');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteServicePhysically(id: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('services', 'readwrite');
      const store = tx.objectStore('services');
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteDatabasesByServiceId(serviceId: number): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('databases', 'readwrite');
      const store = tx.objectStore('databases');
      const index = store.index('service_id');
      const request = index.getAll(serviceId);

      request.onsuccess = () => {
        const databases = request.result;
        let deleted = 0;
        const total = databases.length;

        if (total === 0) {
          resolve();
          return;
        }

        databases.forEach((database: IndexedDBDatabase) => {
          const deleteRequest = store.delete(database.id!);
          deleteRequest.onsuccess = () => {
            deleted++;
            if (deleted === total) {
              resolve();
            }
          };
          deleteRequest.onerror = () => {
            reject(deleteRequest.error);
          };
        });
      };
      request.onerror = () => reject(request.error);
    });
  }

  // Очистка всех данных (для перезагрузки)
  async clearAllData(): Promise<void> {
    const db = await this.init();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['services', 'databases', 'tables', 'fields'], 'readwrite');
      
      let completed = 0;
      const total = 4;
      
      const checkComplete = () => {
        completed++;
        if (completed === total) {
          // Все очистки завершены, транзакция завершится автоматически
        }
      };

      const clearStore = (storeName: string) => {
        return new Promise<void>((res, rej) => {
          const store = tx.objectStore(storeName);
          const request = store.clear();
          request.onsuccess = () => {
            checkComplete();
            res();
          };
          request.onerror = () => {
            console.error(`❌ Error clearing ${storeName}:`, request.error);
            rej(request.error);
          };
        });
      };

      // Очищаем все хранилища
      clearStore('services').catch(reject);
      clearStore('databases').catch(reject);
      clearStore('tables').catch(reject);
      clearStore('fields').catch(reject);

      tx.oncomplete = () => {
        resolve();
      };
      tx.onerror = () => {
        console.error('❌ Transaction error:', tx.error);
        reject(tx.error);
      };
    });
  }

  // Нормализация данных из бэкенда (Этап 1)
  async normalizeAndSaveDataset(dataset: any[]): Promise<void> {
    const db = await this.init();

    // Очистить все данные перед добавлением новых
    await this.clearAllData();

    // Шаг 1: Создание Services
    const serviceMap = new Map<string, IndexedDBService>();
    const serviceIdMap = new Map<string, number>();

    // Проверка уникальности по ключу
    const seenKeys = new Set<string>();
    dataset.forEach((row: any) => {
      const key = `${row.service_name}::${row.target_db_type}`;
      if (!serviceMap.has(key)) {
        // Дополнительная проверка на дубликаты
        if (seenKeys.has(key)) {
          console.warn(`⚠️ Duplicate service key detected: ${key}`);
          return;
        }
        seenKeys.add(key);
        serviceMap.set(key, {
          service_name_original: row.service_name || '',
          service_name: row.service_name || '',
          target_db_type: row.target_db_type || '',
          qty_dbs: 0,
          status: 'unchanged',
        });
      }
    });

    // Подсчет qty_dbs
    serviceMap.forEach((service, key) => {
      // Используем ключ для фильтрации (service_name + target_db_type)
      const [serviceName, targetDbType] = key.split('::');
      const uniqueDbs = new Set(
        dataset
          .filter((r) => r.service_name === serviceName && r.target_db_type === targetDbType)
          .map((r) => r.source_db_name)
          .filter((db) => db && db.trim() !== '') // Исключаем пустые значения
      );
      service.qty_dbs = uniqueDbs.size;
    });

    // Сохранение services
    for (const [key, service] of serviceMap) {
      const id = await this.addService(service);
      serviceIdMap.set(key, id);
    }

    // Шаг 2: Создание Databases
    const databaseMap = new Map<string, IndexedDBDatabase>();
    const databaseIdMap = new Map<string, number>();

    dataset.forEach((row: any) => {
      const serviceKey = `${row.service_name}::${row.target_db_type}`;
      const serviceId = serviceIdMap.get(serviceKey);
      if (!serviceId) return;

      const dbKey = `${serviceId}::${row.source_db_name}`;
      if (!databaseMap.has(dbKey)) {
        databaseMap.set(dbKey, {
          service_id: serviceId,
          source_db_name_original: row.source_db_name || '',
          source_db_name: row.source_db_name || '',
          source_schema_name: row.source_schema_name || '',
          target_db_name: row.target_db_name || '',
          target_schema_name: row.target_schema_name || '',
          source_db_type: row.source_db_type || '',
          qty_tables: 0,
          status: 'unchanged',
        });
      }
    });

    // Подсчет qty_tables
    databaseMap.forEach((database, key) => {
      const [serviceIdStr] = key.split('::');
      const serviceId = parseInt(serviceIdStr);
      const service = Array.from(serviceMap.values()).find(
        (s) => serviceIdMap.get(`${s.service_name_original}::${s.target_db_type}`) === serviceId
      );

      const uniqueTables = new Set(
        dataset
          .filter(
            (r) =>
              r.service_name === service?.service_name_original &&
              r.source_db_name === database.source_db_name_original
          )
          .map((r) => `${r.source_schema_name}::${r.source_table_name}`)
      );
      database.qty_tables = uniqueTables.size;
    });

    // Сохранение databases
    for (const [key, database] of databaseMap) {
      const id = await this.addDatabase(database);
      databaseIdMap.set(key, id);
    }

    // Шаг 3: Создание Tables
    const tableMap = new Map<string, IndexedDBTable>();
    const tableIdMap = new Map<string, number>();

    dataset.forEach((row: any) => {
      const serviceKey = `${row.service_name}::${row.target_db_type}`;
      const serviceId = serviceIdMap.get(serviceKey);
      if (!serviceId) return;

      const dbKey = `${serviceId}::${row.source_db_name}`;
      const databaseId = databaseIdMap.get(dbKey);
      if (!databaseId) return;

      const tableKey = `${databaseId}::${row.source_schema_name}::${row.source_table_name}`;
      if (!tableMap.has(tableKey)) {
        tableMap.set(tableKey, {
          database_id: databaseId,
          source_table_name_original: row.source_table_name || '',
          source_table_name: row.source_table_name || '',
          target_table_name: row.target_table_name || '',
          qty_fields: 0,
          status: 'unchanged',
        });
      }
    });

    // Подсчет qty_fields
    tableMap.forEach((table, key) => {
      const [databaseIdStr, schema, tableName] = key.split('::');
      const databaseId = parseInt(databaseIdStr);
      const database = Array.from(databaseMap.values()).find(
        (d) => databaseIdMap.get(`${d.service_id}::${d.source_db_name_original}`) === databaseId
      );

      const fieldsCount = dataset.filter((r) => {
        return (
          r.source_schema_name === schema &&
          r.source_table_name === tableName &&
          r.source_db_name === database?.source_db_name_original
        );
      }).length;
      table.qty_fields = fieldsCount;
    });

    // Сохранение tables
    for (const [key, table] of tableMap) {
      const id = await this.addTable(table);
      tableIdMap.set(key, id);
    }

    // Шаг 4: Создание Fields
    const fields: IndexedDBField[] = [];

    dataset.forEach((row: any) => {
      const serviceKey = `${row.service_name}::${row.target_db_type}`;
      const serviceId = serviceIdMap.get(serviceKey);
      if (!serviceId) return;

      const dbKey = `${serviceId}::${row.source_db_name}`;
      const databaseId = databaseIdMap.get(dbKey);
      if (!databaseId) return;

      const tableKey = `${databaseId}::${row.source_schema_name}::${row.source_table_name}`;
      const tableId = tableIdMap.get(tableKey);
      if (!tableId) return;

      fields.push({
        id: row.id,
        table_id: tableId,
        source_field_name: row.source_field_name || '',
        source_field_type: row.source_field_type || '',
        target_field_name: row.target_field_name || '',
        target_field_type: row.target_field_type || '',
        target_field_value: row.target_field_value || '',
        is_id: row.is_id || 0,
        row_num: row.row_num || 0,
        status: 'unchanged',
      });
    });

    // Сохранение fields
    for (const field of fields) {
      await this.addField(field);
    }
  }
}

export const indexedDBService = new TruETLIndexedDBService();

