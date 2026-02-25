/**
 * Validation service for TruETL data
 * Implements validation rules for services, databases, tables, and fields
 */

import { indexedDBService } from './indexedDBService';

export type ValidationError = string | null;

/**
 * Validates a service record
 */
export async function validateService(
  serviceName: string,
  targetDbType: string,
  excludeId?: number
): Promise<ValidationError> {
  // Check required fields
  if (!serviceName || serviceName.trim() === '') {
    return 'Service name is required';
  }

  if (!targetDbType || targetDbType.trim() === '') {
    return 'Target DB type is required';
  }

  // Check uniqueness: service_name must be unique
  const existingService = await indexedDBService.getServiceByNameAndType(
    serviceName,
    targetDbType
  );
  if (existingService && existingService.id !== excludeId) {
    return `Service with name "${serviceName}" and type "${targetDbType}" already exists`;
  }

  return null;
}

/**
 * Validates a database record
 */
export async function validateDatabase(
  serviceId: number,
  sourceDbName: string,
  excludeId?: number
): Promise<ValidationError> {
  // Check required fields
  if (!sourceDbName || sourceDbName.trim() === '') {
    return 'Source database name is required';
  }

  if (!serviceId) {
    return 'Service ID is required';
  }

  // Check uniqueness: service_id + source_db_name must be unique
  const existingDatabase = await indexedDBService.getDatabaseByServiceIdAndName(
    serviceId,
    sourceDbName
  );
  if (existingDatabase && existingDatabase.id !== excludeId) {
    return `Database with name "${sourceDbName}" already exists for this service`;
  }

  return null;
}

/**
 * Validates a table record
 */
export async function validateTable(
  databaseId: number,
  sourceTableName: string,
  excludeId?: number
): Promise<ValidationError> {
  // Check required fields
  if (!sourceTableName || sourceTableName.trim() === '') {
    return 'Source table name is required';
  }

  if (!databaseId) {
    return 'Database ID is required';
  }

  // Check uniqueness: database_id + source_table_name must be unique
  const existingTable = await indexedDBService.getTableByDatabaseIdAndNames(
    databaseId,
    sourceTableName
  );
  if (existingTable && existingTable.id !== excludeId) {
    return `Table with name "${sourceTableName}" already exists for this database`;
  }

  return null;
}

/**
 * Validates a field record
 */
export async function validateField(
  tableId: number,
  sourceFieldName: string,
  isId: number,
  excludeId?: number
): Promise<ValidationError> {
  // Check required fields (all except is_id)
  if (!sourceFieldName || sourceFieldName.trim() === '') {
    return 'Source field name is required';
  }

  if (!tableId) {
    return 'Table ID is required';
  }

  // Check uniqueness: table_id + source_field_name must be unique
  const existingFields = await indexedDBService.getFieldsByTableId(tableId);
  const existingField = existingFields.find(
    (f) => f.source_field_name === sourceFieldName && f.id !== excludeId
  );
  if (existingField) {
    return `Field with name "${sourceFieldName}" already exists in this table`;
  }

  // Check is_id constraint: only one field can have is_id = 1 per table
  if (isId === 1) {
    const fieldsWithIsId = existingFields.filter(
      (f) => f.is_id === 1 && f.id !== excludeId
    );
    if (fieldsWithIsId.length > 0) {
      return 'Only one field can be marked as ID (is_id=1) per table';
    }
  }

  return null;
}

/**
 * Validation result with detailed error messages
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates the entire data structure before saving to server
 * Checks:
 * 1. Cascade completeness: service -> database -> table -> field
 * 2. Each table must have exactly one field marked as ID (is_primary_key = true)
 */
export async function validateBeforeSave(): Promise<ValidationResult> {
  const errors: string[] = [];

  try {
    // 1. Get all services (excluding deleted)
    const services = await indexedDBService.getAllServices();

    // Check each service has at least one database
    for (const service of services) {
      if (!service.id) continue;

      const databases = await indexedDBService.getDatabasesByServiceId(service.id);
      const activeDatabases = databases.filter(db => db.status !== 'deleted');

      if (activeDatabases.length === 0) {
        errors.push(
          `Service "${service.service_name}" (${service.target_db_type}) has no databases. Each service must have at least one database.`
        );
        continue;
      }

      // Check each database has at least one table
      for (const database of activeDatabases) {
        if (!database.id) continue;

        const tables = await indexedDBService.getTablesByDatabaseId(database.id);
        const activeTables = tables.filter(table => table.status !== 'deleted');

        if (activeTables.length === 0) {
          errors.push(
            `Database "${database.source_db_name}" in service "${service.service_name}" has no tables. Each database must have at least one table.`
          );
          continue;
        }

        // Check each table has at least one field and exactly one ID field
        for (const table of activeTables) {
          if (!table.id) continue;

          const fields = await indexedDBService.getFieldsByTableId(table.id);
          const activeFields = fields.filter(field => field.status !== 'deleted');

          // Check table has at least one field
          if (activeFields.length === 0) {
            errors.push(
              `Table "${table.source_table_name}" in database "${database.source_db_name}" (service "${service.service_name}") has no fields. Each table must have at least one field.`
            );
            continue;
          }

          // Check table has exactly one ID field (is_id = 1)
          const idFields = activeFields.filter(field => field.is_id === 1);
          if (idFields.length === 0) {
            errors.push(
              `Table "${table.source_table_name}" in database "${database.source_db_name}" (service "${service.service_name}") has no field marked as ID (Primary Key). Each table must have exactly one field marked as ID.`
            );
          } else if (idFields.length > 1) {
            const idFieldNames = idFields.map(f => f.source_field_name).join(', ');
            errors.push(
              `Table "${table.source_table_name}" in database "${database.source_db_name}" (service "${service.service_name}") has ${idFields.length} fields marked as ID (${idFieldNames}). Each table must have exactly one field marked as ID.`
            );
          }
        }
      }
    }
  } catch (error: any) {
    errors.push(`Validation error: ${error.message || 'Unknown error'}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

