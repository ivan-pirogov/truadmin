/**
 * Type mapping utilities for converting source database types to target database types
 */

export type TargetDbType = 'snowflake' | 'mysql' | 'postgresql' | 'postgres';

/**
 * Maps MySQL source types to target database types
 */
const typeMappings: Record<TargetDbType, Record<string, string>> = {
  snowflake: {
    // Integer types
    'int': 'NUMBER(10)',
    'integer': 'NUMBER(10)',
    'tinyint': 'NUMBER(3)',
    'smallint': 'NUMBER(5)',
    'mediumint': 'NUMBER(7)',
    'bigint': 'NUMBER(38)',
    'bigint(20)': 'NUMBER(38)',
    'bigint(20) unsigned': 'NUMBER(38)',
    
    // Decimal types
    'decimal': 'NUMBER(18,2)',
    'numeric': 'NUMBER(18,2)',
    'float': 'FLOAT',
    'double': 'DOUBLE PRECISION',
    'real': 'FLOAT',
    
    // String types
    'char': 'VARCHAR',
    'varchar': 'VARCHAR',
    'varchar(255)': 'VARCHAR(255)',
    'varchar(100)': 'VARCHAR(100)',
    'text': 'STRING',
    'tinytext': 'STRING',
    'mediumtext': 'STRING',
    'longtext': 'STRING',
    
    // Binary types
    'binary': 'BINARY',
    'varbinary': 'BINARY',
    'blob': 'BINARY',
    'tinyblob': 'BINARY',
    'mediumblob': 'BINARY',
    'longblob': 'BINARY',
    
    // Date/Time types
    'date': 'DATE',
    'time': 'TIME',
    'datetime': 'TIMESTAMP_NTZ',
    'timestamp': 'TIMESTAMP_NTZ',
    'year': 'NUMBER(4)',
    
    // Boolean
    'boolean': 'BOOLEAN',
    'bool': 'BOOLEAN',
    
    // JSON
    'json': 'VARIANT',
  },
  
  mysql: {
    // Integer types - keep as is
    'int': 'int',
    'integer': 'int',
    'tinyint': 'tinyint',
    'smallint': 'smallint',
    'mediumint': 'mediumint',
    'bigint': 'bigint',
    'bigint(20)': 'bigint(20)',
    'bigint(20) unsigned': 'bigint(20) unsigned',
    
    // Decimal types
    'decimal': 'decimal(10,2)',
    'numeric': 'numeric(10,2)',
    'float': 'float',
    'double': 'double',
    'real': 'real',
    
    // String types
    'char': 'char',
    'varchar': 'varchar',
    'varchar(255)': 'varchar(255)',
    'varchar(100)': 'varchar(100)',
    'text': 'text',
    'tinytext': 'tinytext',
    'mediumtext': 'mediumtext',
    'longtext': 'longtext',
    
    // Binary types
    'binary': 'binary',
    'varbinary': 'varbinary',
    'blob': 'blob',
    'tinyblob': 'tinyblob',
    'mediumblob': 'mediumblob',
    'longblob': 'longblob',
    
    // Date/Time types
    'date': 'date',
    'time': 'time',
    'datetime': 'datetime',
    'timestamp': 'timestamp',
    'year': 'year',
    
    // Boolean
    'boolean': 'boolean',
    'bool': 'bool',
    
    // JSON
    'json': 'json',
  },
  
  postgresql: {
    // Integer types
    'int': 'integer',
    'integer': 'integer',
    'tinyint': 'smallint',
    'smallint': 'smallint',
    'mediumint': 'integer',
    'bigint': 'bigint',
    'bigint(20)': 'bigint',
    'bigint(20) unsigned': 'bigint',
    
    // Decimal types
    'decimal': 'numeric',
    'numeric': 'numeric',
    'float': 'real',
    'double': 'double precision',
    'real': 'real',
    
    // String types
    'char': 'char',
    'varchar': 'varchar',
    'varchar(255)': 'varchar(255)',
    'varchar(100)': 'varchar(100)',
    'text': 'text',
    'tinytext': 'text',
    'mediumtext': 'text',
    'longtext': 'text',
    
    // Binary types
    'binary': 'bytea',
    'varbinary': 'bytea',
    'blob': 'bytea',
    'tinyblob': 'bytea',
    'mediumblob': 'bytea',
    'longblob': 'bytea',
    
    // Date/Time types
    'date': 'date',
    'time': 'time',
    'datetime': 'timestamp',
    'timestamp': 'timestamp',
    'year': 'integer',
    
    // Boolean
    'boolean': 'boolean',
    'bool': 'boolean',
    
    // JSON
    'json': 'jsonb',
  },
  
  postgres: {
    // Alias for postgresql
    'int': 'integer',
    'integer': 'integer',
    'tinyint': 'smallint',
    'smallint': 'smallint',
    'mediumint': 'integer',
    'bigint': 'bigint',
    'bigint(20)': 'bigint',
    'bigint(20) unsigned': 'bigint',
    'decimal': 'numeric',
    'numeric': 'numeric',
    'float': 'real',
    'double': 'double precision',
    'real': 'real',
    'char': 'char',
    'varchar': 'varchar',
    'varchar(255)': 'varchar(255)',
    'varchar(100)': 'varchar(100)',
    'text': 'text',
    'tinytext': 'text',
    'mediumtext': 'text',
    'longtext': 'text',
    'binary': 'bytea',
    'varbinary': 'bytea',
    'blob': 'bytea',
    'tinyblob': 'bytea',
    'mediumblob': 'bytea',
    'longblob': 'bytea',
    'date': 'date',
    'time': 'time',
    'datetime': 'timestamp',
    'timestamp': 'timestamp',
    'year': 'integer',
    'boolean': 'boolean',
    'bool': 'boolean',
    'json': 'jsonb',
  },
};

