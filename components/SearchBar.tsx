/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { Search, Shuffle } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onRandom: () => void;
  isLoading: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ onSearch, onRandom, isLoading }) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
      setQuery(''); // Clear the input field after search
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSubmit} className="search-form" role="search">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter a concept..."
          className="search-input"
          aria-label="Search for a topic"
          disabled={isLoading}
        />
        <button type="submit" className="search-submit-button" aria-label="Search" disabled={isLoading}>
          <Search size={20} />
        </button>
      </form>
      <button onClick={onRandom} className="random-button" disabled={isLoading} aria-label="Get a random topic">
        <Shuffle size={20} />
      </button>
    </div>
  );
};

export default SearchBar;
