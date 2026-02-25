import React, { useState, useRef, useEffect } from 'react';
import './Layout.css';
import Sidebar from '../Sidebar/Sidebar';
import MainHeader from '../MainHeader/MainHeader';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [sidebarWidth, setSidebarWidth] = useState(350);
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsResizing(true);
    e.preventDefault();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;

      const newWidth = e.clientX;
      if (newWidth >= 200 && newWidth <= 600) {
        setSidebarWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.body.classList.remove('resizing');
    };

    if (isResizing) {
      document.body.classList.add('resizing');
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.body.classList.remove('resizing');
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  return (
    <div className="container">
      <div ref={sidebarRef} style={{ width: `${sidebarWidth}px` }}>
        <Sidebar />
      </div>
      <div className={`resizer ${isResizing ? 'resizing' : ''}`} onMouseDown={handleMouseDown} />
      <div className="mainContent">
        <div className="mainHeader">
          <MainHeader />
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
};

export default Layout;
