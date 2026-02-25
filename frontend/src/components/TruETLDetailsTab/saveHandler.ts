/**
 * Handles saving all changes to server
 */

import { collectAllChanges, AllChanges } from './collectChanges';
import { validateBeforeSave } from './validationService';
import { apiService } from '../../services/api';
import { indexedDBService } from './indexedDBService';
import { loadAndNormalizeToIndexedDB } from './dataLoader';
import { loadServices, loadDatabases, loadTables, loadFields } from './indexedDBLoader';

export interface SaveHandlerCallbacks {
  setLoading: (loading: boolean) => void;
  setLoadingProgress: (progress: string) => void;
  setAlertMessage: (message: string) => void;
  setShowErrorAlert: (show: boolean) => void;
  setShowSuccessAlert: (show: boolean) => void;
  setError: (error: string | null) => void;
  setServices: (services: any[]) => void;
  setDatabases: (databases: any[]) => void;
  setTables: (tables: any[]) => void;
  setFields: (fields: any[]) => void;
  setSelectedFields: (fields: any[]) => void;
  setOriginalFields: (fields: any[]) => void;
}

export interface SaveHandlerParams {
  truetlDatabaseId: string;
  selectedServiceId: number | null;
  selectedDatabaseId: number | null;
  selectedTableId: number | null;
  callbacks: SaveHandlerCallbacks;
}

/**
 * Main save handler - saves all changes to server
 */
export async function handleSaveToServer(params: SaveHandlerParams): Promise<void> {
  const { truetlDatabaseId, selectedServiceId, selectedDatabaseId, selectedTableId, callbacks } = params;
  const {
    setLoading,
    setLoadingProgress,
    setAlertMessage,
    setShowErrorAlert,
    setShowSuccessAlert,
    setError,
    setServices,
    setDatabases,
    setTables,
    setFields,
    setSelectedFields,
    setOriginalFields,
  } = callbacks;

  try {
    setLoading(true);
    
    // Validate entire data structure before saving
    const validationResult = await validateBeforeSave();
    if (!validationResult.isValid) {
      const errorMessage = validationResult.errors.join('\n');
      setAlertMessage(errorMessage);
      setShowErrorAlert(true);
      setLoading(false);
      return;
    }
    
    // Collect all changes from IndexedDB
    const allChanges = await collectAllChanges();
    
    // Check if there are any changes
    const hasChanges = 
      allChanges.services.deleted.length > 0 ||
      allChanges.services.updated.length > 0 ||
      allChanges.databases.deleted.length > 0 ||
      allChanges.databases.updated.length > 0 ||
      allChanges.tables.deleted.length > 0 ||
      allChanges.tables.updated.length > 0 ||
      allChanges.fields.deleted.length > 0 ||
      allChanges.fields.updated.length > 0 ||
      allChanges.fields.added.length > 0;

    if (!hasChanges) {
      setAlertMessage('No changes to save');
      setShowSuccessAlert(true);
      setLoading(false);
      return;
    }


    // Send all changes to API
    await apiService.saveAllTruETLChanges(truetlDatabaseId, allChanges);
    
    // Reload data from server to get updated IDs for added fields and sync with server state
    // This will clear IndexedDB and load fresh data from server (normalizeAndSaveDataset does this)
    setLoadingProgress('Reloading data from server...');
    await loadAndNormalizeToIndexedDB(truetlDatabaseId);
    
    // Reload all data from IndexedDB to sync
    const reloadedServices = await loadServices();
    setServices(reloadedServices);
    
    if (selectedServiceId) {
      const reloadedDatabases = await loadDatabases(selectedServiceId);
      setDatabases(reloadedDatabases);
      
      if (selectedDatabaseId) {
        const reloadedTables = await loadTables(selectedDatabaseId);
        setTables(reloadedTables);
        
        if (selectedTableId) {
          const reloadedFields = await loadFields(selectedTableId);
          setFields(reloadedFields);
          setSelectedFields(reloadedFields);
          setOriginalFields([...reloadedFields]);
        }
      }
    }
    
    const totalChanges = 
      allChanges.services.deleted.length + allChanges.services.updated.length +
      allChanges.databases.deleted.length + allChanges.databases.updated.length +
      allChanges.tables.deleted.length + allChanges.tables.updated.length +
      allChanges.fields.deleted.length + allChanges.fields.updated.length + allChanges.fields.added.length;
    
    setAlertMessage(`Successfully saved ${totalChanges} change(s) to server!`);
    setShowSuccessAlert(true);
  } catch (err: any) {
    setError(err.message || 'Failed to save changes');
    setAlertMessage(err.message || 'Failed to save changes');
    setShowErrorAlert(true);
  } finally {
    setLoading(false);
  }
}

