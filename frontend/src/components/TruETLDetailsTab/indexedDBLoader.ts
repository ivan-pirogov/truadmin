import { indexedDBService } from './indexedDBService';
import { IndexedDBService, IndexedDBDatabase, IndexedDBTable, IndexedDBField } from './types';
import { Service, SourceDatabase, TableMapping } from './types';
import { DMSField, FieldChangeStatus } from './FieldEditModal';

/**
 * Этап 2: Каскадная загрузка данных из IndexedDB
 */

/**
 * Преобразует IndexedDBService в Service для UI
 */
export const mapServiceToUI = (service: IndexedDBService): Service => {
  return {
    id: service.id, // Сохраняем ID для каскадной загрузки
    name: service.service_name, // Используем обычное поле, не _original
    target_db_type: service.target_db_type,
    databases_count: service.qty_dbs,
    status: service.status, // Для визуализации изменений
  };
};

/**
 * Преобразует IndexedDBDatabase в SourceDatabase для UI
 */
export const mapDatabaseToUI = (database: IndexedDBDatabase): SourceDatabase & { id?: number } => {
  return {
    id: database.id, // Сохраняем ID для каскадной загрузки
    name: database.source_db_name, // Используем обычное поле, не _original
    source_schema: database.source_schema_name,
    type: database.source_db_type,
    target_database: database.target_db_name,
    target_schema: database.target_schema_name,
    status: database.status, // Для визуализации изменений
  };
};

/**
 * Преобразует IndexedDBTable в TableMapping для UI
 */
export const mapTableToUI = (table: IndexedDBTable, fieldsCount: number): TableMapping & { id?: number } => {
  return {
    id: table.id, // Сохраняем ID для каскадной загрузки
    source_table: table.source_table_name, // Используем обычное поле, не _original
    target_table: table.target_table_name,
    fields_count: fieldsCount,
    status: table.status, // Для визуализации изменений
  };
};

/**
 * Преобразует IndexedDBField в DMSField для UI
 */
export const mapFieldToUI = (field: IndexedDBField): DMSField => {
  return {
    id: field.id,
    table_id: field.table_id,
    source_field: field.source_field_name,
    source_type: field.source_field_type,
    target_field: field.target_field_name,
    target_type: field.target_field_type,
    target_value: field.target_field_value,
    is_primary_key: field.is_id === 1,
    row_order: field.row_num,
    _changeStatus: field.status as FieldChangeStatus,
  };
};

/**
 * Загружает все сервисы из IndexedDB
 */
export const loadServices = async (): Promise<Service[]> => {
  const services = await indexedDBService.getAllServices();
  
  // Убеждаемся, что нет дубликатов по ключу service_name::target_db_type
  const uniqueServices = new Map<string, Service>();
  services.forEach((service) => {
    const key = `${service.service_name}::${service.target_db_type}`;
    if (!uniqueServices.has(key)) {
      uniqueServices.set(key, mapServiceToUI(service));
    } else {
      console.warn(`⚠️ Duplicate service found: ${key}, skipping...`);
    }
  });
  
  const result = Array.from(uniqueServices.values());
  return result;
};

/**
 * Загружает базы данных для выбранного сервиса
 */
export const loadDatabases = async (serviceId: number): Promise<SourceDatabase[]> => {
  const databases = await indexedDBService.getDatabasesByServiceId(serviceId);
  return databases.map(mapDatabaseToUI);
};

/**
 * Загружает таблицы для выбранной базы данных
 */
export const loadTables = async (databaseId: number): Promise<TableMapping[]> => {
  const tables = await indexedDBService.getTablesByDatabaseId(databaseId);
  
  // Для каждой таблицы нужно получить количество полей
  const tablesWithFieldsCount = await Promise.all(
    tables.map(async (table) => {
      const fields = await indexedDBService.getFieldsByTableId(table.id!);
      return mapTableToUI(table, fields.length);
    })
  );
  
  return tablesWithFieldsCount;
};

/**
 * Загружает поля для выбранной таблицы
 */
export const loadFields = async (tableId: number): Promise<DMSField[]> => {
  const fields = await indexedDBService.getFieldsByTableId(tableId);
  return fields.map(mapFieldToUI);
};

/**
 * Получает полную информацию о таблице по её ID
 */
export const getTableById = async (tableId: number): Promise<any> => {
  // Нужно найти таблицу через все базы данных
  // Это не оптимально, но для начала сойдет
  const services = await indexedDBService.getAllServices();
  
  for (const service of services) {
    const databases = await indexedDBService.getDatabasesByServiceId(service.id!);
    for (const database of databases) {
      const tables = await indexedDBService.getTablesByDatabaseId(database.id!);
      const table = tables.find(t => t.id === tableId);
      if (table) {
        // Собрать полную информацию о таблице
        return {
          id: table.id,
          service_name: service.service_name,
          source_db_name: database.source_db_name,
          source_schema: database.source_schema_name,
          source_table: table.source_table_name,
          source_db_type: database.source_db_type,
          target_db_name: database.target_db_name,
          target_schema: database.target_schema_name,
          target_table: table.target_table_name,
          target_db_type: service.target_db_type,
        };
      }
    }
  }
  
  return null;
};

