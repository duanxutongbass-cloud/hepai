import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Edit3, Highlighter, Eraser, Mic, Layers, Trash2, Grid, CheckCircle, Bell, Menu, PlayCircle, RefreshCw, Music, Download, Loader2, Save, Undo, Type, X, MousePointer2, Maximize2, Minimize2, PenTool, Settings2, Play, Pause, Volume2, Activity, Share2, Radio, Heart, ShieldAlert, UserCog, MessageSquare, Battery, Wifi, ChevronDown, AlertCircle } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';
import CanvasDraw from 'react-canvas-draw';
import { storageService, ScoreData, PlacedObject } from '../services/storageService';
import { apiService } from '../services/apiService';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// Set up PDF.js worker - Use a more stable configuration for high-security or complex environments
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface ReaderViewProps {
  onBack: () => void;
  scoreId: string | null;
  isAdmin: boolean;
  onNavigateScore?: (scoreId: string) => void;
  initialFullscreen?: boolean;
}

const musicSymbols = ['p', 'pp', 'mp', 'mf', 'f', 'ff', 'sfz', 'cresc.', 'dim.', 'tr', '♮', '♯', '♭'];
const fingerings = ['1', '2', '3', '4', '5'];

export default function ReaderView({ onBack, scoreId, isAdmin, onNavigateScore, initialFullscreen }: ReaderViewProps) {
  const [activeTool, setActiveTool] = useState<'select' | 'edit' | 'highlight' | 'eraser' | 'stamp' | 'text'>('select');
  const [selectedStamp, setSelectedStamp] = useState<{ type: 'symbol' | 'fingering' | 'text', content: string } | null>(null);
  const [activeColor, setActiveColor] = useState<string>('#000000');
  const [noteType, setNoteType] = useState<'personal' | 'admin'>('personal');
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [isOffline, setIsOffline] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pdfFile, setPdfFile] = useState<string | Blob | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [currentPartIndex, setCurrentPartIndex] = useState<number>(-1); // -1 means main score
  const [placedObjects, setPlacedObjects] = useState<PlacedObject[]>([]);
  const [textInput, setTextInput] = useState<{ x: number, y: number } | null>(null);
  const [currentText, setCurrentText] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number }>({ x: 0, y: 0 });
  const [isManualSaving, setIsManualSaving] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(initialFullscreen || false);
  const [isToolbarOpen, setIsToolbarOpen] = useState(true);
  const [isSymbolsPanelOpen, setIsSymbolsPanelOpen] = useState(false);
  const [isAnnotationPanelOpen, setIsAnnotationPanelOpen] = useState(false);
  const [isBluetoothPanelOpen, setIsBluetoothPanelOpen] = useState(false);
  const [showUI, setShowUI] = useState(!initialFullscreen);
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [programIds, setProgramIds] = useState<string[]>([]);
  const [isMetronomeOpen, setIsMetronomeOpen] = useState(false);
  const [isPartsMenuOpen, setIsPartsMenuOpen] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [isMetronomePlaying, setIsMetronomePlaying] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [pushFeedback, setPushFeedback] = useState<string | null>(null);
  const [isRoleRequestOpen, setIsRoleRequestOpen] = useState(false);
  const [latency, setLatency] = useState(12);
  const [battery, setBattery] = useState(85);
  const [readingMode, setReadingMode] = useState<'normal' | 'sepia' | 'night'>('normal');
  const [isTwoPageView, setIsTwoPageView] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [isSmartCrop, setIsSmartCrop] = useState(false);
  const [isDisplayMenuOpen, setIsDisplayMenuOpen] = useState(false);
  const [pedalConfig, setPedalConfig] = useState<any>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const metronomeAudioContext = useRef<AudioContext | null>(null);
  const globalStartTimeRef = useRef<number>(Date.now());

  // PDF URL Management
  useEffect(() => {
    if (pdfFile instanceof Blob) {
      const url = URL.createObjectURL(pdfFile);
      setPdfUrl(url);
      return () => URL.revokeObjectURL(url);
    } else if (typeof pdfFile === 'string') {
      setPdfUrl(pdfFile);
    } else {
      setPdfUrl(null);
    }
  }, [pdfFile]);

  // Sync Listener
  useEffect(() => {
    const channel = new BroadcastChannel('nocturne-sync');
    channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'PUSH_SCORE' && !isAdmin) {
        if (onNavigateScore && data.scoreId !== scoreId) {
          onNavigateScore(data.scoreId);
        }
      }
      if (type === 'PUSH_METRONOME' && !isAdmin) {
        setBpm(data.bpm);
        setIsMetronomePlaying(data.isPlaying);
        globalStartTimeRef.current = data.startTime;
      }
    };
    return () => channel.close();
  }, [isAdmin, scoreId, onNavigateScore]);

  // Metronome Sound Logic
  const playClick = () => {
    if (!metronomeAudioContext.current) {
      metronomeAudioContext.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = metronomeAudioContext.current;
    const osc = ctx.createOscillator();
    const envelope = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1000, ctx.currentTime);
    envelope.gain.setValueAtTime(1, ctx.currentTime);
    envelope.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

    osc.connect(envelope);
    envelope.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.05);
  };

  useEffect(() => {
    if (!isMetronomePlaying) return;
    const interval = 60000 / bpm;
    
    // Strict Phase Sync
    const now = Date.now();
    const timeSinceStart = now - globalStartTimeRef.current;
    const msIntoBeat = timeSinceStart % interval;
    const delayToNextBeat = interval - msIntoBeat;

    let timer: NodeJS.Timeout;
    const startMetronome = () => {
      timer = setInterval(() => {
        setPulse(true);
        playClick();
        setTimeout(() => setPulse(false), 100);
      }, interval);
    };

    const initialTimeout = setTimeout(() => {
      setPulse(true);
      playClick();
      setTimeout(() => setPulse(false), 100);
      startMetronome();
    }, delayToNextBeat);

    return () => {
      clearTimeout(initialTimeout);
      if (timer) clearInterval(timer);
    };
  }, [isMetronomePlaying, bpm]);
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
  }, [isFullscreen, orientation, zoom]);

  // Auto-save draft
  useEffect(() => {
    if (!scoreId || placedObjects.length === 0) return;
    const saveDraft = () => {
      localStorage.setItem(`draft_${scoreId}`, JSON.stringify({
        objects: placedObjects,
        timestamp: Date.now()
      }));
    };
    const timer = setInterval(saveDraft, 5000);
    return () => clearInterval(timer);
  }, [scoreId, placedObjects]);

  useEffect(() => {
    if (scoreId) {
      const draft = localStorage.getItem(`draft_${scoreId}`);
      if (draft) {
        setHasDraft(true);
      }
    }
  }, [scoreId]);

  const recoverDraft = () => {
    if (!scoreId) return;
    const draft = localStorage.getItem(`draft_${scoreId}`);
    if (draft) {
      const { objects } = JSON.parse(draft);
      setPlacedObjects(objects);
      setHasDraft(false);
      localStorage.removeItem(`draft_${scoreId}`);
    }
  };

  const getReadingModeFilter = () => {
    let filter = `brightness(${brightness})`;
    if (readingMode === 'sepia') filter += ' sepia(0.6) contrast(0.9)';
    if (readingMode === 'night') filter += ' invert(0.9) hue-rotate(180deg)';
    return filter;
  };

  useEffect(() => {
    const loadScore = async () => {
      if (!scoreId) return;
      setIsLoading(true);
      setLoadError(null);
      
      // Safety Timeout: 15 seconds
      const timeoutId = setTimeout(() => {
        if (isLoading && !loadError) {
          setLoadError('乐谱加载超时。如果您的服务器是 HTTP 且 App 是 HTTPS，请求可能已被浏览器拦截。');
          setIsLoading(false);
        }
      }, 15000);
      
      try {
        // Load program for navigation
        const meta = await storageService.getMetadata();
        const activeSet = (meta.setlists || []).find(s => s.id === (meta.activeSetlistId || ''));
        if (activeSet) {
          setProgramIds(activeSet.program);
        } else {
          setProgramIds(meta.program || []);
        }

        const saved = await storageService.getScore(scoreId);
        if (saved) {
          setScoreData(saved);
          if (saved.blob) {
            setPdfFile(saved.blob);
            setIsOffline(true);
          } else if (saved.cloudUrl) {
            const url = apiService.getFileUrl(saved.cloudUrl);
            setPdfFile(url);
            setIsOffline(false);
            
            // Try to cache it locally in background
            fetch(url)
              .then(res => {
                if (!res.ok) throw new Error('网络响应失败');
                return res.blob();
              })
              .then(blob => {
                storageService.saveScore({ ...saved, blob });
              })
              .catch(err => console.warn('后台自动缓存失败:', err));
          }
          
          if (saved.annotations && saved.annotations[1] && canvasRef.current) {
            canvasRef.current.loadSaveData(saved.annotations[1], true);
          }
          if (saved.objects && saved.objects[1]) {
            setPlacedObjects(saved.objects[1]);
          }
        } else if (scoreId === 'sample-score') {
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
        } else {
          throw new Error('未找到该乐谱数据');
        }
      } catch (err: any) {
        console.error('Score Load Failed:', err);
        setLoadError(err.message || '乐谱读取失败，请检查网络或重试');
      } finally {
        clearTimeout(timeoutId);
        setIsLoading(false);
      }
    };
    loadScore();
  }, [scoreId]);

  // Load Pedal Config & Reader Settings
  useEffect(() => {
    const loadSettings = async () => {
      const meta = await storageService.getMetadata();
      setPedalConfig(meta.pedalConfig);
      if (meta.readerSettings) {
        setReadingMode(meta.readerSettings.mode);
        setBrightness(meta.readerSettings.brightness);
        setZoom(meta.readerSettings.zoom);
        setIsTwoPageView(meta.readerSettings.isTwoPageView);
      }
    };
    loadSettings();
  }, []);

  // Save Reader Settings
  useEffect(() => {
    const saveSettings = async () => {
      await storageService.saveMetadata({
        readerSettings: {
          mode: readingMode,
          brightness,
          zoom,
          isTwoPageView
        }
      });
    };
    saveSettings();
  }, [readingMode, brightness, zoom, isTwoPageView]);

  // Bluetooth Pedal Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!pedalConfig?.enabled) return;
      
      if (pedalConfig.nextPageKeys.includes(e.key)) {
        if (pageNumber < numPages) {
          setPageNumber(prev => prev + 1);
          e.preventDefault();
        }
      } else if (pedalConfig.prevPageKeys.includes(e.key)) {
        if (pageNumber > 1) {
          setPageNumber(prev => prev - 1);
          e.preventDefault();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pedalConfig, pageNumber, numPages]);

  const handlePartChange = (index: number) => {
    if (!scoreData) return;
    setCurrentPartIndex(index);
    if (index === -1) {
      if (scoreData.blob) {
        setPdfFile(scoreData.blob);
      } else if (scoreData.cloudUrl) {
        setPdfFile(apiService.getFileUrl(scoreData.cloudUrl));
      }
    } else {
      const part = scoreData.parts![index];
      if (part.blob) {
        setPdfFile(part.blob);
      } else if (part.cloudUrl) {
        setPdfFile(apiService.getFileUrl(part.cloudUrl));
      }
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
      saveSpecificPageState(placedObjects, false);
    }, 500); // Faster debounce
  };

  const handleScoreClick = (e: React.MouseEvent) => {
    // If clicking on the text input form itself, don't trigger a new placement
    if ((e.target as HTMLElement).closest('form')) return;
    
    // Middle click or tap to toggle UI
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const width = rect.width;

    // If in select mode or just dragging, don't place a new object
    if (activeTool === 'select' || draggingId) {
      // In select mode, we can still use side taps for page turning
      if (x < width * 0.2) {
        if (pageNumber > 1) setPageNumber(prev => prev - 1);
        return;
      }
      if (x > width * 0.8) {
        if (pageNumber < numPages) setPageNumber(prev => prev + 1);
        return;
      }
      
      // Middle tap toggles UI
      setShowUI(!showUI);
      return;
    }
    
    if (activeTool !== 'stamp' && activeTool !== 'text') {
      // Even if not in stamp/text mode, allow page turning and UI toggle
      if (x < width * 0.2) {
        if (pageNumber > 1) setPageNumber(prev => prev - 1);
        return;
      }
      if (x > width * 0.8) {
        if (pageNumber < numPages) setPageNumber(prev => prev + 1);
        return;
      }
      
      // Middle tap toggles UI
      setShowUI(!showUI);
      return;
    }

    // If in stamp/text mode, but clicking in the middle, still toggle UI
    if (x > width * 0.3 && x < width * 0.7) {
      setShowUI(!showUI);
      return;
    }
    
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
    if (scoreData?.audioBlob instanceof Blob && !audioRef.current) {
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

  const currentProgramIndex = scoreId ? programIds.indexOf(scoreId) : -1;

  const pushMetronome = async () => {
    const startTime = Date.now();
    globalStartTimeRef.current = startTime;
    const channel = new BroadcastChannel('nocturne-sync');
    channel.postMessage({
      type: 'PUSH_METRONOME',
      data: { bpm, isPlaying: isMetronomePlaying, startTime }
    });
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const pushScore = async () => {
    if (!scoreId) return;
    const channel = new BroadcastChannel('nocturne-sync');
    channel.postMessage({
      type: 'PUSH_SCORE',
      data: { scoreId, title: scoreData?.title }
    });
    setIsSyncing(true);
    setPushFeedback(`正在推送乐谱: ${scoreData?.title}...`);
    setTimeout(() => {
      setPushFeedback(`乐谱推送成功! 12 台设备已同步`);
      setTimeout(() => {
        setPushFeedback(null);
        setIsSyncing(false);
      }, 3000);
    }, 1500);
  };

  const handleToggleFavorite = async () => {
    if (!scoreData) return;
    const updated = { ...scoreData, isFavorite: !scoreData.isFavorite };
    await storageService.saveScore(updated);
    setScoreData(updated);
  };

  const handleRequestRole = async (role: string) => {
    const meta = await storageService.getMetadata();
    const newRequest = {
      id: Math.random().toString(36).substr(2, 9),
      userId: 'USER_MOCK_ID', // In real app, get from auth
      userName: '当前成员',
      requestedRole: role,
      timestamp: Date.now(),
      status: 'pending' as const
    };
    const updatedRequests = [...(meta.roleRequests || []), newRequest];
    await storageService.saveMetadata({ roleRequests: updatedRequests });
    setIsRoleRequestOpen(false);
    setPushFeedback(`已提交声部变更申请: ${role}`);
    setTimeout(() => setPushFeedback(null), 3000);
  };
  const handleNavigateProgram = (direction: 'prev' | 'next') => {
    if (currentProgramIndex === -1 || !onNavigateScore) return;
    const nextIndex = direction === 'next' ? currentProgramIndex + 1 : currentProgramIndex - 1;
    if (nextIndex >= 0 && nextIndex < programIds.length) {
      onNavigateScore(programIds[nextIndex]);
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-background">
      {/* Push Feedback Toast */}
      <AnimatePresence>
        {pushFeedback && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[200] bg-surface-container-high border border-primary/20 px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <span className="text-sm font-bold text-primary tracking-wide">{pushFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Member Sync Status Overlay */}
      {!isAdmin && showUI && (
        <div className="fixed bottom-24 right-6 z-[100] flex flex-col gap-2">
          <div className="bg-background/80 backdrop-blur-md border border-outline-variant/10 p-3 rounded-2xl shadow-xl flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Wifi className="w-4 h-4 text-primary" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-on-background/30 uppercase tracking-widest">延迟</div>
                <div className="text-sm font-bold text-primary">{latency}ms</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${battery < 20 ? 'bg-secondary/10' : 'bg-tertiary/10'}`}>
                <Battery className={`w-4 h-4 ${battery < 20 ? 'text-secondary' : 'text-tertiary'}`} />
              </div>
              <div>
                <div className="text-[10px] font-bold text-on-background/30 uppercase tracking-widest">电量</div>
                <div className={`text-sm font-bold ${battery < 20 ? 'text-secondary' : 'text-tertiary'}`}>{battery}%</div>
              </div>
            </div>
            <button 
              onClick={() => setIsRoleRequestOpen(true)}
              className="mt-1 flex items-center justify-center gap-2 py-2 bg-surface-container rounded-xl text-[10px] font-bold uppercase tracking-widest text-primary hover:bg-primary/10 transition-all"
            >
              <UserCog className="w-3 h-3" />
              变更声部
            </button>
          </div>
        </div>
      )}

      {/* Role Request Modal */}
      <AnimatePresence>
        {isRoleRequestOpen && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRoleRequestOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative w-full max-w-md bg-surface-container-high rounded-3xl shadow-2xl p-8 overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -mr-16 -mt-16" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-3 bg-primary/10 rounded-2xl">
                    <UserCog className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary">申请变更声部</h3>
                    <p className="text-xs text-on-background/50">变更声部需经管理员批准</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mb-8">
                  {['第一小提琴', '第二小提琴', '中提琴', '大提琴', '低音提琴', '钢琴', '指挥'].map(role => (
                    <button 
                      key={role}
                      onClick={() => handleRequestRole(role)}
                      className="py-4 bg-surface-container rounded-2xl font-bold text-sm text-on-background/70 hover:bg-primary hover:text-on-primary transition-all active:scale-95"
                    >
                      {role}
                    </button>
                  ))}
                </div>
                
                <button 
                  onClick={() => setIsRoleRequestOpen(false)}
                  className="w-full py-4 rounded-2xl font-bold text-sm text-on-background/30 hover:text-on-background transition-all"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Unified Navigation Bar */}

      <nav className={`fixed top-0 left-0 right-0 h-20 bg-surface-bright/80 backdrop-blur-2xl border-b border-outline-variant/10 flex items-center justify-between px-4 sm:px-8 z-[120] transition-all duration-500 ${showUI ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="flex items-center gap-2 sm:gap-6">
          <button 
            onClick={onBack}
            className="p-2 sm:p-3 hover:bg-surface-container rounded-2xl transition-all active:scale-90"
          >
            <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-on-background" />
          </button>
          <div className="hidden xs:block">
            <h1 className="text-sm sm:text-xl font-headline font-bold text-on-background tracking-tight truncate max-w-[120px] sm:max-w-[200px]">
              {scoreData?.title || '加载中...'}
            </h1>
            <div className="flex items-center gap-2 text-[8px] sm:text-[10px] font-bold text-on-background/40 uppercase tracking-widest">
              <span>{currentPartIndex === -1 ? '总谱' : scoreData?.parts[currentPartIndex].name}</span>
              <span>•</span>
              <div className="flex items-center gap-1">
                <button 
                  disabled={pageNumber <= 1}
                  onClick={(e) => { e.stopPropagation(); setPageNumber(prev => Math.max(1, prev - 1)); }}
                  className="p-0.5 hover:bg-primary/10 rounded disabled:opacity-20"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span>P.{pageNumber} / {numPages}</span>
                <button 
                  disabled={pageNumber >= numPages}
                  onClick={(e) => { e.stopPropagation(); setPageNumber(prev => Math.min(numPages, prev + 1)); }}
                  className="p-0.5 hover:bg-primary/10 rounded disabled:opacity-20"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-surface-container/50 p-1 rounded-2xl border border-outline-variant/10">
          <button 
            onClick={() => {
              setIsAnnotationPanelOpen(!isAnnotationPanelOpen);
              setIsSymbolsPanelOpen(false);
              setIsBluetoothPanelOpen(false);
              setIsMetronomeOpen(false);
              setIsPartsMenuOpen(false);
              setIsDisplayMenuOpen(false);
            }}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl transition-all ${isAnnotationPanelOpen ? 'bg-primary text-on-primary shadow-lg' : 'text-on-background/50 hover:bg-surface-container-high'}`}
          >
            {activeTool === 'select' && <MousePointer2 className="w-4 h-4 sm:w-5 sm:h-5" />}
            {activeTool === 'edit' && <Edit3 className="w-4 h-4 sm:w-5 sm:h-5" />}
            {activeTool === 'highlight' && <Highlighter className="w-4 h-4 sm:w-5 sm:h-5" />}
            {activeTool === 'eraser' && <Eraser className="w-4 h-4 sm:w-5 sm:h-5" />}
            {activeTool === 'stamp' && <PenTool className="w-4 h-4 sm:w-5 sm:h-5" />}
            {activeTool === 'text' && <Type className="w-4 h-4 sm:w-5 sm:h-5" />}
            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest hidden md:inline">
              {activeTool === 'select' ? '选择' : 
               activeTool === 'edit' ? '画笔' : 
               activeTool === 'highlight' ? '荧光笔' : 
               activeTool === 'eraser' ? '橡皮擦' : 
               activeTool === 'stamp' ? '符号' : '文字'}
            </span>
            <ChevronDown className={`w-3 h-3 sm:w-4 sm:h-4 transition-transform ${isAnnotationPanelOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex items-center gap-1 bg-surface-container/50 p-1 rounded-xl">
            <button 
              onClick={handleManualSave}
              disabled={isManualSaving}
              className={`p-2 rounded-lg transition-all ${isManualSaving ? 'bg-tertiary text-on-tertiary animate-pulse' : 'text-on-background/50 hover:bg-surface-container-high'}`}
              title="保存"
            >
              {isManualSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            </button>
            <button 
              onClick={handleToggleFavorite}
              className={`p-2 rounded-lg transition-all ${scoreData?.isFavorite ? 'text-secondary' : 'text-on-background/50 hover:bg-surface-container-high'}`}
              title="收藏"
            >
              <Heart className={`w-4 h-4 ${scoreData?.isFavorite ? 'fill-secondary' : ''}`} />
            </button>
          </div>

          <div className="flex items-center gap-1 bg-surface-container/50 p-1 rounded-xl">
            <button 
              onClick={() => {
                setIsBluetoothPanelOpen(!isBluetoothPanelOpen);
                setIsAnnotationPanelOpen(false);
                setIsMetronomeOpen(false);
                setIsPartsMenuOpen(false);
                setIsDisplayMenuOpen(false);
              }}
              className={`p-2 rounded-lg transition-all ${isBluetoothPanelOpen ? 'bg-primary text-on-primary' : 'text-on-background/50 hover:bg-surface-container-high'}`}
              title="蓝牙翻页器"
            >
              <Radio className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setIsMetronomeOpen(!isMetronomeOpen);
                setIsAnnotationPanelOpen(false);
                setIsBluetoothPanelOpen(false);
                setIsPartsMenuOpen(false);
                setIsDisplayMenuOpen(false);
              }}
              className={`p-2 rounded-lg transition-all ${isMetronomeOpen ? 'bg-primary text-on-primary' : 'text-on-background/50 hover:bg-surface-container-high'}`}
              title="节拍器"
            >
              <Activity className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setIsPartsMenuOpen(!isPartsMenuOpen);
                setIsAnnotationPanelOpen(false);
                setIsBluetoothPanelOpen(false);
                setIsMetronomeOpen(false);
                setIsDisplayMenuOpen(false);
              }}
              className={`p-2 rounded-lg transition-all ${isPartsMenuOpen ? 'bg-primary text-on-primary' : 'text-on-background/50 hover:bg-surface-container-high'}`}
              title="声部选择"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button 
              onClick={() => {
                setIsDisplayMenuOpen(!isDisplayMenuOpen);
                setIsAnnotationPanelOpen(false);
                setIsBluetoothPanelOpen(false);
                setIsMetronomeOpen(false);
                setIsPartsMenuOpen(false);
              }}
              className={`p-2 rounded-lg transition-all ${isDisplayMenuOpen ? 'bg-primary text-on-primary' : 'text-on-background/50 hover:bg-surface-container-high'}`}
              title="显示设置"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="h-8 w-[1px] bg-outline-variant/20 mx-1" />

          <button 
            onClick={toggleFullscreen}
            className="p-3 bg-surface-container-high hover:bg-surface-bright rounded-2xl text-on-background/60 transition-all active:scale-90"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </nav>

      <main className={`flex-1 relative overflow-hidden transition-all ${isFullscreen ? 'p-0' : 'p-4 md:p-8'}`}>
        {hasDraft && (
          <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[70] bg-secondary text-on-secondary px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4">
            <AlertCircle className="w-5 h-5" />
            <span className="text-sm font-bold">检测到未保存的批注草稿</span>
            <button 
              onClick={recoverDraft}
              className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-bold transition-all"
            >
              立即恢复
            </button>
            <button 
              onClick={() => { setHasDraft(false); localStorage.removeItem(`draft_${scoreId}`); }}
              className="text-white/60 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <section 
          ref={containerRef} 
          className={`w-full h-full overflow-y-auto custom-scrollbar transition-all flex flex-col items-center ${isFullscreen ? 'p-0' : 'p-4'} ${readingMode === 'night' ? 'bg-black' : readingMode === 'sepia' ? 'bg-[#f4ecd8]' : 'bg-surface-container-low'}`}
        >
          <AnimatePresence mode="wait">
            <motion.div 
              key={`${pageNumber}-${currentPartIndex}-${pdfUrl}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className={`max-w-4xl w-full bg-white relative overflow-hidden min-h-[600px] flex justify-center transition-all duration-500 ${isFullscreen ? 'shadow-none rounded-none' : 'shadow-2xl rounded-lg'} ${orientation === 'landscape' ? 'rotate-90' : ''}`}
              style={{ 
                width: isFullscreen ? (orientation === 'landscape' ? '100vh' : '100vw') : (containerWidth * zoom), 
                height: isFullscreen ? (orientation === 'landscape' ? '100vw' : '100vh') : (canvasHeight * zoom),
                filter: getReadingModeFilter()
              }}
              onClick={handleScoreClick}
              onMouseMove={handleMouseMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
            >
              {isLoading && !loadError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm z-50 px-6 text-center">
                  <div className="space-y-4">
                    <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
                    <p className="text-sm font-bold text-on-background/60">正在加载渲染引擎与文件...</p>
                    {window.location.protocol === 'https:' && typeof pdfUrl === 'string' && pdfUrl.startsWith('http:') && (
                      <div className="mt-4 p-4 bg-error/10 border border-error/20 rounded-2xl">
                        <AlertCircle className="w-5 h-5 text-error mx-auto mb-2" />
                        <p className="text-xs text-error font-bold leading-tight">
                          Mixed Content Blocked!<br/>
                          App (HTTPS) 无法加载来自 HTTP 链接的乐谱文件。<br/>
                          请将服务器设置为 HTTPS 访问。
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {loadError && (
                <div className="absolute inset-0 flex items-center justify-center bg-white z-20 px-8 text-center">
                  <div className="space-y-6 max-w-sm">
                    <div className="w-16 h-16 bg-error/10 rounded-full flex items-center justify-center mx-auto">
                      <AlertCircle className="w-8 h-8 text-error" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-on-background mb-2">加载出错了</h3>
                      <p className="text-xs text-on-background/50 leading-relaxed">{loadError}</p>
                    </div>
                    <button 
                      onClick={() => window.location.reload()}
                      className="w-full py-4 bg-primary text-on-primary rounded-2xl font-bold shadow-lg shadow-primary/20"
                    >
                      再次重试
                    </button>
                    <button 
                      onClick={onBack}
                      className="text-xs font-bold text-on-background/30 uppercase tracking-widest"
                    >
                      返回曲库
                    </button>
                  </div>
                </div>
              )}
              
              {/* PDF Layer */}
              {/* Tap to toggle UI zone */}
              <div 
                className="absolute inset-0 z-30"
                onClick={() => setShowUI(!showUI)}
              />

              <div className={`absolute inset-0 z-0 flex items-center justify-center gap-4 transition-transform duration-500 ${isSmartCrop ? 'scale-[1.15]' : 'scale-100'}`}>
                {pdfUrl && (
                  <Document
                    file={pdfUrl}
                    key={pdfUrl} // Force re-render only if URL changes
                    onLoadSuccess={onDocumentLoadSuccess}
                    onLoadError={(error) => {
                      console.error('PDF Load Error:', error);
                      setIsLoading(false);
                      setLoadError(`乐谱渲染失败: ${error.message || '未知错误'}。可能由于浏览器跨域拦截或文件损坏。`);
                    }}
                    loading={
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 animate-spin text-primary" />
                        <p className="text-xs font-bold text-primary/40 animate-pulse">正在加载乐谱...</p>
                        {window.location.protocol === 'https:' && typeof pdfUrl === 'string' && pdfUrl.startsWith('http:') && (
                          <div className="mt-4 p-4 bg-error/10 border border-error/20 rounded-xl max-w-[200px]">
                            <p className="text-[10px] text-error font-bold leading-tight">
                              ⚠️ 检测到混合内容拦截！App 为 HTTPS，但乐谱为 HTTP。请将服务器改为 HTTPS 访问。
                            </p>
                          </div>
                        )}
                      </div>
                    }
                    error={
                      <div className="flex flex-col items-center gap-4 p-8 bg-surface-container rounded-3xl border border-error/20">
                        <ShieldAlert className="w-12 h-12 text-error" />
                        <p className="text-sm font-bold text-error">乐谱加载失败</p>
                        <button 
                          onClick={() => window.location.reload()}
                          className="px-6 py-2 bg-primary text-on-primary rounded-full text-xs font-bold"
                        >
                          重试
                        </button>
                      </div>
                    }
                    className="flex justify-center gap-8"
                  >
                    {isTwoPageView && orientation === 'landscape' ? (
                      <>
                        <Page 
                          pageNumber={pageNumber} 
                          width={(isFullscreen ? window.innerWidth * 0.9 : containerWidth) * 0.45 * zoom}
                          renderAnnotationLayer={false}
                          renderTextLayer={false}
                        />
                        {pageNumber + 1 <= numPages && (
                          <Page 
                            pageNumber={pageNumber + 1} 
                            width={(isFullscreen ? window.innerWidth * 0.9 : containerWidth) * 0.45 * zoom}
                            renderAnnotationLayer={false}
                            renderTextLayer={false}
                          />
                        )}
                      </>
                    ) : (
                      <Page 
                        pageNumber={pageNumber} 
                        width={(isFullscreen ? (orientation === 'landscape' ? window.innerWidth * 0.9 : window.innerWidth) : containerWidth) * zoom}
                        renderAnnotationLayer={false}
                        renderTextLayer={false}
                      />
                    )}
                  </Document>
                )}
              </div>

              {/* Drawing Layer */}
              <div className={`absolute inset-0 z-10 ${activeTool === 'stamp' || activeTool === 'text' || activeTool === 'select' ? 'pointer-events-none' : ''}`}>
                <CanvasDraw
                  ref={canvasRef}
                  saveData={scoreData?.annotations?.[pageNumber] || ""}
                  canvasWidth={isFullscreen ? window.innerWidth : containerWidth}
                  canvasHeight={isFullscreen ? window.innerHeight : canvasHeight}
                  brushColor={activeTool === 'highlight' ? hexToRgba(activeColor, 0.3) : activeColor}
                  brushRadius={activeTool === 'highlight' ? 12 : 2}
                  lazyRadius={0}
                  backgroundColor="transparent"
                  hideGrid={true}
                  className="cursor-crosshair"
                  onChange={handleCanvasChange}
                  loadTimeOffset={0}
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
          </motion.div>
        </AnimatePresence>
      </section>

        {/* Annotation Tools Panel */}
        <AnimatePresence>
          {isAnnotationPanelOpen && showUI && (
            <motion.div 
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-[110] bg-surface-bright/95 backdrop-blur-2xl p-4 rounded-3xl shadow-2xl border border-outline-variant/10 flex items-center gap-4"
            >
              <div className="flex items-center gap-1 pr-4 border-r border-outline-variant/10">
                <button 
                  onClick={() => { setActiveTool('select'); setIsAnnotationPanelOpen(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${activeTool === 'select' ? 'bg-primary text-on-primary shadow-md' : 'text-on-background/50 hover:bg-surface-container'}`}
                >
                  <MousePointer2 className="w-5 h-5" />
                  <span className="text-[10px] font-bold">选择</span>
                </button>
                <button 
                  onClick={() => { setActiveTool('edit'); setIsAnnotationPanelOpen(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${activeTool === 'edit' ? 'bg-primary text-on-primary shadow-md' : 'text-on-background/50 hover:bg-surface-container'}`}
                >
                  <Edit3 className="w-5 h-5" />
                  <span className="text-[10px] font-bold">画笔</span>
                </button>
                <button 
                  onClick={() => { setActiveTool('highlight'); setIsAnnotationPanelOpen(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${activeTool === 'highlight' ? 'bg-primary text-on-primary shadow-md' : 'text-on-background/50 hover:bg-surface-container'}`}
                >
                  <Highlighter className="w-5 h-5" />
                  <span className="text-[10px] font-bold">荧光笔</span>
                </button>
                <button 
                  onClick={() => { setActiveTool('eraser'); setIsAnnotationPanelOpen(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${activeTool === 'eraser' ? 'bg-primary text-on-primary shadow-md' : 'text-on-background/50 hover:bg-surface-container'}`}
                >
                  <Eraser className="w-5 h-5" />
                  <span className="text-[10px] font-bold">橡皮擦</span>
                </button>
                <button 
                  onClick={() => { setActiveTool('text'); setIsAnnotationPanelOpen(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${activeTool === 'text' ? 'bg-primary text-on-primary shadow-md' : 'text-on-background/50 hover:bg-surface-container'}`}
                >
                  <Type className="w-5 h-5" />
                  <span className="text-[10px] font-bold">文字</span>
                </button>
                <button 
                  onClick={() => { setIsSymbolsPanelOpen(true); setIsAnnotationPanelOpen(false); }}
                  className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all ${activeTool === 'stamp' ? 'bg-secondary text-on-secondary shadow-md' : 'text-on-background/50 hover:bg-surface-container'}`}
                >
                  <PenTool className="w-5 h-5" />
                  <span className="text-[10px] font-bold">符号库</span>
                </button>
              </div>
              
              <div className="flex items-center gap-2 pl-2">
                {['#000000', '#FF0000', '#0000FF', '#008000', '#FFA500'].map(color => (
                  <button 
                    key={color}
                    onClick={() => setActiveColor(color)}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${activeColor === color ? 'border-primary scale-125' : 'border-transparent'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bluetooth Pedal Panel */}
        <AnimatePresence>
          {isBluetoothPanelOpen && showUI && (
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-8 top-24 z-[110] bg-surface-bright/95 backdrop-blur-2xl p-6 rounded-3xl shadow-2xl border border-outline-variant/10 w-72"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline font-bold text-primary uppercase tracking-widest text-xs">蓝牙翻页器</h3>
                <button onClick={() => setIsBluetoothPanelOpen(false)}><X className="w-4 h-4 text-on-background/30" /></button>
              </div>

              <div className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-surface-container rounded-2xl">
                  <div className="flex items-center gap-3">
                    <Radio className={`w-5 h-5 ${pedalConfig?.enabled ? 'text-primary animate-pulse' : 'text-on-background/30'}`} />
                    <span className="text-sm font-bold">启用翻页器</span>
                  </div>
                  <button 
                    onClick={async () => {
                      const next = { ...pedalConfig, enabled: !pedalConfig.enabled };
                      setPedalConfig(next);
                      await storageService.saveMetadata({ pedalConfig: next });
                    }}
                    className={`w-10 h-5 rounded-full transition-all relative ${pedalConfig?.enabled ? 'bg-primary' : 'bg-outline-variant'}`}
                  >
                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${pedalConfig?.enabled ? 'right-1' : 'left-1'}`} />
                  </button>
                </div>

                {pedalConfig?.enabled && (
                  <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
                      className="flex flex-col items-center gap-2 p-4 bg-surface-container hover:bg-primary/10 rounded-2xl transition-all group"
                    >
                      <ChevronLeft className="w-6 h-6 text-primary group-active:-translate-x-1 transition-transform" />
                      <span className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest">上一页</span>
                    </button>
                    <button 
                      onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
                      className="flex flex-col items-center gap-2 p-4 bg-surface-container hover:bg-primary/10 rounded-2xl transition-all group"
                    >
                      <ChevronRight className="w-6 h-6 text-primary group-active:translate-x-1 transition-transform" />
                      <span className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest">下一页</span>
                    </button>
                  </div>
                )}

                <div className="space-y-3">
                  <p className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest px-2">按键配置</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-surface-container rounded-xl">
                      <div className="text-[8px] font-bold text-on-background/30 uppercase mb-1">上一页</div>
                      <div className="text-xs font-mono font-bold text-primary">{pedalConfig?.prevPageKeys?.join(', ') || '未设置'}</div>
                    </div>
                    <div className="p-3 bg-surface-container rounded-xl">
                      <div className="text-[8px] font-bold text-on-background/30 uppercase mb-1">下一页</div>
                      <div className="text-xs font-mono font-bold text-primary">{pedalConfig?.nextPageKeys?.join(', ') || '未设置'}</div>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                  <p className="text-[10px] text-primary/70 leading-relaxed italic">
                    提示：请确保您的蓝牙翻页器已连接到设备，并处于键盘模式。
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isMetronomeOpen && showUI && (
            <motion.div 
              initial={{ x: 100, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 100, opacity: 0 }}
              className="fixed right-24 top-1/2 -translate-y-1/2 z-50 bg-surface-bright/95 backdrop-blur-2xl p-6 rounded-3xl shadow-2xl border border-outline-variant/10 w-64"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-headline font-bold text-primary uppercase tracking-widest text-xs">节拍器</h3>
                <button onClick={() => setIsMetronomeOpen(false)}><X className="w-4 h-4 text-on-background/30" /></button>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="text-6xl font-headline font-bold text-primary tracking-tighter">{bpm}</div>
                  <div className="text-[10px] font-bold text-primary/40 uppercase absolute -right-8 bottom-2">BPM</div>
                  {isMetronomePlaying && (
                    <motion.div 
                      animate={{ scale: pulse ? 1.5 : 1, opacity: pulse ? 1 : 0.2 }}
                      className="absolute -top-4 left-1/2 -translate-x-1/2 w-3 h-3 bg-secondary rounded-full shadow-[0_0_10px_rgba(255,137,137,0.5)]"
                    />
                  )}
                </div>

                <input 
                  type="range" 
                  min="40" 
                  max="240" 
                  value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-surface-container rounded-full appearance-none cursor-pointer accent-primary"
                />

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all active:scale-95 ${isMetronomePlaying ? 'bg-secondary text-on-secondary shadow-lg' : 'bg-surface-container text-secondary'}`}
                  >
                    {isMetronomePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isMetronomePlaying ? '停止' : '开始'}
                  </button>
                  <button 
                    onClick={() => {
                      const now = Date.now();
                      if (saveTimeoutRef.current) { // Reusing ref for tap logic
                        const diff = now - (saveTimeoutRef.current as any);
                        const newBpm = Math.round(60000 / diff);
                        if (newBpm > 30 && newBpm < 300) setBpm(newBpm);
                      }
                      (saveTimeoutRef.current as any) = now;
                    }}
                    className="bg-surface-container text-primary py-3 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
                  >
                    手动打拍
                  </button>
                </div>

                {isAdmin && (
                  <button 
                    onClick={pushMetronome}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                      isSyncing ? 'bg-tertiary text-on-tertiary shadow-lg' : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    <Radio className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                    推送同步节拍
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Controls Integrated into Display Panel */}
        <AnimatePresence>
          {isDisplayMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-24 right-8 w-80 bg-surface-bright/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-outline-variant/10 p-8 z-[130] space-y-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">显示与进度</h3>
                <button onClick={() => setIsDisplayMenuOpen(false)}><X className="w-4 h-4 text-on-background/30" /></button>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest">跳转页面</span>
                  <span className="text-xs font-bold text-primary">{pageNumber} / {numPages}</span>
                </div>
                <input 
                  type="range" min="1" max={numPages || 1} value={pageNumber}
                  onChange={(e) => setPageNumber(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-surface-container rounded-full appearance-none cursor-pointer accent-primary"
                />
              </div>

              <div className="space-y-4">
                <span className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest">阅读模式</span>
                <div className="grid grid-cols-3 gap-2">
                  {(['normal', 'sepia', 'night'] as const).map(mode => (
                    <button 
                      key={mode}
                      onClick={() => setReadingMode(mode)}
                      className={`py-2 rounded-xl text-[10px] font-bold uppercase tracking-tighter transition-all ${readingMode === mode ? 'bg-primary text-on-primary shadow-sm' : 'bg-surface-container text-on-background/50 hover:bg-surface-container-high'}`}
                    >
                      {mode === 'normal' ? '标准' : mode === 'sepia' ? '护眼' : '夜间'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Maximize2 className="w-3 h-3 text-on-background/30" />
                      <span className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest">缩放比例</span>
                    </div>
                    <span className="text-xs font-bold text-secondary">{Math.round(zoom * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="2" step="0.1" value={zoom}
                    onChange={(e) => setZoom(parseFloat(e.target.value))}
                    className="w-full h-1 bg-surface-container rounded-full appearance-none cursor-pointer accent-secondary"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Battery className="w-3 h-3 text-on-background/30" />
                      <span className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest">亮度调节</span>
                    </div>
                    <span className="text-xs font-bold text-tertiary">{Math.round(brightness * 100)}%</span>
                  </div>
                  <input 
                    type="range" min="0.5" max="1.5" step="0.1" value={brightness}
                    onChange={(e) => setBrightness(parseFloat(e.target.value))}
                    className="w-full h-1 bg-surface-container rounded-full appearance-none cursor-pointer accent-tertiary"
                  />
                </div>
              </div>

              <button 
                onClick={() => setIsTwoPageView(!isTwoPageView)}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all ${isTwoPageView ? 'bg-primary/10 text-primary border border-primary/20' : 'bg-surface-container text-on-background/50 border border-transparent'}`}
              >
                <div className="flex items-center gap-3">
                  <Grid className="w-5 h-5" />
                  <span className="text-xs font-bold uppercase tracking-widest">双页显示模式</span>
                </div>
                <div className={`w-10 h-5 rounded-full relative transition-all ${isTwoPageView ? 'bg-primary' : 'bg-on-background/10'}`}>
                  <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-all ${isTwoPageView ? 'right-1' : 'left-1'}`} />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>


        {/* Metronome Panel */}
        <AnimatePresence>
          {isMetronomeOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-24 right-8 w-80 bg-surface-bright/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-outline-variant/10 p-8 z-[110] space-y-8"
            >
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">节拍器</h3>
                <button onClick={() => setIsMetronomeOpen(false)}><X className="w-4 h-4 text-on-background/30" /></button>
              </div>

              <div className="flex flex-col items-center gap-6">
                <div className="relative">
                  <div className="text-6xl font-headline font-bold text-primary tracking-tighter">{bpm}</div>
                  <div className="text-[10px] font-bold text-primary/40 uppercase absolute -right-8 bottom-2">BPM</div>
                  {isMetronomePlaying && (
                    <motion.div 
                      animate={{ scale: pulse ? 1.5 : 1, opacity: pulse ? 1 : 0.2 }}
                      className="absolute -top-4 left-1/2 -translate-x-1/2 w-3 h-3 bg-secondary rounded-full shadow-[0_0_10px_rgba(255,137,137,0.5)]"
                    />
                  )}
                </div>

                <input 
                  type="range" min="40" max="240" value={bpm}
                  onChange={(e) => setBpm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-surface-container rounded-full appearance-none cursor-pointer accent-primary"
                />

                <div className="grid grid-cols-2 gap-3 w-full">
                  <button 
                    onClick={() => setIsMetronomePlaying(!isMetronomePlaying)}
                    className={`flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all active:scale-95 ${isMetronomePlaying ? 'bg-secondary text-on-secondary shadow-lg' : 'bg-surface-container text-secondary'}`}
                  >
                    {isMetronomePlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    {isMetronomePlaying ? '停止' : '开始'}
                  </button>
                  <button 
                    onClick={() => {
                      const now = Date.now();
                      if (saveTimeoutRef.current) {
                        const diff = now - (saveTimeoutRef.current as any);
                        const newBpm = Math.round(60000 / diff);
                        if (newBpm > 30 && newBpm < 300) setBpm(newBpm);
                      }
                      (saveTimeoutRef.current as any) = now;
                    }}
                    className="bg-surface-container text-primary py-3 rounded-xl font-bold text-xs uppercase tracking-widest active:scale-95 transition-all"
                  >
                    手动打拍
                  </button>
                </div>

                {isAdmin && (
                  <button 
                    onClick={pushMetronome}
                    className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-xs uppercase tracking-widest transition-all ${
                      isSyncing ? 'bg-tertiary text-on-tertiary shadow-lg' : 'bg-primary/10 text-primary hover:bg-primary/20'
                    }`}
                  >
                    <Radio className={`w-4 h-4 ${isSyncing ? 'animate-pulse' : ''}`} />
                    推送同步节拍
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Parts Menu Panel */}
        <AnimatePresence>
          {isPartsMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-24 right-8 w-64 bg-surface-bright/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-outline-variant/10 py-4 z-[110]"
            >
              <div className="px-6 py-2 mb-2 border-b border-outline-variant/10">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">声部选择</h3>
              </div>
              <button 
                onClick={() => { handlePartChange(-1); setIsPartsMenuOpen(false); }}
                className={`w-full text-left px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${currentPartIndex === -1 ? 'text-primary bg-primary/10' : 'text-on-background/70 hover:bg-surface-container'}`}
              >
                总谱 (Full Score)
              </button>
              {scoreData?.parts.map((part, idx) => (
                <button 
                  key={part.id}
                  onClick={() => { handlePartChange(idx); setIsPartsMenuOpen(false); }}
                  className={`w-full text-left px-6 py-4 text-xs font-bold uppercase tracking-widest transition-colors ${currentPartIndex === idx ? 'text-primary bg-primary/10' : 'text-on-background/70 hover:bg-surface-container'}`}
                >
                  {part.name}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Symbols & Fingerings Panel */}
        <AnimatePresence>
          {isSymbolsPanelOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 w-[480px] bg-surface-bright/95 backdrop-blur-2xl p-8 rounded-3xl shadow-2xl border border-outline-variant/10 z-[110]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-bold text-primary uppercase tracking-widest">音乐术语与指法库</h3>
                <button onClick={() => setIsSymbolsPanelOpen(false)}>
                  <X className="w-4 h-4 text-on-background/30" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest mb-4">力度与表情</h4>
                  <div className="grid grid-cols-4 gap-2">
                    {musicSymbols.map(symbol => (
                      <button
                        key={symbol}
                        onClick={() => {
                          setActiveTool('stamp');
                          setSelectedStamp({ type: 'symbol', content: symbol });
                          setIsSymbolsPanelOpen(false);
                        }}
                        className={`h-10 flex items-center justify-center rounded-xl text-lg font-serif transition-all ${
                          selectedStamp?.content === symbol && activeTool === 'stamp'
                            ? 'bg-primary text-on-primary shadow-md scale-110'
                            : 'bg-surface-container text-on-background/70 hover:bg-primary/10 hover:text-primary'
                        }`}
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest mb-4">指法标记</h4>
                  <div className="grid grid-cols-5 gap-2">
                    {fingerings.map(num => (
                      <button
                        key={num}
                        onClick={() => {
                          setActiveTool('stamp');
                          setSelectedStamp({ type: 'fingering', content: num });
                          setIsSymbolsPanelOpen(false);
                        }}
                        className={`h-10 flex items-center justify-center rounded-xl font-bold transition-all ${
                          selectedStamp?.content === num && activeTool === 'stamp'
                            ? 'bg-primary text-on-primary shadow-md scale-110'
                            : 'bg-surface-container text-on-background/70 hover:bg-primary/10 hover:text-primary'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-outline-variant/10">
                    <h4 className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest mb-4">颜色选择</h4>
                    <div className="flex gap-3">
                      {['#000000', '#D32F2F', '#1976D2', '#388E3C'].map(color => (
                        <button 
                          key={color}
                          onClick={() => setActiveColor(color)}
                          className={`w-8 h-8 rounded-full border-2 transition-all ${
                            activeColor === color ? 'border-primary scale-110 shadow-md' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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

        {/* Fullscreen Exit Button */}
        {isFullscreen && (
          <button 
            onClick={toggleFullscreen}
            className={`fixed top-6 right-6 z-[60] bg-black/40 hover:bg-black/60 backdrop-blur-md text-white p-2 rounded-full transition-all shadow-lg ${showUI ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
          >
            <Minimize2 className="w-5 h-5" />
          </button>
        )}

        {/* Click-to-flip zones */}
        {!isAnnotationPanelOpen && !isSymbolsPanelOpen && !isBluetoothPanelOpen && !isMetronomeOpen && !isPartsMenuOpen && !isDisplayMenuOpen && (
          <>
            <div 
              onClick={() => setPageNumber(prev => Math.max(1, prev - 1))}
              className="fixed left-0 top-20 bottom-0 w-20 z-40 cursor-pointer"
              title="上一页"
            />
            <div 
              onClick={() => setPageNumber(prev => Math.min(numPages, prev + 1))}
              className="fixed right-0 top-20 bottom-0 w-20 z-40 cursor-pointer"
              title="下一页"
            />
          </>
        )}

        {/* Page Navigation Overlay - Removed floating bar to avoid blocking score */}

        {/* Audio Player Overlay */}
        {scoreData?.audioBlob && (
          <div className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-50 transition-all duration-500 ${showUI ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0 pointer-events-none'}`}>
            <div className="bg-surface-bright/90 backdrop-blur-xl px-8 py-4 rounded-3xl shadow-2xl border border-outline-variant/10 flex items-center gap-6 min-w-[400px]">
              <button 
                onClick={togglePlayback}
                className="w-12 h-12 flex items-center justify-center bg-primary text-on-primary rounded-full shadow-lg hover:scale-105 transition-all"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <PlayCircle className="w-7 h-7" />}
              </button>
              <div className="flex-1 flex flex-col gap-2">
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
              <Volume2 className="w-5 h-5 text-on-background/40" />
            </div>
          </div>
        )}

        {/* Bluetooth Pedal Control Module - Removed as requested, now integrated in panel */}
      </main>
    </div>
  );
}
