import React from 'react';
import { Search } from '@mui/icons-material';

function SearchBar({ searchTerm, setSearchTerm }) {
  const handleSearch = (e) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="search-container">
      <input 
        type="text" 
        placeholder="Ürün ara..." 
        className="search-input" 
        value={searchTerm}
        onChange={handleSearch}
      />
      <Search className="search-icon" />
    </div>
  );
}

export default SearchBar;