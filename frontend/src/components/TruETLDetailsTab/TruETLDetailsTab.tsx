import React, { useState, useEffect, useCallback } from 'react';
import { FiRotateCcw, FiSave } from 'react-icons/fi';
import { TruETLDatabase } from '../../services/api';
import { ConfirmModal, AlertModal } from '../CustomModals';
import { DMSField, FieldChangeStatus } from './FieldEditModal';
import ServicePanel from './ServicePanel';
import DatabasePanel from './DatabasePanel';
import TablePanel from './TablePanel';
import MappingConfigPanel from './MappingConfigPanel';
import FieldMappingPanel from './FieldMappingPanel';
import ModalsContainer from './ModalsContainer';
import ServiceEditModal from './ServiceEditModal';
import DatabaseEditModal from './DatabaseEditModal';
import TableEditModal from './TableEditModal';
import { indexedDBService } from './indexedDBService';
import { loadAndNormalizeToIndexedDB } from './dataLoader';
import { loadServices, loadDatabases, loadTables, loadFields, getTableById } from './indexedDBLoader';
import { addField, updateField, deleteField, moveField } from './fieldHandlers';
import { handleSaveToServer } from './saveHandler';
import { createEntityUIHandlers, EntityDeleteState } from './entityUIHandlers';
import { addService, addDatabase, addTable, updateService, updateDatabase, updateTable } from './entityHandlers';
import { validateField } from './validationService';
import { Service, SourceDatabase, TableMapping } from './types';
import './TruETLDetailsTab.css';

interface TruETLDetailsTabProps {
  truetlDatabase: TruETLDatabase;
}

