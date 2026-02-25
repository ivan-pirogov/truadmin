import React from 'react';
import './Main.css';
import Layout from '../../components/Layout/Layout';
import TabGroup from '../../components/TabGroup/TabGroup';
import { useTab } from '../../contexts/TabContext';
import Connections from '../Connections/Connections';

const Main: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, removeTab } = useTab();

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  const handleTabClose = (tabId: string) => {
    removeTab(tabId);
  };

  return (
    <Layout>
      <TabGroup
        tabs={tabs.map((tab) => ({
          ...tab,
          content: tab.id === 'connections' ? <Connections /> : tab.content,
        }))}
        activeTabId={activeTabId}
        onTabChange={handleTabChange}
        onTabClose={handleTabClose}
      />
    </Layout>
  );
};

export default Main;
