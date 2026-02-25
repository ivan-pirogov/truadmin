import { FieldChangeStatus } from './FieldEditModal';

export interface DMSTable {
  id?: number;
  service_name: string;
  source_db_type: string;
  source_db_name: string;
  source_schema: string;
  source_table: string;
  target_db_type: string;
  target_db_name: string;
  target_schema: string;
  target_table: string;
  [key: string]: any;
}

export interface Service {
  id?: number; // ID из IndexedDB для каскадной загрузки
  name: string;
  target_db_type: string;
  databases_count: number;
  status?: 'unchanged' | 'updated' | 'deleted' | 'added'; // Для визуализации изменений
}

export interface SourceDatabase {
  name: string;
  source_schema: string;
  type: string;
  target_database: string;
  target_schema: string;
  status?: 'unchanged' | 'updated' | 'deleted' | 'added'; // Для визуализации изменений
}

export interface TableMapping {
  source_table: string;
  target_table: string;
  fields_count: number;
  status?: 'unchanged' | 'updated' | 'deleted' | 'added'; // Для визуализации изменений
}

// IndexedDB Types
export interface IndexedDBService {
  id?: number;
  service_name_original: string;
  service_name: string;
  target_db_type: string;
  qty_dbs: number;
  status: 'unchanged' | 'updated' | 'deleted' | 'added';
}

export interface IndexedDBDatabase {
  id?: number;
  service_id: number;
  source_db_name_original: string;
  source_db_name: string;
  source_schema_name: string;
  target_db_name: string;
  target_schema_name: string;
  source_db_type: string;
  qty_tables: number;
  status: 'unchanged' | 'updated' | 'deleted' | 'added';
}

export interface IndexedDBTable {
  id?: number;
  database_id: number;
  source_table_name_original: string;
  source_table_name: string;
  target_table_name: string;
  qty_fields: number;
  status: 'unchanged' | 'updated' | 'deleted' | 'added';
}

export interface IndexedDBField {
  id: number;
  table_id: number;
  source_field_name: string;
  source_field_type: string;
  target_field_name: string;
  target_field_type: string;
  target_field_value: string;
  is_id: number;
  row_num: number;
  status: 'unchanged' | 'updated' | 'deleted' | 'added';
}

