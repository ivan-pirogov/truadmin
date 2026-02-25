import React, { useState, useEffect } from 'react';
import { FiSearch } from 'react-icons/fi';
import '../HohAddressDetailsTab/HohAddressDetailsTab.css';

interface SearchBarProps {
  search: string;
  onSearchSubmit: (value: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ search, onSearchSubmit }) => {
  const [localSearch, setLocalSearch] = useState(search);

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const handleSearch = () => {
    onSearchSubmit(localSearch);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="table-filters-new">
      <div className="search-row">
        <div className="search-input-wrapper">
          <FiSearch size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Search in all fields..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            onKeyPress={handleKeyPress}
            className="search-input"
          />
        </div>
        <button
          type="button"
          onClick={handleSearch}
          className="btn btn-primary btn-sm search-btn"
          title="Search"
        >
          <FiSearch size={16} />
        </button>
      </div>
    </div>
  );
};

export default SearchBar;

