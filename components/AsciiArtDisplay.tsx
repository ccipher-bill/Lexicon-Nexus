/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useMemo } from 'react';
import type { AsciiArtData } from '../services/geminiService';

interface AsciiArtDisplayProps {
  artData: AsciiArtData | null;
  topic: string;
}

interface TooltipState {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

const AsciiArtDisplay: React.FC<AsciiArtDisplayProps> = ({ artData, topic }) => {
  const [visibleContent, setVisibleContent] = useState<string>('*');
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  useEffect(() => {
    let intervalId: number;
    setTooltip(null); // Hide tooltip on new art

    if (artData) {
      setVisibleContent('');
      setIsStreaming(true);

      const fullText = artData.art;
      let currentIndex = 0;
      
      intervalId = window.setInterval(() => {
        if (currentIndex < fullText.length) {
          setVisibleContent(prev => prev + fullText[currentIndex]);
          currentIndex++;
        } else {
          window.clearInterval(intervalId);
          setIsStreaming(false);
        }
      }, 5);

    } else {
      setVisibleContent('*');
      setIsStreaming(false);
    }
    
    return () => window.clearInterval(intervalId);
  }, [artData]);

  const hotspotMap = useMemo(() => {
    if (!artData?.hotspots) return new Map();
    const map = new Map<string, string>();
    for (const spot of artData.hotspots) {
      const key = `${spot.y}-${spot.x}`;
      map.set(key, spot.concept);
    }
    return map;
  }, [artData]);

  const handleMouseOver = (e: React.MouseEvent<HTMLSpanElement>, concept: string) => {
    setTooltip({
      visible: true,
      content: concept,
      x: e.clientX,
      y: e.clientY,
    });
  };

  const handleMouseOut = () => {
    setTooltip(null);
  };

  const renderInteractiveArt = () => {
    if (!artData) return null;

    return artData.art.split('\n').map((line, y) => (
      <React.Fragment key={y}>
        {(() => {
          const lineElements: React.ReactNode[] = [];
          let currentText = '';

          for (let x = 0; x < line.length; x++) {
            const char = line[x];
            const key = `${y}-${x}`;
            
            if (hotspotMap.has(key)) {
              if (currentText.length > 0) {
                // Key is based on starting position of the text block
                lineElements.push(<React.Fragment key={`text-${y}-${x - currentText.length}`}>{currentText}</React.Fragment>);
                currentText = '';
              }
              
              const concept = hotspotMap.get(key)!;
              lineElements.push(
                <span
                  key={`hotspot-${key}`}
                  className="interactive-char"
                  onMouseOver={(e) => handleMouseOver(e, concept)}
                  onMouseOut={handleMouseOut}
                >
                  {char}
                </span>
              );
            } else {
              currentText += char;
            }
          }

          if (currentText.length > 0) {
            lineElements.push(<React.Fragment key={`text-end-${y}`}>{currentText}</React.Fragment>);
          }
          
          return lineElements;
        })()}
        {'\n'}
      </React.Fragment>
    ));
};

  const accessibilityLabel = `ASCII art for ${topic}`;

  return (
    <>
      {tooltip?.visible && (
        <div
          className="ascii-tooltip"
          style={{
            left: `${tooltip.x}px`,
            top: `${tooltip.y}px`,
          }}
        >
          {tooltip.content}
        </div>
      )}
      <pre className="ascii-art" aria-label={accessibilityLabel}>
        {isStreaming ? (
          <>
            {visibleContent}
            <span className="blinking-cursor">█</span>
          </>
        ) : (
          renderInteractiveArt()
        )}
      </pre>
    </>
  );
};

export default AsciiArtDisplay;
