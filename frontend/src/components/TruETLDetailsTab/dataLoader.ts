import { apiService } from '../../services/api';
import { indexedDBService } from './indexedDBService';
import { DMSTable } from './types';
import { DMSField, FieldChangeStatus } from './FieldEditModal';

/**
 * Нормализует имена колонок от бэкенда для работы с IndexedDB
 */
export const normalizeRowForIndexedDB = (row: any): any => {
  return {
    id: row.id,
    service_name: row.service_name || '',
    source_db_name: row.source_db_name || '',
    source_db_type: row.source_db_type || '',
    source_schema_name: row.source_schema_name || row.source_schema || '',
    source_table_name: row.source_table_name || row.source_table || '',
    source_field_name: row.source_field_name || '',
    source_field_type: row.source_field_type || '',
    target_db_name: row.target_db_name || '',
    target_db_type: row.target_db_type || '',
    target_schema_name: row.target_schema_name || row.target_schema || '',
    target_table_name: row.target_table_name || row.target_table || '',
    target_field_name: row.target_field_name || '',
    target_field_type: row.target_field_type || '',
    target_field_value: row.target_field_value || row.target_value || '',
    is_id: row.is_id || (row.is_primary_key ? 1 : 0) || 0,
    row_num: row.row_num || row.row_order || 0,
  };
};

/**
 * Загружает данные из API, нормализует и сохраняет в IndexedDB
 * Этап 1: Нормализация данных
 */
export const loadAndNormalizeToIndexedDB = async (truetlDatabaseId: string): Promise<void> => {
  // Load tables via API
  const loadedTablesData = await apiService.getTruETLDMSTables(truetlDatabaseId);
  
  // Normalize all rows
  const normalizedDataset = loadedTablesData.map(normalizeRowForIndexedDB);
  
  // Save to IndexedDB (normalizeAndSaveDataset handles all 4 tables)
  await indexedDBService.normalizeAndSaveDataset(normalizedDataset);
};

/**
 * @deprecated Используйте loadAndNormalizeToIndexedDB вместо этого
 * Старая функция для обратной совместимости
 */
export const normalizeDataset = (loadedTablesData: any[]): any => {
  // First, normalize all rows and extract table/field information
  const normalizedRows = loadedTablesData.map((row: any) => {
    const normalized: any = { ...row };
    
    // Normalize source_table_name to source_table
    normalized.source_table = row.source_table_name || 
      (Object.keys(row).find(key => 
        key.toLowerCase().includes('source') && 
        key.toLowerCase().includes('table')
      ) ? row[Object.keys(row).find(key => 
        key.toLowerCase().includes('source') && 
        key.toLowerCase().includes('table')
      )!] : '') || '';
    
    // Normalize all table-related fields
    normalized.source_db_name = row.source_db_name || '';
    normalized.source_schema = row.source_schema_name || '';
    normalized.target_db_name = row.target_db_name || '';
    normalized.target_schema = row.target_schema_name || '';
    normalized.target_table = row.target_table_name || '';
    normalized.service_name = row.service_name || '';
    normalized.source_db_type = row.source_db_type || '';
    normalized.target_db_type = row.target_db_type || '';
    
    // Use id as table_id for grouping (each row represents a field, id is the field id)
    // We'll create a composite key for table grouping
    normalized.table_key = `${normalized.service_name}::${normalized.source_db_name}::${normalized.source_schema}::${normalized.source_table}`;
    
    return normalized;
  });
  
  // Group rows by unique table combination
  const tableMap = new Map<string, any[]>();
  normalizedRows.forEach((row: any) => {
    const key = row.table_key;
    if (!tableMap.has(key)) {
      tableMap.set(key, []);
    }
    tableMap.get(key)!.push(row);
  });
  
  // Create unique tables and extract fields
  const loadedTables: DMSTable[] = [];
  const loadedFields: Record<number, DMSField[]> = {};
  let tableIdCounter = 1;
  
  tableMap.forEach((fieldRows, tableKey) => {
    const firstRow = fieldRows[0];
    
    // Create table entry
    const table: DMSTable = {
      id: tableIdCounter,
      service_name: firstRow.service_name,
      source_db_name: firstRow.source_db_name,
      source_schema: firstRow.source_schema,
      source_table: firstRow.source_table,
      source_db_type: firstRow.source_db_type,
      target_db_name: firstRow.target_db_name,
      target_schema: firstRow.target_schema,
      target_table: firstRow.target_table,
      target_db_type: firstRow.target_db_type,
    };
    loadedTables.push(table);
    
    // Extract fields for this table
    const tableFields: DMSField[] = fieldRows
      .map((row: any, index: number) => ({
        id: row.id,
        table_id: tableIdCounter,
        source_field: row.source_field_name || '',
        source_type: row.source_field_type || '',
        target_field: row.target_field_name || '',
        target_type: row.target_field_type || '',
        // Always fill target_value from target_field_value (priority) or target_value
        target_value: row.target_field_value || row.target_value || '',
        is_primary_key: row.is_id === 1 || row.is_primary_key === true,
        row_order: row.row_num || index + 1,
        _changeStatus: 'unchanged' as FieldChangeStatus, // Mark as unchanged when loading
      }))
      .sort((a, b) => a.row_order - b.row_order); // Sort by row_order
    
    loadedFields[tableIdCounter] = tableFields;
    tableIdCounter++;
  });

  return { tables: loadedTables, fields: loadedFields };
};

/**
 * @deprecated Используйте loadAndNormalizeToIndexedDB вместо этого
 * Старая функция для обратной совместимости
 */
export const loadTablesFromAPI = async (truetlDatabaseId: string): Promise<any> => {
  // Load tables via API
  const loadedTablesData = await apiService.getTruETLDMSTables(truetlDatabaseId);
  
  return normalizeDataset(loadedTablesData);
};

