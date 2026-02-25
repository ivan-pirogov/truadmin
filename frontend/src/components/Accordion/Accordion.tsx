import React, { useState, useEffect } from 'react';
import { FiChevronDown, FiChevronRight } from 'react-icons/fi';
import './Accordion.css';

export interface AccordionItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  children?: AccordionItem[];
  onClick?: () => void;
  path?: string;
  isLeaf?: boolean;
}

interface AccordionProps {
  items: AccordionItem[];
  level?: number;
  activePath?: string;
  selectedRoleId?: string | null;
  selectedItemId?: string | null;
  expandedItemsExternal?: Set<string>;
}

const Accordion: React.FC<AccordionProps> = ({ items, level = 0, activePath, selectedRoleId, selectedItemId, expandedItemsExternal }) => {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  // Sync external expanded items
  useEffect(() => {
    if (expandedItemsExternal) {
      setExpandedItems(expandedItemsExternal);
    }
  }, [expandedItemsExternal]);

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const renderItems = (items: AccordionItem[], currentLevel: number) => {
    return items.map((item) => {
      const isExpanded = expandedItems.has(item.id);
      const hasChildren = item.children && item.children.length > 0;
      // Проверяем только конкретные роли (не родительский элемент "Roles")
      const isRoleItem = item.id.match(/-role-[^-]+$/);
      const isActiveRole = isRoleItem && selectedRoleId && item.id.endsWith(`-role-${selectedRoleId}`);
      const isSelectedItem = selectedItemId && item.id === selectedItemId;
      // Для ролей проверяем только isActiveRole, для остальных - activePath или selectedItemId
      const isActive = isRoleItem ? isActiveRole : (isSelectedItem || activePath === item.path);

      return (
        <div key={item.id} className={`accordion-item accordion-item-level-${currentLevel}`}>
          <div
            className={`accordion-header ${isActive ? 'active' : ''}`}
            onClick={() => {
              if (hasChildren) {
                toggleExpand(item.id);
              }
              if (item.onClick) {
                item.onClick();
              }
            }}
            style={{ paddingLeft: `${currentLevel * 16 + 12}px` }}
          >
            {hasChildren && (
              <span className={`accordion-chevron ${isExpanded ? 'expanded' : ''}`}>
                {isExpanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
              </span>
            )}
            {item.icon && <span className="accordion-icon">{item.icon}</span>}
            <span className="accordion-label">{item.label}</span>
          </div>
          {hasChildren && isExpanded && (
            <div className={`accordion-content accordion-content-level-${currentLevel}`}>
              {renderItems(item.children!, currentLevel + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  return <div className="accordion">{renderItems(items, level)}</div>;
};

export default Accordion;
