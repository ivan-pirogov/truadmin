import React, { useState } from 'react';
import { FiEdit3, FiTable } from 'react-icons/fi';
import { HohAddressDatabase } from '../../services/api';
import TabLayout from '../TabLayout/TabLayout';
import StatusListTable from './StatusListTable';
import BlacklistTable from './BlacklistTable';
import WhitelistTable from './WhitelistTable';
import './HohAddressDetailsTab.css';

interface HohAddressDetailsTabProps {
  hohAddressDatabase: HohAddressDatabase;
}

type TableType = 'statuslist' | 'blacklist' | 'whitelist';

const HohAddressDetailsTab: React.FC<HohAddressDetailsTabProps> = ({ hohAddressDatabase }) => {
  const [activeTab, setActiveTab] = useState<TableType>('statuslist');

  return (
    <TabLayout
      header={
        <div className="connections-title-wrapper">
          <FiEdit3 size={28} className="connections-title-icon" />
          <h1 className="connections-title">
            {hohAddressDatabase.connection_name}.{hohAddressDatabase.database_name}
          </h1>
        </div>
      }
    >
      <div className="hohaddress-details-tab">
        {/* Tab Navigation */}
        <div className="hohaddress-tab-header">
          <button
            className={`hohaddress-subtab ${activeTab === 'statuslist' ? 'active' : ''}`}
            onClick={() => setActiveTab('statuslist')}
          >
            <FiTable size={16} />
            <span>Status List</span>
          </button>
          <button
            className={`hohaddress-subtab ${activeTab === 'blacklist' ? 'active' : ''}`}
            onClick={() => setActiveTab('blacklist')}
          >
            <FiTable size={16} />
            <span>Blacklist</span>
          </button>
          <button
            className={`hohaddress-subtab ${activeTab === 'whitelist' ? 'active' : ''}`}
            onClick={() => setActiveTab('whitelist')}
          >
            <FiTable size={16} />
            <span>Whitelist</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="hohaddress-tab-content">
          {activeTab === 'statuslist' && <StatusListTable hohAddressDatabase={hohAddressDatabase} />}
          {activeTab === 'blacklist' && <BlacklistTable hohAddressDatabase={hohAddressDatabase} />}
          {activeTab === 'whitelist' && <WhitelistTable hohAddressDatabase={hohAddressDatabase} />}
        </div>
      </div>
    </TabLayout>
  );
};

export default HohAddressDetailsTab;
