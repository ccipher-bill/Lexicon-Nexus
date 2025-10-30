/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { X } from 'lucide-react';
import * as settingsService from '../services/settingsService';
import * as cacheService from '../services/cacheService';
import { MODELS, DEFAULT_MODEL_ID } from '../config/models';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [isHighQualityArt, setIsHighQualityArt] = useState(() => 
    settingsService.getSetting<boolean>('highQualityArt', true)
  );
  const [selectedModel, setSelectedModel] = useState(() =>
    settingsService.getSetting<string>('apiModel', DEFAULT_MODEL_ID)
  );
  const [customModelName, setCustomModelName] = useState(() =>
    settingsService.getSetting<string>('customApiModel', '')
  );
  const [customApiKey, setCustomApiKey] = useState(() =>
    settingsService.getSetting<string>('customApiKey', '')
  );
  const [clearCacheText, setClearCacheText] = useState('Clear Session Cache');

  const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const isChecked = e.target.checked;
    setIsHighQualityArt(isChecked);
    settingsService.setSetting('highQualityArt', isChecked);
  };
  
  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newModelId = e.target.value;
    setSelectedModel(newModelId);
    settingsService.setSetting('apiModel', newModelId);
    cacheService.clearAll();
  };

  const handleCustomModelNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setCustomModelName(newName);
    settingsService.setSetting('customApiModel', newName);
    if (newName.trim()) {
        cacheService.clearAll();
    }
  };

  const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKey = e.target.value;
    setCustomApiKey(newKey);
    settingsService.setSetting('customApiKey', newKey);
    // Clear the cache as the new key might have different access or produce different results.
    cacheService.clearAll();
  };

  const handleClearCache = () => {
    cacheService.clearAll();
    setClearCacheText('Cache Cleared!');
    setTimeout(() => {
      setClearCacheText('Clear Session Cache');
    }, 2000);
  };
  
  if (!isOpen) {
    return null;
  }

  return (
    <div className="settings-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="settings-title">
      <div className="settings-modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="settings-modal-close-button" aria-label="Close settings modal">
          <X size={24} />
        </button>
        <h2 id="settings-title" className="settings-title">// SYSTEM_SETTINGS</h2>

        <div className="settings-section">
            <h3 className="settings-section-title">// API Key</h3>
            <div className="setting-item">
                <label htmlFor="api-key-input" className="setting-label">
                Custom Gemini API Key
                <span className="setting-description">Overrides the default key. Stored in your browser.</span>
                </label>
            </div>
            <div className="api-key-input-container">
                <input
                    id="api-key-input"
                    type="password"
                    className="api-key-input"
                    placeholder="Enter optional Gemini API key..."
                    value={customApiKey}
                    onChange={handleApiKeyChange}
                    aria-label="Custom Gemini API Key"
                />
            </div>
        </div>
        
        <div className="settings-section">
            <h3 className="settings-section-title">// AI Model</h3>
            <div className="radio-group" role="radiogroup">
              {MODELS.map((model) => (
                <label key={model.id} className="radio-item">
                  <input
                    type="radio"
                    name="api-model"
                    value={model.id}
                    checked={selectedModel === model.id}
                    onChange={handleModelChange}
                  />
                   <span className="radio-custom" aria-hidden="true"></span>
                   <div className="setting-label">
                     {model.name}
                     <span className="setting-description">{model.description}</span>
                   </div>
                   {model.id === 'custom-model' && selectedModel === 'custom-model' && (
                     <div className="custom-model-input-container">
                       <input
                         type="text"
                         className="custom-model-input"
                         placeholder="e.g., gemini-2.5-pro-preview-09-2025"
                         value={customModelName}
                         onChange={handleCustomModelNameChange}
                         aria-label="Custom model name"
                       />
                     </div>
                   )}
                </label>
              ))}
            </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">// Generation</h3>
          <div className="setting-item">
            <label htmlFor="hq-art-toggle" className="setting-label">
              High-Quality ASCII Art (Slower)
              <span className="setting-description">Allows the AI to "think" for more creative results.</span>
            </label>
            <label className="toggle-switch">
              <input 
                id="hq-art-toggle"
                type="checkbox"
                checked={isHighQualityArt}
                onChange={handleToggleChange}
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        <div className="settings-section">
          <h3 className="settings-section-title">// Cache</h3>
          <div className="setting-item">
            <label className="setting-label">
              Session Cache
              <span className="setting-description">Clears stored definitions for the current session.</span>
            </label>
            <button className="settings-button" onClick={handleClearCache}>
                {clearCacheText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;