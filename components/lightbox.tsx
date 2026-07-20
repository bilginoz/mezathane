'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

interface LightboxProps {
  images: { id?: string; imageUrl?: string; src?: string; alt?: string }[];
  initialIndex?: number;
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export function Lightbox({ images, initialIndex = 0, isOpen, onClose, title }: LightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
    }
  }, [isOpen, initialIndex]);

  const resetTransform = useCallback(() => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback((idx: number) => {
    setCurrentIndex(idx);
    resetTransform();
  }, [resetTransform]);

  const prev = useCallback(() => {
    goTo(currentIndex > 0 ? currentIndex - 1 : images.length - 1);
  }, [currentIndex, images.length, goTo]);

  const next = useCallback(() => {
    goTo(currentIndex < images.length - 1 ? currentIndex + 1 : 0);
  }, [currentIndex, images.length, goTo]);

  const handleZoomIn = useCallback(() => setZoom(z => Math.min(z + 0.5, 4)), []);
  const handleZoomOut = useCallback(() => {
    setZoom(z => {
      const nz = Math.max(z - 0.5, 1);
      if (nz === 1) setPan({ x: 0, y: 0 });
      return nz;
    });
  }, []);
  const handleRotate = useCallback(() => setRotation(r => (r + 90) % 360), []);

  // Keyboard
  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape': onClose(); break;
        case 'ArrowLeft': prev(); break;
        case 'ArrowRight': next(); break;
        case '+': case '=': handleZoomIn(); break;
        case '-': handleZoomOut(); break;
        case 'r': handleRotate(); break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose, prev, next, handleZoomIn, handleZoomOut, handleRotate]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  // Mouse drag for panning when zoomed
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || zoom <= 1) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsDragging(false);

  // Scroll to zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  if (!isOpen || images.length === 0) return null;

  const currentImg = images[currentIndex]?.imageUrl ?? images[currentIndex]?.src ?? '';

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-sm"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 py-3 text-white">
          <div className="flex items-center gap-3">
            <span className="text-sm font-mono text-white/60">
              {currentIndex + 1} / {images.length}
            </span>
            {title && <span className="text-sm text-white/80 hidden sm:block">{title}</span>}
          </div>
          <div className="flex items-center gap-1">
            <button onClick={handleZoomOut} disabled={zoom <= 1}
              className="rounded-lg p-2 hover:bg-white/10 transition-colors disabled:opacity-30" title="Uzaklaştır (-)">
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-xs font-mono w-12 text-center text-white/60">{Math.round(zoom * 100)}%</span>
            <button onClick={handleZoomIn} disabled={zoom >= 4}
              className="rounded-lg p-2 hover:bg-white/10 transition-colors disabled:opacity-30" title="Yakınlaştır (+)">
              <ZoomIn className="h-5 w-5" />
            </button>
            <button onClick={handleRotate}
              className="rounded-lg p-2 hover:bg-white/10 transition-colors" title="Döndür (R)">
              <RotateCw className="h-5 w-5" />
            </button>
            <button onClick={onClose}
              className="rounded-lg p-2 hover:bg-white/10 transition-colors ml-2" title="Kapat (Esc)">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Main image area */}
        <div
          className="flex-1 relative overflow-hidden select-none"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center"
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom}) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.2s ease',
              }}
            >
              <Image
                src={currentImg}
                alt={title || 'Görsel'}
                fill
                className="object-contain pointer-events-none"
                sizes="100vw"
                quality={90}
                priority
              />
            </motion.div>
          </AnimatePresence>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              <button onClick={prev}
                className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors z-10">
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button onClick={next}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-3 text-white hover:bg-black/70 transition-colors z-10">
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="flex justify-center gap-2 px-4 py-3 overflow-x-auto scrollbar-none">
            {images.map((img, idx) => (
              <button
                key={img.id ?? idx}
                onClick={() => goTo(idx)}
                className={`flex-shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-all ${
                  idx === currentIndex ? 'border-[#d4af37] scale-110' : 'border-transparent opacity-50 hover:opacity-80'
                }`}
              >
                <div className="relative w-full h-full">
                  <Image src={img.imageUrl ?? img.src ?? ''} alt={img.alt ?? ''} fill className="object-cover" sizes="56px" />
                </div>
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
