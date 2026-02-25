import React from 'react';
import './TabLayout.css';

interface TabLayoutProps {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}

const TabLayout: React.FC<TabLayoutProps> = ({ children, header, footer, className = '' }) => {
  return (
    <div className={`tab-layout ${className}`}>
      {header && <div className="tab-layout-header">{header}</div>}
      <div className="tab-layout-content">{children}</div>
      {footer && <div className="tab-layout-footer">{footer}</div>}
    </div>
  );
};

export default TabLayout;
