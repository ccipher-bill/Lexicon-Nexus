/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { X } from 'lucide-react';

interface QRCodeModalProps {
  url: string;
  isOpen: boolean;
  onClose: () => void;
}

const QRCodeModal: React.FC<QRCodeModalProps> = ({ url, isOpen, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (isOpen && canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 256,
        margin: 2,
        color: {
          dark: '#00ffff', // QR code dots (accent color)
          light: '#00fc43'  // QR code background (background color)
        }
      }, (error) => {
        if (error) console.error('Error generating QR code:', error);
      });
    }
  }, [isOpen, url]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="qr-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="qr-modal-content" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="qr-modal-close-button" aria-label="Close QR code modal">
          <X size={24} />
        </button>
        <canvas ref={canvasRef}></canvas>
        <p className="qr-modal-text">Scan to visit on GitHub</p>
      </div>
    </div>
  );
};

export default QRCodeModal;
