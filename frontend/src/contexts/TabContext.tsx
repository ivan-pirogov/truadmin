import React, { createContext, useContext, useState, ReactNode } from 'react';
import { FiLayers } from 'react-icons/fi';

export interface TabData {
  id: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  closable?: boolean;
  metadata?: {
    type?: string;
    connectionId?: string;
    roleId?: string;
    connectionName?: string;
    roleName?: string;
    canLogin?: boolean;
    databaseName?: string;
    truetlDatabaseId?: string;
    hohAddressDatabaseId?: string;
  };
}

interface TabContextType {
  tabs: TabData[];
  activeTabId: string;
  addTab: (tab: TabData) => void;
  removeTab: (tabId: string) => void;
  setActiveTab: (tabId: string) => void;
  updateTab: (tabId: string, content: React.ReactNode) => void;
  hasTab: (tabId: string) => boolean;
}

const TabContext = createContext<TabContextType | undefined>(undefined);

export const TabProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [tabs, setTabs] = useState<TabData[]>([
    {
      id: 'connections',
      title: 'Servers',
      icon: <FiLayers size={14} />,
      content: null,
      closable: false,
    },
  ]);
  const [activeTabId, setActiveTabId] = useState('connections');

  const addTab = (tab: TabData) => {
    // Проверяем, существует ли уже вкладка с таким ID
    const existingTab = tabs.find((t) => t.id === tab.id);

    if (existingTab) {
      // Если вкладка существует, просто переключаемся на нее
      setActiveTabId(tab.id);
    } else {
      // Если вкладки нет, создаем новую
      setTabs((prev) => [...prev, tab]);
      setActiveTabId(tab.id);
    }
  };

  const removeTab = (tabId: string) => {
    const tabIndex = tabs.findIndex((t) => t.id === tabId);
    if (tabIndex === -1) return;

    // Удаляем вкладку
    const newTabs = tabs.filter((t) => t.id !== tabId);
    setTabs(newTabs);

    // Если удаляем активную вкладку, переключаемся на соседнюю
    if (activeTabId === tabId && newTabs.length > 0) {
      // Переключаемся на предыдущую вкладку, если она есть, иначе на следующую
      const newActiveIndex = tabIndex > 0 ? tabIndex - 1 : 0;
      setActiveTabId(newTabs[newActiveIndex].id);
    }
  };

  const setActiveTab = (tabId: string) => {
    if (tabs.find((t) => t.id === tabId)) {
      setActiveTabId(tabId);
    }
  };

  const updateTab = (tabId: string, content: React.ReactNode) => {
    setTabs((prev) =>
      prev.map((tab) => (tab.id === tabId ? { ...tab, content } : tab))
    );
  };

  const hasTab = (tabId: string) => {
    return tabs.some((t) => t.id === tabId);
  };

  return (
    <TabContext.Provider
      value={{ tabs, activeTabId, addTab, removeTab, setActiveTab, updateTab, hasTab }}
    >
      {children}
    </TabContext.Provider>
  );
};

export const useTab = (): TabContextType => {
  const context = useContext(TabContext);
  if (!context) {
    throw new Error('useTab must be used within TabProvider');
  }
  return context;
};
