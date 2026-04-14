import { Menu, RefreshCw, Radio, CheckCircle, Filter, SortAsc, Piano, Music, Download, BatteryWarning, BatteryLow, Activity, X, Play, Pause, Search, Clock, Settings, LogOut, Heart, User, ShieldAlert, Lock, VolumeX, UserCheck, UserX, Users, Send, MessageSquare, Copy, PlusCircle, ChevronDown, ChevronUp, Edit3, Trash2, MoreHorizontal, Bell, Shield } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storageService, RoleChangeRequest, GroupInfo, ChatMessage, UserRole } from '../services/storageService';

interface SyncViewProps {
  onViewChange: (view: any) => void;
  isAdmin?: boolean;
}

export default function SyncView({ onViewChange, isAdmin: initialIsAdmin }: SyncViewProps) {
  const [bpm, setBpm] = useState(128);
  const [isBroadcasting, setIsBroadcasting] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastTap, setLastTap] = useState<number | null>(null);
  const [filterText, setFilterText] = useState('');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [latency, setLatency] = useState(12);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pulse, setPulse] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSyncEnabled, setIsSyncEnabled] = useState(true);
  const [roleRequests, setRoleRequests] = useState<RoleChangeRequest[]>([]);
  
  const [groups, setGroups] = useState<GroupInfo[]>([]);
  const [activeGroupId, setActiveGroupId] = useState<string>('');
  const [chatHistories, setChatHistories] = useState<{ [groupId: string]: ChatMessage[] }>({});
  const [userRole, setUserRole] = useState<UserRole>('member');
  const [userProfile, setUserProfile] = useState<any>(null);
  
  const [chatInput, setChatInput] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [isJoiningGroup, setIsJoiningGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [isChatFolded, setIsChatFolded] = useState(false);
  const [isOnlineMembersFolded, setIsOnlineMembersFolded] = useState(false);
  const [isConnectedMembersFolded, setIsConnectedMembersFolded] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<{ [groupId: string]: number }>({});
  const [isGroupMenuOpen, setIsGroupMenuOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editGroupName, setEditGroupName] = useState('');
  
  const metronomeAudioContext = useRef<AudioContext | null>(null);
  const globalStartTimeRef = useRef<number>(Date.now());
  const chatEndRef = useRef<HTMLDivElement>(null);

  const isAdmin = userRole === 'admin' || userRole === 'sub-admin';
  const isMainAdmin = userRole === 'admin';
  const activeGroup = groups.find(g => g.id === activeGroupId);
  const currentChat = chatHistories[activeGroupId] || [];

  // Load Metadata
  useEffect(() => {
    const loadMeta = async () => {
      const meta = await storageService.getMetadata();
      setRoleRequests(meta.roleRequests || []);
      setGroups(meta.groups || []);
      setActiveGroupId(meta.activeGroupId || '');
      setChatHistories(meta.chatHistory || {});
      setUserRole(meta.userRole || (initialIsAdmin ? 'admin' : 'member'));
      setUserProfile(meta.profile);
    };
    loadMeta();
  }, [initialIsAdmin]);

  // Chat Auto-scroll
  useEffect(() => {
    if (!isChatFolded && currentChat.length > 0) {
      const container = chatEndRef.current?.parentElement;
      if (container) {
        const isAtBottom = container.scrollHeight - container.scrollTop <= container.clientHeight + 100;
        const lastMessage = currentChat[currentChat.length - 1];
        const isMyMessage = lastMessage.senderId === 'CURRENT_USER_ID';
        
        if (isAtBottom || isMyMessage) {
          chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  }, [currentChat, isChatFolded]);

  // Sync Listener for Chat and Sync Control
  useEffect(() => {
    const channel = new BroadcastChannel('nocturne-sync');
    channel.onmessage = (event) => {
      const { type, data, groupId } = event.data;
      if (type === 'CHAT_MESSAGE') {
        setChatHistories(prev => {
          const history = prev[groupId] || [];
          return { ...prev, [groupId]: [...history, data] };
        });
        if (groupId !== activeGroupId || isChatFolded) {
          setUnreadCounts(prev => ({ ...prev, [groupId]: (prev[groupId] || 0) + 1 }));
        }
      }
      if (type === 'PUSH_METRONOME' && !isAdmin && isSyncEnabled) {
        setBpm(data.bpm);
        setIsPlaying(data.isPlaying);
        globalStartTimeRef.current = data.startTime;
      }
    };
    return () => channel.close();
  }, [isAdmin, isSyncEnabled, activeGroupId, isChatFolded]);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return;
    const newGroup: GroupInfo = {
      id: Date.now().toString(),
      name: newGroupName,
      inviteCode: Math.random().toString(36).substr(2, 6).toUpperCase(),
      mainAdminId: 'CURRENT_USER_ID',
      subAdminIds: [],
      members: ['CURRENT_USER_ID']
    };
    const nextGroups = [...groups, newGroup];
    setGroups(nextGroups);
    setActiveGroupId(newGroup.id);
    await storageService.saveMetadata({ groups: nextGroups, activeGroupId: newGroup.id });
    setIsCreatingGroup(false);
    setNewGroupName('');
  };

  const handleJoinGroup = async () => {
    if (!inviteCodeInput.trim()) return;
    // Mock join logic
    const joinedGroup: GroupInfo = {
      id: 'JOINED_' + Date.now(),
      name: '加入的乐团',
      inviteCode: inviteCodeInput.toUpperCase(),
      mainAdminId: 'OTHER_ADMIN',
      subAdminIds: [],
      members: ['CURRENT_USER_ID']
    };
    const nextGroups = [...groups, joinedGroup];
    setGroups(nextGroups);
    setActiveGroupId(joinedGroup.id);
    await storageService.saveMetadata({ groups: nextGroups, activeGroupId: joinedGroup.id });
    setIsJoiningGroup(false);
    setInviteCodeInput('');
  };

  const handleDeleteGroup = async (id: string) => {
    const nextGroups = groups.filter(g => g.id !== id);
    setGroups(nextGroups);
    if (activeGroupId === id) {
      setActiveGroupId(nextGroups[0]?.id || '');
    }
    await storageService.saveMetadata({ groups: nextGroups });
  };

  const handleRenameGroup = async () => {
    if (!editingGroupId || !editGroupName.trim()) return;
    const nextGroups = groups.map(g => g.id === editingGroupId ? { ...g, name: editGroupName } : g);
    setGroups(nextGroups);
    await storageService.saveMetadata({ groups: nextGroups });
    setEditingGroupId(null);
  };

  const handleSendMessage = async () => {
    if (!chatInput.trim() || !activeGroupId) return;
    const msg: ChatMessage = {
      id: Date.now().toString(),
      senderId: 'CURRENT_USER_ID',
      senderName: isAdmin ? '管理员' : '成员',
      text: chatInput,
      timestamp: Date.now()
    };
    
    const channel = new BroadcastChannel('nocturne-sync');
    channel.postMessage({ type: 'CHAT_MESSAGE', data: msg, groupId: activeGroupId });
    
    const nextHistory = [...currentChat, msg];
    const nextHistories = { ...chatHistories, [activeGroupId]: nextHistory };
    setChatHistories(nextHistories);
    await storageService.saveMetadata({ chatHistory: nextHistories });
    setChatInput('');
  };

  const handleApproveRole = async (requestId: string) => {
    const meta = await storageService.getMetadata();
    const updated = (meta.roleRequests || []).map(req => 
      req.id === requestId ? { ...req, status: 'approved' as const } : req
    );
    await storageService.saveMetadata({ roleRequests: updated });
    setRoleRequests(updated);
  };

  const handleRejectRole = async (requestId: string) => {
    const meta = await storageService.getMetadata();
    const updated = (meta.roleRequests || []).map(req => 
      req.id === requestId ? { ...req, status: 'rejected' as const } : req
    );
    await storageService.saveMetadata({ roleRequests: updated });
    setRoleRequests(updated);
  };

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

  // Sync Listener
  useEffect(() => {
    const channel = new BroadcastChannel('nocturne-sync');
    channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'PUSH_METRONOME' && !isAdmin) {
        setBpm(data.bpm);
        setIsPlaying(data.isPlaying);
        globalStartTimeRef.current = data.startTime;
      }
    };
    return () => channel.close();
  }, [isAdmin]);

  // Metronome pulse effect with strict phase sync
  useEffect(() => {
    if (!isPlaying) return;
    const interval = 60000 / bpm;
    
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
  }, [isPlaying, bpm]);

  // Dynamic latency effect
  useEffect(() => {
    const timer = setInterval(() => {
      setLatency(prev => {
        const change = Math.floor(Math.random() * 3) - 1;
        return Math.max(8, Math.min(25, prev + change));
      });
    }, 3000);
    return () => clearInterval(timer);
  }, []);

  const members = [
    { name: '张小明', role: '钢琴 / 第一部', battery: 85, progress: 100, status: 'normal' },
    { name: '李华', role: '小提琴 / 首席', battery: 12, progress: 100, status: 'low-battery' },
    { name: '王大力', role: '大提琴', battery: 92, progress: 64, status: 'downloading' },
    { name: '陈静', role: '长笛', battery: 55, progress: 100, status: 'normal' },
    { name: '周杰', role: '打击乐', battery: 4, progress: 100, status: 'critical-battery' },
    { name: '赵雷', role: '调音师', battery: 100, progress: 100, status: 'normal' },
  ];

  const handleManualTap = () => {
    const now = Date.now();
    if (lastTap) {
      const diff = now - lastTap;
      const newBpm = Math.round(60000 / diff);
      if (newBpm > 30 && newBpm < 300) {
        setBpm(newBpm);
      }
    }
    setLastTap(now);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => setIsRefreshing(false), 1500);
  };

  const pushMetronome = () => {
    const startTime = Date.now();
    globalStartTimeRef.current = startTime;
    const channel = new BroadcastChannel('nocturne-sync');
    channel.postMessage({
      type: 'PUSH_METRONOME',
      data: { bpm, isPlaying, startTime }
    });
    setIsSyncing(true);
    setTimeout(() => setIsSyncing(false), 1500);
  };

  const filteredMembers = members.filter(m => 
    m.name.toLowerCase().includes(filterText.toLowerCase()) || 
    m.role.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <div className="pb-24">
      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            />
            <motion.div 
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 bottom-0 w-80 bg-surface-container-high z-[101] shadow-2xl flex flex-col"
            >
              <div className="p-8 border-b border-outline-variant/10">
                <div className="flex items-center gap-3 mb-8">
                  <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center text-on-primary font-bold text-xl shadow-lg shadow-primary/20">合</div>
                  <h2 className="font-headline font-bold text-2xl tracking-tight text-primary">合拍管理系统</h2>
                </div>
                
                <div className="space-y-1">
                  <button 
                    onClick={() => { onViewChange('library'); setIsSidebarOpen(false); }}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-on-background/60 hover:bg-primary/10 hover:text-primary transition-all group"
                  >
                    <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">快速搜索</span>
                  </button>
                  <button 
                    onClick={() => { onViewChange('recent'); setIsSidebarOpen(false); }}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-on-background/60 hover:bg-primary/10 hover:text-primary transition-all group"
                  >
                    <Clock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">最近演出</span>
                  </button>
                  <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-on-background/60 hover:bg-primary/10 hover:text-primary transition-all group">
                    <Heart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">收藏曲目</span>
                  </button>
                </div>
              </div>

              <div className="flex-1 p-8 overflow-y-auto">
                <div className="text-[10px] font-bold text-on-background/30 uppercase tracking-widest mb-4">系统</div>
                <div className="space-y-1">
                  <button className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-on-background/60 hover:bg-primary/10 hover:text-primary transition-all group">
                    <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">个人中心</span>
                  </button>
                  <button 
                    onClick={() => { onViewChange('settings'); setIsSidebarOpen(false); }}
                    className="w-full flex items-center gap-4 px-4 py-3 rounded-xl text-on-background/60 hover:bg-primary/10 hover:text-primary transition-all group"
                  >
                    <Settings className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="font-bold">系统设置</span>
                  </button>
                </div>
              </div>

              <div className="p-8 border-t border-outline-variant/10">
                <button className="w-full flex items-center gap-4 px-4 py-4 rounded-xl text-error hover:bg-error/10 transition-all group">
                  <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  <span className="font-bold">退出登录</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Menu 
            onClick={() => setIsSidebarOpen(true)}
            className="text-primary cursor-pointer w-6 h-6 hover:scale-110 transition-transform" 
          />
          <h1 className="font-headline font-bold text-lg tracking-tight text-primary uppercase">排练同步大厅</h1>
        </div>
        <div className="flex items-center gap-4">
          <RefreshCw 
            onClick={handleRefresh}
            className={`text-primary cursor-pointer w-6 h-6 ${isRefreshing ? 'animate-spin' : ''}`} 
          />
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
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20 group-hover:border-primary transition-all">
              {(userProfile?.name || '音')[0]}
            </div>
          </div>
        </div>
      </header>

      <main className="px-6 max-w-7xl mx-auto space-y-8 pt-4">
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-8 bg-surface-container-high rounded-xl p-8 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h2 className="font-headline text-on-background/50 text-xs font-bold uppercase tracking-[0.2em]">
                    {isAdmin ? '主节拍控制 (Master Metronome)' : '同步节拍器 (Sync Metronome)'}
                  </h2>
                  {isPlaying && (
                    <motion.div 
                      animate={{ scale: pulse ? 1.5 : 1, opacity: pulse ? 1 : 0.3 }}
                      className="w-3 h-3 bg-primary rounded-full shadow-[0_0_10px_rgba(137,172,255,0.5)]"
                    />
                  )}
                </div>
                
                {isAdmin && (
                  <div className="flex items-center gap-2 bg-background/50 p-1 rounded-xl border border-outline-variant/10">
                    <button 
                      onClick={() => setBpm(prev => Math.max(30, prev - 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container text-primary transition-colors"
                    >
                      -1
                    </button>
                    <input 
                      type="range" 
                      min="30" 
                      max="250" 
                      value={bpm} 
                      onChange={(e) => setBpm(parseInt(e.target.value))}
                      className="w-32 accent-primary"
                    />
                    <button 
                      onClick={() => setBpm(prev => Math.min(250, prev + 1))}
                      className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-surface-container text-primary transition-colors"
                    >
                      +1
                    </button>
                  </div>
                )}
              </div>
              <div className="flex items-end gap-4">
                <span className="font-headline text-8xl md:text-9xl font-bold text-primary tracking-tighter">{bpm}</span>
                <span className="font-headline text-2xl text-primary/40 mb-4">BPM</span>
              </div>
            </div>
            <div className="relative z-10 mt-8 flex flex-wrap items-center gap-4">
              {isAdmin ? (
                <>
                  <button 
                    onClick={() => setIsPlaying(!isPlaying)}
                    className={`flex items-center gap-2 px-6 py-4 rounded-xl font-bold transition-all active:scale-95 ${isPlaying ? 'bg-primary text-on-primary shadow-lg shadow-primary/20' : 'bg-surface-container text-primary border border-outline-variant/10'}`}
                  >
                    {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    {isPlaying ? '停止节拍' : '启动节拍'}
                  </button>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Adagio', bpm: 56 },
                      { label: 'Andante', bpm: 84 },
                      { label: 'Moderato', bpm: 112 },
                      { label: 'Allegro', bpm: 132 },
                      { label: 'Presto', bpm: 180 },
                    ].map(tempo => (
                      <button 
                        key={tempo.label}
                        onClick={() => setBpm(tempo.bpm)}
                        className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${bpm === tempo.bpm ? 'bg-primary text-on-primary' : 'bg-background hover:bg-primary/10 text-on-background/50'}`}
                      >
                        {tempo.label} ({tempo.bpm})
                      </button>
                    ))}
                  </div>
                  <button 
                    onClick={pushMetronome}
                    className={`flex items-center gap-2 px-6 py-4 rounded-xl font-bold transition-all active:scale-95 ${isSyncing ? 'bg-tertiary text-on-tertiary shadow-lg' : 'bg-primary/10 text-primary border border-primary/20'}`}
                  >
                    <Radio className={`w-5 h-5 ${isSyncing ? 'animate-pulse' : ''}`} />
                    推送同步节拍
                  </button>
                </>
              ) : (
                <div className="flex items-center gap-4 bg-primary/5 p-6 rounded-2xl border border-primary/10 w-full">
                  <div className={`p-4 rounded-full ${isPlaying ? 'bg-primary text-on-primary animate-pulse' : 'bg-surface-container text-on-background/20'}`}>
                    <Activity className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="text-lg font-bold text-on-background">
                      {isPlaying ? '正在接收同步节拍' : '等待管理员启动'}
                    </div>
                    <div className="text-sm text-on-background/50">
                      {isSyncEnabled ? '同步模式已开启，节拍将与管理员保持一致' : '同步已关闭，您正在独立练习'}
                    </div>
                  </div>
                  <div className="flex-grow" />
                  <div className="flex items-center gap-4 bg-background/50 p-4 rounded-xl border border-outline-variant/15">
                    <span className="text-sm font-medium text-on-background/70">同步开关</span>
                    <div 
                      onClick={() => setIsSyncEnabled(!isSyncEnabled)}
                      className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${isSyncEnabled ? 'bg-secondary' : 'bg-outline-variant'}`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isSyncEnabled ? 'right-1' : 'left-1'}`}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="md:col-span-4 grid grid-rows-2 gap-6">
            {isAdmin ? (
              <div className={`p-6 rounded-xl flex flex-col justify-between relative overflow-hidden transition-colors ${isBroadcasting ? 'bg-secondary' : 'bg-surface-container-high border border-outline-variant/10'}`}>
                <Radio className={`absolute -right-4 -bottom-4 w-32 h-32 ${isBroadcasting ? 'text-on-secondary/10' : 'text-on-background/5'}`} />
                <h3 className={`font-bold text-lg font-headline tracking-tight ${isBroadcasting ? 'text-on-secondary' : 'text-on-background/50'}`}>广播状态</h3>
                <div className={`font-headline text-4xl font-bold ${isBroadcasting ? 'text-on-secondary' : 'text-on-background/30'}`}>
                  {isBroadcasting ? '正在直播推送' : '已停止广播'}
                </div>
                <p className={`text-sm ${isBroadcasting ? 'text-on-secondary/70' : 'text-on-background/20'}`}>
                  {isBroadcasting ? '当前正在向 12 台设备广播数据' : '广播已暂停，成员无法接收同步'}
                </p>
              </div>
            ) : (
              <div className="bg-surface-container-high p-6 rounded-xl flex flex-col justify-between border border-outline-variant/10 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Shield className="w-16 h-16" />
                </div>
                <h3 className="text-on-background/50 font-bold text-xs uppercase tracking-widest">同步安全</h3>
                <div className="text-2xl font-headline font-bold text-primary">已加密连接</div>
                <p className="text-xs text-on-background/50">您的设备已通过安全通道连接至排练主控台。</p>
              </div>
            )}
            
            {isAdmin ? (
              <div className="bg-surface-container-high p-6 rounded-xl flex flex-col justify-between border border-outline-variant/10">
                <h3 className="text-on-background/50 font-bold text-xs uppercase tracking-widest">全局控制</h3>
                <div className="grid grid-cols-2 gap-2">
                  <button className="flex flex-col items-center gap-2 p-3 bg-background rounded-xl hover:bg-error/10 hover:text-error transition-all group">
                    <VolumeX className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">全员静音</span>
                  </button>
                  <button className="flex flex-col items-center gap-2 p-3 bg-background rounded-xl hover:bg-primary/10 hover:text-primary transition-all group">
                    <Lock className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">锁定屏幕</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-surface-container-high p-6 rounded-xl flex flex-col justify-between border border-outline-variant/10">
                <h3 className="text-on-background/50 font-bold text-xs uppercase tracking-widest">网络延迟</h3>
                <div className="flex items-end justify-between">
                  <div className="text-tertiary font-headline text-5xl font-bold transition-all duration-500">{latency}<span className="text-xl ml-1 font-light opacity-50">ms</span></div>
                  <div className="bg-tertiary/10 text-tertiary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 fill-tertiary/20" />
                    {latency < 20 ? '极佳' : '良好'}
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Group Management Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="text-primary w-6 h-6" />
              <h2 className="text-2xl font-headline font-bold text-on-background tracking-tight">
                {activeGroup ? activeGroup.name : '群组管理'}
              </h2>
              {groups.length > 1 && (
                <div className="relative">
                  <button 
                    onClick={() => setIsGroupMenuOpen(!isGroupMenuOpen)}
                    className={`p-2 hover:bg-surface-container rounded-lg transition-colors ${isGroupMenuOpen ? 'bg-surface-container text-primary' : 'text-on-background/50'}`}
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isGroupMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <AnimatePresence>
                    {isGroupMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-[55]" onClick={() => setIsGroupMenuOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 10, scale: 0.95 }}
                          className="absolute top-full left-0 mt-2 w-56 bg-surface-container-high border border-outline-variant/10 rounded-2xl shadow-2xl py-3 z-[60] overflow-hidden"
                        >
                          <div className="px-4 py-2 text-[10px] font-bold text-on-background/30 uppercase tracking-widest border-b border-outline-variant/5 mb-2">切换乐团</div>
                          {groups.map(g => (
                            <button 
                              key={g.id}
                              onClick={() => {
                                setActiveGroupId(g.id);
                                setIsGroupMenuOpen(false);
                                setUnreadCounts(prev => ({ ...prev, [g.id]: 0 }));
                              }}
                              className={`w-full text-left px-4 py-3 text-sm font-bold flex items-center justify-between transition-colors ${activeGroupId === g.id ? 'text-primary bg-primary/10' : 'text-on-background/70 hover:bg-surface-container'}`}
                            >
                              <div className="flex items-center gap-3">
                                <Users className={`w-4 h-4 ${activeGroupId === g.id ? 'text-primary' : 'text-on-background/30'}`} />
                                {g.name}
                              </div>
                              {unreadCounts[g.id] > 0 && (
                                <span className="bg-error text-on-error text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                  {unreadCounts[g.id]}
                                </span>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setIsJoiningGroup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-surface-container text-secondary rounded-xl font-bold text-sm border border-secondary/20"
              >
                <PlusCircle className="w-4 h-4" />
                加入
              </button>
              <button 
                onClick={() => setIsCreatingGroup(true)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-bold text-sm shadow-lg shadow-primary/20"
              >
                <PlusCircle className="w-4 h-4" />
                创建
              </button>
            </div>
          </div>

          {activeGroup && (
            <div className="flex items-center gap-4 bg-surface-container-high p-4 rounded-2xl border border-outline-variant/10">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-background/50 uppercase tracking-widest">邀请码:</span>
                <span className="text-sm font-mono font-bold text-primary">{activeGroup.inviteCode}</span>
                <button className="p-1 hover:bg-primary/10 rounded text-primary"><Copy className="w-3 h-3" /></button>
              </div>
              <div className="h-4 w-px bg-outline-variant/20" />
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-background/50 uppercase tracking-widest">我的身份:</span>
                <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  {userRole === 'admin' ? '主管理员' : userRole === 'sub-admin' ? '二级管理员' : '成员'}
                </span>
              </div>
              <div className="flex-grow" />
              {isMainAdmin && (
                <div className="flex items-center gap-2">
                  {editingGroupId === activeGroup.id ? (
                    <div className="flex items-center gap-2 bg-background rounded-lg px-2 py-1 border border-primary/30">
                      <input 
                        autoFocus
                        className="bg-transparent text-xs font-bold outline-none w-32"
                        value={editGroupName}
                        onChange={(e) => setEditGroupName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleRenameGroup()}
                      />
                      <button onClick={handleRenameGroup} className="text-primary"><CheckCircle className="w-4 h-4" /></button>
                      <button onClick={() => setEditingGroupId(null)} className="text-on-background/30"><X className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <button 
                      onClick={() => {
                        setEditingGroupId(activeGroup.id);
                        setEditGroupName(activeGroup.name);
                      }}
                      className="p-2 hover:bg-surface-container rounded-lg text-on-background/50"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  )}
                  <button 
                    onClick={() => handleDeleteGroup(activeGroup.id)}
                    className="p-2 hover:bg-error/10 rounded-lg text-error/50 hover:text-error"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}

          {isCreatingGroup && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-container-high p-6 rounded-2xl border border-primary/20 shadow-xl"
            >
              <h3 className="text-lg font-bold text-primary mb-4">创建新群组</h3>
              <div className="flex gap-4">
                <input 
                  autoFocus
                  className="flex-1 bg-background border border-outline-variant/20 rounded-xl px-4 py-3 outline-none focus:border-primary transition-colors"
                  placeholder="输入群组名称 (如: 爱乐乐团排练群)"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                />
                <button 
                  onClick={handleCreateGroup}
                  className="px-6 py-3 bg-primary text-on-primary rounded-xl font-bold hover:bg-primary-dark transition-colors"
                >
                  确认启动
                </button>
                <button 
                  onClick={() => setIsCreatingGroup(false)}
                  className="px-6 py-3 text-on-background/50 font-bold"
                >
                  取消
                </button>
              </div>
            </motion.div>
          )}

          {isJoiningGroup && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-container-high p-6 rounded-2xl border border-secondary/20 shadow-xl"
            >
              <h3 className="text-lg font-bold text-secondary mb-4">加入现有群组</h3>
              <div className="flex gap-4">
                <input 
                  autoFocus
                  className="flex-1 bg-background border border-outline-variant/20 rounded-xl px-4 py-3 outline-none focus:border-secondary transition-colors font-mono tracking-widest uppercase"
                  placeholder="输入 6 位邀请码"
                  maxLength={6}
                  value={inviteCodeInput}
                  onChange={(e) => setInviteCodeInput(e.target.value)}
                />
                <button 
                  onClick={handleJoinGroup}
                  className="px-6 py-3 bg-secondary text-on-secondary rounded-xl font-bold hover:bg-secondary-dark transition-colors"
                >
                  立即加入
                </button>
                <button 
                  onClick={() => setIsJoiningGroup(false)}
                  className="px-6 py-3 text-on-background/50 font-bold"
                >
                  取消
                </button>
              </div>
            </motion.div>
          )}
        </section>

        {/* Chatroom Section */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative">
          <div className={`lg:col-span-8 flex flex-col bg-surface-container-high rounded-2xl border border-outline-variant/10 overflow-hidden shadow-xl transition-all duration-500 ${isChatFolded ? 'h-16' : 'h-[500px]'}`}>
            <div 
              onClick={() => {
                setIsChatFolded(!isChatFolded);
                if (isChatFolded) setUnreadCounts(prev => ({ ...prev, [activeGroupId]: 0 }));
              }}
              className="p-4 border-b border-outline-variant/10 bg-surface-bright flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg relative">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  {Object.values(unreadCounts).reduce((a, b) => a + b, 0) > 0 && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-error rounded-full border-2 border-surface-bright" />
                  )}
                </div>
                <h3 className="font-bold text-on-background">
                  {activeGroup ? `${activeGroup.name} 聊天室` : '同步聊天室'}
                </h3>
              </div>
              <div className="flex items-center gap-4">
                {!isChatFolded && (
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-tertiary rounded-full animate-pulse" />
                    <span className="text-[10px] font-bold text-tertiary uppercase tracking-widest">本地同步中</span>
                  </div>
                )}
                {isChatFolded ? <ChevronDown className="w-4 h-4 text-on-background/30" /> : <ChevronUp className="w-4 h-4 text-on-background/30" />}
              </div>
            </div>
            
            {!isChatFolded && (
              <>
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                  {currentChat.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-on-background/20">
                      <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
                      <p className="text-sm font-bold">暂无消息，开始交流吧</p>
                    </div>
                  ) : (
                    currentChat.map(msg => (
                      <div 
                        key={msg.id}
                        className={`flex flex-col ${msg.senderId === 'CURRENT_USER_ID' ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-on-background/40 uppercase tracking-tighter">{msg.senderName}</span>
                          <span className="text-[8px] text-on-background/20">{new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className={`max-w-[80%] px-4 py-2 rounded-2xl text-sm font-medium shadow-sm ${
                          msg.senderId === 'CURRENT_USER_ID' 
                            ? 'bg-primary text-on-primary rounded-tr-none' 
                            : 'bg-background text-on-background border border-outline-variant/10 rounded-tl-none'
                        }`}>
                          {msg.text}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-4 bg-surface-bright border-t border-outline-variant/10">
                  <div className="flex gap-2">
                    <input 
                      className="flex-1 bg-background border border-outline-variant/20 rounded-xl px-4 py-2 text-sm outline-none focus:border-primary transition-colors"
                      placeholder="在此输入消息..."
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    />
                    <button 
                      onClick={handleSendMessage}
                      className="p-2 bg-primary text-on-primary rounded-xl hover:bg-primary-dark transition-all active:scale-95"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {isAdmin && (
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/10 shadow-lg">
                <div 
                  onClick={() => setIsOnlineMembersFolded(!isOnlineMembersFolded)}
                  className="flex items-center justify-between cursor-pointer mb-4 group"
                >
                  <h3 className="text-sm font-bold text-on-background/50 uppercase tracking-widest">在线成员 (仅管理员可见)</h3>
                  <div className="p-1 hover:bg-surface-container rounded transition-colors">
                    {isOnlineMembersFolded ? <ChevronDown className="w-4 h-4 text-on-background/30" /> : <ChevronUp className="w-4 h-4 text-on-background/30" />}
                  </div>
                </div>
                
                <AnimatePresence>
                  {!isOnlineMembersFolded && (
                    <motion.div 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-3 overflow-hidden"
                    >
                      {members.map(member => (
                        <div key={member.name} className="flex items-center justify-between p-3 bg-background rounded-xl border border-outline-variant/5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xs">
                              {member.name[0]}
                            </div>
                            <div>
                              <div className="text-xs font-bold text-on-background">{member.name}</div>
                              <div className="text-[10px] text-on-background/40">{member.role}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="text-[10px] font-bold text-tertiary">12ms</div>
                            <div className="w-1.5 h-1.5 bg-tertiary rounded-full shadow-[0_0_5px_rgba(0,255,0,0.5)]" />
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          )}
        </section>

        {isAdmin && roleRequests.length > 0 && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-secondary w-6 h-6" />
              <h2 className="text-2xl font-headline font-bold text-on-background tracking-tight">声部变更申请</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roleRequests.filter(r => r.status === 'pending').map(request => (
                <div key={request.id} className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/10 flex items-center justify-between">
                  <div>
                    <div className="text-lg font-bold text-on-background">{request.userName}</div>
                    <div className="text-sm text-on-background/50">申请变更为: <span className="text-primary font-bold">{request.requestedRole}</span></div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleApproveRole(request.id)}
                      className="p-3 bg-tertiary/10 text-tertiary rounded-xl hover:bg-tertiary hover:text-on-tertiary transition-all"
                    >
                      <UserCheck className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleRejectRole(request.id)}
                      className="p-3 bg-error/10 text-error rounded-xl hover:bg-error hover:text-on-error transition-all"
                    >
                      <UserX className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <div 
              onClick={() => setIsConnectedMembersFolded(!isConnectedMembersFolded)}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <h2 className="text-2xl font-headline font-bold text-on-background tracking-tight">连接成员 ({filteredMembers.length})</h2>
              <div className="p-1 hover:bg-surface-container rounded transition-colors">
                {isConnectedMembersFolded ? <ChevronDown className="w-5 h-5 text-on-background/30" /> : <ChevronUp className="w-5 h-5 text-on-background/30" />}
              </div>
            </div>
            <div className="flex gap-2">
              {isFilterOpen ? (
                <div className="flex items-center bg-surface-container-high rounded-lg px-3 py-1 border border-primary/30">
                  <input 
                    autoFocus
                    className="bg-transparent outline-none text-sm w-32"
                    placeholder="搜索成员..."
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                  />
                  <button onClick={() => { setIsFilterOpen(false); setFilterText(''); }}>
                    <X className="w-4 h-4 text-on-background/30" />
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setIsFilterOpen(true)}
                  className="bg-surface-container-high text-primary p-2 rounded-lg hover:bg-surface-bright"
                >
                  <Filter className="w-5 h-5" />
                </button>
              )}
              <button className="bg-surface-container-high text-primary p-2 rounded-lg hover:bg-surface-bright">
                <SortAsc className="w-5 h-5" />
              </button>
            </div>
          </div>
          <AnimatePresence>
            {!isConnectedMembersFolded && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-hidden"
              >
                {filteredMembers.map((member, idx) => (
                  <div 
                    key={idx}
                    className={`bg-surface-container-high rounded-xl p-5 border-l-4 transition-all hover:bg-surface-bright group ${
                      member.status.includes('battery') ? 'border-secondary' : 'border-primary'
                    } ${member.status === 'critical-battery' ? 'bg-secondary/5' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="text-on-background font-bold text-lg">{member.name}</div>
                        <div className="text-on-background/50 text-sm flex items-center gap-1">
                          {member.role.includes('钢琴') ? <Piano className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                          {member.role}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-headline font-bold flex items-center gap-1 justify-end ${
                          member.status.includes('battery') ? 'text-secondary' : 'text-on-background'
                        }`}>
                          {member.status === 'critical-battery' && <BatteryWarning className="w-4 h-4" />}
                          {member.status === 'low-battery' && <BatteryLow className="w-4 h-4" />}
                          {member.battery}%
                        </div>
                        <div className="text-[10px] uppercase font-bold tracking-tighter text-on-background/30">电池电量</div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs font-medium text-on-background/50 mb-1">
                        <span className="flex items-center gap-1">
                          {member.status === 'downloading' && <Download className="w-3 h-3 animate-bounce" />}
                          乐谱同步进度
                        </span>
                        <span>{member.progress}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all duration-500 ${member.status === 'downloading' ? 'bg-primary' : 'bg-tertiary'}`}
                          style={{ width: `${member.progress}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      </main>
    </div>
  );
}
