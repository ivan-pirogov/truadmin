import { DMSTable } from './types';
import { DMSField, FieldChangeStatus } from './FieldEditModal';

/**
 * Добавление нового поля
 */
export const addField = (
  fieldData: Partial<DMSField>,
  selectedTable: DMSTable,
  selectedFields: DMSField[]
): DMSField => {
  const maxRowOrder = selectedFields.length > 0
    ? Math.max(...selectedFields.map(f => f.row_order || 0))
    : 0;
  
  return {
    ...fieldData,
    id: Date.now(), // Temporary ID
    table_id: selectedTable.id!,
    row_order: fieldData.row_order || maxRowOrder + 1,
    _changeStatus: 'added' as FieldChangeStatus,
  } as DMSField;
};

/**
 * Обновление существующего поля
 */
export const updateField = (
  field: DMSField,
  fieldData: Partial<DMSField>,
  selectedFields: DMSField[]
): DMSField[] => {
  return selectedFields.map((f) => {
    if (f.id === field.id) {
      // Check if field was actually modified
      const wasModified = 
        f.source_field !== fieldData.source_field ||
        f.source_type !== fieldData.source_type ||
        f.target_field !== fieldData.target_field ||
        f.target_type !== fieldData.target_type ||
        f.target_value !== fieldData.target_value ||
        f.is_primary_key !== fieldData.is_primary_key ||
        f.row_order !== fieldData.row_order;
      
      return {
        ...f,
        ...fieldData,
        _changeStatus: wasModified 
          ? (f._changeStatus === 'added' ? 'added' : 'modified') 
          : f._changeStatus,
      };
    }
    return f;
  });
};

/**
 * Удаление поля (помечает как deleted или удаляет полностью)
 */
export const deleteField = (
  field: DMSField,
  selectedFields: DMSField[]
): DMSField[] => {
  // If field was just added (not saved yet), remove it completely
  // Otherwise mark as deleted
  if (field._changeStatus === 'added') {
    return selectedFields.filter((f) => f.id !== field.id);
  } else {
    // Mark as deleted instead of removing
    return selectedFields.map((f) =>
      f.id === field.id
        ? { ...f, _changeStatus: 'deleted' as FieldChangeStatus }
        : f
    );
  }
};

/**
 * Перемещение поля вверх или вниз
 */
export const moveField = (
  field: DMSField,
  direction: 'up' | 'down',
  selectedFields: DMSField[]
): DMSField[] => {
  // Filter out deleted fields for movement
  const visibleFields = selectedFields.filter(f => f._changeStatus !== 'deleted');
  const currentIndex = visibleFields.findIndex((f) => f.id === field.id);
  if (currentIndex === -1) return selectedFields;

  const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
  if (newIndex < 0 || newIndex >= visibleFields.length) return selectedFields;

  // Save original row_order values before swapping
  const originalRowOrders = new Map<number | undefined, number>();
  visibleFields.forEach(f => {
    originalRowOrders.set(f.id, f.row_order || 0);
  });

  // Create a copy and swap the two fields
  const updatedVisibleFields = visibleFields.map(f => ({ ...f }));
  const swappedField1 = updatedVisibleFields[currentIndex];
  const swappedField2 = updatedVisibleFields[newIndex];
  
  // Swap the two fields
  updatedVisibleFields[currentIndex] = { ...swappedField2 };
  updatedVisibleFields[newIndex] = { ...swappedField1 };

  // Update row_order for all fields based on new positions
  updatedVisibleFields.forEach((f, idx) => {
    const newRowOrder = idx + 1;
    const originalRowOrder = originalRowOrders.get(f.id) || 0;
    
    // Update row_order
    f.row_order = newRowOrder;
    
    // Mark as modified only if row_order actually changed
    // and field wasn't just added (added fields stay as added)
    if (newRowOrder !== originalRowOrder) {
      // Only change status if it was unchanged, otherwise preserve existing status
      if (f._changeStatus === 'unchanged' || !f._changeStatus) {
        f._changeStatus = 'modified';
      }
      // If field was already 'added' or 'modified', keep that status
    }
  });

  // Merge back with deleted fields
  const deletedFields = selectedFields.filter(f => f._changeStatus === 'deleted');
  return [...updatedVisibleFields, ...deletedFields].sort(
    (a, b) => (a.row_order || 0) - (b.row_order || 0)
  );
};

/**
 * Проверка наличия изменений
 */
export const hasChanges = (selectedFields: DMSField[]): boolean => {
  return selectedFields.some(
    field => field._changeStatus && field._changeStatus !== 'unchanged'
  );
};

