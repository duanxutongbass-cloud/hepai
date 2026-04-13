import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Edit3, Highlighter, Eraser, Mic, Layers, Trash2, Grid, CheckCircle, Bell, Menu, PlayCircle, RefreshCw, Music, Download, Loader2, Save, Undo, Type, X, MousePointer2, Maximize2, Minimize2, PenTool, Settings2, Play, Pause, Volume2 } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import CanvasDraw from 'react-canvas-draw';
import { storageService, ScoreData, PlacedObject } from '../services/storageService';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ReaderViewProps {
  onBack: () => void;
  scoreId: string | null;
  isAdmin: boolean;
}

const musicSymbols = ['p', 'pp', 'mp', 'mf', 'f', 'ff', 'sfz', 'cresc.', 'dim.', 'tr', '♮', '♯', '♭'];
const fingerings = ['1', '2', '3', '4', '5'];

export default function ReaderView({ onBack, scoreId, isAdmin }: ReaderViewProps) {
  const [activeTool, setActiveTool] = useState<'select' | 'edit' | 'highlight' | 'eraser' | 'stamp' | 'text'>('select');
  const [selectedStamp, setSelectedStamp] = useState<{ type: 'symbol' | 'fingering' | 'text', content: string } | null>(null);
  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [noteType, setNoteType] = useState<'personal' | 'admin'>('personal');
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [pdfFile, setPdfFile] = useState<string | Blob | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [currentPartIndex, setCurrentPartIndex] = useState<number>(-1); // -1 means main score
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [textInput, setTextInput] = useState<{ x: number, y: number } | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const [isSymbolsPanelOpen, setIsSymbolsPanelOpen] = useState(false);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  
  // Audio Playback State
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioProgress, setAudioProgress] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevPageRef = useRef<number>(pageNumber);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<CanvasDraw>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);
  const [canvasHeight, setCanvasHeight] = useState<number>(1131);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        const isLandscape = window.innerWidth > window.innerHeight;
        // If in fullscreen, we might want to force orientation or follow window
        if (isFullscreen) {
          setContainerWidth(window.innerWidth);
          setCanvasHeight(window.innerHeight);
          // Auto-detect orientation if not manually set? 
          // For now, let's just ensure the container fills the screen
        } else {
          const width = Math.min(containerRef.current.clientWidth - 40, 800);
          setContainerWidth(width);
          setCanvasHeight(width * 1.414);
        }
      }
    };
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, [isFullscreen, orientation]);

  useEffect(() => {
    const loadScore = async () => {
      if (!scoreId) return;
      setIsLoading(true);
      const saved = await storageService.getScore(scoreId);
      if (saved) {
        setScoreData(saved);
        setPdfFile(saved.blob);
        setIsOffline(true);
        if (saved.annotations && saved.annotations[1] && canvasRef.current) {
          canvasRef.current.loadSaveData(saved.annotations[1], true);
        }
        if (saved.objects && saved.objects[1]) {
          setPlacedObjects(saved.objects[1]);
        }
      } else if (scoreId === 'sample-score') {
        // Fallback for sample if not in DB
        const response = await fetch('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf');
        const blob = await response.blob();
        const sample: ScoreData = { 
          id: 'sample-score', 
          title: '月光奏鸣曲', 
          blob, 
          type: 'single',
          updatedAt: Date.now() 
        };
        setScoreData(sample);
        setPdfFile(blob);
      }
      setIsLoading(false);
    };
    loadScore();
  }, [scoreId]);

  const handlePartChange = (index: number) => {
    if (!scoreData) return;
    setCurrentPartIndex(index);
    if (index === -1) {
      setPdfFile(scoreData.blob);
    } else {
      setPdfFile(scoreData.parts![index].blob);
    }
    setPageNumber(1);
    if (canvasRef.current) canvasRef.current.clear();
    setPlacedObjects([]);
  };

  useEffect(() => {
    const handlePageSwitch = async () => {
      if (scoreData) {
        // Save PREVIOUS page state before loading new one
        const annotations = canvasRef.current ? canvasRef.current.getSaveData() : (scoreData.annotations?.[prevPageRef.current] || '');
        const updatedScore: ScoreData = {
          ...scoreData,
          annotations: { ...(scoreData.annotations || {}), [prevPageRef.current]: annotations },
          objects: { ...(scoreData.objects || {}), [prevPageRef.current]: placedObjects },
          updatedAt: Date.now()
        };
        await storageService.saveScore(updatedScore);
        setScoreData(updatedScore);

        // Load NEW page state
        if (canvasRef.current) {
          canvasRef.current.clear();
          const newData = updatedScore.annotations?.[pageNumber];
          if (newData) {
            // Small delay to ensure canvas is ready for loading
            setTimeout(() => {
              if (canvasRef.current) {
                canvasRef.current.loadSaveData(newData, true);
              }
            }, 50);
          }
        }
        setPlacedObjects(updatedScore.objects?.[pageNumber] || []);
        setTextInput(null);
        
        // Update ref for next switch
        prevPageRef.current = pageNumber;
      }
    };

    handlePageSwitch();
  }, [pageNumber]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.parentElement?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const toggleOrientation = () => {
    setOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait');
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && pageNumber < numPages) {
      setPageNumber(prev => prev + 1);
    } else if (isRightSwipe && pageNumber > 1) {
      setPageNumber(prev => prev - 1);
    }
    setTouchStart(null);
  };
  const hexToRgba = (hex: string, alpha: number) => {
    let r = 0, g = 0, b = 0;
    if (hex.length === 4) {
      r = parseInt(hex[1] + hex[1], 16);
      g = parseInt(hex[2] + hex[2], 16);
      b = parseInt(hex[3] + hex[3], 16);
    } else if (hex.length === 7) {
      r = parseInt(hex.slice(1, 3), 16);
      g = parseInt(hex.slice(3, 5), 16);
      b = parseInt(hex.slice(5, 7), 16);
    }
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const saveSpecificPageState = async (currentObjects: PlacedObject[], isManual: boolean = false) => {
    if (!scoreData) return;
    
    // Capture canvas data immediately before any other operations
    const annotations = canvasRef.current ? canvasRef.current.getSaveData() : (scoreData.annotations?.[pageNumber] || '');
    
    const isAdminScore = !scoreData.uploaderId || scoreData.uploaderId === 'admin';
    const shouldFork = !isAdmin && isAdminScore;

    const updatedScore: ScoreData = {
      ...scoreData,
      annotations: { ...(scoreData.annotations || {}), [pageNumber]: annotations },
      objects: { ...(scoreData.objects || {}), [pageNumber]: currentObjects },
      updatedAt: Date.now()
    };

    if (shouldFork) {
      // Create a fork for the member
      const fork: ScoreData = {
        ...updatedScore,
        id: Math.random().toString(36).substr(2, 9),
        originalScoreId: scoreData.id,
        uploaderId: 'current-user',
        uploaderName: '张三',
        title: `${scoreData.title} (我的批注)`
      };
      await storageService.saveScore(fork);
      setScoreData(fork);
      // Update URL to the new score if needed, but for now just keep the state
    } else {
      await storageService.saveScore(updatedScore);
      setScoreData(updatedScore);
    }

    if (isManual) setIsManualSaving(true);
    if (isManual) {
      setTimeout(() => setIsManualSaving(false), 800);
    }
  };

  const saveCurrentPageState = () => saveSpecificPageState(placedObjects, false);
  
  const handleManualSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveSpecificPageState(placedObjects, true);
  };

  const handleCanvasChange = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      saveCurrentPageState();
    }, 1000); // Debounce save for 1 second after drawing
  };

  const handleScoreClick = (e: React.MouseEvent) => {
    // If clicking on the text input form itself, don't trigger a new placement
    if ((e.target as HTMLElement).closest('form')) return;
    // If we are in select mode or just dragging, don't place a new object
    if (activeTool === 'select' || draggingId) return;
    
    if (activeTool !== 'stamp' && activeTool !== 'text') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeTool === 'stamp' && selectedStamp) {
      const newObj: PlacedObject = {
        id: Math.random().toString(36).substr(2, 9),
        type: selectedStamp.type,
        content: selectedStamp.content,
        x,
        y,
        color: activeColor,
      };
      const newObjects = [...placedObjects, newObj];
      setPlacedObjects(newObjects);
      saveSpecificPageState(newObjects);
    } else if (activeTool === 'text') {
      setTextInput({ x, y });
      setCurrentText('');
    }
  };

  const handleTextSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (textInput && currentText.trim()) {
      const newObj: PlacedObject = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        content: currentText,
        x: textInput.x,
        y: textInput.y,
        color: activeColor,
      };
      const newObjects = [...placedObjects, newObj];
      setPlacedObjects(newObjects);
      saveSpecificPageState(newObjects);
    }
    setTextInput(null);
  };

  const removeObject = (id: string) => {
    const newObjects = placedObjects.filter(o => o.id !== id);
    setPlacedObjects(newObjects);
    saveSpecificPageState(newObjects);
  };

  const handleDragStart = (e: React.MouseEvent, obj: PlacedObject) => {
    e.stopPropagation();
    setDraggingId(obj.id);
    const rect = containerRef.current?.getBoundingClientRect();
    if (rect) {
      setDragOffset({
        x: e.clientX - obj.x,
        y: e.clientY - obj.y
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingId) return;
    
    const rect = containerRef.current?.querySelector('.max-w-4xl')?.getBoundingClientRect();
    if (rect) {
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      setPlacedObjects(prev => prev.map(obj => 
        obj.id === draggingId ? { ...obj, x, y } : obj
      ));
    }
  };

  const handleDragEnd = () => {
    if (draggingId) {
      saveSpecificPageState(placedObjects);
      setDraggingId(null);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setIsLoading(false);
  };

  useEffect(() => {
    if (scoreData?.audioBlob && !audioRef.current) {
      const url = URL.createObjectURL(scoreData.audioBlob);
      audioRef.current = new Audio(url);
      
      const audio = audioRef.current;
      audio.addEventListener('timeupdate', () => {
        setAudioProgress((audio.currentTime / audio.duration) * 100);
      });
      audio.addEventListener('loadedmetadata', () => {
        setAudioDuration(audio.duration);
      });
      audio.addEventListener('ended', () => {
        setIsPlaying(false);
        setAudioProgress(0);
      });

      return () => {
        audio.pause();
        URL.revokeObjectURL(url);
        audioRef.current = null;
      };
    }
  }, [scoreData]);

  const togglePlayback = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = (parseFloat(e.target.value) / 100) * audioDuration;
    audioRef.current.currentTime = newTime;
    setAudioProgress(parseFloat(e.target.value));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  const handleSaveOffline = async () => {
    if (!scoreData) return;
    setIsSaving(true);
    try {
      const response = await fetch('https://raw.githubusercontent.com/mozilla/pdf.js/ba2edeae/web/compressed.tracemonkey-pldi-09.pdf');
      const blob = await response.blob();
      const newScore: ScoreData = {
        ...scoreData,
        blob: blob,
        updatedAt: Date.now(),
      };
      await storageService.saveScore(newScore);
      setScoreData(newScore);
      setPdfFile(blob);
      setIsOffline(true);
    } catch (error) {
      console.error('Failed to save for offline:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const selectStamp = (type: 'symbol' | 'fingering', content: string) => {
    setActiveTool('stamp');
    setSelectedStamp({ type, content });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      <header className={`bg-background flex justify-between items-center w-full px-6 py-4 border-b border-outline-variant/10 transition-all ${isFullscreen ? 'h-0 py-0 overflow-hidden border-none' : ''}`}>
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="text-primary hover:bg-surface-container-high p-2 rounded-xl transition-all">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="text-xl font-bold text-primary tracking-widest uppercase font-headline">合拍</h1>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleFullscreen}
            className="p-2 rounded-xl text-primary hover:bg-surface-container-high transition-all"
            title={isFullscreen ? "退出全屏" : "全屏模式"}
          >
            {isFullscreen ? <Minimize2 className="w-6 h-6" /> : <Maximize2 className="w-6 h-6" />}
          </button>
          {isOffline ? (
            <div className="flex items-center gap-2 bg-tertiary/10 px-3 py-1.5 rounded-full border border-tertiary/20">
              <CheckCircle className="text-tertiary w-4 h-4 fill-tertiary/20" />
              <span className="text-[10px] font-bold text-tertiary uppercase tracking-tighter">已下载 - 离线可用</span>
            </div>
          ) : (
            <button 
              onClick={handleSaveOffline}
              disabled={isSaving}
              className="flex items-center gap-2 bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-full border border-primary/20 transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin text-primary" /> : <Download className="text-primary w-4 h-4" />}
              <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">
                {isSaving ? '正在下载...' : '下载以离线使用'}
              </span>
            </button>
          )}
          <button 
            onClick={handleManualSave}
            disabled={isManualSaving}
            className={`p-2 rounded-xl transition-all flex items-center gap-2 ${
              isManualSaving ? 'bg-tertiary/20 text-tertiary' : 'text-primary hover:bg-surface-container-high'
            }`}
            title="保存所有更改"
          >
            {isManualSaving ? (
              <>
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-[10px] font-bold uppercase tracking-tighter">保存中...</span>
              </>
            ) : (
              <Save className="w-6 h-6" />
            )}
          </button>
        </div>
      </header>

      <nav className={`bg-surface-container-low px-6 py-2 flex flex-wrap items-center justify-between gap-4 border-b border-outline-variant/10 transition-all ${isFullscreen ? 'h-0 py-0 overflow-hidden border-none' : ''}`}>
        <div className="flex items-center gap-2">
          <span className="text-on-background/70 text-sm font-medium">{scoreData?.title || '正在加载...'}</span>
          {scoreData?.parts && scoreData.parts.length > 0 && (
            <>
              <span className="text-outline-variant text-xs mx-2">|</span>
              <div className="flex items-center gap-2 bg-background p-1 rounded-lg border border-outline-variant/10">
                <button 
                  onClick={() => handlePartChange(-1)}
                  className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${currentPartIndex === -1 ? 'bg-primary text-on-primary' : 'text-on-background/50 hover:text-primary'}`}
                >
                  总谱
                </button>
                {scoreData.parts.map((part, idx) => {
                  // Visibility logic: Admin sees all, members see assigned
                  const isVisible = isAdmin || !part.assignedTo?.length || part.assignedTo.includes('VN'); // Mock 'VN' as current user
                  if (!isVisible) return null;

                  return (
                    <button 
                      key={part.id}
                      onClick={() => handlePartChange(idx)}
                      className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${currentPartIndex === idx ? 'bg-primary text-on-primary' : 'text-on-background/50 hover:text-primary'}`}
                    >
                      {part.name}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <span className="text-outline-variant text-xs mx-2">|</span>
          <button 
            onClick={() => setIsToolbarOpen(!isToolbarOpen)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              isToolbarOpen ? 'bg-primary text-on-primary' : 'bg-surface-container text-primary hover:bg-surface-bright'
            }`}
          >
            <PenTool className="w-4 h-4" />
            {isToolbarOpen ? '收起工具' : '开启批注'}
          </button>
        </div>

        <div className="flex items-center bg-background p-1 rounded-full border border-outline-variant/15">
          <button 
            onClick={() => setNoteType('personal')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              noteType === 'personal' ? 'bg-primary text-on-primary' : 'text-on-background/50 hover:text-on-background'
            }`}
          >
            个人笔记
          </button>
          <button 
            onClick={() => setNoteType('admin')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${
              noteType === 'admin' ? 'bg-primary text-on-primary' : 'text-on-background/50 hover:text-on-background'
            }`}
          >
            管理员批注
          </button>
        </div>

        {noteType === 'admin' && (
          <div className="flex items-center gap-3 bg-secondary/10 px-4 py-2 rounded-xl border border-secondary/20 animate-pulse">
            <RefreshCw className="text-secondary w-4 h-4 animate-spin-slow" />
            <span className="text-xs font-bold text-secondary uppercase tracking-tight">管理员已更新批注</span>
          </div>
        )}
      </nav>

      <main className="flex-1 relative overflow-hidden flex flex-row" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
        <section ref={containerRef} className={`flex-1 overflow-y-auto custom-scrollbar bg-surface-container-low transition-all ${isFullscreen ? 'p-0' : 'p-4 md:p-8'} flex flex-col items-center`}>
          <div 
            className={`max-w-4xl w-full bg-white relative overflow-hidden min-h-[600px] flex justify-center transition-all duration-500 ${isFullscreen ? 'shadow-none rounded-none' : 'shadow-2xl rounded-lg'} ${orientation === 'landscape' ? 'rotate-90' : ''}`}
            style={{ 
              width: isFullscreen ? (orientation === 'landscape' ? '100vh' : '100vw') : containerWidth, 
              height: isFullscreen ? (orientation === 'landscape' ? '100vw' : '100vh') : canvasHeight 
            }}
            onClick={handleScoreClick}
            onMouseMove={handleMouseMove}
            onMouseUp={handleDragEnd}
            onMouseLeave={handleDragEnd}
          >
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
              </div>
            )}
            
            {/* PDF Layer */}
            <div className="absolute inset-0 z-0 flex items-center justify-center">
              {pdfFile && (
                <Document
                  file={pdfFile}
                  onLoadSuccess={onDocumentLoadSuccess}
                  loading={<Loader2 className="w-12 h-12 animate-spin text-primary" />}
                  className="flex justify-center"
                >
                  <Page 
                    pageNumber={pageNumber} 
                    width={isFullscreen ? (orientation === 'landscape' ? window.innerWidth * 0.9 : window.innerWidth) : containerWidth}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                </Document>
              )}
            </div>

            {/* Drawing Layer */}
            <div className={`absolute inset-0 z-10 ${activeTool === 'stamp' || activeTool === 'text' || activeTool === 'select' ? 'pointer-events-none' : ''}`}>
              <CanvasDraw
                ref={canvasRef}
                canvasWidth={isFullscreen ? window.innerWidth : containerWidth}
                canvasHeight={isFullscreen ? window.innerHeight : canvasHeight}
                brushColor={activeTool === 'highlight' ? hexToRgba(activeColor, 0.3) : activeColor}
                brushRadius={activeTool === 'highlight' ? 12 : 2}
                lazyRadius={0}
                backgroundColor="transparent"
                hideGrid={true}
                className="cursor-crosshair"
                onChange={handleCanvasChange}
              />
            </div>

            {/* Objects Layer */}
            <div className="absolute inset-0 z-20 pointer-events-none">
              {placedObjects.map(obj => (
                <div 
                  key={obj.id}
                  className={`absolute pointer-events-auto group cursor-move ${draggingId === obj.id ? 'opacity-50 scale-110' : ''}`}
                  style={{ left: obj.x, top: obj.y, transform: 'translate(-50%, -50%)' }}
                  onMouseDown={(e) => handleDragStart(e, obj)}
                >
                  <div 
                    className={`
                      ${obj.type === 'fingering' ? 'text-sm font-headline font-bold' : ''}
                      ${obj.type === 'symbol' ? 'text-2xl font-serif italic font-bold' : ''}
                      ${obj.type === 'text' ? 'bg-surface-container-high/40 px-2 py-1 rounded text-sm font-medium border border-outline-variant/10 whitespace-nowrap' : ''}
                    `}
                    style={{ color: obj.color || '#000000' }}
                  >
                    {obj.content}
                  </div>
                  <button 
                    onClick={(e) => { e.stopPropagation(); removeObject(obj.id); }}
                    className="absolute -top-2 -right-2 bg-secondary text-on-secondary rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-50"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}

              {textInput && (
                <div 
                  className="absolute pointer-events-auto z-30"
                  style={{ left: textInput.x, top: textInput.y, transform: 'translate(-50%, -50%)' }}
                >
                  <form onSubmit={handleTextSubmit} className="flex gap-2 bg-surface-bright p-2 rounded-lg shadow-xl border border-primary">
                    <input 
                      autoFocus
                      className="bg-transparent border-none outline-none text-sm min-w-[100px]"
                      style={{ color: activeColor }}
                      placeholder="输入笔记..."
                      value={currentText}
                      onChange={(e) => setCurrentText(e.target.value)}
                      onBlur={() => !currentText && setTextInput(null)}
                    />
                    <button type="submit" className="text-primary"><CheckCircle className="w-4 h-4" /></button>
                  </form>
                </div>
              )}
            </div>

            <div className="absolute inset-0 sheet-canvas pointer-events-none opacity-10 z-30"></div>
          </div>
        </section>

        {/* Floating Toolbar */}
        <div className={`fixed right-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 transition-all duration-500 ${isToolbarOpen ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0 pointer-events-none'}`}>
          <div className="bg-surface-bright/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-outline-variant/10 flex flex-col gap-2">
            <button 
              onClick={() => setActiveTool('select')}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                activeTool === 'select' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-background/50 hover:bg-surface-container-high'
              }`}
              title="选择与移动"
            >
              <MousePointer2 className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setActiveTool('edit')}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                activeTool === 'edit' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-background/50 hover:bg-surface-container-high'
              }`}
              title="画笔"
            >
              <Edit3 className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setActiveTool('highlight')}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                activeTool === 'highlight' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-background/50 hover:bg-surface-container-high'
              }`}
              title="荧光笔"
            >
              <Highlighter className="w-6 h-6" />
            </button>
            <button 
              onClick={() => setActiveTool('text')}
              className={`w-12 h-12 flex items-center justify-center rounded-xl transition-all ${
                activeTool === 'text' ? 'bg-primary text-on-primary shadow-lg' : 'text-on-background/50 hover:bg-surface-container-high'
              }`}
              title="文本笔记"
            >
              <Type className="w-6 h-6" />
            </button>
            <div className="h-px bg-outline-variant/20 mx-2 my-1"></div>
            <button 
              onClick={() => canvasRef.current?.undo()}
              className="w-12 h-12 flex items-center justify-center rounded-xl text-on-background/50 hover:bg-surface-container-high transition-all"
              title="撤销"
            >
              <Undo className="w-6 h-6" />
            </button>
            <button 
              onClick={() => {
                canvasRef.current?.clear();
                setPlacedObjects([]);
              }}
              className="w-12 h-12 flex items-center justify-center rounded-xl text-on-background/50 hover:bg-surface-container-high transition-all"
              title="清空"
            >
              <Trash2 className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-surface-bright/90 backdrop-blur-xl p-2 rounded-2xl shadow-2xl border border-outline-variant/10 flex flex-col gap-2">
            {['#000000', '#D32F2F', '#1976D2', '#388E3C'].map(color => (
              <button 
                key={color}
                onClick={() => setActiveColor(color)}
                className={`w-10 h-10 rounded-full border-2 transition-all ${
                  activeColor === color ? 'border-primary scale-110 shadow-md' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
            <button 
              onClick={() => setIsSymbolsPanelOpen(!isSymbolsPanelOpen)}
              className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                isSymbolsPanelOpen ? 'bg-primary text-on-primary shadow-lg' : 'bg-surface-container text-on-background/50 hover:bg-surface-container-high'
              }`}
              title="音乐术语与指法"
            >
              <Settings2 className="w-5 h-5" />
            </button>
          </div>

          {/* Symbols & Fingerings Panel */}
          {isSymbolsPanelOpen && (
            <div className="absolute right-16 top-0 w-48 bg-surface-bright/95 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-outline-variant/10 animate-in fade-in slide-in-from-right-4 duration-300 z-[70]">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest">音乐术语</h3>
                <button onClick={() => setIsSymbolsPanelOpen(false)}>
                  <X className="w-3 h-3 text-on-background/30" />
                </button>
              </div>
              <div className="grid grid-cols-4 gap-2 mb-4">
                {musicSymbols.map(symbol => (
                  <button
                    key={symbol}
                    onClick={() => {
                      setActiveTool('stamp');
                      setSelectedStamp({ type: 'symbol', content: symbol });
                    }}
                    className={`h-8 flex items-center justify-center rounded-lg text-sm font-serif transition-all ${
                      selectedStamp?.content === symbol && activeTool === 'stamp'
                        ? 'bg-primary text-on-primary shadow-md scale-110'
                        : 'bg-surface-container-low text-on-background/70 hover:bg-primary/10 hover:text-primary'
                    }`}
                  >
                    {symbol}
                  </button>
                ))}
              </div>

              <h3 className="text-[10px] font-bold text-primary uppercase tracking-widest mb-3">指法</h3>
              <div className="grid grid-cols-5 gap-2">
                {fingerings.map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      setActiveTool('stamp');
                      setSelectedStamp({ type: 'fingering', content: num });
                    }}
                    className={`h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all ${
                      selectedStamp?.content === num && activeTool === 'stamp'
                        ? 'bg-secondary text-on-secondary shadow-md scale-110'
                        : 'bg-surface-container-low text-on-background/70 hover:bg-secondary/10 hover:text-secondary'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {isFullscreen && (
          <div className="fixed top-6 left-6 z-[60] flex gap-2">
            <button 
              onClick={() => setIsToolbarOpen(!isToolbarOpen)}
              className="bg-black/20 hover:bg-black/40 backdrop-blur-md text-white p-3 rounded-full transition-all"
              title={isToolbarOpen ? "隐藏工具" : "显示工具"}
            >
              <PenTool className="w-6 h-6" />
            </button>
            <button 
              onClick={toggleOrientation}
              className="bg-black/20 hover:bg-black/40 backdrop-blur-md text-white p-3 rounded-full transition-all"
              title="切换横竖屏"
            >
              <RefreshCw className={`w-6 h-6 transition-transform duration-500 ${orientation === 'landscape' ? 'rotate-90' : ''}`} />
            </button>
          </div>
        )}

        {isFullscreen && (
          <button 
            onClick={toggleFullscreen}
            className="fixed top-6 right-6 z-[60] bg-black/20 hover:bg-black/40 backdrop-blur-md text-white p-3 rounded-full transition-all"
          >
            <Minimize2 className="w-6 h-6" />
          </button>
        )}

        <div className={`absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 px-8 py-3 bg-background/90 backdrop-blur-xl rounded-full border border-outline-variant/10 shadow-2xl z-50 transition-all ${isFullscreen ? 'opacity-0 hover:opacity-100 translate-y-4 hover:translate-y-0' : 'opacity-100'}`}>
          <div className="flex items-center gap-4">
            <button 
              disabled={pageNumber <= 1}
              onClick={() => setPageNumber(prev => prev - 1)}
              className="text-on-background/50 hover:text-primary transition-colors disabled:opacity-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-headline font-bold text-sm tracking-widest text-primary min-w-[80px] text-center">
              {pageNumber} / {numPages || '--'} 页
            </span>
            <button 
              disabled={pageNumber >= numPages}
              onClick={() => setPageNumber(prev => prev + 1)}
              className="text-on-background/50 hover:text-primary transition-colors disabled:opacity-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {scoreData?.audioBlob && (
            <>
              <div className="w-px h-6 bg-outline-variant/20" />
              <div className="flex items-center gap-4 min-w-[300px]">
                <button 
                  onClick={togglePlayback}
                  className="w-10 h-10 flex items-center justify-center bg-primary text-on-primary rounded-full shadow-lg hover:scale-105 transition-all"
                >
                  {isPlaying ? <Pause className="w-5 h-5" /> : <PlayCircle className="w-6 h-6" />}
                </button>
                <div className="flex-1 flex flex-col gap-1">
                  <div className="flex justify-between text-[10px] font-bold text-on-background/40 uppercase tracking-tighter">
                    <span>{formatTime((audioProgress / 100) * audioDuration)}</span>
                    <span>{formatTime(audioDuration)}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={audioProgress}
                    onChange={handleProgressChange}
                    className="w-full h-1.5 bg-surface-container rounded-full appearance-none cursor-pointer accent-primary"
                  />
                </div>
                <Volume2 className="w-4 h-4 text-on-background/40" />
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
