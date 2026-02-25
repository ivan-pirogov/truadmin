import { DMSTable } from './types';
import { DMSField, FieldChangeStatus } from './FieldEditModal';

export interface SelectionState {
  selectedService: string | null;
  selectedSourceDb: string | null;
  selectedTable: DMSTable | null;
  selectedFields: DMSField[];
}

/**
 * Обработчик выбора сервиса
 */
export const handleServiceSelect = (
  serviceName: string,
  setSelectedService: (value: string | null) => void,
  setSelectedSourceDb: (value: string | null) => void,
  setSelectedTable: (value: DMSTable | null) => void,
  setSelectedFields: (value: DMSField[]) => void
) => {
  setSelectedService(serviceName);
  setSelectedSourceDb(null);
  setSelectedTable(null);
  setSelectedFields([]);
};

/**
 * Обработчик выбора базы данных
 */
export const handleSourceDbSelect = (
  dbName: string,
  setSelectedSourceDb: (value: string | null) => void,
  setSelectedTable: (value: DMSTable | null) => void,
  setSelectedFields: (value: DMSField[]) => void
) => {
  setSelectedSourceDb(dbName);
  setSelectedTable(null);
  setSelectedFields([]);
};

/**
 * Обработчик выбора таблицы
 */
export const handleTableSelect = (
  tableName: string,
  tables: DMSTable[],
  fields: Record<number, DMSField[]>,
  selectedService: string | null,
  selectedSourceDb: string | null,
  setSelectedTable: (value: DMSTable | null) => void,
  setSelectedFields: (value: DMSField[]) => void,
  setOriginalFields: (value: DMSField[]) => void
) => {
  const table = tables.find(
    (t) =>
      t.service_name === selectedService &&
      t.source_db_name === selectedSourceDb &&
      t.source_table === tableName
  );
  
  if (table) {
    console.log('🔍 Table selected:', {
      tableName,
      tableId: table.id,
      hasFields: table.id ? !!fields[table.id] : false,
      fieldsCount: table.id ? (fields[table.id]?.length || 0) : 0,
      allFieldsKeys: Object.keys(fields)
    });
    
    setSelectedTable(table);
    const tableFields = table.id ? (fields[table.id] || []) : [];
    
    // Mark all fields as unchanged when loading
    const fieldsWithStatus = tableFields.map(f => ({
      ...f,
      _changeStatus: 'unchanged' as FieldChangeStatus
    }));
    
    setSelectedFields(fieldsWithStatus);
    setOriginalFields([...fieldsWithStatus]); // Save original for revert
  } else {
    console.warn('⚠️ Table not found:', tableName);
  }
};