/**
 * Normalizes a MySQL type string to a key for lookup
 * Examples:
 * - "bigint(20) unsigned" -> "bigint(20) unsigned"
 * - "varchar(255)" -> "varchar(255)"
 * - "int" -> "int"
 */
function normalizeType(typeStr: string): string {
  if (!typeStr) return '';
  
  // Remove backticks and quotes
  let normalized = typeStr.trim().toLowerCase().replace(/[`'"]/g, '');
  
  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ');
  
  return normalized;
}

/**
 * Maps a MySQL source type to a target database type
 * @param sourceType - The source type (e.g., "bigint(20) unsigned", "varchar(255)")
 * @param targetDbType - The target database type (e.g., "snowflake", "mysql", "postgresql")
 * @returns The mapped target type, or the source type if no mapping found
 */
export function mapTypeToTarget(sourceType: string, targetDbType: string): string {
  if (!sourceType || !targetDbType) {
    return sourceType || '';
  }
  
  const normalizedSource = normalizeType(sourceType);
  const normalizedTarget = targetDbType.toLowerCase() as TargetDbType;
  
  // Check if we have a mapping for this target DB type
  const mapping = typeMappings[normalizedTarget];
  if (!mapping) {
    // If no mapping exists, return source type as-is
    return sourceType;
  }
  
  // Try exact match first
  if (mapping[normalizedSource]) {
    return mapping[normalizedSource];
  }
  
  // Try to match with parameter extraction (e.g., "varchar(255)" -> "varchar")
  const match = normalizedSource.match(/^(\w+)(\([^)]+\))?(\s+\w+)?/);
  if (match) {
    const baseType = match[1];
    const params = match[2] || '';
    const modifier = (match[3] || '').trim();
    
    // Try with full type including params
    const withParams = `${baseType}${params}${modifier ? ' ' + modifier : ''}`;
    if (mapping[withParams]) {
      return mapping[withParams];
    }
    
    // Try base type with modifier
    if (modifier) {
      const withModifier = `${baseType} ${modifier}`;
      if (mapping[withModifier]) {
        return mapping[withModifier];
      }
    }
    
    // Try just base type
    if (mapping[baseType]) {
      const mapped = mapping[baseType];
      // If source had params, try to preserve them
      if (params && mapped.includes('(')) {
        // Already has params, use as-is
        return mapped;
      } else if (params && !mapped.includes('(')) {
        // Add params to mapped type
        return `${mapped}${params}`;
      }
      return mapped;
    }
  }
  
  // No mapping found, return source type
  return sourceType;
}

/**
 * Gets all supported target database types
 */
export function getSupportedTargetDbTypes(): TargetDbType[] {
  return Object.keys(typeMappings) as TargetDbType[];
}