/**
 * Helper function to update IndexedDB after successful save
 */
async function updateIndexedDBAfterSave(changes: AllChanges): Promise<void> {
  // Update services: set status to 'unchanged' and update _original fields
  for (const service of changes.services.updated) {
    const allServices = await indexedDBService.getAllServices();
    const serviceRecord = allServices.find(s => s.service_name_original === service.service_name_original);
    if (serviceRecord && serviceRecord.id) {
      await indexedDBService.updateService(serviceRecord.id, {
        status: 'unchanged',
        service_name_original: service.service_name, // Update original to new value
      });
    }
  }

  // Update databases: set status to 'unchanged' and update _original fields
  for (const database of changes.databases.updated) {
    const allServices = await indexedDBService.getAllServices();
    for (const service of allServices) {
      if (service.id) {
        const databases = await indexedDBService.getDatabasesByServiceId(service.id);
        const databaseRecord = databases.find(d => d.source_db_name_original === database.source_db_name_original);
        if (databaseRecord && databaseRecord.id) {
          await indexedDBService.updateDatabase(databaseRecord.id, {
            status: 'unchanged',
            source_db_name_original: database.source_db_name, // Update original to new value
          });
        }
      }
    }
  }

  // Update tables: set status to 'unchanged' and update _original fields
  for (const table of changes.tables.updated) {
    const allServices = await indexedDBService.getAllServices();
    for (const service of allServices) {
      if (service.id) {
        const databases = await indexedDBService.getDatabasesByServiceId(service.id);
        for (const database of databases) {
          if (database.id) {
            const tables = await indexedDBService.getTablesByDatabaseId(database.id);
            const tableRecord = tables.find(t => t.source_table_name_original === table.source_table_name_original);
            if (tableRecord && tableRecord.id) {
              await indexedDBService.updateTable(tableRecord.id, {
                status: 'unchanged',
                source_table_name_original: table.source_table_name, // Update original to new value
              });
            }
          }
        }
      }
    }
  }

  // Update fields: set status to 'unchanged'
  for (const field of changes.fields.updated) {
    await indexedDBService.updateField(field.id, {
      status: 'unchanged',
    });
  }

  // Update added fields: set status to 'unchanged'
  // Note: We need to find added fields by their table_id and field data
  // Since we don't have server IDs yet, we'll update by matching field data
  for (const addedField of changes.fields.added) {
    // Find the field in IndexedDB by matching table and field data
    const allServices = await indexedDBService.getAllServices();
    for (const service of allServices) {
      if (service.service_name === addedField.service_name && service.id) {
        const databases = await indexedDBService.getDatabasesByServiceId(service.id);
        const database = databases.find(d => d.source_db_name === addedField.source_db_name);
        if (database && database.id) {
          const tables = await indexedDBService.getTablesByDatabaseId(database.id);
          const table = tables.find(t => t.source_table_name === addedField.source_table_name);
          if (table && table.id) {
            const fields = await indexedDBService.getFieldsByTableId(table.id);
            const field = fields.find(f => 
              f.status === 'added' &&
              f.source_field_name === addedField.source_field_name &&
              f.target_field_name === addedField.target_field_name
            );
            if (field && field.id) {
              await indexedDBService.updateField(field.id, {
                status: 'unchanged',
              });
            }
          }
        }
      }
    }
  }
}