const TruETLDetailsTab: React.FC<TruETLDetailsTabProps> = ({ truetlDatabase }) => {
  const [loading, setLoading] = useState(true); // Начинаем с true, так как сразу загружаем
  const [loadingProgress, setLoadingProgress] = useState<string>('Initializing...');
  const [error, setError] = useState<string | null>(null);

  // IndexedDB data state (Этап 2: Каскадная загрузка)
  const [services, setServices] = useState<Service[]>([]);
  const [databases, setDatabases] = useState<SourceDatabase[]>([]);
  const [tables, setTables] = useState<TableMapping[]>([]);
  const [fields, setFields] = useState<DMSField[]>([]);

  // Selected items (by ID for IndexedDB)
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedServiceName, setSelectedServiceName] = useState<string | null>(null);
  const [selectedDatabaseId, setSelectedDatabaseId] = useState<number | null>(null);
  const [selectedDatabaseName, setSelectedDatabaseName] = useState<string | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<number | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string | null>(null);
  const [selectedTableFull, setSelectedTableFull] = useState<any | null>(null); // Full table info for mapping config
  const [selectedFields, setSelectedFields] = useState<DMSField[]>([]);
  const [originalFields, setOriginalFields] = useState<DMSField[]>([]); // For revert functionality

  // Modal states
  const [showFieldEditModal, setShowFieldEditModal] = useState(false);
  const [fieldEditMode, setFieldEditMode] = useState<'add' | 'edit'>('add');
  const [fieldToEdit, setFieldToEdit] = useState<DMSField | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [fieldToDelete, setFieldToDelete] = useState<DMSField | null>(null);
  const [showSuccessAlert, setShowSuccessAlert] = useState(false);
  const [showErrorAlert, setShowErrorAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [showReloadConfirm, setShowReloadConfirm] = useState(false);
  
  // Entity edit modals
  const [showServiceEditModal, setShowServiceEditModal] = useState(false);
  const [showDatabaseEditModal, setShowDatabaseEditModal] = useState(false);
  const [showTableEditModal, setShowTableEditModal] = useState(false);
  const [entityEditMode, setEntityEditMode] = useState<'add' | 'edit'>('add');
  const [entityToDelete, setEntityToDelete] = useState<EntityDeleteState | null>(null);
  const [showDeleteEntityConfirm, setShowDeleteEntityConfirm] = useState(false);
  
  // Entity UI handlers
  const entityHandlers = createEntityUIHandlers(
    setEntityEditMode,
    setShowServiceEditModal,
    setShowDatabaseEditModal,
    setShowTableEditModal,
    setEntityToDelete,
    setShowDeleteEntityConfirm,
    setAlertMessage,
    setShowErrorAlert,
    setLoading,
    setShowSuccessAlert,
    setError,
    selectedServiceId,
    selectedServiceName,
    selectedDatabaseId,
    selectedDatabaseName,
    selectedTableId,
    selectedTableName,
    setSelectedServiceId,
    setSelectedServiceName,
    setSelectedDatabaseId,
    setSelectedDatabaseName,
    setSelectedTableId,
    setSelectedTableName,
    setSelectedTableFull,
    setSelectedFields,
    setDatabases,
    setTables,
    setFields,
    setServices,
    entityToDelete
  );

  // Этап 1: Инициализация и загрузка данных в IndexedDB
  // Загружаем данные с сервера только если их нет в IndexedDB (новая вкладка)
  // При переключении на существующую вкладку или refresh - загружаем из IndexedDB
  useEffect(() => {
    let isMounted = true;

    const initializeData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Проверяем, есть ли данные в IndexedDB
        const existingServices = await loadServices();
        const hasDataInIndexedDB = existingServices.length > 0;

        if (hasDataInIndexedDB) {
          // Данные уже есть в IndexedDB - загружаем из кеша (refresh или переключение вкладки)
          setLoadingProgress('Loading data...');
          
          if (!isMounted) return;
          
          setServices(existingServices);
          setLoading(false);
          setLoadingProgress('');
          return;
        }

        // Данных нет в IndexedDB - это новая вкладка, загружаем с сервера
        console.log('🆕 No data in IndexedDB, loading from server...');
        
        // Этап 1: Загрузка данных с сервера
        setLoadingProgress('Loading data from server...');
        await loadAndNormalizeToIndexedDB(truetlDatabase.id);

        if (!isMounted) return;

        // Этап 2: Загрузка сервисов для отображения
        setLoadingProgress('Loading services...');
        const loadedServices = await loadServices();
        if (!isMounted) return;
        
        setServices(loadedServices);
        setLoadingProgress('Ready!');
      } catch (err: any) {
        console.error('❌ Error initializing data:', err);
        if (isMounted) {
          setError(err.message || 'Failed to initialize data');
          setLoadingProgress('Loading error');
        }
      } finally {
        if (isMounted) {
          // Небольшая задержка для плавности анимации
          setTimeout(() => {
            setLoading(false);
            setLoadingProgress('');
          }, 300);
        }
      }
    };

    initializeData();

    return () => {
      isMounted = false;
    };
  }, [truetlDatabase.id]);

  // Этап 2: Каскадная загрузка при выборе Service
  const handleServiceSelect = async (serviceName: string) => {
    try {
      // Найти ID сервиса
      const service = services.find(s => s.name === serviceName);
      if (!service || !service.id) return;

      // 1. Очистка зависимых таблиц
      setDatabases([]);
      setTables([]);
      setFields([]);
      setSelectedDatabaseId(null);
      setSelectedDatabaseName(null);
      setSelectedTableId(null);
      setSelectedTableName(null);
      setSelectedTableFull(null);
      setSelectedFields([]);

      // 2. Установка выбранного сервиса
      setSelectedServiceId(service.id);
      setSelectedServiceName(serviceName);

      // 3. Загрузка databases из IndexedDB
      const loadedDatabases = await loadDatabases(service.id);
      setDatabases(loadedDatabases);
    } catch (err: any) {
      console.error('❌ Error loading databases:', err);
      setError(err.message || 'Failed to load databases');
    }
  };

  // Этап 2: Каскадная загрузка при выборе Database
  const handleSourceDbSelect = async (dbName: string) => {
    try {
      // Найти ID базы данных
      const database = databases.find(d => d.name === dbName) as any;
      if (!database || !database.id || !selectedServiceId) return;

      // 1. Очистка зависимых таблиц
      setTables([]);
      setFields([]);
      setSelectedTableId(null);
      setSelectedTableName(null);
      setSelectedTableFull(null);
      setSelectedFields([]);

      // 2. Установка выбранной базы данных
      setSelectedDatabaseId(database.id);
      setSelectedDatabaseName(dbName);

      // 3. Загрузка tables из IndexedDB
      const loadedTables = await loadTables(database.id);
      setTables(loadedTables);
    } catch (err: any) {
      console.error('❌ Error loading tables:', err);
      setError(err.message || 'Failed to load tables');
    }
  };

  // Этап 2: Каскадная загрузка при выборе Table
  const handleTableSelect = async (tableName: string) => {
    try {
      // Найти ID таблицы
      const table = tables.find(t => t.source_table === tableName) as any;
      if (!table || !table.id || !selectedDatabaseId) return;

      // 1. Очистка зависимой таблицы
      setFields([]);
      setSelectedFields([]);

      // 2. Установка выбранной таблицы
      setSelectedTableId(table.id);
      setSelectedTableName(tableName);

      // 3. Загрузка полной информации о таблице для mapping config
      const tableFull = await getTableById(table.id);
      setSelectedTableFull(tableFull);

      // 4. Загрузка fields из IndexedDB
      const loadedFields = await loadFields(table.id);
      const fieldsWithStatus = loadedFields.map(f => ({
        ...f,
        _changeStatus: f._changeStatus || 'unchanged' as FieldChangeStatus
      }));
      setSelectedFields(fieldsWithStatus);
      setOriginalFields([...fieldsWithStatus]); // Save original for revert
    } catch (err: any) {
      console.error('❌ Error loading fields:', err);
      setError(err.message || 'Failed to load fields');
    }
  };

  const handleSave = async () => {
    await handleSaveToServer({
      truetlDatabaseId: truetlDatabase.id,
      selectedServiceId,
      selectedDatabaseId,
      selectedTableId,
      callbacks: {
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
      },
    });
  };

  // Проверка наличия изменений
  const hasChanges = selectedFields.some(
    field => field._changeStatus && field._changeStatus !== 'unchanged'
  );

  const handleRevert = () => {
    // Показываем предупреждение перед перезагрузкой данных с сервера
    setShowReloadConfirm(true);
  };

  const confirmReload = async () => {
    setShowReloadConfirm(false);
    
    try {
      setLoading(true);
      setLoadingProgress('Reloading data from server...');
      setError(null);

      // Очистить все данные и загрузить заново с сервера
      await loadAndNormalizeToIndexedDB(truetlDatabase.id);

      // Очистить выбранные элементы
      setSelectedServiceId(null);
      setSelectedServiceName(null);
      setSelectedDatabaseId(null);
      setSelectedDatabaseName(null);
      setSelectedTableId(null);
      setSelectedTableName(null);
      setSelectedTableFull(null);
      setSelectedFields([]);
      setOriginalFields([]);
      setDatabases([]);
      setTables([]);
      setFields([]);

      // Загрузить services для отображения
      setLoadingProgress('Loading services...');
      const loadedServices = await loadServices();
      
      setServices(loadedServices);
      setLoadingProgress('Ready!');
      setAlertMessage('Data successfully reloaded from server');
      setShowSuccessAlert(true);
    } catch (err: any) {
      console.error('❌ Error reloading data:', err);
      setError(err.message || 'Failed to reload data');
      setAlertMessage(err.message || 'Error reloading data');
      setShowErrorAlert(true);
    } finally {
      setTimeout(() => {
        setLoading(false);
        setLoadingProgress('');
      }, 300);
    }
  };

  // Field management handlers
  const handleAddField = () => {
    const maxRowOrder = selectedFields.length > 0
      ? Math.max(...selectedFields.map(f => f.row_order || 0))
      : 0;
    
    setFieldEditMode('add');
    setFieldToEdit({ ...({} as DMSField), row_order: maxRowOrder + 1 });
    setShowFieldEditModal(true);
  };

  const handleEditField = (field: DMSField) => {
    setFieldEditMode('edit');
    setFieldToEdit(field);
    setShowFieldEditModal(true);
  };

  const handleDeleteField = (field: DMSField) => {
    setFieldToDelete(field);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteField = async () => {
    if (!fieldToDelete || !selectedTableFull || !fieldToDelete.id) return;

    try {
      // If field was just added (not saved yet), remove it completely from IndexedDB
      if (fieldToDelete._changeStatus === 'added') {
        await indexedDBService.deleteFieldPhysically(fieldToDelete.id);
        const updatedFields = selectedFields.filter((f) => f.id !== fieldToDelete.id);
        setSelectedFields(updatedFields);
      } else {
        // Mark as deleted in IndexedDB
        await indexedDBService.updateField(fieldToDelete.id, { status: 'deleted' });
        const updatedFields = deleteField(fieldToDelete, selectedFields);
        setSelectedFields(updatedFields);
      }

      setShowDeleteConfirm(false);
      setFieldToDelete(null);
      setAlertMessage('Field deleted successfully');
      setShowSuccessAlert(true);
    } catch (err: any) {
      setError(err.message || 'Failed to delete field');
      setAlertMessage(err.message || 'Failed to delete field');
      setShowErrorAlert(true);
    }
  };

  const handleSaveField = async (fieldData: Partial<DMSField>) => {
    if (!selectedTableFull || !selectedTableId) return;

    try {
      // Validate first
      const validationError = await validateField(
        selectedTableId,
        fieldData.source_field || '',
        fieldData.is_primary_key ? 1 : 0,
        fieldEditMode === 'edit' && fieldToEdit?.id ? fieldToEdit.id : undefined
      );
      
      if (validationError) {
        setAlertMessage(validationError);
        setShowErrorAlert(true);
        return;
      }

      if (fieldEditMode === 'add') {
        // Add new field - save to IndexedDB immediately
        const maxRowOrder = selectedFields.length > 0
          ? Math.max(...selectedFields.map(f => f.row_order || 0))
          : 0;
        
        const newFieldData = {
          id: Date.now(), // Temporary ID until saved to server
          table_id: selectedTableId,
          source_field_name: fieldData.source_field || '',
          source_field_type: fieldData.source_type || '',
          target_field_name: fieldData.target_field || '',
          target_field_type: fieldData.target_type || '',
          target_field_value: fieldData.target_value || '',
          is_id: fieldData.is_primary_key ? 1 : 0,
          row_num: fieldData.row_order || maxRowOrder + 1,
          status: 'added' as const,
        };

        // Save to IndexedDB
        await indexedDBService.addField(newFieldData);

        // Update local state
        const newField = addField(fieldData, selectedTableFull, selectedFields);
        const updatedFields = [...selectedFields, newField].sort(
          (a, b) => a.row_order - b.row_order
        );
        setSelectedFields(updatedFields);
      } else if (fieldToEdit && fieldToEdit.id) {
        // Update existing field - save to IndexedDB immediately
        // Сохраняем статус 'added' если он был, иначе ставим 'updated'
        const currentStatus = fieldToEdit._changeStatus === 'added' ? 'added' : 'updated';
        const updatedFieldData = {
          source_field_name: fieldData.source_field,
          source_field_type: fieldData.source_type,
          target_field_name: fieldData.target_field,
          target_field_type: fieldData.target_type,
          target_field_value: fieldData.target_value,
          is_id: fieldData.is_primary_key ? 1 : 0,
          row_num: fieldData.row_order,
          status: currentStatus as 'added' | 'updated',
        };

        // Save to IndexedDB
        await indexedDBService.updateField(fieldToEdit.id, updatedFieldData);

        // Update local state
        const updatedFields = updateField(fieldToEdit, fieldData, selectedFields);
        setSelectedFields(updatedFields);
      }

      setShowFieldEditModal(false);
      setFieldToEdit(null);
    } catch (err: any) {
      setError(err.message || 'Failed to save field');
      setAlertMessage(err.message || 'Failed to save field');
      setShowErrorAlert(true);
    }
  };

  const handleMoveField = async (field: DMSField, direction: 'up' | 'down') => {
    // Save original row_order values to compare after move
    const originalRowOrders = new Map<number | undefined, number>();
    selectedFields.forEach(f => {
      if (f.id) {
        originalRowOrders.set(f.id, f.row_order || 0);
      }
    });

    // Update local state
    const updatedFields = moveField(field, direction, selectedFields);
    setSelectedFields(updatedFields);

    // Save to IndexedDB immediately (exception: save on move)
    if (selectedTableId && field.id) {
      try {
        // Get only fields that were actually moved (their row_order changed)
        const movedFields = updatedFields.filter(f => {
          if (!f.id) return false;
          const originalRowOrder = originalRowOrders.get(f.id);
          return originalRowOrder !== undefined && f.row_order !== originalRowOrder;
        });

        // Update each moved field in IndexedDB
        for (const movedField of movedFields) {
          if (movedField.id) {
            await indexedDBService.updateField(movedField.id, {
              row_num: movedField.row_order,
              status: movedField._changeStatus === 'modified' ? 'updated' : 
                      movedField._changeStatus === 'added' ? 'added' : 'unchanged',
            });
          }
        }

        // Don't reset change status after saving - keep visual indication
        // Status will be reset only after "Save to Server"
      } catch (err: any) {
        console.error('Error saving field move to IndexedDB:', err);
        setError(err.message || 'Failed to save field order');
        setAlertMessage(err.message || 'Failed to save field order');
        setShowErrorAlert(true);
      }
    }
  };

  // Entity save handlers
  const handleSaveService = async (data: { serviceName: string; targetDbType: string }) => {
    try {
      setLoading(true);
      if (entityEditMode === 'add') {
        await addService(data.serviceName, data.targetDbType);
        // Reload services
        const reloadedServices = await loadServices();
        setServices(reloadedServices);
        setAlertMessage('Service added successfully');
        setShowSuccessAlert(true);
      } else if (selectedServiceId) {
        await updateService(selectedServiceId, {
          service_name: data.serviceName,
          target_db_type: data.targetDbType,
        });
        // Reload services
        const reloadedServices = await loadServices();
        setServices(reloadedServices);
        setAlertMessage('Service updated successfully');
        setShowSuccessAlert(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save service');
      setAlertMessage(err.message || 'Failed to save service');
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDatabase = async (data: {
    sourceDbName: string;
    sourceSchemaName: string;
    targetDbName: string;
    targetSchemaName: string;
    sourceDbType: string;
  }) => {
    if (!selectedServiceId) return;
    
    try {
      setLoading(true);
      if (entityEditMode === 'add') {
        await addDatabase(
          selectedServiceId,
          data.sourceDbName,
          data.sourceSchemaName,
          data.targetDbName,
          data.targetSchemaName,
          data.sourceDbType
        );
        // Reload databases
        const reloadedDatabases = await loadDatabases(selectedServiceId);
        setDatabases(reloadedDatabases);
        setAlertMessage('Database added successfully');
        setShowSuccessAlert(true);
      } else if (selectedDatabaseId) {
        await updateDatabase(selectedDatabaseId, {
          source_db_name: data.sourceDbName,
          source_schema_name: data.sourceSchemaName,
          target_db_name: data.targetDbName,
          target_schema_name: data.targetSchemaName,
          source_db_type: data.sourceDbType,
        });
        // Reload databases
        const reloadedDatabases = await loadDatabases(selectedServiceId);
        setDatabases(reloadedDatabases);
        setAlertMessage('Database updated successfully');
        setShowSuccessAlert(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save database');
      setAlertMessage(err.message || 'Failed to save database');
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTable = async (data: {
    sourceTableName: string;
    targetTableName: string;
    fieldsFromDDL?: any[];
  }) => {
    if (!selectedDatabaseId) return;
    
    try {
      setLoading(true);
      let newTableId: number | null = null;
      
      if (entityEditMode === 'add') {
        newTableId = await addTable(selectedDatabaseId, data.sourceTableName, data.targetTableName);
        
        // If fields from DDL are provided, create them
        if (data.fieldsFromDDL && data.fieldsFromDDL.length > 0 && newTableId) {
          // Update table_id for all fields
          const fieldsWithTableId = data.fieldsFromDDL.map(field => ({
            ...field,
            table_id: newTableId,
          }));
          
          // Save fields to IndexedDB
          for (const field of fieldsWithTableId) {
            await indexedDBService.addField(field);
          }
          
          // If this table is currently selected, reload fields
          if (selectedTableId === newTableId) {
            const loadedFields = await loadFields(newTableId);
            const fieldsWithStatus = loadedFields.map(f => ({
              ...f,
              _changeStatus: f._changeStatus || 'unchanged' as FieldChangeStatus
            }));
            setSelectedFields(fieldsWithStatus);
            setOriginalFields([...fieldsWithStatus]);
          }
        }
        
        // Reload tables
        const reloadedTables = await loadTables(selectedDatabaseId);
        setTables(reloadedTables);
        setAlertMessage('Table added successfully');
        setShowSuccessAlert(true);
      } else if (selectedTableId) {
        await updateTable(selectedTableId, {
          source_table_name: data.sourceTableName,
          target_table_name: data.targetTableName,
        });
        
        // If fields from DDL are provided, create/update them
        if (data.fieldsFromDDL && data.fieldsFromDDL.length > 0) {
          // Get existing fields
          const existingFields = await loadFields(selectedTableId);
          const existingFieldNames = new Set(existingFields.map(f => f.source_field_name));
          
          // Update table_id for all fields from DDL
          const fieldsWithTableId = data.fieldsFromDDL.map(field => ({
            ...field,
            table_id: selectedTableId,
          }));
          
          // Add new fields or update existing ones
          for (const field of fieldsWithTableId) {
            const existingField = existingFields.find(
              f => f.source_field_name === field.source_field_name
            );
            
            if (existingField && existingField.id) {
              // Update existing field
              await indexedDBService.updateField(existingField.id, {
                source_field_name: field.source_field_name,
                source_field_type: field.source_field_type,
                target_field_name: field.target_field_name,
                target_field_type: field.target_field_type,
                target_field_value: field.target_field_value,
                is_id: field.is_id,
                row_num: field.row_num,
                status: existingField.status === 'added' ? 'added' : 'updated',
              });
            } else {
              // Add new field
              await indexedDBService.addField(field);
            }
          }
          
          // Reload fields if this table is currently selected
          const loadedFields = await loadFields(selectedTableId);
          const fieldsWithStatus = loadedFields.map(f => ({
            ...f,
            _changeStatus: f._changeStatus || 'unchanged' as FieldChangeStatus
          }));
          setSelectedFields(fieldsWithStatus);
          setOriginalFields([...fieldsWithStatus]);
        }
        
        // Reload tables
        const reloadedTables = await loadTables(selectedDatabaseId);
        setTables(reloadedTables);
        setAlertMessage('Table updated successfully');
        setShowSuccessAlert(true);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save table');
      setAlertMessage(err.message || 'Failed to save table');
      setShowErrorAlert(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="truetl-details-tab">
      {error && <div className="error-banner">{error}</div>}

      {/* Loading indicator */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">{loadingProgress}</div>
          </div>
        </div>
      )}

      <div className="truetl-layout">
        {/* Left Panels */}
        <div className="truetl-left-panels">
          <ServicePanel
            services={services}
            selectedService={selectedServiceName}
            loading={loading}
            error={error}
            onServiceSelect={handleServiceSelect}
            onAdd={entityHandlers.handleAddService}
            onEdit={entityHandlers.handleEditService}
            onDelete={entityHandlers.handleDeleteService}
          />

          <DatabasePanel
            databases={databases}
            selectedDatabase={selectedDatabaseName}
            selectedService={selectedServiceName}
            onDatabaseSelect={handleSourceDbSelect}
            onAdd={entityHandlers.handleAddDatabase}
            onEdit={entityHandlers.handleEditDatabase}
            onDelete={entityHandlers.handleDeleteDatabase}
          />

          <TablePanel
            tables={tables}
            selectedTable={selectedTableFull}
            selectedService={selectedServiceName}
            selectedSourceDb={selectedDatabaseName}
            onTableSelect={handleTableSelect}
            onAdd={entityHandlers.handleAddTable}
            onEdit={entityHandlers.handleEditTable}
            onDelete={entityHandlers.handleDeleteTable}
          />
        </div>

        {/* Right Panels */}
        <div className="truetl-right-panels">
          <MappingConfigPanel selectedTable={selectedTableFull} />

          <FieldMappingPanel
            selectedTable={selectedTableFull}
            selectedFields={selectedFields}
            loading={loading}
            onAddField={handleAddField}
            onEditField={handleEditField}
            onDeleteField={handleDeleteField}
            onMoveField={handleMoveField}
          />
        </div>
      </div>

      {/* Save and revert buttons - always visible */}
      <div className="truetl-actions-bar">
        <button 
          className="btn btn-sm btn-warning" 
          onClick={handleRevert} 
          disabled={loading}
        >
          <FiRotateCcw size={14} />
          Revert Changes
        </button>
        <button 
          className="btn btn-sm btn-success" 
          onClick={handleSave} 
          disabled={loading || !hasChanges}
        >
          <FiSave size={14} />
          Save to Server
        </button>
      </div>

      {/* Modals */}
      <ModalsContainer
        showFieldEditModal={showFieldEditModal}
        fieldEditMode={fieldEditMode}
        fieldToEdit={fieldToEdit}
        selectedFields={selectedFields}
        onCloseFieldEditModal={() => {
          setShowFieldEditModal(false);
          setFieldToEdit(null);
        }}
        onSaveField={handleSaveField}
        showDeleteConfirm={showDeleteConfirm}
        fieldToDelete={fieldToDelete}
        onCloseDeleteConfirm={() => {
          setShowDeleteConfirm(false);
          setFieldToDelete(null);
        }}
        onConfirmDelete={confirmDeleteField}
        showSuccessAlert={showSuccessAlert}
        showErrorAlert={showErrorAlert}
        alertMessage={alertMessage}
        onCloseSuccessAlert={() => setShowSuccessAlert(false)}
        onCloseErrorAlert={() => setShowErrorAlert(false)}
      />

      <ConfirmModal
        isOpen={showReloadConfirm}
        onClose={() => setShowReloadConfirm(false)}
        onConfirm={confirmReload}
        title="Revert Changes"
        message="Are you sure you want to reload data from the server? All unsaved changes will be lost and cannot be recovered."
        confirmText="Reload"
        cancelText="Cancel"
        confirmButtonVariant="danger"
      />

      <ConfirmModal
        isOpen={showDeleteEntityConfirm}
        onClose={() => {
          setShowDeleteEntityConfirm(false);
          setEntityToDelete(null);
        }}
        onConfirm={entityHandlers.confirmDeleteEntity}
        title="Delete Confirmation"
        message={`Are you sure you want to delete "${entityToDelete?.name}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        confirmButtonVariant="danger"
      />

      <ServiceEditModal
        isOpen={showServiceEditModal}
        onClose={() => setShowServiceEditModal(false)}
        onSave={handleSaveService}
        mode={entityEditMode}
        serviceId={entityEditMode === 'edit' ? selectedServiceId : null}
      />

      <DatabaseEditModal
        isOpen={showDatabaseEditModal}
        onClose={() => setShowDatabaseEditModal(false)}
        onSave={handleSaveDatabase}
        mode={entityEditMode}
        serviceId={selectedServiceId || 0}
        databaseId={entityEditMode === 'edit' ? selectedDatabaseId : null}
      />

      <TableEditModal
        isOpen={showTableEditModal}
        onClose={() => setShowTableEditModal(false)}
        onSave={handleSaveTable}
        mode={entityEditMode}
        databaseId={selectedDatabaseId || 0}
        tableId={entityEditMode === 'edit' ? selectedTableId : null}
      />
    </div>
  );
};

export default TruETLDetailsTab;

