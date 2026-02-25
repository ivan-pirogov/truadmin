import React, { useState } from 'react';
import { FiX, FiPlus } from 'react-icons/fi';
import './TabGroup.css';

export interface Tab {
  id: string;
  title: string;
  icon?: React.ReactNode;
  content: React.ReactNode;
  closable?: boolean;
}

interface TabGroupProps {
  tabs: Tab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onNewTab?: () => void;
}

const TabGroup: React.FC<TabGroupProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onNewTab,
}) => {
  const activeTab = tabs.find((tab) => tab.id === activeTabId);

  return (
    <div className="tab-group">
      <div className="tab-group-header">
        <div className="tab-list">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`tab ${tab.id === activeTabId ? 'active' : ''}`}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.icon && <span className="tab-icon">{tab.icon}</span>}
              <span className="tab-title">{tab.title}</span>
              {tab.closable !== false && onTabClose && (
                <button
                  className="tab-close"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose(tab.id);
                  }}
                >
                  <FiX size={14} />
                </button>
              )}
            </div>
          ))}
          {onNewTab && (
            <button className="tab-new" onClick={onNewTab}>
              <FiPlus size={16} />
            </button>
          )}
        </div>
      </div>
      <div className="tab-content">{activeTab?.content}</div>
    </div>
  );
};

export default TabGroup;
