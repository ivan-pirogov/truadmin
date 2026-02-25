/**
 * Collects all changes from IndexedDB for saving to server
 */

import { indexedDBService } from './indexedDBService';
import { IndexedDBService, IndexedDBDatabase, IndexedDBTable, IndexedDBField } from './types';

export interface AllChanges {
  services: {
    deleted: string[]; // service_name_original
    updated: Array<{
      service_name_original: string;
      service_name: string;
      target_db_type: string;
    }>;
  };
  databases: {
    deleted: string[]; // source_db_name_original
    updated: Array<{
      source_db_name_original: string;
      source_db_name: string;
      source_schema_name: string;
      target_db_name: string;
      target_schema_name: string;
      source_db_type: string;
    }>;
  };
  tables: {
    deleted: string[]; // source_table_name_original
    updated: Array<{
      source_table_name_original: string;
      source_table_name: string;
      target_table_name: string;
    }>;
  };
  fields: {
    deleted: number[]; // ids
    updated: Array<{
      id: number;
      source_field_name: string;
      source_field_type: string;
      target_field_name: string;
      target_field_type: string;
      target_field_value: string;
      is_id: number;
      row_num: number;
    }>;
    added: Array<{
      service_name: string;
      source_db_name: string;
      source_schema_name: string;
      source_table_name: string;
      source_field_name: string;
      source_field_type: string;
      target_db_name: string;
      target_schema_name: string;
      target_table_name: string;
      target_field_name: string;
      target_field_type: string;
      target_field_value: string;
      is_id: number;
      row_num: number;
      source_db_type: string;
      target_db_type: string;
    }>;
  };
}

/**
 * Collects all changes from IndexedDB
 */
export async function collectAllChanges(): Promise<AllChanges> {
  const changes: AllChanges = {
    services: { deleted: [], updated: [] },
    databases: { deleted: [], updated: [] },
    tables: { deleted: [], updated: [] },
    fields: { deleted: [], updated: [], added: [] },
  };

  // 1. Collect services
  const allServices = await indexedDBService.getAllServices();
  for (const service of allServices) {
    if (service.status === 'deleted') {
      changes.services.deleted.push(service.service_name_original);
    } else if (service.status === 'updated') {
      changes.services.updated.push({
        service_name_original: service.service_name_original,
        service_name: service.service_name,
        target_db_type: service.target_db_type,
      });
    }
  }

  // 2. Collect databases
  const allDatabases: IndexedDBDatabase[] = [];
  for (const service of allServices) {
    if (service.id) {
      const databases = await indexedDBService.getDatabasesByServiceId(service.id);
      allDatabases.push(...databases);
    }
  }

  for (const database of allDatabases) {
    if (database.status === 'deleted') {
      changes.databases.deleted.push(database.source_db_name_original);
    } else if (database.status === 'updated') {
      changes.databases.updated.push({
        source_db_name_original: database.source_db_name_original,
        source_db_name: database.source_db_name,
        source_schema_name: database.source_schema_name,
        target_db_name: database.target_db_name,
        target_schema_name: database.target_schema_name,
        source_db_type: database.source_db_type,
      });
    }
  }

  // 3. Collect tables
  const allTables: IndexedDBTable[] = [];
  for (const database of allDatabases) {
    if (database.id) {
      const tables = await indexedDBService.getTablesByDatabaseId(database.id);
      allTables.push(...tables);
    }
  }

  for (const table of allTables) {
    if (table.status === 'deleted') {
      changes.tables.deleted.push(table.source_table_name_original);
    } else if (table.status === 'updated') {
      changes.tables.updated.push({
        source_table_name_original: table.source_table_name_original,
        source_table_name: table.source_table_name,
        target_table_name: table.target_table_name,
      });
    }
  }

  // 4. Collect fields (need to get full context from parent tables)
  const allFields: Array<IndexedDBField & { 
    table?: IndexedDBTable;
    database?: IndexedDBDatabase;
    service?: IndexedDBService;
  }> = [];

  for (const table of allTables) {
    if (table.id) {
      const fields = await indexedDBService.getFieldsByTableId(table.id);
      
      // Get parent database
      const database = allDatabases.find(d => d.id === table.database_id);
      
      // Get parent service
      let service: IndexedDBService | undefined;
      if (database) {
        service = allServices.find(s => s.id === database.service_id);
      }

      // Add fields with context
      for (const field of fields) {
        allFields.push({
          ...field,
          table,
          database,
          service,
        });
      }
    }
  }

  for (const field of allFields) {
    if (field.status === 'deleted' && field.id) {
      changes.fields.deleted.push(field.id);
    } else if (field.status === 'updated' && field.id) {
      changes.fields.updated.push({
        id: field.id,
        source_field_name: field.source_field_name,
        source_field_type: field.source_field_type,
        target_field_name: field.target_field_name,
        target_field_type: field.target_field_type,
        target_field_value: field.target_field_value,
        is_id: field.is_id,
        row_num: field.row_num,
      });
    } else if (field.status === 'added' && field.table && field.database && field.service) {
      changes.fields.added.push({
        service_name: field.service.service_name,
        source_db_name: field.database.source_db_name,
        source_schema_name: field.database.source_schema_name,
        source_table_name: field.table.source_table_name,
        source_field_name: field.source_field_name,
        source_field_type: field.source_field_type,
        target_db_name: field.database.target_db_name,
        target_schema_name: field.database.target_schema_name,
        target_table_name: field.table.target_table_name,
        target_field_name: field.target_field_name,
        target_field_type: field.target_field_type,
        target_field_value: field.target_field_value,
        is_id: field.is_id,
        row_num: field.row_num,
        source_db_type: field.database.source_db_type,
        target_db_type: field.service.target_db_type,
      });
    }
  }

  return changes;
}

