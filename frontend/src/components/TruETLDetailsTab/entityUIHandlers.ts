/**
 * UI handlers for entity operations (services, databases, tables)
 * These handlers manage UI state and call business logic handlers
 */

import {
  deleteService,
  deleteDatabase,
  deleteTable,
} from './entityHandlers';
import { loadServices, loadDatabases, loadTables } from './indexedDBLoader';

export interface EntityDeleteState {
  type: 'service' | 'database' | 'table';
  id: number;
  name: string;
}

export interface EntityUIHandlers {
  handleAddService: () => void;
  handleEditService: () => void;
  handleDeleteService: () => void;
  handleAddDatabase: () => void;
  handleEditDatabase: () => void;
  handleDeleteDatabase: () => void;
  handleAddTable: () => void;
  handleEditTable: () => void;
  handleDeleteTable: () => void;
  confirmDeleteEntity: () => Promise<void>;
}

export function createEntityUIHandlers(
  // State setters
  setEntityEditMode: (mode: 'add' | 'edit') => void,
  setShowServiceEditModal: (show: boolean) => void,
  setShowDatabaseEditModal: (show: boolean) => void,
  setShowTableEditModal: (show: boolean) => void,
  setEntityToDelete: (entity: EntityDeleteState | null) => void,
  setShowDeleteEntityConfirm: (show: boolean) => void,
  setAlertMessage: (message: string) => void,
  setShowErrorAlert: (show: boolean) => void,
  setLoading: (loading: boolean) => void,
  setShowSuccessAlert: (show: boolean) => void,
  setError: (error: string | null) => void,
  
  // Selected IDs
  selectedServiceId: number | null,
  selectedServiceName: string | null,
  selectedDatabaseId: number | null,
  selectedDatabaseName: string | null,
  selectedTableId: number | null,
  selectedTableName: string | null,
  
  // State setters for clearing selections
  setSelectedServiceId: (id: number | null) => void,
  setSelectedServiceName: (name: string | null) => void,
  setSelectedDatabaseId: (id: number | null) => void,
  setSelectedDatabaseName: (name: string | null) => void,
  setSelectedTableId: (id: number | null) => void,
  setSelectedTableName: (name: string | null) => void,
  setSelectedTableFull: (table: any | null) => void,
  setSelectedFields: (fields: any[]) => void,
  setDatabases: (databases: any[]) => void,
  setTables: (tables: any[]) => void,
  setFields: (fields: any[]) => void,
  setServices: (services: any[]) => void,
  
  // Entity to delete
  entityToDelete: EntityDeleteState | null
): EntityUIHandlers {
  const handleAddService = () => {
    setEntityEditMode('add');
    setShowServiceEditModal(true);
  };

  const handleEditService = () => {
    if (!selectedServiceId) return;
    setEntityEditMode('edit');
    setShowServiceEditModal(true);
  };

  const handleDeleteService = () => {
    if (!selectedServiceId || !selectedServiceName) return;
    setEntityToDelete({
      type: 'service',
      id: selectedServiceId,
      name: selectedServiceName,
    });
    setShowDeleteEntityConfirm(true);
  };

  const handleAddDatabase = () => {
    if (!selectedServiceId) {
      setAlertMessage('Please select a service first');
      setShowErrorAlert(true);
      return;
    }
    setEntityEditMode('add');
    setShowDatabaseEditModal(true);
  };

  const handleEditDatabase = () => {
    if (!selectedDatabaseId) return;
    setEntityEditMode('edit');
    setShowDatabaseEditModal(true);
  };

  const handleDeleteDatabase = () => {
    if (!selectedDatabaseId || !selectedDatabaseName) return;
    setEntityToDelete({
      type: 'database',
      id: selectedDatabaseId,
      name: selectedDatabaseName,
    });
    setShowDeleteEntityConfirm(true);
  };

  const handleAddTable = () => {
    if (!selectedDatabaseId) {
      setAlertMessage('Please select a database first');
      setShowErrorAlert(true);
      return;
    }
    setEntityEditMode('add');
    setShowTableEditModal(true);
  };

  const handleEditTable = () => {
    if (!selectedTableId) return;
    setEntityEditMode('edit');
    setShowTableEditModal(true);
  };

  const handleDeleteTable = () => {
    if (!selectedTableId || !selectedTableName) return;
    setEntityToDelete({
      type: 'table',
      id: selectedTableId,
      name: selectedTableName,
    });
    setShowDeleteEntityConfirm(true);
  };

  const confirmDeleteEntity = async () => {
    if (!entityToDelete) return;

    try {
      setLoading(true);
      
      if (entityToDelete.type === 'service') {
        await deleteService(entityToDelete.id);
        // Clear all dependent data
        setSelectedServiceId(null);
        setSelectedServiceName(null);
        setSelectedDatabaseId(null);
        setSelectedDatabaseName(null);
        setSelectedTableId(null);
        setSelectedTableName(null);
        setSelectedTableFull(null);
        setSelectedFields([]);
        setDatabases([]);
        setTables([]);
        setFields([]);
        // Reload services
        const reloadedServices = await loadServices();
        setServices(reloadedServices);
      } else if (entityToDelete.type === 'database') {
        await deleteDatabase(entityToDelete.id);
        // Clear dependent data
        setSelectedDatabaseId(null);
        setSelectedDatabaseName(null);
        setSelectedTableId(null);
        setSelectedTableName(null);
        setSelectedTableFull(null);
        setSelectedFields([]);
        setTables([]);
        setFields([]);
        // Reload databases
        if (selectedServiceId) {
          const reloadedDatabases = await loadDatabases(selectedServiceId);
          setDatabases(reloadedDatabases);
        }
      } else if (entityToDelete.type === 'table') {
        await deleteTable(entityToDelete.id);
        // Clear dependent data
        setSelectedTableId(null);
        setSelectedTableName(null);
        setSelectedTableFull(null);
        setSelectedFields([]);
        setFields([]);
        // Reload tables
        if (selectedDatabaseId) {
          const reloadedTables = await loadTables(selectedDatabaseId);
          setTables(reloadedTables);
        }
      }

      setShowDeleteEntityConfirm(false);
      setEntityToDelete(null);
      setAlertMessage(`${entityToDelete.type} deleted successfully`);
      setShowSuccessAlert(true);
    } catch (err: any) {
      setError(err.message || 'Failed to delete');
      setAlertMessage(err.message || 'Failed to delete');
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  return {
    handleAddService,
    handleEditService,
    handleDeleteService,
    handleAddDatabase,
    handleEditDatabase,
    handleDeleteDatabase,
    handleAddTable,
    handleEditTable,
    handleDeleteTable,
    confirmDeleteEntity,
  };
}

