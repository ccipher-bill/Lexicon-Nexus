/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useRef } from 'react';
import { Search, Shuffle, FileUp, X, Settings } from 'lucide-react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  onRandom: () => void;
  isLoading: boolean;
  onFileUpload: (file: File) => void;
  onClearFile: () => void;
  uploadedFile: { name: string } | null;
  onSettingsClick: () => void;
  isApiConfigured: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  onSearch, 
  onRandom, 
  isLoading, 
  onFileUpload, 
  onClearFile, 
  uploadedFile,
  onSettingsClick,
  isApiConfigured,
}) => {
  const [query, setQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
      setQuery(''); // Clear the input field after search
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
    // Reset file input value to allow re-uploading the same file
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  const isUiDisabled = isLoading || !isApiConfigured;

  return (
    <>
      {uploadedFile && (
        <div className="file-display-container">
          <span>{uploadedFile.name}</span>
          <button onClick={onClearFile} aria-label={`Remove file ${uploadedFile.name}`}>
            <X size={16} />
          </button>
        </div>
      )}
      <div className="search-container">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          accept=".pdf,.html,.doc,.docx,text/plain"
          disabled={isUiDisabled}
        />
        <form onSubmit={handleSubmit} className="search-form" role="search">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={!isApiConfigured ? "API Key required..." : (uploadedFile ? `Ask about ${uploadedFile.name}...` : "Enter a concept...")}
            className="search-input"
            aria-label="Search for a topic or ask a question about the uploaded file"
            disabled={isUiDisabled}
          />
          <button type="submit" className="search-submit-button" aria-label="Search" disabled={isUiDisabled}>
            <Search size={20} />
          </button>
        </form>
        <button onClick={onSettingsClick} className="upload-button" disabled={isLoading} aria-label="Open settings">
          <Settings size={20} />
        </button>
        <button onClick={handleUploadClick} className="upload-button" disabled={isUiDisabled} aria-label="Upload a file">
          <FileUp size={20} />
        </button>
        <button onClick={onRandom} className="random-button" disabled={isUiDisabled || !!uploadedFile} aria-label="Get a random topic">
          <Shuffle size={20} />
        </button>
      </div>
    </>
  );
};

export default SearchBar;