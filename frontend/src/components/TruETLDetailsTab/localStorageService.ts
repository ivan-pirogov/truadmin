/**
 * Сервис для работы с localStorage (временное решение до полного перехода на IndexedDB)
 */

export const localStorageService = {
  /**
   * Загружает таблицы из localStorage
   */
  loadTables: (truetlDatabaseId: string): any[] | null => {
    const storageKey = `truetl_tables_${truetlDatabaseId}`;
    const cached = localStorage.getItem(storageKey);
    if (!cached) return null;

    try {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {
      console.error('❌ Error loading cached tables:', e);
    }
    return null;
  },

  /**
   * Загружает поля из localStorage
   */
  loadFields: (truetlDatabaseId: string): Record<number, any[]> | null => {
    const storageKey = `truetl_fields_${truetlDatabaseId}`;
    const cached = localStorage.getItem(storageKey);
    if (!cached) return null;

    try {
      return JSON.parse(cached);
    } catch (e) {
      console.error('Error loading cached fields:', e);
    }
    return null;
  },

  /**
   * Сохраняет таблицы в localStorage
   */
  saveTables: (truetlDatabaseId: string, tables: any[]): void => {
    const storageKey = `truetl_tables_${truetlDatabaseId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(tables));
    } catch (e) {
      console.error('Error saving tables to localStorage:', e);
    }
  },

  /**
   * Сохраняет поля в localStorage
   */
  saveFields: (truetlDatabaseId: string, fields: Record<number, any[]>): void => {
    const storageKey = `truetl_fields_${truetlDatabaseId}`;
    try {
      localStorage.setItem(storageKey, JSON.stringify(fields));
    } catch (e) {
      console.error('Error saving fields to localStorage:', e);
    }
  },
};

