/**
 * Handlers for editing, deleting, and adding services, databases, and tables
 * Implements Stage 3 logic from docs/frontend/services/indexedDB-migration-plan.md
 */

import { indexedDBService } from './indexedDBService';
import {
  validateService,
  validateDatabase,
  validateTable,
} from './validationService';
import { IndexedDBService, IndexedDBDatabase, IndexedDBTable } from './types';

/**
 * Updates a service in IndexedDB
 * Sets status to 'updated' if changes detected
 */
export async function updateService(
  serviceId: number,
  updates: Partial<IndexedDBService>
): Promise<void> {
  // Get current service from IndexedDB
  const currentService = await indexedDBService.getServiceById(serviceId);
  if (!currentService) {
    throw new Error('Service not found');
  }

  // Validate
  const validationError = await validateService(
    updates.service_name || currentService.service_name,
    updates.target_db_type || currentService.target_db_type,
    serviceId
  );
  if (validationError) {
    throw new Error(validationError);
  }

  // Prepare update (exclude _original fields from update)
  const updateData: Partial<IndexedDBService> = {
    ...updates,
    // Сохраняем статус 'added' если он был, иначе ставим 'updated'
    status: currentService.status === 'added' ? 'added' : 'updated',
  };
  // Don't update _original fields
  delete (updateData as any).service_name_original;

  await indexedDBService.updateService(serviceId, updateData);
}

/**
 * Updates a database in IndexedDB
 */
export async function updateDatabase(
  databaseId: number,
  updates: Partial<IndexedDBDatabase>
): Promise<void> {
  const currentDatabase = await indexedDBService.getDatabaseById(databaseId);
  if (!currentDatabase) {
    throw new Error('Database not found');
  }

  // Validate
  const validationError = await validateDatabase(
    currentDatabase.service_id,
    updates.source_db_name || currentDatabase.source_db_name,
    databaseId
  );
  if (validationError) {
    throw new Error(validationError);
  }

  const updateData: Partial<IndexedDBDatabase> = {
    ...updates,
    // Сохраняем статус 'added' если он был, иначе ставим 'updated'
    status: currentDatabase.status === 'added' ? 'added' : 'updated',
  };
  delete (updateData as any).source_db_name_original;

  await indexedDBService.updateDatabase(databaseId, updateData);
}

/**
 * Updates a table in IndexedDB
 */
export async function updateTable(
  tableId: number,
  updates: Partial<IndexedDBTable>
): Promise<void> {
  const currentTable = await indexedDBService.getTableById(tableId);
  if (!currentTable) {
    throw new Error('Table not found');
  }

  // Validate
  const validationError = await validateTable(
    currentTable.database_id,
    updates.source_table_name || currentTable.source_table_name,
    tableId
  );
  if (validationError) {
    throw new Error(validationError);
  }

  const updateData: Partial<IndexedDBTable> = {
    ...updates,
    // Сохраняем статус 'added' если он был, иначе ставим 'updated'
    status: currentTable.status === 'added' ? 'added' : 'updated',
  };
  delete (updateData as any).source_table_name_original;

  await indexedDBService.updateTable(tableId, updateData);
}

/**
 * Deletes a service (sets status to 'deleted' or physically deletes)
 * Physically deletes all cascading records (databases, tables, fields)
 */
export async function deleteService(serviceId: number): Promise<void> {
  const currentService = await indexedDBService.getServiceById(serviceId);
  if (!currentService) {
    throw new Error('Service not found');
  }

  // 1. Get all databases for this service
  const databases = await indexedDBService.getDatabasesByServiceId(serviceId);
  
  // 2. For each database, delete all tables and their fields
  for (const database of databases) {
    if (database.id) {
      // Get all tables for this database
      const tables = await indexedDBService.getTablesByDatabaseId(database.id);
      
      // Delete all fields for each table
      for (const table of tables) {
        if (table.id) {
          await indexedDBService.deleteFieldsByTableId(table.id);
        }
      }
      
      // Delete all tables for this database
      await indexedDBService.deleteTablesByDatabaseId(database.id);
    }
  }
  
  // 3. Delete all databases for this service
  await indexedDBService.deleteDatabasesByServiceId(serviceId);
  
  // 4. If service was added (not saved to server), physically delete it
  // Otherwise mark as deleted
  if (currentService.status === 'added') {
    await indexedDBService.deleteServicePhysically(serviceId);
  } else {
    await indexedDBService.updateService(serviceId, { status: 'deleted' });
  }
}

