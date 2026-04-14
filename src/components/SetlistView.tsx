import { Menu, Bell, PlayCircle, GripVertical, Gauge, Music, Trash2, ChevronUp, ChevronDown, FileText, Plus, Edit2, Check, X, List, Archive, CheckCircle2, Image as ImageIcon, Eye, Search, Settings, LogOut, User, Clock, Heart, Calendar } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { storageService, ScoreData, Setlist, Notification } from '../services/storageService';
import { motion, AnimatePresence } from 'motion/react';

interface SetlistViewProps {
  onOpenScore: (scoreId: string, performance?: boolean) => void;
  isAdmin: boolean;
  onViewChange: (view: any) => void;
}

export default function SetlistView({ onOpenScore, isAdmin, onViewChange }: SetlistViewProps) {
  const [programScores, setProgramScores] = useState<ScoreData[]>([]);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [activeSetlistId, setActiveSetlistId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [newSetName, setNewSetName] = useState('');
  const [editingSetId, setEditingSetId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [showTrackOrder, setShowTrackOrder] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isShowingNotifications, setIsShowingNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [confirmingRemoveTrackId, setConfirmingRemoveTrackId] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    const meta = await storageService.getMetadata();
    const allScores = await storageService.getAllScores();
    
    let currentSetlists = meta.setlists || [];
    let currentActiveId = meta.activeSetlistId || '';

    // Migration logic...
    if (currentSetlists.length === 0 && meta.program && meta.program.length > 0) {
      const defaultSet: Setlist = {
        id: 'default-set',
        name: '我的节目单',
        program: meta.program,
        createdAt: Date.now(),
        status: 'active'
      };
      currentSetlists = [defaultSet];
      currentActiveId = defaultSet.id;
      await storageService.saveMetadata({ setlists: currentSetlists, activeSetlistId: currentActiveId });
    }

    const now = Date.now();
    const sortedSetlists = [...currentSetlists].sort((a, b) => {
      const dateA = a.performanceDate || a.createdAt;
      const dateB = b.performanceDate || b.createdAt;
      // Closest to now first (future or past)
      return Math.abs(dateA - now) - Math.abs(dateB - now);
    });

    setSetlists(sortedSetlists);
    setActiveSetlistId(currentActiveId);
    setNotifications(meta.notifications || []);
    setUserProfile(meta.profile);
    setUserRole(meta.userRole || (isAdmin ? 'admin' : 'member'));
    
    const activeSet = currentSetlists.find(s => s.id === currentActiveId);
    if (activeSet) {
      const orderedScores = activeSet.program
        .map(id => allScores.find(s => s.id === id))
        .filter((s): s is ScoreData => !!s);
      setProgramScores(orderedScores);
    } else {
      setProgramScores([]);
    }
    
    setIsLoading(false);
  };

  const handleCreateSetlist = async () => {
    if (!newSetName.trim()) return;
    const newSet: Setlist = {
      id: Math.random().toString(36).substr(2, 9),
      name: newSetName,
      program: [],
      createdAt: Date.now(),
      status: 'active'
    };
    const nextSetlists = [...setlists, newSet];
    setSetlists(nextSetlists);
    setActiveSetlistId(newSet.id);
    await storageService.saveMetadata({ setlists: nextSetlists, activeSetlistId: newSet.id });
    setProgramScores([]);
    setNewSetName('');
    setIsCreating(false);
  };

  const handleSwitchSetlist = async (id: string) => {
    setActiveSetlistId(id);
    await storageService.saveMetadata({ activeSetlistId: id });
    const allScores = await storageService.getAllScores();
    const activeSet = setlists.find(s => s.id === id);
    if (activeSet) {
      const orderedScores = activeSet.program
        .map(id => allScores.find(s => s.id === id))
        .filter((s): s is ScoreData => !!s);
      setProgramScores(orderedScores);
    }
  };

  const handleDeleteSetlist = async (id: string) => {
    const nextSetlists = setlists.filter(s => s.id !== id);
    let nextActiveId = activeSetlistId;
    if (activeSetlistId === id) {
      nextActiveId = nextSetlists.length > 0 ? nextSetlists[0].id : '';
    }
    setSetlists(nextSetlists);
    setActiveSetlistId(nextActiveId);
    await storageService.saveMetadata({ setlists: nextSetlists, activeSetlistId: nextActiveId });
    setConfirmingDeleteId(null);
    loadData();
  };

  const handleRenameSetlist = async () => {
    if (!editingSetId || !editName.trim()) return;
    const nextSetlists = setlists.map(s => s.id === editingSetId ? { ...s, name: editName } : s);
    setSetlists(nextSetlists);
    await storageService.saveMetadata({ setlists: nextSetlists });
    setEditingSetId(null);
  };

  const handleStatusChange = async (id: string, status: 'active' | 'archived' | 'completed') => {
    const nextSetlists = setlists.map(s => s.id === id ? { ...s, status, performanceDate: status === 'completed' ? Date.now() : s.performanceDate } : s);
    setSetlists(nextSetlists);
    await storageService.saveMetadata({ setlists: nextSetlists });
  };

  const handleSetPerformanceDate = async (date: string) => {
    if (!activeSetlistId || !date) return;
    const timestamp = new Date(date).getTime();
    if (isNaN(timestamp)) return;
    const nextSetlists = setlists.map(s => s.id === activeSetlistId ? { ...s, performanceDate: timestamp } : s);
    
    // Re-sort after date change
    const now = Date.now();
    const sorted = [...nextSetlists].sort((a, b) => {
      const dateA = a.performanceDate || a.createdAt;
      const dateB = b.performanceDate || b.createdAt;
      return Math.abs(dateA - now) - Math.abs(dateB - now);
    });

    setSetlists(sorted);
    await storageService.saveMetadata({ setlists: sorted });
    // Show a temporary success state if needed
  };

  const toLocalISO = (timestamp: number) => {
    const date = new Date(timestamp);
    const offset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
  };

  const handleLogout = () => {
    if (confirm('确定要退出登录吗？')) {
      onViewChange('library');
      // In a real app, we'd clear auth tokens here
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeSetlistId) return;

    const nextSetlists = setlists.map(s => s.id === activeSetlistId ? { ...s, imageBlob: file } : s);
    setSetlists(nextSetlists);
    await storageService.saveMetadata({ setlists: nextSetlists });
  };

  const handleMove = async (index: number, direction: 'up' | 'down') => {
    const activeSet = setlists.find(s => s.id === activeSetlistId);
    if (!activeSet) return;

    const nextProgram = [...activeSet.program];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= nextProgram.length) return;

    [nextProgram[index], nextProgram[targetIndex]] = [nextProgram[targetIndex], nextProgram[index]];
    
    const nextSetlists = setlists.map(s => s.id === activeSetlistId ? { ...s, program: nextProgram } : s);
    setSetlists(nextSetlists);
    await storageService.saveMetadata({ setlists: nextSetlists });
    
    const nextScores = [...programScores];
    [nextScores[index], nextScores[targetIndex]] = [nextScores[targetIndex], nextScores[index]];
    setProgramScores(nextScores);
  };

  const handleRemove = async (scoreId: string) => {
    const activeSet = setlists.find(s => s.id === activeSetlistId);
    if (!activeSet) return;

    const nextProgram = activeSet.program.filter(id => id !== scoreId);
    const nextSetlists = setlists.map(s => s.id === activeSetlistId ? { ...s, program: nextProgram } : s);
    setSetlists(nextSetlists);
    await storageService.saveMetadata({ setlists: nextSetlists });
    setProgramScores(programScores.filter(s => s.id !== scoreId));
    setConfirmingRemoveTrackId(null);
  };

  const activeSet = setlists.find(s => s.id === activeSetlistId);
  const filteredSetlists = setlists.filter(s => showArchived ? (s.status === 'archived' || s.status === 'completed') : (s.status === 'active' || !s.status));

  return (
    <div className="pb-40 bg-background min-h-screen">
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4 bg-background/80 backdrop-blur-md border-b border-outline-variant/10">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 hover:bg-surface-container rounded-full transition-all text-primary"
          >
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-headline font-bold text-lg tracking-tight text-primary uppercase">节目单管理</h1>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsShowingNotifications(true)}
            className="p-2 hover:bg-surface-container rounded-full transition-all text-primary relative"
          >
            <Bell className="w-6 h-6" />
            {notifications.some(n => !n.read) && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full border-2 border-background"></span>
            )}
          </button>
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
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20 group-hover:border-primary transition-all overflow-hidden">
              {userProfile?.avatar ? (
                <img src={URL.createObjectURL(userProfile.avatar)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                (userProfile?.name || '音')[0]
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="font-headline text-2xl font-bold tracking-tight">我的节目单</h2>
            <button 
              onClick={() => setShowArchived(!showArchived)}
              className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border transition-all ${showArchived ? 'bg-tertiary text-on-tertiary border-tertiary' : 'text-on-background/40 border-outline-variant/20 hover:border-primary/30'}`}
            >
              {showArchived ? '显示活跃' : '显示已归档'}
            </button>
          </div>
          <button 
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-primary/20 transition-all"
          >
            <Plus className="w-4 h-4" /> 新建节目单
          </button>
        </div>

        {isCreating && (
          <div className="mb-8 bg-surface-container-high p-6 rounded-2xl border border-primary/20 animate-in slide-in-from-top-4 duration-300">
            <h3 className="text-sm font-bold uppercase tracking-widest text-primary mb-4">创建新节目单</h3>
            <div className="flex gap-3">
              <input 
                autoFocus
                className="flex-1 bg-background rounded-xl px-4 py-3 border border-outline-variant/20 focus:ring-2 focus:ring-primary/50 outline-none transition-all"
                placeholder="节目单名称..."
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSetlist()}
              />
              <button 
                onClick={handleCreateSetlist}
                className="bg-primary text-on-primary px-6 rounded-xl font-bold transition-all active:scale-95"
              >
                创建
              </button>
              <button 
                onClick={() => setIsCreating(false)}
                className="p-3 text-on-background/50 hover:bg-surface-container rounded-xl transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex gap-3 overflow-x-auto pb-6 no-scrollbar">
          {filteredSetlists.map(set => (
            <div 
              key={set.id}
              className={`flex-shrink-0 group relative flex items-center gap-3 px-5 py-3 rounded-2xl border transition-all cursor-pointer ${
                activeSetlistId === set.id 
                  ? 'bg-primary text-on-primary border-primary shadow-lg shadow-primary/20' 
                  : 'bg-surface-container-high text-on-background/50 border-outline-variant/10 hover:border-primary/30'
              }`}
              onClick={() => handleSwitchSetlist(set.id)}
            >
              {editingSetId === set.id ? (
                <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                  <input 
                    autoFocus
                    className="bg-background/20 text-white rounded px-2 py-1 outline-none w-32"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRenameSetlist()}
                  />
                  <button onClick={handleRenameSetlist}><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingSetId(null)}><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <>
                  <List className="w-4 h-4" />
                  <span className="font-bold whitespace-nowrap">{set.name}</span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSetId(set.id);
                        setEditName(set.name);
                      }}
                      className="p-1 hover:bg-white/20 rounded"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    {confirmingDeleteId === set.id ? (
                      <div className="flex items-center gap-1 bg-error rounded px-1">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSetlist(set.id);
                          }}
                          className="text-[10px] font-bold text-white px-1"
                        >
                          确认
                        </button>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmingDeleteId(null);
                          }}
                          className="text-white"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmingDeleteId(set.id);
                        }}
                        className="p-1 hover:bg-error/20 text-error rounded"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        {activeSet && (
          <div className="relative mb-12 overflow-hidden rounded-3xl bg-surface-container-low min-h-[320px] flex flex-col justify-end group shadow-2xl border border-outline-variant/10">
            {activeSet.imageBlob ? (
              <div className="absolute inset-0">
                <img 
                  src={URL.createObjectURL(activeSet.imageBlob)} 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent"></div>
              </div>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-background to-background">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full -ml-20 -mb-20 blur-3xl"></div>
              </div>
            )}
            
            <div className="relative z-10 p-8 pt-20">
              <div className="flex justify-between items-end mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${
                      activeSet.status === 'completed' ? 'bg-tertiary/20 text-tertiary border-tertiary/30' :
                      activeSet.status === 'archived' ? 'bg-outline-variant/20 text-on-background/50 border-outline-variant/30' :
                      'bg-primary/20 text-primary border-primary/30'
                    }`}>
                      {activeSet.status === 'completed' ? '已完成' : activeSet.status === 'archived' ? '已归档' : '排练中'}
                    </span>
                    {activeSet.performanceDate && (
                      <div className="flex items-center gap-2 px-3 py-1 bg-background/40 backdrop-blur-md rounded-full border border-outline-variant/10">
                        <Calendar className="w-3 h-3 text-primary" />
                        <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
                          {new Date(activeSet.performanceDate).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                  </div>
                  <h2 className="font-headline font-bold text-5xl md:text-6xl text-on-background tracking-tighter leading-none mb-4">{activeSet.name}</h2>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-4 mt-4">
                      <div className="relative flex items-center bg-background/50 backdrop-blur-md rounded-xl border border-outline-variant/20 px-3 py-2 group focus-within:ring-2 focus-within:ring-primary/50 transition-all">
                        <Calendar className="w-4 h-4 text-primary mr-2" />
                        <input 
                          type="datetime-local"
                          className="bg-transparent text-xs font-bold outline-none cursor-pointer text-on-background min-w-[150px]"
                          value={activeSet.performanceDate ? toLocalISO(activeSet.performanceDate) : ''}
                          onChange={(e) => handleSetPerformanceDate(e.target.value)}
                        />
                        {!activeSet.performanceDate && (
                          <span className="absolute left-10 pointer-events-none text-xs font-bold text-on-background/30">设置演出时间</span>
                        )}
                        {activeSet.performanceDate && (
                          <CheckCircle2 className="w-3 h-3 text-tertiary ml-2 opacity-50" />
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex flex-col gap-2">
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-4 bg-background/80 backdrop-blur-xl rounded-2xl hover:bg-primary hover:text-on-primary transition-all shadow-lg border border-outline-variant/10"
                      title="更换海报封面"
                    >
                      <ImageIcon className="w-6 h-6" />
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      accept="image/*"
                      onChange={handleImageUpload}
                    />
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleStatusChange(activeSet.id, activeSet.status === 'completed' ? 'active' : 'completed')}
                        className={`p-3 backdrop-blur-md rounded-xl transition-all border ${activeSet.status === 'completed' ? 'bg-tertiary text-on-tertiary border-tertiary shadow-lg shadow-tertiary/20' : 'bg-background/50 hover:bg-tertiary/10 text-tertiary border-outline-variant/20'}`}
                        title={activeSet.status === 'completed' ? '取消完成' : '标记为完成'}
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => handleStatusChange(activeSet.id, activeSet.status === 'archived' ? 'active' : 'archived')}
                        className={`p-3 backdrop-blur-md rounded-xl transition-all border ${activeSet.status === 'archived' ? 'bg-outline-variant text-on-background border-outline-variant shadow-lg' : 'bg-background/50 hover:bg-outline-variant/10 text-on-background/50 border-outline-variant/20'}`}
                        title={activeSet.status === 'archived' ? '取消归档' : '归档节目单'}
                      >
                        <Archive className="w-5 h-5" />
                      </button>
                      {confirmingDeleteId === activeSet.id ? (
                        <div className="flex items-center gap-2 bg-error/20 backdrop-blur-md rounded-xl border border-error/40 px-3">
                          <span className="text-[10px] font-bold text-error uppercase">确定删除?</span>
                          <button 
                            onClick={() => handleDeleteSetlist(activeSet.id)}
                            className="p-2 bg-error text-on-error rounded-lg"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => setConfirmingDeleteId(null)}
                            className="p-2 text-error"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => setConfirmingDeleteId(activeSet.id)}
                          className="p-3 bg-error/10 hover:bg-error/20 text-error backdrop-blur-md rounded-xl transition-all border border-error/20 shadow-lg shadow-error/10"
                          title="永久删除节目单"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="mt-6 flex items-center gap-6">
                <div className="flex flex-col">
                  <span className="font-label text-[10px] uppercase text-on-background/50 tracking-wider">曲目数</span>
                  <span className="font-headline text-2xl font-semibold">{programScores.length}</span>
                </div>
                <div className="w-px h-8 bg-outline-variant/20"></div>
                <div className="flex flex-col">
                  <span className="font-label text-[10px] uppercase text-on-background/50 tracking-wider">总时长</span>
                  <span className="font-headline text-2xl font-semibold">
                    {Math.floor(programScores.reduce((acc, s) => acc + (s.duration || 0), 0) / 60)}:
                    {(programScores.reduce((acc, s) => acc + (s.duration || 0), 0) % 60).toString().padStart(2, '0')}
                  </span>
                </div>
                <div className="w-px h-8 bg-outline-variant/20"></div>
                <button 
                  onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                  className={`flex flex-col items-start group transition-all ${showOnlyFavorites ? 'text-secondary' : 'text-on-background/50 hover:text-secondary'}`}
                >
                  <span className="font-label text-[10px] uppercase tracking-wider">收藏曲目</span>
                  <div className="flex items-center gap-1">
                    <Heart className={`w-5 h-5 ${showOnlyFavorites ? 'fill-secondary' : ''}`} />
                    <span className={`font-headline text-2xl font-semibold ${showOnlyFavorites ? 'opacity-100' : 'opacity-50'}`}>
                      {programScores.filter(s => s.isFavorite).length}
                    </span>
                  </div>
                </button>
                <div className="w-px h-8 bg-outline-variant/20"></div>
                <button 
                  onClick={() => setShowTrackOrder(true)}
                  className="flex flex-col items-start group"
                >
                  <span className="font-label text-[10px] uppercase text-on-background/50 tracking-wider group-hover:text-primary transition-colors">查看顺序</span>
                  <span className="font-headline text-2xl font-semibold flex items-center gap-2 group-hover:text-primary transition-colors">
                    <Eye className="w-5 h-5" /> 列表
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex justify-between items-end mb-6">
            <h3 className="font-headline text-xl font-medium tracking-tight">演出顺序</h3>
            <span className="font-label text-xs text-on-background/50">点击乐谱进入阅读模式</span>
          </div>

          {isLoading ? (
            <div className="py-20 flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : programScores.length === 0 ? (
            <div className="py-20 text-center text-on-background/30 border-2 border-dashed border-outline-variant/10 rounded-3xl">
              <Music className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="font-headline font-bold text-lg">节目单为空</p>
              <p className="text-sm">请在乐谱库中添加乐谱</p>
            </div>
          ) : (
            programScores
              .filter(track => !showOnlyFavorites || track.isFavorite)
              .map((track, index) => (
              <div 
                key={track.id}
                draggable
                onDragStart={() => setDraggedIndex(index)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (draggedIndex !== null && draggedIndex !== index) {
                    handleMove(draggedIndex, draggedIndex < index ? 'down' : 'up');
                  }
                  setDraggedIndex(null);
                }}
                className={`group flex items-center gap-4 bg-surface-container-high hover:bg-surface-bright transition-all duration-300 p-4 rounded-xl border-2 ${draggedIndex === index ? 'opacity-50 border-primary border-dashed' : 'border-transparent'}`}
              >
                <div className="flex items-center gap-2">
                  <div className="cursor-grab active:cursor-grabbing p-1">
                    <Menu className="w-4 h-4 text-outline-variant/30" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <button 
                      disabled={index === 0}
                      onClick={() => handleMove(index, 'up')}
                      className={`p-1 transition-all ${index === 0 ? 'opacity-0' : 'text-on-background/30 hover:text-primary'}`}
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button 
                      disabled={index === programScores.length - 1}
                      onClick={() => handleMove(index, 'down')}
                      className={`p-1 transition-all ${index === programScores.length - 1 ? 'opacity-0' : 'text-on-background/30 hover:text-primary'}`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div 
                  onClick={() => onOpenScore(track.id)}
                  className="flex-grow flex items-center gap-4 cursor-pointer"
                >
                  <div className="w-10 h-14 bg-surface-container-low rounded overflow-hidden flex-shrink-0 flex items-center justify-center">
                    {track.coverBlob ? (
                      <img src={URL.createObjectURL(track.coverBlob)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <FileText className="text-primary/40 w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-headline text-lg font-semibold tracking-wide">{track.title}</h4>
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-on-background/50">{track.composer || '未知作曲家'}</p>
                      {track.bpm && (
                        <span className="flex items-center gap-1 text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-bold">
                          <Gauge className="w-3 h-3" /> {track.bpm}
                        </span>
                      )}
                      {track.key && (
                        <span className="flex items-center gap-1 text-[10px] bg-secondary/10 text-secondary px-1.5 py-0.5 rounded font-bold">
                          <Music className="w-3 h-3" /> {track.key}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  {confirmingRemoveTrackId === track.id ? (
                    <div className="flex items-center gap-1 bg-error/10 rounded-lg p-1 border border-error/20">
                      <button 
                        onClick={() => handleRemove(track.id)}
                        className="text-[10px] font-bold text-error px-2 py-1"
                      >
                        确认移除
                      </button>
                      <button 
                        onClick={() => setConfirmingRemoveTrackId(null)}
                        className="p-1 text-on-background/30"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmingRemoveTrackId(track.id);
                      }}
                      className="p-2 text-error/40 hover:text-error hover:bg-error/10 rounded-lg transition-all"
                      title="从节目单移除"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  )}
                  <GripVertical className="text-outline-variant/30" />
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      <div className="fixed bottom-28 left-0 w-full px-6 flex justify-center z-40 pointer-events-none">
        <button 
          onClick={() => programScores.length > 0 && onOpenScore(programScores[0].id, true)}
          className={`pointer-events-auto bg-gradient-to-br from-secondary to-[#ffb28c] text-on-secondary px-10 py-5 rounded-full shadow-[0_8px_32px_rgba(255,117,32,0.3)] hover:shadow-[0_12px_48px_rgba(255,117,32,0.45)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95 flex items-center gap-3 ${programScores.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <PlayCircle className="w-6 h-6 fill-on-secondary/20" />
          <span className="font-headline font-bold text-lg tracking-wider uppercase">进入演出模式</span>
        </button>
      </div>

      {/* Notifications Modal */}
      <AnimatePresence>
        {isShowingNotifications && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsShowingNotifications(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-surface-container-high rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/10"
            >
              <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="font-headline text-xl font-bold">通知中心</h3>
                <button onClick={() => setIsShowingNotifications(false)} className="p-2 hover:bg-surface-container rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="text-center py-12 text-on-background/30">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>暂无新通知</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map(n => (
                      <div key={n.id} className={`p-4 rounded-2xl border ${n.read ? 'bg-background/50 border-outline-variant/10' : 'bg-primary/5 border-primary/20'}`}>
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="font-bold text-sm">{n.title}</h4>
                          <span className="text-[10px] text-on-background/40">{new Date(n.timestamp).toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-on-background/60">{n.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showTrackOrder && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowTrackOrder(false)}
              className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg bg-surface-container-high rounded-3xl shadow-2xl overflow-hidden border border-outline-variant/10"
            >
              <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
                <h3 className="font-headline text-xl font-bold">演出曲目顺序</h3>
                <button onClick={() => setShowTrackOrder(false)} className="p-2 hover:bg-surface-container rounded-full"><X className="w-5 h-5" /></button>
              </div>
              <div className="p-6 max-h-[60vh] overflow-y-auto">
                <div className="space-y-3">
                  {programScores.map((track, i) => (
                    <div key={track.id} className="flex items-center gap-4 p-3 bg-background rounded-xl">
                      <span className="w-6 h-6 flex items-center justify-center bg-primary/10 text-primary text-xs font-bold rounded-full">{i + 1}</span>
                      <div className="flex-1">
                        <p className="font-bold text-sm">{track.title}</p>
                        <p className="text-[10px] text-on-background/50 uppercase tracking-wider">{track.composer}</p>
                      </div>
                      <span className="text-xs text-on-background/30">{Math.floor((track.duration || 0) / 60)}:{(track.duration || 0) % 60}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Sidebar (Menu) */}
      <AnimatePresence>
        {isSidebarOpen && (
          <div className="fixed inset-0 z-[100]">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 h-full w-72 bg-surface-container-low shadow-2xl p-6 flex flex-col"
            >
              <div className="flex items-center gap-4 mb-12">
                <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center text-on-primary shadow-lg shadow-primary/20">
                  <Music className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-headline font-bold text-xl tracking-tight">Nocturne</h2>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-primary">演出管理系统</p>
                </div>
              </div>

              <nav className="flex-1 space-y-2">
                {[
                  { icon: Search, label: '快速搜索', color: 'text-primary', view: 'library' },
                  { icon: Clock, label: '最近演出', color: 'text-secondary', view: 'recent' },
                  { icon: Heart, label: '收藏曲目', color: 'text-tertiary', view: 'library' },
                  { icon: User, label: '个人中心', color: 'text-on-background/70', view: 'settings' },
                  { icon: Settings, label: '系统设置', color: 'text-on-background/70', view: 'settings' },
                ].map((item, i) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      onViewChange(item.view as any);
                      setIsSidebarOpen(false);
                    }}
                    className="w-full flex items-center gap-4 p-4 hover:bg-surface-container rounded-2xl transition-all group"
                  >
                    <item.icon className={`w-5 h-5 ${item.color} group-hover:scale-110 transition-transform`} />
                    <span className="font-bold text-sm">{item.label}</span>
                  </button>
                ))}
              </nav>

              <button 
                onClick={handleLogout}
                className="flex items-center gap-4 p-4 text-error hover:bg-error/5 rounded-2xl transition-all mt-auto group"
              >
                <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="font-bold text-sm">退出登录</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
