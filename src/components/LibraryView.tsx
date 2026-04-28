import { 
  Search, Bell, Menu, FolderOpen, MoreVertical, Download, Music, 
  FileText, X, Heart, Clock, Settings, LogOut, Star, Filter, 
  CheckCircle, Plus, Edit2, Trash2, UserCheck, Users, ChevronRight, 
  Upload, Minimize2, Maximize2, RefreshCw, PenTool, Loader2,
  Play, Pause, Volume2, AlertCircle, ChevronLeft, List, Cloud
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as pdfjsLib from 'pdfjs-dist';

// Set up PDF.js worker - Match package.json version
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/5.6.205/pdf.worker.min.js`;

const PDFPreview = ({ file, cloudUrl }: { file?: File | Blob, cloudUrl?: string }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const renderPreview = async () => {
      if (!file && !cloudUrl) return;
      setLoading(true);
      try {
        let arrayBuffer: ArrayBuffer;
        if (file) {
          arrayBuffer = await file.arrayBuffer();
        } else {
          const response = await fetch(apiService.getFileUrl(cloudUrl!));
          arrayBuffer = await response.arrayBuffer();
        }
        
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const page = await pdf.getPage(1);
        
        const viewport = page.getViewport({ scale: 1.5 });
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const context = canvas.getContext('2d');
        if (!context) return;
        
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        
        await page.render({
          canvasContext: context,
          viewport: viewport,
          canvas: canvas as any
        } as any).promise;
      } catch (err) {
        console.error('PDF preview error:', err);
        setError('预览加载失败');
      } finally {
        setLoading(false);
      }
    };
    renderPreview();
  }, [file, cloudUrl]);

  if (error) return <div className="w-full h-full flex items-center justify-center text-error/50 text-xs">{error}</div>;
  if (loading) return <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-4 h-4 animate-spin text-primary/30" /></div>;

  return <canvas ref={canvasRef} className="w-full h-full object-contain" />;
};
import { storageService, ScoreData, ScorePart, Notification, Setlist } from '../services/storageService';
import { apiService } from '../services/apiService';

interface LibraryViewProps {
  onOpenScore: (scoreId: string) => void;
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  onViewChange: (view: any) => void;
}

interface ScoreCardProps {
  score: ScoreData;
  viewMode: 'grid' | 'compact' | 'list';
  handleOpenScore: (id: string) => void;
  activeMenuId: string | null;
  setActiveMenuId: (id: string | null) => void;
  toggleFavorite: (e: React.MouseEvent, score: ScoreData) => void;
  handleDownloadPDF: (score: ScoreData) => void;
  setIsEditingScore: (score: ScoreData) => void;
  handleAddToProgram: (score: ScoreData) => void;
  handleDeleteScore: (id: string) => void;
  isAdmin: boolean;
}

const ScoreCard = ({ 
  score, 
  viewMode, 
  handleOpenScore, 
  activeMenuId, 
  setActiveMenuId, 
  toggleFavorite,
  handleDownloadPDF,
  setIsEditingScore,
  handleAddToProgram,
  handleDeleteScore,
  isAdmin
}: ScoreCardProps) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (score.coverBlob instanceof Blob) {
      const url = URL.createObjectURL(score.coverBlob);
      setCoverUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setCoverUrl(null);
  }, [score.coverBlob]);

  if (viewMode === 'list') {
    return (
      <div 
        key={score.id}
        className="hardware-card p-3 flex items-center justify-between group cursor-pointer"
      >
        <div className="flex gap-4 items-center flex-1" onClick={() => handleOpenScore(score.id)}>
          <div className="w-10 h-12 bg-surface-container-low rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
            {coverUrl ? (
              <img src={coverUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <FileText className="text-primary/40 w-6 h-6" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-white truncate">{score.title}</h4>
              {score.cloudUrl && (
                <Cloud className="w-3 h-3 text-primary/60" />
              )}
              {score.type === 'collection' && (
                <span className="px-1.5 py-0.5 bg-primary/20 text-primary-light text-[8px] font-bold rounded uppercase border border-primary/30">合订本</span>
              )}
            </div>
            <div className="flex items-center gap-3 mono-label">
              <span className="font-medium text-white/60">{score.composer || '未知作曲家'}</span>
              <span>•</span>
              <span className="uppercase tracking-widest">{score.folder || '未分类'}</span>
              {score.duration && (
                <>
                  <span>•</span>
                  <span className="font-mono">{Math.floor(score.duration / 60)}:{(score.duration % 60).toString().padStart(2, '0')}</span>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={(e) => { e.stopPropagation(); toggleFavorite(e, score); }}
            className={`p-2 rounded-full transition-all ${score.isFavorite ? 'text-primary' : 'text-on-background/20 hover:text-primary'}`}
          >
            <Star className={`w-4 h-4 ${score.isFavorite ? 'fill-primary' : ''}`} />
          </button>
          <div 
            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === score.id ? null : score.id); }}
            className="p-2 hover:bg-surface-container text-on-background/20 hover:text-on-background transition-colors relative cursor-pointer rounded-full"
            role="button"
            tabIndex={0}
            style={{ zIndex: activeMenuId === score.id ? 200 : 1 }}
          >
            <MoreVertical className="w-4 h-4" />
            {activeMenuId === score.id && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface-bright rounded-2xl shadow-2xl border border-outline-variant/10 py-3 z-[200] text-on-background animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="px-4 py-2 border-b border-outline-variant/5 mb-1">
                  <p className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest truncate">{score.title}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Download className="w-4 h-4" /> 下载 PDF</button>
                <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /> 编辑属性</button>
                <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Music className="w-4 h-4" /> 查看声部</button>
                <button onClick={(e) => { e.stopPropagation(); handleAddToProgram(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Star className="w-4 h-4" /> 添加到节目单</button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteScore(score.id); }} 
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> 删除乐谱
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (viewMode === 'compact') {
    return (
      <div 
        key={score.id}
        onClick={() => handleOpenScore(score.id)}
        className="bg-surface-container-high rounded-2xl group cursor-pointer border border-outline-variant/10 hover:border-primary/30 transition-all shadow-sm hover:shadow-lg flex flex-col"
        style={{ zIndex: activeMenuId === score.id ? 100 : 1 }}
      >
        <div className="aspect-[3/4] bg-surface-container-low relative">
          {coverUrl ? (
            <img src={coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-primary/20">
              <FileText className="w-10 h-10" />
            </div>
          )}
          <div className="absolute top-2 right-2">
             <div 
              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === score.id ? null : score.id); }}
              className={`p-1.5 bg-black/40 backdrop-blur-md rounded-full text-white transition-all relative cursor-pointer ${activeMenuId === score.id ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100 sm:opacity-0'}`}
              role="button"
              tabIndex={0}
            >
              <MoreVertical className="w-3 h-3" />
              {activeMenuId === score.id && (
                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-bright rounded-2xl shadow-2xl border border-outline-variant/10 py-3 z-[200] text-on-background animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                  <div className="px-4 py-2 border-b border-outline-variant/5 mb-1">
                    <p className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest truncate">{score.title}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Download className="w-4 h-4" /> 下载 PDF</button>
                  <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /> 编辑属性</button>
                  <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Music className="w-4 h-4" /> 查看声部</button>
                  <button onClick={(e) => { e.stopPropagation(); handleAddToProgram(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Star className="w-4 h-4" /> 添加到节目单</button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDeleteScore(score.id); }} 
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" /> 删除乐谱
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="p-2">
          <h4 className="text-[10px] font-bold text-on-background truncate">{score.title}</h4>
        </div>
      </div>
    );
  }

  return (
    <div 
      key={score.id}
      onClick={() => handleOpenScore(score.id)}
      className="hardware-card group cursor-pointer flex flex-col overflow-hidden"
      style={{ zIndex: activeMenuId === score.id ? 100 : 1 }}
    >
      <div className="aspect-[3/4] bg-surface-container-low relative">
        {coverUrl ? (
          <img src={coverUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-primary/20">
            <FileText className="w-16 h-16" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
          <div className="flex gap-2">
            <button 
              onClick={(e) => { e.stopPropagation(); toggleFavorite(e, score); }}
              className="p-2 bg-white/20 backdrop-blur-md rounded-full text-white hover:bg-white/40 transition-all"
            >
              <Star className={`w-4 h-4 ${score.isFavorite ? 'fill-white' : ''}`} />
            </button>
          </div>
        </div>
        <div className="absolute top-3 right-3 z-[150]">
          <div 
            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === score.id ? null : score.id); }}
            className={`p-2 bg-black/40 backdrop-blur-md rounded-full text-white transition-all relative cursor-pointer ${activeMenuId === score.id ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100 sm:opacity-0'}`}
            role="button"
            tabIndex={0}
          >
            <MoreVertical className="w-4 h-4" />
            {activeMenuId === score.id && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-surface-bright rounded-2xl shadow-2xl border border-outline-variant/10 py-3 z-[200] text-on-background animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="px-4 py-2 border-b border-outline-variant/5 mb-1">
                  <p className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest truncate">{score.title}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Download className="w-4 h-4" /> 下载 PDF</button>
                <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /> 编辑属性</button>
                <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Music className="w-4 h-4" /> 查看声部</button>
                <button onClick={(e) => { e.stopPropagation(); handleAddToProgram(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Star className="w-4 h-4" /> 添加到节目单</button>
                <button 
                  onClick={(e) => { e.stopPropagation(); handleDeleteScore(score.id); }} 
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> 删除乐谱
                </button>
              </div>
            )}
          </div>
        </div>
        {score.type === 'collection' && (
          <div className="absolute top-3 left-3 px-2 py-1 bg-primary text-on-primary text-[10px] font-bold rounded-lg shadow-lg uppercase tracking-tighter">
            合订本
          </div>
        )}
      </div>
      <div className="p-4 bg-surface/50 backdrop-blur-sm border-t border-white/5">
        <h4 className="font-sans font-bold text-white truncate mb-0.5 group-hover:text-primary transition-colors">{score.title}</h4>
        <p className="text-xs text-white/40 truncate mb-2 mono-label">{score.composer || '未知'}</p>
        <div className="flex items-center justify-between">
          <span className="mono-label text-primary/80">
            {score.folder || '未分类'}
          </span>
          {score.duration && (
            <span className="text-[10px] font-mono text-white/20">
              {Math.floor(score.duration / 60)}:{(score.duration % 60).toString().padStart(2, '0')}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

interface FolderCardProps {
  folder: string;
  viewMode: 'grid' | 'compact' | 'list';
  coverBlob?: Blob;
  onClick: () => void;
  isEditing: boolean;
  tempName: string;
  setTempName: (name: string) => void;
  onRename: () => void;
  onStopPropagation: (e: React.MouseEvent) => void;
}

const FolderCard = ({ 
  folder, 
  viewMode, 
  coverBlob, 
  onClick, 
  isEditing, 
  tempName, 
  setTempName, 
  onRename,
  onStopPropagation
}: FolderCardProps) => {
  const [coverUrl, setCoverUrl] = useState<string | null>(null);

  useEffect(() => {
    if (coverBlob instanceof Blob) {
      const url = URL.createObjectURL(coverBlob);
      setCoverUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setCoverUrl(null);
  }, [coverBlob]);

  return (
    <div 
      onClick={onClick}
      className={`bg-surface-container-high rounded-2xl relative overflow-hidden group cursor-pointer active:scale-95 transition-all border border-outline-variant/5 hover:border-primary/20 shadow-sm hover:shadow-md ${
        viewMode === 'list' ? 'p-4 flex items-center gap-4' : 'p-6'
      }`}
    >
      <div className={`${viewMode === 'list' ? 'relative opacity-100' : 'absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity'}`}>
        {coverUrl ? (
          <img src={coverUrl} className={`${viewMode === 'list' ? 'w-10 h-10' : 'w-24 h-24'} object-cover rounded-lg`} referrerPolicy="no-referrer" />
        ) : (
          <FolderOpen className={`${viewMode === 'list' ? 'w-6 h-6 text-primary' : 'w-24 h-24'}`} />
        )}
      </div>
      <div className="relative z-10 flex-1">
        <div className="flex justify-between items-start">
          {isEditing ? (
            <input 
              autoFocus
              className="font-headline text-lg font-bold text-on-background mb-1 bg-surface-container-low border-b-2 border-primary outline-none w-full"
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={onRename}
              onKeyDown={(e) => e.key === 'Enter' && onRename()}
              onClick={onStopPropagation}
            />
          ) : (
            <h3 className="font-headline text-lg font-bold text-on-background mb-1 group-hover:text-primary transition-colors">
              {folder.startsWith('member:') ? folder.replace('member:', '') : folder}
            </h3>
          )}
        </div>
        <div className="flex items-center gap-2">
          {folder.startsWith('member:') && (
            <span className="px-2 py-0.5 bg-secondary/10 text-secondary text-[8px] font-bold rounded-full uppercase tracking-widest">成员上传</span>
          )}
          <span className="text-[10px] font-bold text-on-background/30 uppercase tracking-widest">文件夹</span>
        </div>
      </div>
    </div>
  );
};

export default function LibraryView({ onOpenScore, isAdmin, setIsAdmin, onViewChange }: LibraryViewProps) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'folders' | 'tags'>('folders');
  const [filterType, setFilterType] = useState<'all' | 'favorites' | 'recent' | 'program'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [scores, setScores] = useState<ScoreData[]>([]);
  const [programIds, setProgramIds] = useState<string[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [activeSetlistId, setActiveSetlistId] = useState<string>('');
  const [tags, setTags] = useState<string[]>(['钢琴谱', '小提琴', '大提琴', '古典', '浪漫主义', '现代', '练习曲', '奏鸣曲']);
  const [isEditingScore, setIsEditingScore] = useState<ScoreData | null>(null);
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [newTag, setNewTag] = useState('');
  const [folders, setFolders] = useState<string[]>([]);
  const [globalRoles, setGlobalRoles] = useState<string[]>([]);
  const [globalPartTags, setGlobalPartTags] = useState<string[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [isManagingMetadata, setIsManagingMetadata] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isShowingNotifications, setIsShowingNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'compact' | 'list'>('grid');
  const [uploadType, setUploadType] = useState<'single' | 'collection'>('single');
  const [isUploading, setIsUploading] = useState(false);
  const [folderCovers, setFolderCovers] = useState<{ [folderName: string]: Blob }>({});
  const [folderAliases, setFolderAliases] = useState<{ [originalName: string]: string }>({});
  const [editingFolderName, setEditingFolderName] = useState<string | null>(null);
  const [tempFolderName, setTempFolderName] = useState('');
  const [activeMenuId, setActiveMenuId] = useState<string | null>(null);
  const [pendingUploads, setPendingUploads] = useState<{ file: File, scoreTitle: string, suggestedPartName: string, ambiguous: boolean }[]>([]);
  const [isShowingAmbiguityDialog, setIsShowingAmbiguityDialog] = useState(false);
  const [isCreatingNewCollection, setIsCreatingNewCollection] = useState(false);
  const [newCollectionTitle, setNewCollectionTitle] = useState('');
  const [confirmingClearProgram, setConfirmingClearProgram] = useState(false);
  const [confirmingDeleteScoreId, setConfirmingDeleteScoreId] = useState<string | null>(null);
  const [confirmingRemoveFromProgramId, setConfirmingRemoveFromProgramId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string, type: 'info' | 'error' } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedScoreIds, setSelectedScoreIds] = useState<Set<string>>(new Set());
  const [isMovingToFolder, setIsMovingToFolder] = useState(false);
  const [userRole, setUserRole] = useState<string>('member');

  const showMessage = (text: string, type: 'info' | 'error' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const toggleScoreSelection = (scoreId: string) => {
    const newSelected = new Set(selectedScoreIds);
    if (newSelected.has(scoreId)) {
      newSelected.delete(scoreId);
    } else {
      newSelected.add(scoreId);
    }
    setSelectedScoreIds(newSelected);
  };

  const handleBatchDelete = async () => {
    if (selectedScoreIds.size === 0) return;
    if (!window.confirm(`确定要删除选中的 ${selectedScoreIds.size} 份乐谱吗？`)) return;
    
    for (const id of selectedScoreIds) {
      await storageService.deleteScore(id);
    }
    setScores(scores.filter(s => !selectedScoreIds.has(s.id)));
    setSelectedScoreIds(new Set());
    setIsMultiSelectMode(false);
    showMessage('批量删除成功');
  };

  const handleBatchMove = async (folderName: string) => {
    for (const id of selectedScoreIds) {
      const score = scores.find(s => s.id === id);
      if (score) {
        await storageService.saveScore({ ...score, folder: folderName, updatedAt: Date.now() });
      }
    }
    const updatedScores = await storageService.getAllScores();
    setScores(updatedScores);
    setSelectedScoreIds(new Set());
    setIsMultiSelectMode(false);
    setIsMovingToFolder(false);
    showMessage('批量移动成功');
  };

  const instrumentCodes: { [key: string]: string } = {
    '01': '第一小提琴',
    '02': '第二小提琴',
    '03': '中提琴',
    '04': '大提琴',
    '05': '低音提琴',
    '06': '钢琴',
    '07': '打击乐',
  };

  const instrumentPatterns = [
    { pattern: /violin\s*1|1st\s*violin|第一小提琴|小提琴\s*1/i, name: '第一小提琴' },
    { pattern: /violin\s*2|2nd\s*violin|第二小提琴|小提琴\s*2/i, name: '第二小提琴' },
    { pattern: /violin|vln|小提琴/i, name: '小提琴', ambiguous: true },
    { pattern: /viola|vla|中提琴/i, name: '中提琴' },
    { pattern: /cello|vcl|大提琴/i, name: '大提琴' },
    { pattern: /double\s*bass|db|低音提琴/i, name: '低音提琴' },
    { pattern: /flute|fl|长笛/i, name: '长笛' },
    { pattern: /oboe|ob|双簧管/i, name: '双簧管' },
    { pattern: /clarinet|cl|单簧管/i, name: '单簧管' },
    { pattern: /bassoon|bn|巴松管/i, name: '巴松管' },
    { pattern: /horn|hn|圆号/i, name: '圆号' },
    { pattern: /trumpet|tpt|小号/i, name: '小号' },
    { pattern: /trombone|tbn|长号/i, name: '长号' },
    { pattern: /tuba|大号/i, name: '大号' },
    { pattern: /percussion|打击乐/i, name: '打击乐' },
    { pattern: /piano|pno|钢琴/i, name: '钢琴' },
    { pattern: /harp|竖琴/i, name: '竖琴' },
  ];

  const markAllAsRead = async () => {
    const updatedNotifications = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updatedNotifications);
    await storageService.saveMetadata({ notifications: updatedNotifications });
  };

  const markAsRead = async (id: string) => {
    const updatedNotifications = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updatedNotifications);
    await storageService.saveMetadata({ notifications: updatedNotifications });
  };

  const handleRenameFolder = async (oldName: string) => {
    if (!tempFolderName || tempFolderName === oldName) {
      setEditingFolderName(null);
      return;
    }

    if (oldName.startsWith('member:')) {
      // Admin renaming a member folder locally
      const memberName = oldName.replace('member:', '');
      const newAliases = { ...folderAliases, [memberName]: tempFolderName };
      setFolderAliases(newAliases);
      await storageService.saveMetadata({ folderAliases: { 'admin': newAliases } });
      setEditingFolderName(null);
      return;
    }

    // Permission check: Members cannot rename admin folders
    if (!isAdmin) {
      showMessage('成员无权更改管理员发布的文件夹名字', 'error');
      setEditingFolderName(null);
      return;
    }

    const newFolders = folders.map(f => f === oldName ? tempFolderName : f);
    setFolders(newFolders);
    await storageService.saveMetadata({ folders: newFolders });
    
    // Update all scores in this folder
    const allScores = await storageService.getAllScores();
    for (const score of allScores) {
      if (score.folder === oldName) {
        await storageService.saveScore({ ...score, folder: tempFolderName });
      }
    }
    loadScores();
    setEditingFolderName(null);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const partInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadScores();
    loadMetadata();
  }, []);

  useEffect(() => {
    const handleClickOutside = () => setActiveMenuId(null);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const loadMetadata = async () => {
    const meta = await storageService.getMetadata();
    setFolders(meta.folders);
    setGlobalRoles(meta.roles);
    setGlobalPartTags(meta.partTags);
    setFolderAliases(meta.folderAliases?.['admin'] || {});
    setSetlists(meta.setlists || []);
    setActiveSetlistId(meta.activeSetlistId || '');
    
    setFolderCovers(meta.folderCovers || {});

    setNotifications(meta.notifications || [
      { id: '1', type: 'request', title: '声部加入请求', message: '李四 申请加入 第一小提琴 声部', timestamp: Date.now(), read: false },
      { id: '2', type: 'upload', title: '新乐谱上传', message: '王五 上传了《天鹅湖》', timestamp: Date.now() - 3600000, read: true }
    ]);
    setUserProfile(meta.profile);
    setUserRole(meta.userRole || 'member');
  };

  const loadScores = async () => {
    let allScores = await storageService.getAllScores();
    const isLoggedIn = !!localStorage.getItem('nocturne_token');

    if (isLoggedIn) {
      try {
        const res = await apiService.scores.list();
        const cloudScores = res.data;
        
        // Simple sync: if cloud score not in local, add it
        for (const cs of cloudScores) {
          const exists = allScores.find(s => s.cloudUrl === cs.file_path);
          if (!exists) {
            const newScore: ScoreData = {
              id: `cloud-${cs.id}`,
              title: cs.title,
              composer: cs.composer,
              folder: cs.category, // Using category as temporary folder name if needed
              cloudUrl: cs.file_path,
              type: 'single',
              updatedAt: new Date(cs.created_at).getTime(),
              blob: undefined // Will download on demand
            };
            await storageService.saveScore(newScore);
            allScores.push(newScore);
          }
        }
      } catch (err) {
        console.error('Failed to fetch cloud scores:', err);
      }
    }

    if (allScores.length === 0) {
      const sample: ScoreData = { 
        id: 'sample-score', 
        title: '月光奏鸣曲', 
        composer: '路德维希·凡·贝多芬', 
        tags: ['钢琴谱', '古典'], 
        type: 'single',
        updatedAt: Date.now(),
        blob: new Blob([''], { type: 'application/pdf' }) 
      };
      await storageService.saveScore(sample);
      allScores = [sample];
    }
    setScores(allScores);
    const meta = await storageService.getMetadata();
    
    const activeSet = (meta.setlists || []).find(s => s.id === (meta.activeSetlistId || ''));
    if (activeSet) {
      setProgramIds(activeSet.program);
    } else {
      setProgramIds(meta.program || []);
    }
  };

  const handleDeleteScore = async (scoreId: string) => {
    if (window.confirm('确定要删除这个乐谱吗？此操作不可撤销。')) {
      await storageService.deleteScore(scoreId);
      await loadScores();
      setActiveMenuId(null);
    }
  };

  const handleAddScore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const MAX_SIZE = 20 * 1024 * 1024; // 20MB
    const validFiles: File[] = [];

    for (const file of files) {
      if (!file.name.toLowerCase().endsWith('.pdf')) {
        showMessage(`文件 ${file.name} 不是 PDF 格式`, 'error');
        continue;
      }
      if (file.size > MAX_SIZE) {
        showMessage(`文件 ${file.name} 超过 20MB 限制`, 'error');
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    const newPending: { file: File, scoreTitle: string, suggestedPartName: string, ambiguous: boolean }[] = [];

    for (const file of validFiles) {
      const filename = file.name.replace('.pdf', '');
      let scoreTitle = filename;
      let partName = '';
      let isAmbiguous = false;

      // 1. Try user's numeric code pattern: (\d{2})(\d{2})\s+(.+)
      const codeMatch = filename.match(/^(\d{2})(\d{2})\s+(.+)$/);
      if (codeMatch) {
        const instCode = codeMatch[1];
        // const catCode = codeMatch[2]; // Category code, can be used for tags if needed
        scoreTitle = codeMatch[3].trim();
        partName = instrumentCodes[instCode] || '';
      }

      // 2. Fallback to instrument name patterns if not found by code
      if (!partName) {
        for (const pattern of instrumentPatterns) {
          const match = filename.match(pattern.pattern);
          if (match) {
            partName = pattern.name;
            isAmbiguous = pattern.ambiguous || false;
            // Remove instrument name and common separators from title
            scoreTitle = filename.replace(match[0], '').replace(/[-_]/g, ' ').trim();
            break;
          }
        }
      }

      newPending.push({ file, scoreTitle, suggestedPartName: partName, ambiguous: isAmbiguous });
    }

    setPendingUploads(newPending);
    
    if (newPending.some(p => p.ambiguous)) {
      setIsShowingAmbiguityDialog(true);
    } else {
      await processUploads(newPending);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processUploads = async (uploads: { file: File, scoreTitle: string, suggestedPartName: string }[]) => {
    const newNotifications: Notification[] = [];
    const isLoggedIn = !!localStorage.getItem('nocturne_token');
    
    // Group uploads by scoreTitle to handle merging correctly
    const groupedUploads: { [key: string]: typeof uploads } = {};
    uploads.forEach(u => {
      const title = u.scoreTitle.toLowerCase();
      if (!groupedUploads[title]) groupedUploads[title] = [];
      groupedUploads[title].push(u);
    });

    for (const title in groupedUploads) {
      const currentUploads = groupedUploads[title];
      const scoreTitle = currentUploads[0].scoreTitle;
      
      // Refresh existing scores to get the latest state
      const existingScores = await storageService.getAllScores();
      let score = existingScores.find(s => s.title.toLowerCase() === title);

      if (score) {
        // Add all parts to existing score
        const newParts: ScorePart[] = [];
        for (const u of currentUploads) {
          let cloudUrl = '';
          if (isLoggedIn) {
            try {
              const formData = new FormData();
              formData.append('file', u.file);
              formData.append('title', u.scoreTitle);
              formData.append('composer', score.composer || '');
              formData.append('category', u.suggestedPartName);
              const res = await apiService.scores.upload(formData);
              cloudUrl = res.data.file_path;
            } catch (err) {
              console.error('Cloud upload failed:', err);
            }
          }

          newParts.push({
            id: Math.random().toString(36).substr(2, 9),
            name: u.suggestedPartName || u.file.name.replace('.pdf', ''),
            blob: u.file,
            cloudUrl,
            assignedTo: [],
            tags: [],
            pendingRequests: []
          });
        }
        
        score.parts = [...(score.parts || []), ...newParts];
        score.updatedAt = Date.now();
        await storageService.saveScore(score);
        
        newNotifications.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'upload',
          title: '乐谱更新',
          message: `乐谱《${score.title}》已更新，新增了 ${newParts.length} 个声部。`,
          timestamp: Date.now(),
          read: false
        });
      } else {
        // Create new score with all parts
        const firstUpload = currentUploads[0];
        
        const newScore: ScoreData = {
          id: Math.random().toString(36).substr(2, 9),
          title: scoreTitle,
          blob: firstUpload.file,
          type: uploadType,
          updatedAt: Date.now(),
          tags: [],
          parts: [],
          uploaderId: 'current-user',
          uploaderName: '张三',
          allowDownload: true,
          folder: selectedFolder || undefined
        };

        const newParts: ScorePart[] = [];
        for (const u of currentUploads) {
          let cloudUrl = '';
          if (isLoggedIn) {
            try {
              const formData = new FormData();
              formData.append('file', u.file);
              formData.append('title', u.scoreTitle);
              formData.append('category', u.suggestedPartName);
              const res = await apiService.scores.upload(formData);
              cloudUrl = res.data.file_path;
            } catch (err) {
              console.error('Cloud upload failed:', err);
            }
          }

          newParts.push({
            id: Math.random().toString(36).substr(2, 9),
            name: u.suggestedPartName || u.file.name.replace('.pdf', ''),
            blob: u.file,
            cloudUrl,
            assignedTo: [],
            tags: [],
            pendingRequests: []
          });
        }

        if (uploadType === 'collection') {
          newScore.parts = newParts;
        } else if (newParts.length > 1) {
          // If multiple files for a non-collection, treat it as a collection
          newScore.type = 'collection';
          newScore.parts = newParts;
        }

        await storageService.saveScore(newScore);
        
        newNotifications.push({
          id: Math.random().toString(36).substr(2, 9),
          type: 'upload',
          title: '新乐谱上传',
          message: `新乐谱《${scoreTitle}》已上传到 ${selectedFolder || '未分类'}，包含 ${newParts.length} 个声部。`,
          timestamp: Date.now(),
          read: false
        });
      }
    }

    if (newNotifications.length > 0) {
      const updatedNotifications = [...newNotifications, ...notifications];
      setNotifications(updatedNotifications);
      await storageService.saveMetadata({ notifications: updatedNotifications });
    }

    loadScores();
    setIsUploading(false);
    setPendingUploads([]);
    setIsShowingAmbiguityDialog(false);
  };

  const handleAddTag = () => {
    if (newTag && !tags.includes(newTag)) {
      setTags([...tags, newTag]);
      setNewTag('');
      setIsAddingTag(false);
    }
  };

  const handleUpdateScore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditingScore) {
      // Sync new roles and tags to metadata
      if (isEditingScore.parts) {
        for (const part of isEditingScore.parts) {
          if (part.assignedTo) {
            for (const role of part.assignedTo) {
              if (!globalRoles.includes(role)) {
                await handleUpdateMetadata('roles', role);
              }
            }
          }
          if (part.tags) {
            for (const tag of part.tags) {
              if (!globalPartTags.includes(tag)) {
                await handleUpdateMetadata('partTags', tag);
              }
            }
          }
        }
      }

      // If member editing admin score, create a fork
      const isAdminScore = !isEditingScore.uploaderId || isEditingScore.uploaderId === 'admin';
      if (!isAdmin && isAdminScore) {
        const fork: ScoreData = {
          ...isEditingScore,
          id: Math.random().toString(36).substr(2, 9),
          originalScoreId: isEditingScore.id,
          uploaderId: 'current-user',
          uploaderName: '张三',
          updatedAt: Date.now()
        };
        await storageService.saveScore(fork);
      } else {
        await storageService.saveScore(isEditingScore);
      }
      setIsEditingScore(null);
      loadScores();
    }
  };

  const handleAddPart = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0 && isEditingScore) {
      const newParts: ScorePart[] = Array.from(files).map(file => ({
        id: Math.random().toString(36).substr(2, 9),
        name: file.name.replace('.pdf', ''),
        blob: file,
        assignedTo: [],
        tags: [],
        pendingRequests: []
      }));
      
      const updated = {
        ...isEditingScore,
        parts: [...(isEditingScore.parts || []), ...newParts]
      };
      setIsEditingScore(updated);
    }
  };

  const handleApproveRequest = async (scoreId: string, partId: string, userId: string) => {
    const score = scores.find(s => s.id === scoreId);
    if (score && score.parts) {
      const updatedParts = score.parts.map(p => {
        if (p.id === partId) {
          return {
            ...p,
            assignedTo: [...(p.assignedTo || []), userId],
            pendingRequests: (p.pendingRequests || []).filter(id => id !== userId)
          };
        }
        return p;
      });
      const updatedScore = { ...score, parts: updatedParts };
      await storageService.saveScore(updatedScore);
      loadScores();
      if (isEditingScore?.id === scoreId) {
        setIsEditingScore(updatedScore);
      }
    }
  };

  const handleCreateFolder = async () => {
    if (newFolderName && !folders.includes(newFolderName)) {
      const newFolders = [...folders, newFolderName];
      setFolders(newFolders);
      await storageService.saveMetadata({ folders: newFolders });
      setNewFolderName('');
      setIsManagingMetadata(false);
    }
  };

  const handleDeleteFolder = async (folder: string) => {
    const newFolders = folders.filter(f => f !== folder);
    setFolders(newFolders);
    await storageService.saveMetadata({ folders: newFolders });
    if (selectedFolder === folder) setSelectedFolder(null);
  };

  const handleUpdateMetadata = async (type: 'roles' | 'partTags' | 'folders', value: string, oldValue?: string) => {
    if (type === 'roles' && !globalRoles.includes(value)) {
      const newRoles = oldValue ? globalRoles.map(r => r === oldValue ? value : r) : [...globalRoles, value];
      setGlobalRoles(newRoles);
      await storageService.saveMetadata({ roles: newRoles });
    } else if (type === 'partTags' && !globalPartTags.includes(value)) {
      const newPartTags = oldValue ? globalPartTags.map(t => t === oldValue ? value : t) : [...globalPartTags, value];
      setGlobalPartTags(newPartTags);
      await storageService.saveMetadata({ partTags: newPartTags });
    } else if (type === 'folders' && !folders.includes(value)) {
      const newFolders = oldValue ? folders.map(f => f === oldValue ? value : f) : [...folders, value];
      setFolders(newFolders);
      await storageService.saveMetadata({ folders: newFolders });
    }
  };

  const handleAddToProgram = async (score: ScoreData) => {
    if (programIds.includes(score.id)) {
      alert('该乐谱已在当前节目单中');
      return;
    }
    const next = [...programIds, score.id];
    setProgramIds(next);
    
    if (activeSetlistId) {
      const nextSetlists = setlists.map(s => s.id === activeSetlistId ? { ...s, program: next } : s);
      setSetlists(nextSetlists);
      await storageService.saveMetadata({ setlists: nextSetlists });
    } else {
      await storageService.saveMetadata({ program: next });
    }
    
    alert(`《${score.title}》已添加到当前节目单`);
    setActiveMenuId(null);
  };

  const handleFolderToProgram = async (folderName: string) => {
    const folderScores = scores.filter(s => s.folder === folderName);
    const newIds = folderScores.map(s => s.id).filter(id => !programIds.includes(id));
    
    if (newIds.length === 0) {
      alert('文件夹中的乐谱已全部在当前节目单中');
      return;
    }

    const next = [...programIds, ...newIds];
    setProgramIds(next);
    
    if (activeSetlistId) {
      const nextSetlists = setlists.map(s => s.id === activeSetlistId ? { ...s, program: next } : s);
      setSetlists(nextSetlists);
      await storageService.saveMetadata({ setlists: nextSetlists });
    } else {
      await storageService.saveMetadata({ program: next });
    }
    
    alert(`文件夹“${folderName}”中的 ${newIds.length} 份新乐谱已添加到当前节目单`);
  };

  const handleRemoveFromProgram = async (scoreId: string) => {
    const next = programIds.filter(id => id !== scoreId);
    setProgramIds(next);
    
    if (activeSetlistId) {
      const nextSetlists = setlists.map(s => s.id === activeSetlistId ? { ...s, program: next } : s);
      setSetlists(nextSetlists);
      await storageService.saveMetadata({ setlists: nextSetlists });
    } else {
      await storageService.saveMetadata({ program: next });
    }
  };

  const handleMoveProgramItem = async (index: number, direction: 'up' | 'down') => {
    const next = [...programIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= next.length) return;
    
    [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
    setProgramIds(next);
    
    if (activeSetlistId) {
      const nextSetlists = setlists.map(s => s.id === activeSetlistId ? { ...s, program: next } : s);
      setSetlists(nextSetlists);
      await storageService.saveMetadata({ setlists: nextSetlists });
    } else {
      await storageService.saveMetadata({ program: next });
    }
  };

  const handleDownloadPDF = async (score: ScoreData) => {
    if (!score.allowDownload && !isAdmin) return;
    
    let url = '';
    if (score.blob) {
      url = URL.createObjectURL(score.blob);
    } else if (score.cloudUrl) {
      // If no local blob, download from cloud
      try {
        const response = await fetch(apiService.getFileUrl(score.cloudUrl));
        const blob = await response.blob();
        url = URL.createObjectURL(blob);
      } catch (err) {
        alert('下载失败，请检查网络连接');
        return;
      }
    }

    if (!url) return;
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${score.title}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleFavorite = async (e: React.MouseEvent, score: ScoreData) => {
    e.stopPropagation();
    const updated = { ...score, isFavorite: !score.isFavorite };
    await storageService.saveScore(updated);
    loadScores();
  };

  const handleOpenScore = async (scoreId: string) => {
    const score = scores.find(s => s.id === scoreId);
    if (score) {
      const updated = { ...score, lastViewedAt: Date.now() };
      await storageService.saveScore(updated);
    }
    onOpenScore(scoreId);
  };

  const filteredScores = scores
    .filter(score => {
      if (filterType === 'favorites') return score.isFavorite;
      if (filterType === 'recent') return score.lastViewedAt;
      return true;
    })
    .filter(score => 
      score.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      score.composer?.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="pb-24 min-h-screen bg-background relative overflow-hidden">
      {/* Dramatic Atmospheric Backgrounds */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-secondary/10 blur-[100px] rounded-full pointer-events-none" />
      
      {/* Batch Actions Bar */}
      <AnimatePresence>
        {isMultiSelectMode && selectedScoreIds.size > 0 && (
          <motion.div 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-2xl bg-surface-bright/90 backdrop-blur-xl border border-outline-variant/10 rounded-3xl shadow-2xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-primary">已选择 {selectedScoreIds.size} 项</span>
              <button 
                onClick={() => setSelectedScoreIds(new Set(scores.map(s => s.id)))}
                className="text-xs font-bold text-on-background/50 hover:text-primary transition-colors"
              >
                全选
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setIsMovingToFolder(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold hover:bg-primary/20 transition-all"
              >
                <FolderOpen className="w-4 h-4" />
                移动到
              </button>
              <button 
                onClick={handleBatchDelete}
                className="flex items-center gap-2 px-4 py-2 bg-error/10 text-error rounded-xl text-xs font-bold hover:bg-error/20 transition-all"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
              <button 
                onClick={() => { setIsMultiSelectMode(false); setSelectedScoreIds(new Set()); }}
                className="p-2 text-on-background/50 hover:bg-surface-container rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Move to Folder Dialog */}
      <AnimatePresence>
        {isMovingToFolder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setIsMovingToFolder(false)}
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              className="relative bg-surface-bright w-full max-w-md rounded-3xl shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="text-lg font-bold">移动到文件夹</h3>
                <button onClick={() => setIsMovingToFolder(false)}><X className="w-5 h-5" /></button>
              </div>
              <div className="p-4 max-h-[60vh] overflow-y-auto space-y-2">
                <button 
                  onClick={() => handleBatchMove('')}
                  className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-surface-container transition-all text-left"
                >
                  <div className="w-10 h-10 bg-surface-container-low rounded-xl flex items-center justify-center text-primary">
                    <Music className="w-5 h-5" />
                  </div>
                  <span className="font-bold">无文件夹 (根目录)</span>
                </button>
                {folders.map(folder => (
                  <button 
                    key={folder}
                    onClick={() => handleBatchMove(folder)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl hover:bg-surface-container transition-all text-left"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <span className="font-bold">{folder}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar / Hamburger Menu */}
      <div className={`fixed inset-0 z-[100] transition-all duration-500 ${isSidebarOpen ? 'visible' : 'invisible'}`}>
        <div 
          className={`absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-500 ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setIsSidebarOpen(false)}
        />
        <aside className={`absolute top-0 left-0 h-full w-80 bg-surface-bright shadow-2xl transition-transform duration-500 flex flex-col ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary font-headline font-bold">合</div>
              <h2 className="font-headline font-bold text-xl text-primary tracking-tight">合拍</h2>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
              <X className="w-6 h-6 text-on-background/50" />
            </button>
          </div>

          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            <button 
              onClick={() => { setFilterType('all'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${filterType === 'all' ? 'bg-primary/10 text-primary font-bold' : 'text-on-background/70 hover:bg-surface-container'}`}
            >
              <Music className="w-5 h-5" />
              <span>所有乐谱</span>
            </button>
            <button 
              onClick={() => { setFilterType('favorites'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${filterType === 'favorites' ? 'bg-primary/10 text-primary font-bold' : 'text-on-background/70 hover:bg-surface-container'}`}
            >
              <Star className="w-5 h-5" />
              <span>我的收藏</span>
            </button>
            <button 
              onClick={() => { setFilterType('recent'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${filterType === 'recent' ? 'bg-primary/10 text-primary font-bold' : 'text-on-background/70 hover:bg-surface-container'}`}
            >
              <Clock className="w-5 h-5" />
              <span>最近查看</span>
            </button>
            <button 
              onClick={() => { setFilterType('program'); setIsSidebarOpen(false); }}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${filterType === 'program' ? 'bg-primary/10 text-primary font-bold' : 'text-on-background/70 hover:bg-surface-container'}`}
            >
              <List className="w-5 h-5" />
              <span>节目单</span>
              {programIds.length > 0 && (
                <span className="ml-auto bg-primary text-on-primary text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {programIds.length}
                </span>
              )}
            </button>
            {isAdmin && (
              <button 
                onClick={() => { setIsManagingMetadata(true); setIsSidebarOpen(false); }}
                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-on-background/70 hover:bg-surface-container transition-all"
              >
                <Filter className="w-5 h-5" />
                <span>标签与角色管理</span>
              </button>
            )}
            <div className="h-px bg-outline-variant/10 my-4 mx-4"></div>
            <button 
              onClick={() => onViewChange('settings')}
              className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-on-background/70 hover:bg-surface-container transition-all"
            >
              <Settings className="w-5 h-5" />
              <span>系统设置</span>
            </button>
          </nav>

          {isAdmin && (
            <div className="p-6 border-t border-outline-variant/10 space-y-4">
              <div className="flex items-center justify-between px-4 py-2 bg-surface-container rounded-xl">
                <div className="flex items-center gap-3">
                  <UserCheck className="w-5 h-5 text-primary" />
                  <span className="text-sm font-bold">管理员模式</span>
                </div>
                <button 
                  onClick={() => setIsAdmin(!isAdmin)}
                  className={`w-10 h-5 rounded-full transition-all relative ${isAdmin ? 'bg-primary' : 'bg-outline-variant'}`}
                >
                  <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${isAdmin ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-error font-bold hover:bg-error/10 transition-all">
                <LogOut className="w-5 h-5" />
                <span>退出登录</span>
              </button>
            </div>
          )}
          {!isAdmin && (
            <div className="p-6 border-t border-outline-variant/10">
              <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-error font-bold hover:bg-error/10 transition-all">
                <LogOut className="w-5 h-5" />
                <span>退出登录</span>
              </button>
            </div>
          )}
        </aside>
      </div>

      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 sm:px-6 py-3 sm:py-4 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 sm:gap-4">
            <button 
              onClick={() => {
                setIsMultiSelectMode(!isMultiSelectMode);
                setSelectedScoreIds(new Set());
              }}
              className={`p-2 rounded-xl transition-all ${isMultiSelectMode ? 'bg-primary text-on-primary' : 'text-primary hover:bg-surface-container-high'}`}
              title="多选模式"
            >
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <Menu onClick={() => setIsSidebarOpen(true)} className="text-primary cursor-pointer w-5 h-5 sm:w-6 sm:h-6 hover:scale-110 transition-transform" />
          </div>
          <h1 className="font-headline font-bold text-base sm:text-lg tracking-tight text-primary uppercase">我的乐谱库</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="relative">
            <button 
              onClick={() => setIsShowingNotifications(!isShowingNotifications)}
              className="p-1.5 sm:p-2 hover:bg-surface-container-high rounded-full text-primary transition-all relative"
            >
              <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
              {notifications.filter(n => !n.read).length > 0 && (
                <span className="absolute top-1 right-1 w-2.5 h-2.5 sm:w-3 sm:h-3 bg-error rounded-full border-2 border-background"></span>
              )}
            </button>
            {isShowingNotifications && (
              <div className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-surface-bright rounded-2xl shadow-2xl border border-outline-variant/10 py-4 z-[100] animate-in slide-in-from-top-2 duration-200">
                <div className="px-4 mb-3 flex justify-between items-center">
                  <h3 className="font-bold text-sm text-on-background">通知中心</h3>
                  <button 
                    onClick={markAllAsRead}
                    className="text-[10px] font-bold text-primary uppercase tracking-tighter hover:underline"
                  >
                    全部已读
                  </button>
                </div>
                <div className="max-h-80 overflow-y-auto custom-scrollbar">
                  {notifications.length > 0 ? [...notifications].sort((a, b) => b.timestamp - a.timestamp).map(n => (
                    <div 
                      key={n.id} 
                      onClick={() => markAsRead(n.id)}
                      className={`px-4 py-3 hover:bg-surface-container transition-colors cursor-pointer border-l-4 ${n.read ? 'border-transparent bg-transparent opacity-60' : 'border-primary bg-primary/5'}`}
                    >
                      <div className="flex justify-between items-start mb-0.5">
                        <p className={`text-xs font-bold ${n.read ? 'text-on-background/70' : 'text-on-background'}`}>{n.title}</p>
                        {!n.read && <span className="w-2 h-2 bg-primary rounded-full"></span>}
                      </div>
                      <p className="text-[10px] text-on-background/60 leading-relaxed">{n.message}</p>
                      <p className="text-[8px] text-on-background/30 mt-1 font-mono">{new Date(n.timestamp).toLocaleString()}</p>
                    </div>
                  )) : (
                    <div className="px-4 py-8 text-center text-on-background/30 text-xs">暂无通知</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <div 
            onClick={() => onViewChange('profile')}
            className="flex items-center gap-3 pl-4 border-l border-outline-variant/10 cursor-pointer group"
          >
            <div className="text-right hidden sm:block">
              <div className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest leading-none mb-1">
                {userRole === 'admin' ? '主管理员' : userRole === 'sub-admin' ? '二级管理员' : '乐团成员'}
              </div>
              <div className="text-xs font-bold text-on-background group-hover:text-primary transition-colors">
                {userProfile?.name || '音乐家'}
              </div>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20 group-hover:border-primary transition-all">
              {(userProfile?.name || '音')[0]}
            </div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 py-4 max-w-5xl mx-auto">
        <section className="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
          <div className="relative group">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="text-outline w-4 h-4 sm:w-5 sm:h-5 group-focus-within:text-primary transition-colors" />
            </div>
            <input
              className="w-full bg-surface-container-low border-none ring-1 ring-outline-variant/15 focus:ring-2 focus:ring-primary/50 rounded-xl py-3 sm:py-4 pl-10 sm:pl-12 pr-4 text-sm sm:text-base text-on-background placeholder:text-on-background/30 transition-all shadow-sm"
              placeholder="搜索作曲家、标题或关键词..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex bg-surface-container-low rounded-full p-1 shadow-inner w-full sm:w-auto">
              <button 
                onClick={() => setActiveTab('folders')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'folders' ? 'bg-primary text-on-primary shadow-md' : 'text-on-background/50 hover:text-on-background'
                }`}
              >
                文件夹
              </button>
              <button 
                onClick={() => setActiveTab('tags')}
                className={`flex-1 sm:flex-none px-4 sm:px-6 py-2 rounded-full text-xs sm:text-sm font-bold transition-all ${
                  activeTab === 'tags' ? 'bg-primary text-on-primary shadow-md' : 'text-on-background/50 hover:text-on-background'
                }`}
              >
                标签
              </button>
            </div>
            <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-2">
              <div className="flex bg-surface-container-low rounded-full p-1 shadow-inner">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-full transition-all ${viewMode === 'grid' ? 'bg-primary text-on-primary shadow-md' : 'text-on-background/50 hover:text-on-background'}`}
                  title="大图标"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('compact')}
                  className={`p-2 rounded-full transition-all ${viewMode === 'compact' ? 'bg-primary text-on-primary shadow-md' : 'text-on-background/50 hover:text-on-background'}`}
                  title="小图标"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-full transition-all ${viewMode === 'list' ? 'bg-primary text-on-primary shadow-md' : 'text-on-background/50 hover:text-on-background'}`}
                  title="详细列表"
                >
                  <Menu className="w-4 h-4" />
                </button>
              </div>
              <button className="flex items-center gap-2 text-primary font-bold text-sm hover:bg-primary/5 px-3 py-1.5 rounded-full transition-colors">
                <Filter className="w-4 h-4" />
                <span>筛选</span>
              </button>
            </div>
          </div>
        </section>

        {filterType === 'program' ? (
          <section className="animate-in fade-in duration-700">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-headline text-2xl font-bold tracking-tight flex items-center gap-3 text-on-background">
                <List className="text-primary w-6 h-6" />
                当前节目单
              </h2>
              {programIds.length > 0 && (
                <div className="flex items-center gap-2">
                  {confirmingClearProgram ? (
                    <div className="flex items-center gap-2 bg-error/10 px-3 py-1.5 rounded-full border border-error/20 animate-in fade-in slide-in-from-right-2">
                      <span className="text-[10px] font-bold text-error uppercase">确定清空?</span>
                      <button 
                        onClick={async () => {
                          setProgramIds([]);
                          await storageService.saveMetadata({ program: [] });
                          setConfirmingClearProgram(false);
                        }}
                        className="text-xs font-bold text-error hover:underline"
                      >
                        确认
                      </button>
                      <button 
                        onClick={() => setConfirmingClearProgram(false)}
                        className="text-on-background/30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => setConfirmingClearProgram(true)}
                      className="text-xs font-bold text-error hover:bg-error/5 px-3 py-1.5 rounded-full transition-all"
                    >
                      清空节目单
                    </button>
                  )}
                </div>
              )}
            </div>
            
            {programIds.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-on-background/30 border-2 border-dashed border-outline-variant/10 rounded-3xl">
                <List className="w-16 h-16 mb-4 opacity-20" />
                <p className="font-headline font-bold text-lg">节目单为空</p>
                <p className="text-sm">从乐谱库中添加乐谱到节目单</p>
              </div>
            ) : (
              <div className="space-y-4">
                {programIds.map((id, index) => {
                  const score = scores.find(s => s.id === id);
                  if (!score) return null;
                  return (
                    <div 
                      key={id}
                      className="bg-surface-container-high p-4 rounded-2xl flex items-center gap-4 group hover:bg-surface-bright transition-all border border-outline-variant/5 hover:border-primary/20 shadow-sm"
                    >
                      <div className="flex flex-col gap-1">
                        <button 
                          disabled={index === 0}
                          onClick={() => handleMoveProgramItem(index, 'up')}
                          className={`p-1 transition-all ${index === 0 ? 'opacity-0' : 'text-on-background/30 hover:text-primary'}`}
                        >
                          <ChevronLeft className="w-4 h-4 rotate-90" />
                        </button>
                        <button 
                          disabled={index === programIds.length - 1}
                          onClick={() => handleMoveProgramItem(index, 'down')}
                          className={`p-1 transition-all ${index === programIds.length - 1 ? 'opacity-0' : 'text-on-background/30 hover:text-primary'}`}
                        >
                          <ChevronLeft className="w-4 h-4 -rotate-90" />
                        </button>
                      </div>
                      
                      <div className="w-12 h-16 bg-surface-container-low rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {score.coverBlob ? (
                          <img src={URL.createObjectURL(score.coverBlob)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          <FileText className="text-primary/40 w-6 h-6" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0" onClick={() => onOpenScore(score.id)}>
                        <h4 className="font-bold text-on-background truncate">{score.title}</h4>
                        <p className="text-xs text-on-background/50 truncate">{score.composer || '未知'}</p>
                      </div>
                      
                      {confirmingRemoveFromProgramId === id ? (
                        <div className="flex items-center gap-2 bg-error/10 px-3 py-1.5 rounded-xl border border-error/20 animate-in fade-in scale-95">
                          <button 
                            onClick={() => handleRemoveFromProgram(id)}
                            className="text-[10px] font-bold text-error uppercase"
                          >
                            确认移除
                          </button>
                          <button onClick={() => setConfirmingRemoveFromProgramId(null)}>
                            <X className="w-4 h-4 text-on-background/30" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmingRemoveFromProgramId(id)}
                          className="p-2 text-on-background/20 hover:text-error transition-colors"
                          title="从节目单移除"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        ) : (
          <>
            {activeTab === 'folders' && !searchQuery ? (
          <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-headline text-xl font-bold tracking-tight flex items-center gap-2 text-on-background/80">
                <FolderOpen className="text-primary w-5 h-5" />
                {selectedFolder ? `文件夹: ${selectedFolder}` : '所有文件夹'}
              </h2>
              <div className="flex gap-2">
                {!selectedFolder && (
                  <button 
                    onClick={() => setIsCreatingFolder(true)}
                    className="flex items-center gap-2 text-xs font-bold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-full transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    新增文件夹
                  </button>
                )}
                {selectedFolder && (
                  <button 
                    onClick={() => setSelectedFolder(null)}
                    className="text-xs font-bold text-primary hover:underline"
                  >
                    返回全部
                  </button>
                )}
              </div>
            </div>
            <div className={`grid gap-3 sm:gap-4 ${
              viewMode === 'grid' ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3' : 
              viewMode === 'compact' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6' : 
              'grid-cols-1'
            }`}>
              {!selectedFolder && folders.map(folder => (
                <FolderCard 
                  key={folder}
                  folder={folder}
                  viewMode={viewMode}
                  coverBlob={folderCovers[folder]}
                  onClick={() => setSelectedFolder(folder)}
                  isEditing={editingFolderName === folder}
                  tempName={tempFolderName}
                  setTempName={setTempFolderName}
                  onRename={() => handleRenameFolder(folder)}
                  onStopPropagation={(e) => e.stopPropagation()}
                />
              ))}
              {/* Member Folders for Admin */}
              {isAdmin && !selectedFolder && Array.from(new Set(scores.map(s => s.uploaderName).filter(Boolean))).map(name => (
                <FolderCard 
                  key={`member-${name}`}
                  folder={`member:${name}`}
                  viewMode={viewMode}
                  onClick={() => setSelectedFolder(`member:${name}`)}
                  isEditing={editingFolderName === `member:${name}`}
                  tempName={tempFolderName}
                  setTempName={setTempFolderName}
                  onRename={() => handleRenameFolder(`member:${name}`)}
                  onStopPropagation={(e) => e.stopPropagation()}
                />
              ))}
              {selectedFolder && (
                <div className={viewMode === 'list' ? 'space-y-2 col-span-full' : `grid gap-6 col-span-full ${
                  viewMode === 'grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
                }`}>
                  {filteredScores.filter(s => {
                    if (selectedFolder.startsWith('member:')) {
                      return s.uploaderName === selectedFolder.replace('member:', '');
                    }
                    return s.folder === selectedFolder;
                  }).map(score => (
                    viewMode === 'list' ? (
                      <div 
                        key={score.id}
                        className="bg-surface-container-high p-3 rounded-xl flex items-center justify-between group hover:bg-surface-bright transition-all cursor-pointer border border-outline-variant/5 hover:border-primary/20 shadow-sm"
                      >
                        <div className="flex gap-4 items-center flex-1" onClick={() => isMultiSelectMode ? toggleScoreSelection(score.id) : handleOpenScore(score.id)}>
                          {isMultiSelectMode && (
                            <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${selectedScoreIds.has(score.id) ? 'bg-primary border-primary' : 'border-outline-variant'}`}>
                              {selectedScoreIds.has(score.id) && <CheckCircle className="w-4 h-4 text-white" />}
                            </div>
                          )}
                          <div className="w-10 h-12 bg-surface-container-low rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center">
                            {score.coverBlob ? (
                              <img src={URL.createObjectURL(score.coverBlob)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <FileText className="text-primary/40 w-6 h-6" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-on-background truncate">{score.title}</h4>
                            </div>
                            <p className="text-[10px] text-on-background/50 truncate">{score.composer || '未知作曲家'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === score.id ? null : score.id); }}
                            className="p-2 hover:bg-surface-container text-on-background/20 hover:text-on-background transition-colors relative cursor-pointer rounded-full"
                            role="button"
                            tabIndex={0}
                            style={{ zIndex: activeMenuId === score.id ? 200 : 1 }}
                          >
                            <MoreVertical className="w-4 h-4" />
                            {activeMenuId === score.id && (
                              <div className="absolute right-0 top-full mt-2 w-48 bg-surface-bright rounded-2xl shadow-2xl border border-outline-variant/10 py-3 z-[200] text-on-background animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="px-4 py-2 border-b border-outline-variant/5 mb-1">
                                  <p className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest truncate">{score.title}</p>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Download className="w-4 h-4" /> 下载 PDF</button>
                                <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /> 编辑属性</button>
                                <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Music className="w-4 h-4" /> 查看声部</button>
                                <button onClick={(e) => { e.stopPropagation(); handleAddToProgram(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Star className="w-4 h-4" /> 添加到节目单</button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleDeleteScore(score.id); }} 
                                  className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" /> 删除乐谱
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div 
                        key={score.id}
                        onClick={() => isMultiSelectMode ? toggleScoreSelection(score.id) : handleOpenScore(score.id)}
                        className={`bg-surface-container-high rounded-3xl group cursor-pointer border transition-all shadow-sm hover:shadow-xl flex flex-col ${
                          selectedScoreIds.has(score.id) ? 'border-primary ring-2 ring-primary/20' : 'border-outline-variant/10 hover:border-primary/30'
                        } ${viewMode === 'compact' ? 'rounded-2xl' : ''}`}
                        style={{ zIndex: activeMenuId === score.id ? 100 : 1 }}
                      >
                        <div className="aspect-[3/4] bg-surface-container-low relative">
                          {isMultiSelectMode && (
                            <div className="absolute top-2 left-2 z-40">
                              <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${selectedScoreIds.has(score.id) ? 'bg-primary border-primary' : 'bg-black/20 border-white'}`}>
                                {selectedScoreIds.has(score.id) && <CheckCircle className="w-4 h-4 text-white" />}
                              </div>
                            </div>
                          )}
                          {score.coverBlob ? (
                            <img src={URL.createObjectURL(score.coverBlob)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 rounded-t-3xl" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-primary/20">
                              <FileText className={viewMode === 'compact' ? 'w-10 h-10' : 'w-16 h-16'} />
                            </div>
                          )}
                          <div className="absolute top-2 right-2 z-50">
                            <div 
                              onClick={(e) => { e.stopPropagation(); setActiveMenuId(activeMenuId === score.id ? null : score.id); }}
                              className={`p-2 bg-black/40 backdrop-blur-md rounded-full text-white transition-all relative cursor-pointer ${activeMenuId === score.id ? 'opacity-100 scale-110' : 'opacity-0 group-hover:opacity-100 sm:opacity-0'}`}
                              role="button"
                              tabIndex={0}
                            >
                              <MoreVertical className="w-4 h-4" />
                              {activeMenuId === score.id && (
                                <div className="absolute right-0 top-full mt-2 w-48 bg-surface-bright rounded-2xl shadow-2xl border border-outline-variant/10 py-3 z-[200] text-on-background animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                  <div className="px-4 py-2 border-b border-outline-variant/5 mb-1">
                                    <p className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest truncate">{score.title}</p>
                                  </div>
                                  <button onClick={(e) => { e.stopPropagation(); handleDownloadPDF(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Download className="w-4 h-4" /> 下载 PDF</button>
                                  <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Edit2 className="w-4 h-4" /> 编辑属性</button>
                                  <button onClick={(e) => { e.stopPropagation(); setIsEditingScore(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Music className="w-4 h-4" /> 查看声部</button>
                                  <button onClick={(e) => { e.stopPropagation(); handleAddToProgram(score); }} className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold hover:bg-primary/10 hover:text-primary transition-colors"><Star className="w-4 h-4" /> 添加到节目单</button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleDeleteScore(score.id); }} 
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold text-error hover:bg-error/10 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" /> 删除乐谱
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={viewMode === 'compact' ? 'p-2' : 'p-4'}>
                          <h4 className={`font-headline font-bold text-on-background truncate ${viewMode === 'compact' ? 'text-[10px]' : ''}`}>{score.title}</h4>
                          {viewMode !== 'compact' && <p className="text-xs text-on-background/50 truncate">{score.composer || '未知'}</p>}
                        </div>
                      </div>
                    )
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <section className="mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="font-headline text-xl font-bold mb-4 tracking-tight flex items-center gap-2 text-on-background/80">
              <Filter className="text-primary w-5 h-5" />
              热门标签
            </h2>
            <div className="flex flex-wrap gap-3">
              {tags.map(tag => (
                <button key={tag} className="px-4 py-2 rounded-xl bg-surface-container-high text-on-background/70 font-bold text-sm hover:bg-primary hover:text-on-primary transition-all shadow-sm group relative">
                  #{tag}
                  <X className="w-3 h-3 absolute -top-1 -right-1 bg-error text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); setTags(tags.filter(t => t !== tag)); }} />
                </button>
              ))}
              {isAddingTag ? (
                <div className="flex items-center gap-2">
                  <input 
                    autoFocus
                    className="bg-surface-container-low border border-primary/30 rounded-xl px-3 py-1.5 text-sm outline-none w-32"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                    onBlur={handleAddTag}
                  />
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingTag(true)}
                  className="px-4 py-2 rounded-xl border border-dashed border-primary/30 text-primary font-bold text-sm hover:bg-primary/5 transition-all flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  添加标签
                </button>
              )}
            </div>
          </section>
        )}

        <section className="space-y-4 animate-in fade-in duration-700">
          <h2 className="font-headline text-xl font-bold mb-4 tracking-tight text-on-background/80">
            {searchQuery ? '搜索结果' : '所有乐谱'}
          </h2>
          
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filteredScores.map(score => (
                <ScoreCard 
                  key={score.id}
                  score={score}
                  viewMode="grid"
                  handleOpenScore={handleOpenScore}
                  activeMenuId={activeMenuId}
                  setActiveMenuId={setActiveMenuId}
                  toggleFavorite={toggleFavorite}
                  handleDownloadPDF={handleDownloadPDF}
                  setIsEditingScore={setIsEditingScore}
                  handleAddToProgram={handleAddToProgram}
                  handleDeleteScore={handleDeleteScore}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : viewMode === 'compact' ? (
            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredScores.map(score => (
                <ScoreCard 
                  key={score.id}
                  score={score}
                  viewMode="compact"
                  handleOpenScore={handleOpenScore}
                  activeMenuId={activeMenuId}
                  setActiveMenuId={setActiveMenuId}
                  toggleFavorite={toggleFavorite}
                  handleDownloadPDF={handleDownloadPDF}
                  setIsEditingScore={setIsEditingScore}
                  handleAddToProgram={handleAddToProgram}
                  handleDeleteScore={handleDeleteScore}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredScores.map((score) => (
                <ScoreCard 
                  key={score.id}
                  score={score}
                  viewMode="list"
                  handleOpenScore={handleOpenScore}
                  activeMenuId={activeMenuId}
                  setActiveMenuId={setActiveMenuId}
                  toggleFavorite={toggleFavorite}
                  handleDownloadPDF={handleDownloadPDF}
                  setIsEditingScore={setIsEditingScore}
                  handleAddToProgram={handleAddToProgram}
                  handleDeleteScore={handleDeleteScore}
                  isAdmin={isAdmin}
                />
              ))}
            </div>
          )}

          {filteredScores.length === 0 && (
            <div className="py-20 flex flex-col items-center justify-center text-on-background/30">
              <Search className="w-16 h-16 mb-4 opacity-20" />
              <p className="font-headline font-bold text-lg">未找到相关乐谱</p>
              <p className="text-sm">尝试更换关键词搜索</p>
            </div>
          )}
        </section>
      </>
    )}
  </main>

      {/* Edit Score Modal */}
      {isEditingScore && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsEditingScore(null)} />
          <div className="relative bg-surface-bright w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h2 className="font-headline font-bold text-2xl tracking-tight text-primary">编辑乐谱属性</h2>
              <button onClick={() => setIsEditingScore(null)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <X className="w-6 h-6 text-on-background/50" />
              </button>
            </header>
            
            <form onSubmit={handleUpdateScore} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">标题</label>
                  <input 
                    className="w-full bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    value={isEditingScore.title}
                    onChange={(e) => setIsEditingScore({...isEditingScore, title: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">作曲家</label>
                  <input 
                    className="w-full bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    value={isEditingScore.composer || ''}
                    onChange={(e) => setIsEditingScore({...isEditingScore, composer: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">文件夹</label>
                  <select 
                    className="w-full bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all appearance-none"
                    value={isEditingScore.folder || ''}
                    onChange={(e) => setIsEditingScore({...isEditingScore, folder: e.target.value})}
                  >
                    <option value="">未分类</option>
                    {folders.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">乐谱封面</label>
                  <div className="flex items-center gap-4 px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    {isEditingScore.coverBlob ? (
                      <div className="flex items-center gap-3 flex-1">
                        <img src={URL.createObjectURL(isEditingScore.coverBlob)} className="w-10 h-10 object-cover rounded" referrerPolicy="no-referrer" />
                        <span className="text-sm truncate">已设置封面</span>
                        <button 
                          type="button"
                          onClick={() => setIsEditingScore({...isEditingScore, coverBlob: undefined})}
                          className="text-error hover:bg-error/10 p-1 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-3 flex-1 cursor-pointer">
                        <Upload className="w-5 h-5 text-on-background/30" />
                        <span className="text-sm text-on-background/30">上传封面图片</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setIsEditingScore({...isEditingScore, coverBlob: file});
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">BPM (速度)</label>
                  <input 
                    type="number"
                    className="w-full bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    value={isEditingScore.bpm || ''}
                    placeholder="例如: 120"
                    onChange={(e) => setIsEditingScore({...isEditingScore, bpm: parseInt(e.target.value) || undefined})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">调性</label>
                  <input 
                    className="w-full bg-surface-container-low rounded-xl px-4 py-3 border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                    value={isEditingScore.key || ''}
                    placeholder="例如: C Major"
                    onChange={(e) => setIsEditingScore({...isEditingScore, key: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">乐谱类型</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setIsEditingScore({...isEditingScore, type: 'single'})}
                      className={`flex-1 py-3 rounded-xl border transition-all text-sm font-bold ${isEditingScore.type === 'single' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-background/50 border-outline-variant/20'}`}
                    >
                      单份分谱
                    </button>
                    <button 
                      type="button"
                      onClick={() => setIsEditingScore({...isEditingScore, type: 'collection'})}
                      className={`flex-1 py-3 rounded-xl border transition-all text-sm font-bold ${isEditingScore.type === 'collection' ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container-low text-on-background/50 border-outline-variant/20'}`}
                    >
                      合订乐谱
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">时长 (时:分:秒)</label>
                  <div className="flex gap-2">
                    <select 
                      className="flex-1 bg-surface-container-low rounded-xl px-3 py-3 border border-outline-variant/20 outline-none text-sm"
                      value={Math.floor((isEditingScore.duration || 0) / 3600)}
                      onChange={(e) => {
                        const h = parseInt(e.target.value);
                        const m = Math.floor(((isEditingScore.duration || 0) % 3600) / 60);
                        const s = (isEditingScore.duration || 0) % 60;
                        setIsEditingScore({...isEditingScore, duration: h * 3600 + m * 60 + s});
                      }}
                    >
                      {Array.from({length: 10}, (_, i) => <option key={i} value={i}>{i} 时</option>)}
                    </select>
                    <select 
                      className="flex-1 bg-surface-container-low rounded-xl px-3 py-3 border border-outline-variant/20 outline-none text-sm"
                      value={Math.floor(((isEditingScore.duration || 0) % 3600) / 60)}
                      onChange={(e) => {
                        const h = Math.floor((isEditingScore.duration || 0) / 3600);
                        const m = parseInt(e.target.value);
                        const s = (isEditingScore.duration || 0) % 60;
                        setIsEditingScore({...isEditingScore, duration: h * 3600 + m * 60 + s});
                      }}
                    >
                      {Array.from({length: 60}, (_, i) => <option key={i} value={i}>{i} 分</option>)}
                    </select>
                    <select 
                      className="flex-1 bg-surface-container-low rounded-xl px-3 py-3 border border-outline-variant/20 outline-none text-sm"
                      value={(isEditingScore.duration || 0) % 60}
                      onChange={(e) => {
                        const h = Math.floor((isEditingScore.duration || 0) / 3600);
                        const m = Math.floor(((isEditingScore.duration || 0) % 3600) / 60);
                        const s = parseInt(e.target.value);
                        setIsEditingScore({...isEditingScore, duration: h * 3600 + m * 60 + s});
                      }}
                    >
                      {Array.from({length: 60}, (_, i) => <option key={i} value={i}>{i} 秒</option>)}
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">录音文件</label>
                  <div className="flex items-center gap-4 px-4 py-3 bg-surface-container-low rounded-xl border border-outline-variant/20">
                    {isEditingScore.audioBlob ? (
                      <div className="flex items-center gap-3 flex-1">
                        <Music className="w-5 h-5 text-primary" />
                        <span className="text-sm truncate">已上传录音</span>
                        <button 
                          type="button"
                          onClick={() => setIsEditingScore({...isEditingScore, audioBlob: undefined})}
                          className="text-error hover:bg-error/10 p-1 rounded-full"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-3 flex-1 cursor-pointer">
                        <Upload className="w-5 h-5 text-on-background/30" />
                        <span className="text-sm text-on-background/30">点击上传录音 (MP3/WAV)</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="audio/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) setIsEditingScore({...isEditingScore, audioBlob: file});
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">乐谱标签</label>
                  <div className="flex gap-2">
                    <input 
                      className="bg-surface-container-low border border-outline-variant/20 rounded-lg px-2 py-1 text-xs outline-none"
                      placeholder="添加新标签..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = (e.target as HTMLInputElement).value.trim();
                          if (val && !tags.includes(val)) {
                            setTags([...tags, val]);
                            (e.target as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 p-4 bg-surface-container-low rounded-xl border border-outline-variant/20">
                  {tags.map(tag => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        const currentTags = isEditingScore.tags || [];
                        const newTags = currentTags.includes(tag) 
                          ? currentTags.filter(t => t !== tag)
                          : [...currentTags, tag];
                        setIsEditingScore({...isEditingScore, tags: newTags});
                      }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isEditingScore.tags?.includes(tag) 
                          ? 'bg-primary text-on-primary shadow-md' 
                          : 'bg-surface-container text-on-background/50 hover:bg-surface-container-high'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-widest text-on-background/50 ml-1">声部管理 (声部合并)</label>
                  <button 
                    type="button"
                    onClick={() => partInputRef.current?.click()}
                    className="flex items-center gap-2 text-primary font-bold text-xs hover:bg-primary/5 px-3 py-1.5 rounded-full transition-all"
                  >
                    <Upload className="w-4 h-4" />
                    添加声部文件
                  </button>
                  <input type="file" ref={partInputRef} className="hidden" accept=".pdf" multiple onChange={handleAddPart} />
                </div>

                <div className="space-y-3">
                  {isEditingScore.parts?.map((part, idx) => (
                    <div key={part.id} className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between border border-outline-variant/10 group">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary font-bold">{idx + 1}</div>
                          <div className="flex-1 space-y-2">
                            <input 
                              className="bg-transparent border-none outline-none font-bold text-on-background w-full"
                              value={part.name}
                              onChange={(e) => {
                                const newParts = [...(isEditingScore.parts || [])];
                                newParts[idx].name = e.target.value;
                                setIsEditingScore({...isEditingScore, parts: newParts});
                              }}
                            />
                            
                            <div className="flex items-center gap-2 relative group/select">
                              <Users className="w-3 h-3 text-on-background/30" />
                              <input 
                                className="text-[10px] font-bold text-primary uppercase tracking-tighter bg-transparent border-none outline-none w-full placeholder:text-on-background/20"
                                placeholder="分配角色 (如: 第一小提琴, 钢琴)"
                                value={part.assignedTo?.join(', ') || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newParts = [...(isEditingScore.parts || [])];
                                  newParts[idx].assignedTo = val.split(',').map(s => s.trim()).filter(Boolean);
                                  setIsEditingScore({...isEditingScore, parts: newParts});
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value.split(',').pop()?.trim();
                                    if (val) handleUpdateMetadata('roles', val);
                                  }
                                }}
                              />
                              <div className="absolute top-full left-0 w-full bg-surface-bright shadow-lg rounded-lg border border-outline-variant/10 hidden group-focus-within/select:block z-50 max-h-32 overflow-y-auto">
                                {globalRoles.map(role => (
                                  <button 
                                    key={role}
                                    type="button"
                                    onClick={() => {
                                      const newParts = [...(isEditingScore.parts || [])];
                                      const current = newParts[idx].assignedTo || [];
                                      if (!current.includes(role)) {
                                        newParts[idx].assignedTo = [...current, role];
                                        setIsEditingScore({...isEditingScore, parts: newParts});
                                      }
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-surface-container"
                                  >
                                    {role}
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 relative group/select-tag">
                              <Filter className="w-3 h-3 text-on-background/30" />
                              <input 
                                className="text-[10px] font-bold text-secondary uppercase tracking-tighter bg-transparent border-none outline-none w-full placeholder:text-on-background/20"
                                placeholder="声部标签 (如: 弦乐, 木管)"
                                value={part.tags?.join(', ') || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  const newParts = [...(isEditingScore.parts || [])];
                                  newParts[idx].tags = val.split(',').map(s => s.trim()).filter(Boolean);
                                  setIsEditingScore({...isEditingScore, parts: newParts});
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value.split(',').pop()?.trim();
                                    if (val) handleUpdateMetadata('partTags', val);
                                  }
                                }}
                              />
                              <div className="absolute top-full left-0 w-full bg-surface-bright shadow-lg rounded-lg border border-outline-variant/10 hidden group-focus-within/select-tag:block z-50 max-h-32 overflow-y-auto">
                                {globalPartTags.map(tag => (
                                  <button 
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      const newParts = [...(isEditingScore.parts || [])];
                                      const current = newParts[idx].tags || [];
                                      if (!current.includes(tag)) {
                                        newParts[idx].tags = [...current, tag];
                                        setIsEditingScore({...isEditingScore, parts: newParts});
                                      }
                                    }}
                                    className="w-full text-left px-3 py-1.5 text-[10px] font-bold hover:bg-surface-container"
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>
                            </div>

                            {part.pendingRequests && part.pendingRequests.length > 0 && (
                              <div className="mt-2 p-2 bg-secondary/5 rounded-lg border border-secondary/10">
                                <p className="text-[10px] font-bold text-secondary uppercase mb-1">待确认请求:</p>
                                {part.pendingRequests.map(userId => (
                                  <div key={userId} className="flex items-center justify-between gap-2">
                                    <span className="text-xs text-on-background/70">{userId}</span>
                                    <button 
                                      type="button"
                                      onClick={() => handleApproveRequest(isEditingScore.id, part.id, userId)}
                                      className="text-[10px] font-bold bg-secondary text-on-secondary px-2 py-0.5 rounded"
                                    >
                                      确认加入
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => {
                          const newParts = isEditingScore.parts?.filter(p => p.id !== part.id);
                          setIsEditingScore({...isEditingScore, parts: newParts});
                        }}
                        className="p-2 text-error opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {(!isEditingScore.parts || isEditingScore.parts.length === 0) && (
                    <div className="py-8 text-center border-2 border-dashed border-outline-variant/20 rounded-2xl">
                      <p className="text-sm text-on-background/30">暂无声部文件，点击上方按钮添加</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="submit"
                  className="flex-1 bg-primary text-on-primary py-4 rounded-2xl font-bold uppercase tracking-widest shadow-xl hover:shadow-primary/20 transition-all active:scale-95"
                >
                  保存更改
                </button>
                <button 
                  type="button"
                  onClick={async () => {
                    if (confirm('确定要删除这份乐谱吗？')) {
                      await storageService.deleteScore(isEditingScore.id);
                      setIsEditingScore(null);
                      loadScores();
                    }
                  }}
                  className="px-6 bg-error/10 text-error rounded-2xl font-bold hover:bg-error/20 transition-all"
                >
                  <Trash2 className="w-6 h-6" />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Type Selection Modal */}
      <div className="fixed bottom-24 right-6 z-[150] flex flex-col gap-3 items-end">
        {isUploading && (
          <div className="bg-surface-bright p-4 rounded-2xl shadow-2xl border border-outline-variant/10 animate-in slide-in-from-bottom-4 duration-300 flex flex-col gap-2">
            <p className="text-[10px] font-bold text-on-background/50 uppercase tracking-widest mb-1">选择上传类型</p>
            <button 
              onClick={() => { setUploadType('single'); fileInputRef.current?.click(); }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-primary/10 rounded-xl text-sm font-bold text-primary transition-all"
            >
              <FileText className="w-4 h-4" />
              单份分谱
            </button>
            <button 
              onClick={() => { 
                setIsCreatingNewCollection(true);
              }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-primary/10 rounded-xl text-sm font-bold text-primary transition-all"
            >
              <FolderOpen className="w-4 h-4" />
              新建合订乐谱 (空壳模式)
            </button>
            <button 
              onClick={() => { setUploadType('collection'); fileInputRef.current?.click(); }}
              className="flex items-center gap-3 px-4 py-2 hover:bg-primary/10 rounded-xl text-sm font-bold text-primary transition-all"
            >
              <Upload className="w-4 h-4" />
              批量导入并自动合订
            </button>
          </div>
        )}
        <button 
          onClick={() => setIsUploading(!isUploading)}
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-secondary text-on-secondary shadow-2xl flex items-center justify-center active:scale-90 hover:scale-105 transition-all z-40 group"
        >
          {isUploading ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <span className="text-2xl sm:text-3xl font-bold group-hover:rotate-90 transition-transform">+</span>}
        </button>
        <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" multiple onChange={handleAddScore} />
      </div>
      {/* Metadata Management Modal */}
      {isManagingMetadata && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setIsManagingMetadata(false)} />
          <div className="relative bg-surface-bright w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <header className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
              <h2 className="font-headline font-bold text-xl tracking-tight text-primary">标签与角色管理系统</h2>
              <button onClick={() => setIsManagingMetadata(false)} className="p-2 hover:bg-surface-container rounded-full">
                <X className="w-6 h-6 text-on-background/50" />
              </button>
            </header>
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary">文件夹管理</h3>
                <div className="flex flex-wrap gap-2">
                  {folders.map(folder => (
                    <div key={folder} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold group">
                      <input 
                        className="bg-transparent border-none outline-none w-24"
                        value={folder}
                        onChange={(e) => handleUpdateMetadata('folders', e.target.value, folder)}
                      />
                      <button onClick={() => handleDeleteFolder(folder)}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg">
                    <input 
                      className="bg-transparent border-none outline-none text-xs font-bold w-24"
                      placeholder="新文件夹..."
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
                    />
                    <button onClick={handleCreateFolder} className="text-primary"><Plus className="w-4 h-4" /></button>
                  </div>
                </div>
              </section>
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-primary">全局角色 (分配角色)</h3>
                <div className="flex flex-wrap gap-2">
                  {globalRoles.map(role => (
                    <div key={role} className="flex items-center gap-2 bg-primary/10 text-primary px-3 py-1.5 rounded-lg text-xs font-bold">
                      <input 
                        className="bg-transparent border-none outline-none w-24"
                        value={role}
                        onChange={(e) => handleUpdateMetadata('roles', e.target.value, role)}
                      />
                      <button onClick={async () => {
                        const next = globalRoles.filter(r => r !== role);
                        setGlobalRoles(next);
                        await storageService.saveMetadata({ roles: next });
                      }}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg">
                    <input 
                      className="bg-transparent border-none outline-none text-xs font-bold w-24"
                      placeholder="新角色..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateMetadata('roles', (e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </section>
              <section className="space-y-4">
                <h3 className="text-xs font-bold uppercase tracking-widest text-secondary">全局声部标签</h3>
                <div className="flex flex-wrap gap-2">
                  {globalPartTags.map(tag => (
                    <div key={tag} className="flex items-center gap-2 bg-secondary/10 text-secondary px-3 py-1.5 rounded-lg text-xs font-bold">
                      <input 
                        className="bg-transparent border-none outline-none w-24"
                        value={tag}
                        onChange={(e) => handleUpdateMetadata('partTags', e.target.value, tag)}
                      />
                      <button onClick={async () => {
                        const next = globalPartTags.filter(t => t !== tag);
                        setGlobalPartTags(next);
                        await storageService.saveMetadata({ partTags: next });
                      }}><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <div className="flex items-center gap-2 bg-surface-container px-3 py-1.5 rounded-lg">
                    <input 
                      className="bg-transparent border-none outline-none text-xs font-bold w-24"
                      placeholder="新标签..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleUpdateMetadata('partTags', (e.target as HTMLInputElement).value);
                          (e.target as HTMLInputElement).value = '';
                        }
                      }}
                    />
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}
      {isCreatingFolder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-bright w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-on-background">新建文件夹</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-primary">文件夹名称</label>
              <input 
                type="text" 
                placeholder="例如：交响乐、室内乐"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newFolderName) {
                    const createBtn = document.getElementById('create-folder-btn');
                    createBtn?.click();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => { setIsCreatingFolder(false); setNewFolderName(''); }}
                className="px-6 py-3 rounded-xl font-bold text-on-background/60 hover:bg-surface-container transition-all"
              >
                取消
              </button>
              <button 
                id="create-folder-btn"
                onClick={async () => {
                  if (!newFolderName) return;
                  const next = [...folders, newFolderName];
                  setFolders(next);
                  await storageService.saveMetadata({ folders: next });
                  setIsCreatingFolder(false);
                  setNewFolderName('');
                }}
                className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      {isCreatingNewCollection && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-bright w-full max-w-md rounded-3xl shadow-2xl p-6 space-y-6">
            <h3 className="text-xl font-bold text-on-background">新建合订乐谱</h3>
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-widest text-primary">合订本名称</label>
              <input 
                type="text" 
                placeholder="例如：贝多芬第五交响曲"
                value={newCollectionTitle}
                onChange={(e) => setNewCollectionTitle(e.target.value)}
                className="w-full bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && newCollectionTitle) {
                    const createBtn = document.getElementById('create-collection-btn');
                    createBtn?.click();
                  }
                }}
              />
            </div>
            <div className="flex justify-end gap-4">
              <button 
                onClick={() => setIsCreatingNewCollection(false)}
                className="px-6 py-3 rounded-xl font-bold text-on-background/60 hover:bg-surface-container transition-all"
              >
                取消
              </button>
              <button 
                id="create-collection-btn"
                onClick={async () => {
                  if (!newCollectionTitle) return;
                  const newScore: ScoreData = {
                    id: Math.random().toString(36).substr(2, 9),
                    title: newCollectionTitle,
                    blob: new Blob([''], { type: 'application/pdf' }),
                    type: 'collection',
                    updatedAt: Date.now(),
                    tags: [],
                    parts: [],
                    uploaderId: 'current-user',
                    uploaderName: '张三',
                    allowDownload: true,
                    folder: selectedFolder || undefined
                  };
                  await storageService.saveScore(newScore);
                  loadScores();
                  setIsEditingScore(newScore);
                  setIsCreatingNewCollection(false);
                  setNewCollectionTitle('');
                  setIsUploading(false);
                }}
                className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all"
              >
                创建
              </button>
            </div>
          </div>
        </div>
      )}
      {isShowingAmbiguityDialog && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-surface-bright w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center bg-surface-container-low">
              <div>
                <h3 className="text-xl font-bold text-on-background">确认乐谱声部</h3>
                <p className="text-sm text-on-background/50">识别到不明确的乐器名称，请手动确认</p>
              </div>
              <button onClick={() => setIsShowingAmbiguityDialog(false)} className="p-2 hover:bg-surface-container rounded-full transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {pendingUploads.map((upload, index) => (
                <div key={index} className="flex flex-col lg:flex-row gap-6 p-4 bg-surface-container-low rounded-2xl border border-outline-variant/10">
                  <div className="w-full lg:w-1/2 aspect-[3/4] bg-black rounded-xl overflow-hidden border border-outline-variant/20 flex items-center justify-center">
                    <PDFPreview file={upload.file} />
                  </div>
                  <div className="flex-1 space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-primary">乐曲名称</label>
                      <input 
                        type="text" 
                        value={upload.scoreTitle}
                        onChange={(e) => {
                          const next = [...pendingUploads];
                          next[index].scoreTitle = e.target.value;
                          setPendingUploads(next);
                        }}
                        className="w-full bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold uppercase tracking-widest text-primary">声部名称</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['第一小提琴', '第二小提琴', '中提琴', '大提琴', '低音提琴'].map(name => (
                          <button 
                            key={name}
                            onClick={() => {
                              const next = [...pendingUploads];
                              next[index].suggestedPartName = name;
                              setPendingUploads(next);
                            }}
                            className={`px-3 py-2 rounded-lg text-xs font-bold transition-all border ${upload.suggestedPartName === name ? 'bg-primary text-on-primary border-primary' : 'bg-surface-container text-on-background/60 border-outline-variant/20 hover:border-primary/50'}`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                      <input 
                        type="text" 
                        placeholder="手动输入声部..."
                        value={upload.suggestedPartName}
                        onChange={(e) => {
                          const next = [...pendingUploads];
                          next[index].suggestedPartName = e.target.value;
                          setPendingUploads(next);
                        }}
                        className="w-full bg-surface-container rounded-xl px-4 py-3 border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all mt-2"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="p-6 bg-surface-container-low border-t border-outline-variant/10 flex justify-end gap-4">
              <button 
                onClick={() => setIsShowingAmbiguityDialog(false)}
                className="px-6 py-3 rounded-xl font-bold text-on-background/60 hover:bg-surface-container transition-all"
              >
                取消
              </button>
              <button 
                onClick={() => processUploads(pendingUploads)}
                className="px-8 py-3 bg-primary text-on-primary rounded-xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/40 transition-all transform active:scale-95"
              >
                确认并导入所有
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Message Toast */}
      <AnimatePresence>
        {message && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
              message.type === 'error' ? 'bg-error/90 text-on-error border-error' : 'bg-primary/90 text-on-primary border-primary'
            }`}
          >
            {message.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
            <span className="font-bold text-sm">{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