/**
 * Deletes a database (sets status to 'deleted' or physically deletes)
 * Physically deletes all cascading records (tables, fields)
 */
export async function deleteDatabase(databaseId: number): Promise<void> {
  const currentDatabase = await indexedDBService.getDatabaseById(databaseId);
  if (!currentDatabase) {
    throw new Error('Database not found');
  }

  // 1. Get all tables for this database
  const tables = await indexedDBService.getTablesByDatabaseId(databaseId);
  
  // 2. Delete all fields for each table
  for (const table of tables) {
    if (table.id) {
      await indexedDBService.deleteFieldsByTableId(table.id);
    }
  }
  
  // 3. Delete all tables for this database
  await indexedDBService.deleteTablesByDatabaseId(databaseId);
  
  // 4. If database was added (not saved to server), physically delete it
  // Otherwise mark as deleted
  if (currentDatabase.status === 'added') {
    await indexedDBService.deleteDatabasePhysically(databaseId);
  } else {
    await indexedDBService.updateDatabase(databaseId, { status: 'deleted' });
  }
}

/**
 * Deletes a table (sets status to 'deleted' or physically deletes)
 * Physically deletes all cascading records (fields)
 */
export async function deleteTable(tableId: number): Promise<void> {
  const currentTable = await indexedDBService.getTableById(tableId);
  if (!currentTable) {
    throw new Error('Table not found');
  }

  // 1. Delete all fields for this table
  await indexedDBService.deleteFieldsByTableId(tableId);
  
  // 2. If table was added (not saved to server), physically delete it
  // Otherwise mark as deleted
  if (currentTable.status === 'added') {
    await indexedDBService.deleteTablePhysically(tableId);
  } else {
    await indexedDBService.updateTable(tableId, { status: 'deleted' });
  }
}

/**
 * Adds a new service
 */
export async function addService(
  serviceName: string,
  targetDbType: string
): Promise<number> {
  // Validate
  const validationError = await validateService(serviceName, targetDbType);
  if (validationError) {
    throw new Error(validationError);
  }

  const newService: Omit<IndexedDBService, 'id'> = {
    service_name_original: serviceName,
    service_name: serviceName,
    target_db_type: targetDbType,
    qty_dbs: 0,
    status: 'added',
  };

  return await indexedDBService.addService(newService);
}

/**
 * Adds a new database
 */
export async function addDatabase(
  serviceId: number,
  sourceDbName: string,
  sourceSchemaName: string = '',
  targetDbName: string = '',
  targetSchemaName: string = '',
  sourceDbType: string = ''
): Promise<number> {
  // Validate
  const validationError = await validateDatabase(serviceId, sourceDbName);
  if (validationError) {
    throw new Error(validationError);
  }

  const newDatabase: Omit<IndexedDBDatabase, 'id'> = {
    service_id: serviceId,
    source_db_name_original: sourceDbName,
    source_db_name: sourceDbName,
    source_schema_name: sourceSchemaName,
    target_db_name: targetDbName,
    target_schema_name: targetSchemaName,
    source_db_type: sourceDbType,
    qty_tables: 0,
    status: 'added',
  };

  return await indexedDBService.addDatabase(newDatabase);
}

/**
 * Adds a new table
 */
export async function addTable(
  databaseId: number,
  sourceTableName: string,
  targetTableName: string = ''
): Promise<number> {
  // Validate
  const validationError = await validateTable(databaseId, sourceTableName);
  if (validationError) {
    throw new Error(validationError);
  }

  const newTable: Omit<IndexedDBTable, 'id'> = {
    database_id: databaseId,
    source_table_name_original: sourceTableName,
    source_table_name: sourceTableName,
    target_table_name: targetTableName,
    qty_fields: 0,
    status: 'added',
  };

  return await indexedDBService.addTable(newTable);
}

