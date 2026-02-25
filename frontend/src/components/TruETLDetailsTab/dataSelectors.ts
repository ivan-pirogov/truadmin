import { DMSTable, Service, SourceDatabase, TableMapping } from './types';
import { DMSField } from './FieldEditModal';

/**
 * Вычисляет уникальные сервисы из таблиц
 */
export const getServices = (tables: DMSTable[]): Service[] => {
  if (tables.length === 0) return [];

  return Array.from(
    new Set(tables.map((t) => t.service_name).filter((name) => name != null && name !== ''))
  ).map((serviceName) => {
    const serviceTables = tables.filter((t) => t.service_name === serviceName);
    return {
      name: serviceName,
      target_db_type: serviceTables[0]?.target_db_type || '',
      databases_count: new Set(
        serviceTables.map((t) => t.source_db_name).filter((db) => db != null && db !== '')
      ).size,
    };
  });
};

/**
 * Вычисляет базы данных для выбранного сервиса
 */
export const getSourceDatabases = (
  tables: DMSTable[],
  selectedService: string | null
): SourceDatabase[] => {
  if (!selectedService) return [];

  return Array.from(
    new Set(
      tables.filter((t) => t.service_name === selectedService).map((t) => t.source_db_name)
    )
  ).map((dbName) => {
    const dbTables = tables.filter(
      (t) => t.service_name === selectedService && t.source_db_name === dbName
    );
    const firstTable = dbTables[0];
    
    // Find first table with non-empty schema, or use first table
    const tableWithSchema = dbTables.find(t => 
      (t.source_schema && t.source_schema.trim() !== '') ||
      (t.target_schema && t.target_schema.trim() !== '')
    ) || firstTable;
    
    // Debug logging
    if (dbTables.length > 0) {
      console.log(`🔍 Source DB "${dbName}" - schema data:`, {
        totalTables: dbTables.length,
        firstTableSchemas: {
          source_schema: firstTable?.source_schema,
          target_schema: firstTable?.target_schema,
        },
        tableWithSchema: tableWithSchema ? {
          source_schema: tableWithSchema.source_schema,
          target_schema: tableWithSchema.target_schema,
        } : null,
        allSchemas: dbTables.map(t => ({
          source_schema: t.source_schema,
          target_schema: t.target_schema
        }))
      });
    }
    
    return {
      name: dbName,
      source_schema: tableWithSchema?.source_schema || '',
      type: firstTable?.source_db_type || '',
      target_database: firstTable?.target_db_name || '',
      target_schema: tableWithSchema?.target_schema || '',
    };
  });
};

/**
 * Вычисляет таблицы для выбранного сервиса и базы данных
 */
export const getTableMappings = (
  tables: DMSTable[],
  fields: Record<number, DMSField[]>,
  selectedService: string | null,
  selectedSourceDb: string | null
): TableMapping[] => {
  if (!selectedService || !selectedSourceDb) return [];

  return Array.from(
    new Set(
      tables
        .filter(
          (t) => 
            t.service_name === selectedService && 
            t.source_db_name === selectedSourceDb &&
            t.source_table && 
            t.source_table.trim() !== ''
        )
        .map((t) => t.source_table)
    )
  ).map((tableName) => {
    const table = tables.find(
      (t) =>
        t.service_name === selectedService &&
        t.source_db_name === selectedSourceDb &&
        t.source_table === tableName
    );
    const tableFields = table?.id ? fields[table.id] || [] : [];
    return {
      source_table: tableName,
      target_table: table?.target_table || '',
      fields_count: tableFields.length,
    };
  });
};

