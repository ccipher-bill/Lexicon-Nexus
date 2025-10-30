/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { streamDefinition, generateAncillaryData, AncillaryData, generateDeepDive, DeepDiveData, AsciiArtData } from './services/geminiService';
import * as cache from './services/cacheService';
import * as settingsService from './services/settingsService';
import ContentDisplay from './components/ContentDisplay';
import SearchBar from './components/SearchBar';
import LoadingSkeleton from './components/LoadingSkeleton';
import AsciiArtDisplay from './components/AsciiArtDisplay';
import QRCodeModal from './components/QRCodeModal';
import { QrCode, ChevronsDown } from 'lucide-react';
import DeepDiveDisplay from './components/DeepDiveDisplay';
import SettingsModal from './components/SettingsModal';

// A curated list of "banger" words and phrases for the random button.
const PREDEFINED_WORDS = [
  // List 1
  'Balance', 'Harmony', 'Discord', 'Unity', 'Fragmentation', 'Clarity', 'Ambiguity', 'Presence', 'Absence', 'Creation', 'Destruction', 'Light', 'Shadow', 'Beginning', 'Ending', 'Rising', 'Falling', 'Connection', 'Isolation', 'Hope', 'Despair',
  // Complex phrases from List 1
  'Order and chaos', 'Light and shadow', 'Sound and silence', 'Form and formlessness', 'Being and nonbeing', 'Presence and absence', 'Motion and stillness', 'Unity and multiplicity', 'Finite and infinite', 'Sacred and profane', 'Memory and forgetting', 'Question and answer', 'Search and discovery', 'Journey and destination', 'Dream and reality', 'Time and eternity', 'Self and other', 'Known and unknown', 'Spoken and unspoken', 'Visible and invisible',
  // List 2
  'Zigzag', 'Waves', 'Spiral', 'Bounce', 'Slant', 'Drip', 'Stretch', 'Squeeze', 'Float', 'Fall', 'Spin', 'Melt', 'Rise', 'Twist', 'Explode', 'Stack', 'Mirror', 'Echo', 'Vibrate',
  // List 3
  'Gravity', 'Friction', 'Momentum', 'Inertia', 'Turbulence', 'Pressure', 'Tension', 'Oscillate', 'Fractal', 'Quantum', 'Entropy', 'Vortex', 'Resonance', 'Equilibrium', 'Centrifuge', 'Elastic', 'Viscous', 'Refract', 'Diffuse', 'Cascade', 'Levitate', 'Magnetize', 'Polarize', 'Accelerate', 'Compress', 'Undulate',
  // List 4
  'Liminal', 'Ephemeral', 'Paradox', 'Zeitgeist', 'Metamorphosis', 'Synesthesia', 'Recursion', 'Emergence', 'Dialectic', 'Apophenia', 'Limbo', 'Flux', 'Sublime', 'Uncanny', 'Palimpsest', 'Chimera', 'Void', 'Transcend', 'Ineffable', 'Qualia', 'Gestalt', 'Simulacra', 'Abyssal',
  // List 5
  'Existential', 'Nihilism', 'Solipsism', 'Phenomenology', 'Hermeneutics', 'Deconstruction', 'Postmodern', 'Absurdism', 'Catharsis', 'Epiphany', 'Melancholy', 'Nostalgia', 'Longing', 'Reverie', 'Pathos', 'Ethos', 'Logos', 'Mythos', 'Anamnesis', 'Intertextuality', 'Metafiction', 'Stream', 'Lacuna', 'Caesura', 'Enjambment'
];
const UNIQUE_WORDS = [...new Set(PREDEFINED_WORDS)];


/**
 * Creates a simple ASCII art bounding box as a fallback.
 * @param topic The text to display inside the box.
 * @returns An AsciiArtData object with the generated art.
 */
const createFallbackArt = (topic: string): AsciiArtData => {
  const displayableTopic = topic.length > 20 ? topic.substring(0, 17) + '...' : topic;
  const paddedTopic = ` ${displayableTopic} `;
  const topBorder = `+${'-'.repeat(paddedTopic.length)}+`;
  const middle = `|${paddedTopic}|`;
  const bottomBorder = `+${'-'.repeat(paddedTopic.length)}+`;
  return {
    art: `${topBorder}\n${middle}\n${bottomBorder}`
  };
};

