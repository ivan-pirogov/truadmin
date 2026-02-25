/**
 * DDL Parser for MySQL CREATE TABLE statements
 * Parses DDL and extracts table name and column definitions
 */

export interface ParsedColumn {
  name: string;
  type: string;
  nullable: boolean;
  defaultValue: string | null;
  isPrimaryKey: boolean;
  isAutoIncrement: boolean;
  isUnique: boolean;
}

export interface ParsedDDL {
  tableName: string;
  columns: ParsedColumn[];
  primaryKeys: string[];
  uniqueKeys: string[];
}

/**
 * Removes comments from DDL (both -- and /* style)
 */
function removeComments(ddl: string): string {
  // Remove -- style comments
  let cleaned = ddl.replace(/--.*$/gm, '');
  
  // Remove /* */ style comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  
  return cleaned;
}

/**
 * Normalizes whitespace in DDL
 */
function normalizeWhitespace(ddl: string): string {
  return ddl.replace(/\s+/g, ' ').trim();
}

/**
 * Extracts table name from CREATE TABLE statement
 */
function extractTableName(ddl: string): string {
  // Match CREATE TABLE `table_name` or CREATE TABLE table_name
  const match = ddl.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`'"]?(\w+)[`'"]?/i);
  if (match && match[1]) {
    return match[1];
  }
  return '';
}

/**
 * Extracts column definitions from CREATE TABLE statement
 */
