/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo } from 'react';
import type { DeepDiveData } from '../services/geminiService';
import LoadingSkeleton from './LoadingSkeleton';
import { ChevronDown } from 'lucide-react';

interface DeepDiveDisplayProps {
  isLoading: boolean;
  error: string | null;
  data: DeepDiveData | null;
  onWordClick: (word: string) => void;
}

const DeepDiveDisplay: React.FC<DeepDiveDisplayProps> = ({ isLoading, error, data, onWordClick }) => {
  const [revealedContent, setRevealedContent] = useState<React.ReactNode[]>([]);
  const [isRevealingComplete, setIsRevealingComplete] = useState(false);
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(true);
  const [isResourcesOpen, setIsResourcesOpen] = useState(true);

  // Parse the summary into an array of words and interactive keywords
  const summaryParts = useMemo(() => {
    if (!data?.summary) return [];
    // Split by our keyword markers and also by whitespace, keeping all parts.
    return data.summary.split(/(\[\[.*?\]\]|\s+|\n+)/g).filter(Boolean);
  }, [data]);


  useEffect(() => {
    if (summaryParts.length > 0) {
      setIsRevealingComplete(false);
      setRevealedContent([]);
      let index = 0;

      const intervalId = setInterval(() => {
        if (index < summaryParts.length) {
          const part = summaryParts[index];
          const isKeyword = part.startsWith('[[') && part.endsWith(']]');
          
          let node: React.ReactNode;
          if (isKeyword) {
            const keyword = part.slice(2, -2);
            node = (
              <button key={index} className="interactive-word" onClick={() => onWordClick(keyword)}>
                {keyword}
              </button>
            );
          } else if (part.includes('\n')) {
             // Handle newlines as paragraphs
            node = <p key={index}></p>
          } else {
            node = <span key={index}>{part}</span>;
          }

          setRevealedContent(prev => [...prev, node]);
          index++;
        } else {
          clearInterval(intervalId);
          setIsRevealingComplete(true);
        }
      }, 25); // Adjust word reveal speed here

      return () => clearInterval(intervalId);
    }
  }, [summaryParts, onWordClick]);


  if (isLoading) {
    return (
      <div className="deep-dive-container">
        <LoadingSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="deep-dive-container">
        <div className="error-message">
          <p>Deep Dive Failed</p>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  return (
    <div className="deep-dive-container">
      <section>
        <button 
          className={`deep-dive-heading ${!isAnalysisOpen ? 'collapsed' : ''}`}
          onClick={() => setIsAnalysisOpen(!isAnalysisOpen)}
          aria-expanded={isAnalysisOpen}
        >
          <ChevronDown size={16} className="deep-dive-heading-indicator" />
          // COMPREHENSIVE ANALYSIS
        </button>
        <div className={`deep-dive-section-content ${!isAnalysisOpen ? 'collapsed' : ''}`}>
          <div className="deep-dive-summary">
            <p>
              {revealedContent}
              {!isRevealingComplete && <span className="blinking-cursor">█</span>}
            </p>
          </div>
        </div>
      </section>

      <section className={`resource-section ${isRevealingComplete ? 'visible' : ''}`} style={{ marginTop: '2rem' }}>
        <button 
          className={`deep-dive-heading ${!isResourcesOpen ? 'collapsed' : ''}`}
          onClick={() => setIsResourcesOpen(!isResourcesOpen)}
          aria-expanded={isResourcesOpen}
        >
          <ChevronDown size={16} className="deep-dive-heading-indicator" />
           // RECOMMENDED RESOURCES
        </button>
        <div className={`deep-dive-section-content ${!isResourcesOpen ? 'collapsed' : ''}`}>
          <ul className="resource-list" style={{ marginTop: '1rem' }}>
            {data.resources.map((resource, index) => (
              <li key={index} className="resource-item">
                <a 
                  href={resource.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="resource-link"
                >
                  {resource.title}
                </a>
                <p className="resource-description">{resource.description}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </div>
  );
};

export default DeepDiveDisplay;