interface UploadedFile {
  name: string;
  data: string;
  mimeType: string;
}

const App: React.FC = () => {
  const [currentTopic, setCurrentTopic] = useState<string>('Hypertext');
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [asciiArt, setAsciiArt] = useState<AsciiArtData | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [file, setFile] = useState<UploadedFile | null>(null);
  const [isApiConfigured, setIsApiConfigured] = useState<boolean>(true);

  const [relatedConcepts, setRelatedConcepts] = useState<string[]>([]);
  const [isAncillaryLoading, setIsAncillaryLoading] = useState<boolean>(false);
  const [ancillaryError, setAncillaryError] = useState<string | null>(null);

  const [deepDiveContent, setDeepDiveContent] = useState<DeepDiveData | null>(null);
  const [isDeepDiveLoading, setIsDeepDiveLoading] = useState<boolean>(false);
  const [deepDiveError, setDeepDiveError] = useState<string | null>(null);

  const checkApiKey = useCallback(() => {
    const key = settingsService.getApiKey();
    setIsApiConfigured(!!key);
    if (!key) {
      setIsLoading(false); // Stop loading if no key is found
    }
  }, []);

  useEffect(() => {
    checkApiKey();
  }, [checkApiKey]);

  // This effect runs ONLY when in "Topic Exploration" mode (no file uploaded).
  useEffect(() => {
    if (file || !currentTopic || !isApiConfigured) return;

    let isCancelled = false;

    const fetchTopicData = async () => {
      // Set initial state for a clean page load
      setIsLoading(true);
      setError(null);
      setContent('');
      setAsciiArt(null);
      setGenerationTime(null);
      setRelatedConcepts([]);
      setDeepDiveContent(null);
      setDeepDiveError(null);
      setIsDeepDiveLoading(false);
      setIsAncillaryLoading(true);
      setAncillaryError(null);

      const startTime = performance.now();
      
      // Step 1: Get main definition (cache or stream)
      const modelId = settingsService.getActiveModelId();
      const definitionCacheKey = `definition_${modelId}_${currentTopic.toLowerCase()}`;
      const cachedDefinition = cache.get<string>(definitionCacheKey);
      let definitionError: string | null = null;
      
      if (cachedDefinition) {
          setContent(cachedDefinition);
      } else {
          try {
              let accumulatedContent = '';
              for await (const chunk of streamDefinition(currentTopic)) {
                  if (isCancelled) return;
                  if (chunk.startsWith('[SYSTEM:RETRY]')) {
                    setError(chunk.replace('[SYSTEM:RETRY]', ''));
                  } else {
                    if (error && error.startsWith('Rate limit')) {
                      setError(null);
                    }
                    accumulatedContent += chunk;
                    setContent(accumulatedContent);
                  }
              }
              if (accumulatedContent) {
                cache.set(definitionCacheKey, accumulatedContent);
              }
          } catch (e: unknown) {
              if (!isCancelled) {
                  const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
                  definitionError = errorMessage;
                  setError(errorMessage);
                  console.error(e);
              }
          }
      }
      
      if (isCancelled) return;

      // Stop loading for main content, regardless of cache/stream
      setIsLoading(false);
      
      // If main definition failed, stop everything
      if (definitionError) {
          setIsAncillaryLoading(false);
          return;
      }

      setGenerationTime(performance.now() - startTime);

      // Step 2: Fetch Ancillary Data (Art and Concepts) - this has its own cache
      try {
        setAncillaryError(null);
        const onAncillaryRetry = (attempt: number, delay: number) => {
          if (!isCancelled) {
            setAncillaryError(`Rate limit reached. Retrying in ${delay / 1000}s...`);
          }
        };
        const data = await generateAncillaryData(currentTopic, onAncillaryRetry);
        if (!isCancelled) {
          setAncillaryError(null); // Clear retry message on success
          setAsciiArt(data.artData);
          setRelatedConcepts(data.concepts);
        }
      } catch (err) {
        if (!isCancelled) {
          const errorMessage = err instanceof Error ? err.message : 'Could not load art and concepts.';
          setAncillaryError(errorMessage);
          console.error("Failed to generate ancillary data:", err);
          setAsciiArt(createFallbackArt(currentTopic)); // Show fallback on error
        }
      } finally {
        if (!isCancelled) setIsAncillaryLoading(false);
      }
    };

    fetchTopicData();
    
    return () => {
      isCancelled = true;
    };
  }, [currentTopic, file, isApiConfigured]);

  const handleDeepDive = useCallback(async () => {
    setIsDeepDiveLoading(true);
    setDeepDiveError(null);
    try {
      const onDeepDiveRetry = (attempt: number, delay: number) => {
        setDeepDiveError(`Rate limit reached. Retrying in ${delay / 1000}s...`);
      };
      const result = await generateDeepDive(currentTopic, onDeepDiveRetry);
      setDeepDiveError(null);
      setDeepDiveContent(result);
    } catch(e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during deep dive.';
      setDeepDiveError(errorMessage);
      console.error(e);
    } finally {
      setIsDeepDiveLoading(false);
    }
  }, [currentTopic]);

  const handleWordClick = useCallback((word: string) => {
    if (isLoading || file || !isApiConfigured) return;
    const newTopic = word.trim();
    if (newTopic && newTopic.toLowerCase() !== currentTopic.toLowerCase()) {
      setCurrentTopic(newTopic);
    }
  }, [currentTopic, isLoading, file, isApiConfigured]);

  const handleSearch = useCallback(async (query: string) => {
    if (isLoading || !isApiConfigured) return;
    const trimmedQuery = query.trim();
    if (!trimmedQuery) return;

    if (file) {
      // File Q&A mode
      setIsLoading(true);
      setError(null);
      setContent('');
      setGenerationTime(null);
      
      const startTime = performance.now();
      let accumulatedContent = '';
      try {
        for await (const chunk of streamDefinition(trimmedQuery, file)) {
          if (chunk.startsWith('[SYSTEM:RETRY]')) {
            setError(chunk.replace('[SYSTEM:RETRY]', ''));
          } else {
             if (error && error.startsWith('Rate limit')) {
                setError(null);
             }
            accumulatedContent += chunk;
            setContent(accumulatedContent);
          }
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
        setError(errorMessage);
        setContent('');
        console.error(e);
      } finally {
        setIsLoading(false);
        setGenerationTime(performance.now() - startTime);
      }
    } else {
      // Topic exploration mode
      if (trimmedQuery.toLowerCase() !== currentTopic.toLowerCase()) {
        setCurrentTopic(trimmedQuery);
      }
    }
  }, [currentTopic, isLoading, file, error, isApiConfigured]);

  const handleRandom = useCallback(() => {
    if (isLoading || file || !isApiConfigured) return;
    setIsLoading(true); // Disable UI immediately
    setError(null);
    setContent('');
    setAsciiArt(null);

    const randomIndex = Math.floor(Math.random() * UNIQUE_WORDS.length);
    let randomWord = UNIQUE_WORDS[randomIndex];

    // Prevent picking the same word twice in a row
    if (randomWord.toLowerCase() === currentTopic.toLowerCase()) {
      const nextIndex = (randomIndex + 1) % UNIQUE_WORDS.length;
      randomWord = UNIQUE_WORDS[nextIndex];
    }
    setCurrentTopic(randomWord);
  }, [currentTopic, isLoading, file, isApiConfigured]);

  const handleFileUpload = useCallback((uploadedFile: File) => {
    setIsLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      setFile({
        name: uploadedFile.name,
        data: dataUrl.split(',')[1],
        mimeType: uploadedFile.type,
      });
      setCurrentTopic(uploadedFile.name); // Use filename for display
      setContent(''); // Clear previous content
      setError(null);
      // Clear all topic-specific data
      setAsciiArt(null);
      setRelatedConcepts([]);
      setDeepDiveContent(null);
      setIsLoading(false);
    };
    reader.onerror = (e) => {
      console.error("File reading error", e);
      setError("Failed to read the uploaded file.");
      setIsLoading(false);
    };
    reader.readAsDataURL(uploadedFile);
  }, []);

  const handleFileClear = useCallback(() => {
    setFile(null);
    setContent('');
    setError(null);
    setCurrentTopic('Hypertext'); // Reset to a default topic
  }, []);


  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">
          [LEXICON_NEXUS_v1.0]
        </h1>
        <div className="header-controls">
           <SearchBar 
            onSearch={handleSearch} 
            onRandom={handleRandom} 
            isLoading={isLoading || isAncillaryLoading} 
            onFileUpload={handleFileUpload}
            onClearFile={handleFileClear}
            uploadedFile={file ? { name: file.name } : null}
            onSettingsClick={() => setIsSettingsOpen(true)}
            isApiConfigured={isApiConfigured}
            />
        </div>
      </header>
      
      <main>
        {!isApiConfigured && (
          <div className="error-message">
            <p>API Key Not Configured</p>
            <p>Please add your Gemini API key in the settings panel (gear icon) to begin.</p>
          </div>
        )}

        {isApiConfigured && file && (
          <h2 className="topic-title">
            <span className="topic-title-prefix">// QUERYING FILE: </span>{currentTopic}
          </h2>
        )}

        {isApiConfigured && !file && (
          <>
            {isAncillaryLoading ? (
               <pre className="ascii-art"><LoadingSkeleton /></pre>
            ) : (
              <AsciiArtDisplay artData={asciiArt} topic={currentTopic} />
            )}
            <h2 className="topic-title">
              <span className="topic-title-prefix">// DEFINITION FOR: </span>{currentTopic}
            </h2>
          </>
        )}

        {isApiConfigured && error && (
          <div className="error-message">
            <p>{error.includes('Occurred') ? 'An Error Occurred' : 'System Message'}</p>
            <p>{error}</p>
          </div>
        )}
        
        {isApiConfigured && isLoading && content.length === 0 && !error && (
          <LoadingSkeleton />
        )}

        {isApiConfigured && content.length > 0 && (
            <ContentDisplay 
              content={content} 
              isLoading={isLoading} 
              onWordClick={handleWordClick} 
            />
        )}

        {isApiConfigured && !isLoading && !error && content.length === 0 && !file && (
          <div>
            <p>Content could not be generated.</p>
          </div>
        )}
        
        {/* Topic-only sections */}
        {isApiConfigured && !file && (content.length > 0 || !isLoading) && !error && (
          <>
            <div className="related-concepts-container">
              <h3 className="related-concepts-heading">// RELATED CONCEPTS</h3>
              {isAncillaryLoading && <div className="skeleton-bar" style={{width: '80%', height: '44px'}}></div>}
              {ancillaryError && <p className="error-message-inline">{ancillaryError}</p>}
              {!isAncillaryLoading && relatedConcepts.length > 0 && (
                  <div className="related-concepts-list">
                      {relatedConcepts.map((concept, index) => (
                          <button
                              key={index}
                              className="related-concept-item"
                              onClick={() => handleWordClick(concept)}
                              disabled={isLoading || isAncillaryLoading}
                          >
                              {concept}
                          </button>
                      ))}
                  </div>
              )}
            </div>

            {!deepDiveContent && (
              <div className="deep-dive-trigger-container">
                <button 
                  className="deep-dive-trigger" 
                  onClick={handleDeepDive}
                  disabled={isDeepDiveLoading}
                >
                  <ChevronsDown size={16} />
                  <span>[Initiate Deep Dive]</span>
                </button>
              </div>
            )}

            <DeepDiveDisplay 
              isLoading={isDeepDiveLoading}
              error={deepDiveError}
              data={deepDiveContent}
              onWordClick={handleWordClick}
            />
          </>
        )}
      </main>

      <footer className="sticky-footer">
        <div className="footer-text">
          <span className="footer-status-ok">[STATUS: OK]</span>
          <span>[USER: <a href="https://github.com/ccipher-bill" target="_blank" rel="noopener noreferrer">ccipher-bill</a>
            <button 
              onClick={() => setIsQrModalOpen(true)} 
              className="qr-code-button" 
              aria-label="Show QR code for developer's GitHub profile"
            >
              <QrCode size={16} />
            </button>]
          </span>
          <span>[SRC: Gemini]</span>
          {generationTime && <span>[LATENCY: {Math.round(generationTime)}ms]</span>}
        </div>
      </footer>

      <QRCodeModal 
        url="https://github.com/ccipher-bill"
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
      />

      <SettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => {
            setIsSettingsOpen(false);
            checkApiKey();
        }}
      />
    </div>
  );
};

export default App;