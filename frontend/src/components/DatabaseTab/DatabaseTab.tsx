import React, { useState } from 'react';
import { FiTable, FiEye, FiCode, FiDatabase, FiActivity } from 'react-icons/fi';
import MonitoringTab from '../MonitoringTab/MonitoringTab';
import './DatabaseTab.css';

interface DatabaseTabProps {
  connectionId: string;
  databaseName: string;
}

type DatabaseSubTab = 'tables' | 'views' | 'functions' | 'schemas' | 'monitoring';

const DatabaseTab: React.FC<DatabaseTabProps> = ({ connectionId, databaseName }) => {
  const [activeSubTab, setActiveSubTab] = useState<DatabaseSubTab>('tables');

  const renderTabContent = () => {
    switch (activeSubTab) {
      case 'tables':
        return (
          <div className="database-content">
            <h3>Tables</h3>
            <p>Список таблиц для {databaseName}</p>
          </div>
        );
      case 'views':
        return (
          <div className="database-content">
            <h3>Views</h3>
            <p>Список представлений для {databaseName}</p>
          </div>
        );
      case 'functions':
        return (
          <div className="database-content">
            <h3>Functions</h3>
            <p>Список функций для {databaseName}</p>
          </div>
        );
      case 'schemas':
        return (
          <div className="database-content">
            <h3>Schemas</h3>
            <p>Список схем для {databaseName}</p>
          </div>
        );
      case 'monitoring':
        return <MonitoringTab connectionId={connectionId} databaseName={databaseName} />;
      default:
        return null;
    }
  };

  return (
    <div className="database-tab">
      <div className="database-tab-header">
        <button
          className={`database-subtab ${activeSubTab === 'tables' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('tables')}
        >
          <FiTable size={16} />
          <span>Tables</span>
        </button>
        <button
          className={`database-subtab ${activeSubTab === 'views' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('views')}
        >
          <FiEye size={16} />
          <span>Views</span>
        </button>
        <button
          className={`database-subtab ${activeSubTab === 'functions' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('functions')}
        >
          <FiCode size={16} />
          <span>Functions</span>
        </button>
        <button
          className={`database-subtab ${activeSubTab === 'schemas' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('schemas')}
        >
          <FiDatabase size={16} />
          <span>Schemas</span>
        </button>
        <button
          className={`database-subtab ${activeSubTab === 'monitoring' ? 'active' : ''}`}
          onClick={() => setActiveSubTab('monitoring')}
        >
          <FiActivity size={16} />
          <span>Monitoring</span>
        </button>
      </div>
      <div className="database-tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default DatabaseTab;