function extractColumns(ddl: string): ParsedColumn[] {
  const columns: ParsedColumn[] = [];
  
  // Find the column definition section (between first ( and matching closing ))
  const openParen = ddl.indexOf('(');
  if (openParen === -1) return columns;
  
  // Find matching closing parenthesis
  let depth = 0;
  let closeParen = -1;
  for (let i = openParen; i < ddl.length; i++) {
    if (ddl[i] === '(') depth++;
    if (ddl[i] === ')') {
      depth--;
      if (depth === 0) {
        closeParen = i;
        break;
      }
    }
  }
  
  if (closeParen === -1) return columns;
  
  // Extract column definitions section
  const columnSection = ddl.substring(openParen + 1, closeParen);
  
  // Split by commas, but be careful with nested parentheses (for function calls, etc.)
  const columnDefs: string[] = [];
  let current = '';
  let parenDepth = 0;
  
  for (let i = 0; i < columnSection.length; i++) {
    const char = columnSection[i];
    
    if (char === '(') {
      parenDepth++;
      current += char;
    } else if (char === ')') {
      parenDepth--;
      current += char;
    } else if (char === ',' && parenDepth === 0) {
      columnDefs.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    columnDefs.push(current.trim());
  }
  
  // Parse each column definition
  for (const def of columnDefs) {
    const trimmed = def.trim();
    
    // Skip if it's a constraint (PRIMARY KEY, UNIQUE KEY, etc.)
    if (trimmed.match(/^(PRIMARY\s+KEY|UNIQUE\s+KEY|KEY|INDEX|CONSTRAINT|FOREIGN\s+KEY)/i)) {
      continue;
    }
    
    const column = parseColumnDefinition(trimmed);
    if (column) {
      columns.push(column);
    }
  }
  
  return columns;
}

/**
 * Parses a single column definition
 * Example: `id` bigint(20) unsigned NOT NULL AUTO_INCREMENT
 */
function parseColumnDefinition(def: string): ParsedColumn | null {
  const trimmed = def.trim();
  if (!trimmed) return null;
  
  // Extract column name (may be in backticks, quotes, or plain)
  const nameMatch = trimmed.match(/^[`'"]?(\w+)[`'"]?\s+/);
  if (!nameMatch) return null;
  
  const name = nameMatch[1];
  const rest = trimmed.substring(nameMatch[0].length).trim();
  
  // Extract type
  // Match type with optional parameters: varchar(255), bigint(20), etc.
  const typeMatch = rest.match(/^(\w+(?:\([^)]+\))?(?:\s+\w+)?)/i);
  if (!typeMatch) return null;
  
  let type = typeMatch[1];
  let remaining = rest.substring(typeMatch[0].length).trim();
  
  // Check for modifiers
  const isUnsigned = /\bunsigned\b/i.test(remaining);
  if (isUnsigned) {
    type = `${type} unsigned`;
    remaining = remaining.replace(/\bunsigned\b/gi, '').trim();
  }
  
  // Check for nullable
  const isNotNull = /\bNOT\s+NULL\b/i.test(remaining);
  const nullable = !isNotNull;
  remaining = remaining.replace(/\bNOT\s+NULL\b/gi, '').trim();
  
  // Check for AUTO_INCREMENT
  const isAutoIncrement = /\bAUTO_INCREMENT\b/i.test(remaining);
  remaining = remaining.replace(/\bAUTO_INCREMENT\b/gi, '').trim();
  
  // Check for DEFAULT value
  let defaultValue: string | null = null;
  const defaultMatch = remaining.match(/\bDEFAULT\s+((?:'[^']*'|"[^"]*"|\w+|\d+))/i);
  if (defaultMatch) {
    defaultValue = defaultMatch[1].replace(/^['"]|['"]$/g, '');
    remaining = remaining.replace(/\bDEFAULT\s+((?:'[^']*'|"[^"]*"|\w+|\d+))/i, '').trim();
  }
  
  // Check for UNIQUE
  const isUnique = /\bUNIQUE\b/i.test(remaining);
  remaining = remaining.replace(/\bUNIQUE\b/gi, '').trim();
  
  return {
    name,
    type,
    nullable,
    defaultValue,
    isPrimaryKey: false, // Will be set later from PRIMARY KEY constraint
    isAutoIncrement,
    isUnique,
  };
}

/**
 * Extracts PRIMARY KEY constraints
 */
function extractPrimaryKeys(ddl: string): string[] {
  const keys: string[] = [];
  
  // Match PRIMARY KEY (`column_name`) or PRIMARY KEY (column_name)
  const primaryKeyMatch = ddl.match(/PRIMARY\s+KEY\s*\([^)]+\)/i);
  if (primaryKeyMatch) {
    const keyDef = primaryKeyMatch[0];
    const columnMatch = keyDef.match(/\([`'"]?(\w+)[`'"]?\)/);
    if (columnMatch) {
      keys.push(columnMatch[1]);
    } else {
      // Multiple columns: PRIMARY KEY (`col1`, `col2`)
      const columnsMatch = keyDef.match(/\(([^)]+)\)/);
      if (columnsMatch) {
        const columns = columnsMatch[1].split(',').map(col => {
          const match = col.match(/[`'"]?(\w+)[`'"]?/);
          return match ? match[1] : col.trim();
        });
        keys.push(...columns);
      }
    }
  }
  
  return keys;
}

/**
 * Extracts UNIQUE KEY constraints
 */
function extractUniqueKeys(ddl: string): string[] {
  const keys: string[] = [];
  
  // Match UNIQUE KEY `key_name` (`column_name`) or UNIQUE (`column_name`)
  const uniqueKeyMatches = ddl.matchAll(/UNIQUE\s+(?:KEY\s+[`'"]?\w+[`'"]?\s+)?\([^)]+\)/gi);
  
  for (const match of uniqueKeyMatches) {
    const keyDef = match[0];
    const columnMatch = keyDef.match(/\([`'"]?(\w+)[`'"]?\)/);
    if (columnMatch) {
      keys.push(columnMatch[1]);
    } else {
      // Multiple columns
      const columnsMatch = keyDef.match(/\(([^)]+)\)/);
      if (columnsMatch) {
        const columns = columnsMatch[1].split(',').map(col => {
          const match = col.match(/[`'"]?(\w+)[`'"]?/);
          return match ? match[1] : col.trim();
        });
        keys.push(...columns);
      }
    }
  }
  
  return keys;
}

/**
 * Parses a MySQL CREATE TABLE DDL statement
 * @param ddl - The DDL string to parse
 * @returns Parsed DDL with table name and columns
 */
export function parseDDL(ddl: string): ParsedDDL {
  if (!ddl || !ddl.trim()) {
    throw new Error('DDL string is empty');
  }
  
  // Remove comments and normalize
  let cleaned = removeComments(ddl);
  cleaned = normalizeWhitespace(cleaned);
  
  // Check if it's a CREATE TABLE statement
  if (!cleaned.match(/CREATE\s+TABLE/i)) {
    throw new Error('Not a CREATE TABLE statement');
  }
  
  // Extract table name
  const tableName = extractTableName(cleaned);
  if (!tableName) {
    throw new Error('Could not extract table name from DDL');
  }
  
  // Extract columns
  const columns = extractColumns(cleaned);
  
  // Extract primary keys
  const primaryKeys = extractPrimaryKeys(cleaned);
  
  // Extract unique keys
  const uniqueKeys = extractUniqueKeys(cleaned);
  
  // Mark primary key columns
  columns.forEach(col => {
    if (primaryKeys.includes(col.name)) {
      col.isPrimaryKey = true;
    }
    if (uniqueKeys.includes(col.name)) {
      col.isUnique = true;
    }
  });
  
  return {
    tableName,
    columns,
    primaryKeys,
    uniqueKeys,
  };
}

