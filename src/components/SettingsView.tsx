import { Menu, Bell, Settings, Network, StickyNote, FolderArchive, History, BarChart, Activity, User, RefreshCw, UserCheck, Users, CheckCircle2, AlertCircle, CheckCircle, X, ChevronRight, Shield, Palette, Globe, Type, Database, Info, FileJson, DownloadCloud, Trash2, ChevronDown, Radio } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storageService, Setlist } from '../services/storageService';

interface SettingsViewProps {
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  onViewChange: (view: any) => void;
}

export default function SettingsView({ isAdmin, setIsAdmin, onViewChange }: SettingsViewProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [message, setMessage] = useState<{ text: string, type: 'info' | 'error' } | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [setlists, setSetlists] = useState<Setlist[]>([]);
  const [selectedSetlistId, setSelectedSetlistId] = useState<string>('all');
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [language, setLanguage] = useState<'zh' | 'en'>('zh');
  const [fontSize, setFontSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isShowingNotifications, setIsShowingNotifications] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [pedalConfig, setPedalConfig] = useState<any>({ nextPageKeys: ['ArrowRight', 'PageDown'], prevPageKeys: ['ArrowLeft', 'PageUp'], enabled: true });
  const [isRecordingKey, setIsRecordingKey] = useState<'next' | 'prev' | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const meta = await storageService.getMetadata();
      setUserProfile(meta.profile);
      setSetlists(meta.setlists || []);
      setNotifications(meta.notifications || []);
      if (meta.pedalConfig) setPedalConfig(meta.pedalConfig);
    };
    loadData();
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (isRecordingKey) {
        e.preventDefault();
        e.stopPropagation();
        const updated = { ...pedalConfig };
        if (isRecordingKey === 'next') {
          if (!updated.nextPageKeys.includes(e.key)) {
            updated.nextPageKeys = [...updated.nextPageKeys, e.key];
          }
        } else {
          if (!updated.prevPageKeys.includes(e.key)) {
            updated.prevPageKeys = [...updated.prevPageKeys, e.key];
          }
        }
        setPedalConfig(updated);
        storageService.saveMetadata({ pedalConfig: updated });
        setIsRecordingKey(null);
        showMessage('按键录制成功');
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [isRecordingKey, pedalConfig]);

  const removeKey = (type: 'next' | 'prev', key: string) => {
    const updated = { ...pedalConfig };
    if (type === 'next') {
      updated.nextPageKeys = updated.nextPageKeys.filter(k => k !== key);
    } else {
      updated.prevPageKeys = updated.prevPageKeys.filter(k => k !== key);
    }
    setPedalConfig(updated);
    storageService.saveMetadata({ pedalConfig: updated });
  };

  const togglePedal = () => {
    const updated = { ...pedalConfig, enabled: !pedalConfig.enabled };
    setPedalConfig(updated);
    storageService.saveMetadata({ pedalConfig: updated });
  };

  const markAllAsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    await storageService.saveMetadata({ notifications: updated });
  };

  const showMessage = (text: string, type: 'info' | 'error' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const handleExport = () => {
    setIsExporting(true);
    setExportProgress(0);
    const interval = setInterval(() => {
      setExportProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setIsExporting(false);
            showMessage(`${selectedSetlistId === 'all' ? '全部数据' : '节目单数据'} 导出成功`);
          }, 500);
          return 100;
        }
        return prev + 5;
      });
    }, 100);
  };

  const handleClearCache = () => {
    showMessage('缓存已清理，释放了 124MB 空间');
  };

  const handleResetData = () => {
    if (confirm('确定要重置所有本地数据吗？此操作不可撤销。')) {
      showMessage('数据已重置', 'error');
    }
  };
  const members = [
    { name: 'Alex M.', img: 'https://i.pravatar.cc/150?u=alex' },
    { name: 'Sarah K.', img: 'https://i.pravatar.cc/150?u=sarah' },
    { name: 'David L.', img: 'https://i.pravatar.cc/150?u=david' },
    { name: 'Elena R.', img: 'https://i.pravatar.cc/150?u=elena' },
    { name: 'Marcus T.', img: 'https://i.pravatar.cc/150?u=marcus' },
  ];

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 sm:px-6 py-3 sm:py-4 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <h1 className="text-lg sm:text-xl font-bold text-primary tracking-widest uppercase font-headline">系统设置</h1>
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
            
            <AnimatePresence>
              {isShowingNotifications && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setIsShowingNotifications(false)} />
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 top-full mt-2 w-[calc(100vw-2rem)] sm:w-80 bg-surface-bright rounded-2xl shadow-2xl border border-outline-variant/10 py-4 z-[70] overflow-hidden"
                  >
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
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
          <div 
            onClick={() => onViewChange('profile')}
            className="flex items-center gap-3 pl-4 border-l border-outline-variant/10 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20 group-hover:bg-primary group-hover:text-on-primary transition-all overflow-hidden">
              {userProfile?.avatar instanceof Blob ? (
                <img src={URL.createObjectURL(userProfile.avatar)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                (userProfile?.name || '音')[0]
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-8 sm:space-y-10">
        {/* Profile Card */}
        <section className="bg-surface-container-high rounded-3xl p-4 sm:p-6 border border-primary/20 shadow-lg overflow-hidden relative group cursor-pointer" onClick={() => onViewChange('profile')}>
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
            <User className="w-24 h-24 sm:w-32 sm:h-32" />
          </div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl sm:text-3xl border-2 border-primary/20 shadow-inner overflow-hidden">
                  {userProfile?.avatar instanceof Blob ? (
                    <img src={URL.createObjectURL(userProfile.avatar)} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    (userProfile?.name || '音')[0]
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 p-1 bg-primary text-on-primary rounded-lg shadow-lg">
                  <Settings className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                </div>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-headline font-bold text-on-background">{userProfile?.name || '音乐家'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`px-2 sm:px-3 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest ${isAdmin ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-background/50'}`}>
                    {isAdmin ? '系统管理员' : '普通成员'}
                  </span>
                  <span className="text-[9px] sm:text-[10px] font-bold text-on-background/30 uppercase tracking-tighter">ID: 892734</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 text-primary font-bold text-xs bg-primary/5 px-4 py-2 rounded-xl group-hover:bg-primary group-hover:text-on-primary transition-all w-full sm:w-auto justify-center">
              <span>个人中心</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        </section>

        {/* General Settings */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Palette className="text-primary w-5 h-5" />
            <h2 className="font-headline font-bold text-xl tracking-tight">常规设置</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-surface-container-high rounded-2xl p-5 border border-outline-variant/10 space-y-4">
              <div className="flex items-center gap-3 text-on-background/50">
                <Palette className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">外观主题</span>
              </div>
              <div className="flex gap-2">
                {['light', 'dark', 'system'].map(t => (
                  <button 
                    key={t}
                    onClick={() => setTheme(t as any)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${theme === t ? 'bg-primary text-on-primary shadow-lg' : 'bg-background text-on-background/50 hover:bg-surface-container'}`}
                  >
                    {t === 'light' ? '明亮' : t === 'dark' ? '深色' : '跟随系统'}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-surface-container-high rounded-2xl p-5 border border-outline-variant/10 space-y-4">
              <div className="flex items-center gap-3 text-on-background/50">
                <Globe className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">语言选择</span>
              </div>
              <div className="flex gap-2">
                {['zh', 'en'].map(l => (
                  <button 
                    key={l}
                    onClick={() => setLanguage(l as any)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${language === l ? 'bg-primary text-on-primary shadow-lg' : 'bg-background text-on-background/50 hover:bg-surface-container'}`}
                  >
                    {l === 'zh' ? '简体中文' : 'English'}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-surface-container-high rounded-2xl p-5 border border-outline-variant/10 space-y-4">
              <div className="flex items-center gap-3 text-on-background/50">
                <Type className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-widest">字体大小</span>
              </div>
              <div className="flex gap-2">
                {['small', 'medium', 'large'].map(s => (
                  <button 
                    key={s}
                    onClick={() => setFontSize(s as any)}
                    className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase transition-all ${fontSize === s ? 'bg-primary text-on-primary shadow-lg' : 'bg-background text-on-background/50 hover:bg-surface-container'}`}
                  >
                    {s === 'small' ? '小' : s === 'medium' ? '中' : '大'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Storage & Security */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Database className="text-primary w-5 h-5" />
              <h2 className="font-headline font-bold text-xl tracking-tight">存储与数据</h2>
            </div>
            <div className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/10 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-background">本地缓存</p>
                  <p className="text-xs text-on-background/50">当前占用: 124.5 MB</p>
                </div>
                <button 
                  onClick={handleClearCache}
                  className="px-4 py-2 bg-surface-container text-on-background/70 rounded-xl text-xs font-bold hover:bg-error/10 hover:text-error transition-all"
                >
                  清理缓存
                </button>
              </div>
              <div className="h-px bg-outline-variant/10" />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-on-background">重置应用</p>
                  <p className="text-xs text-on-background/50">清除所有本地设置与乐谱</p>
                </div>
                <button 
                  onClick={handleResetData}
                  className="px-4 py-2 bg-error/10 text-error rounded-xl text-xs font-bold hover:bg-error hover:text-on-error transition-all"
                >
                  重置数据
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="text-primary w-5 h-5" />
              <h2 className="font-headline font-bold text-xl tracking-tight">系统权限</h2>
            </div>
            <div className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isAdmin ? 'bg-primary/10 text-primary' : 'bg-on-background/5 text-on-background/30'}`}>
                    {isAdmin ? <UserCheck className="w-5 h-5" /> : <Users className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="font-bold text-on-background">{isAdmin ? '管理员模式' : '成员模式'}</p>
                    <p className="text-[10px] text-on-background/50 uppercase tracking-tighter">当前身份状态</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdmin(!isAdmin)}
                  className={`w-12 h-6 rounded-full transition-all relative ${isAdmin ? 'bg-primary' : 'bg-outline-variant'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isAdmin ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
              <p className="text-xs text-on-background/40 leading-relaxed">
                {isAdmin ? '您当前拥有完整管理权限，可上传、编辑及管理成员。' : '您当前处于成员模式，仅限查看及使用乐谱。'}
              </p>
            </div>
          </div>
        </section>

        {/* Bluetooth Pedal */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Radio className="text-primary w-5 h-5" />
            <h2 className="font-headline font-bold text-xl tracking-tight">蓝牙踏板翻页</h2>
          </div>
          <div className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/10 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-on-background">启用踏板翻页</p>
                <p className="text-xs text-on-background/50">支持蓝牙键盘、翻页笔、踏板等 HID 设备</p>
              </div>
              <button 
                onClick={togglePedal}
                className={`w-12 h-6 rounded-full transition-all relative ${pedalConfig.enabled ? 'bg-primary' : 'bg-outline-variant'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${pedalConfig.enabled ? 'right-1' : 'left-1'}`} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-background/50 uppercase tracking-widest">下一页按键</span>
                  <button 
                    onClick={() => setIsRecordingKey('next')}
                    className={`text-[10px] font-bold px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all ${isRecordingKey === 'next' ? 'animate-pulse bg-primary text-on-primary' : ''}`}
                  >
                    {isRecordingKey === 'next' ? '请按下按键...' : '+ 录制新按键'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pedalConfig.nextPageKeys.map((key: string) => (
                    <div key={key} className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border border-outline-variant/10 group">
                      <span className="text-xs font-mono font-bold text-primary">{key}</span>
                      <button onClick={() => removeKey('next', key)} className="text-on-background/20 hover:text-error transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-on-background/50 uppercase tracking-widest">上一页按键</span>
                  <button 
                    onClick={() => setIsRecordingKey('prev')}
                    className={`text-[10px] font-bold px-2 py-1 rounded bg-primary/10 text-primary hover:bg-primary/20 transition-all ${isRecordingKey === 'prev' ? 'animate-pulse bg-primary text-on-primary' : ''}`}
                  >
                    {isRecordingKey === 'prev' ? '请按下按键...' : '+ 录制新按键'}
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pedalConfig.prevPageKeys.map((key: string) => (
                    <div key={key} className="flex items-center gap-2 bg-background px-3 py-1.5 rounded-lg border border-outline-variant/10 group">
                      <span className="text-xs font-mono font-bold text-primary">{key}</span>
                      <button onClick={() => removeKey('prev', key)} className="text-on-background/20 hover:text-error transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Export Configuration */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <DownloadCloud className="text-primary w-5 h-5" />
            <h2 className="font-headline font-bold text-xl tracking-tight">导出配置 (高级)</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
            <div className="md:col-span-7 bg-surface-container-high rounded-2xl p-8 space-y-6 border border-outline-variant/10">
              <div className="space-y-4">
                <div className="relative">
                  <p className="text-xs font-bold text-on-background/50 uppercase tracking-widest mb-2">选择导出范围</p>
                  <button 
                    onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                    className="w-full flex items-center justify-between p-4 bg-background rounded-xl border border-outline-variant/20 hover:border-primary transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <FileJson className="text-primary w-5 h-5" />
                      <span className="font-bold text-on-background">
                        {selectedSetlistId === 'all' ? '全部数据 (所有节目单)' : setlists.find(s => s.id === selectedSetlistId)?.name || '选择节目单'}
                      </span>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-on-background/30 transition-transform ${isExportMenuOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  <AnimatePresence>
                    {isExportMenuOpen && (
                      <>
                        <div className="fixed inset-0 z-[65]" onClick={() => setIsExportMenuOpen(false)} />
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          className="absolute top-full left-0 right-0 mt-2 bg-surface-bright border border-outline-variant/20 rounded-2xl shadow-2xl py-2 z-[70] max-h-60 overflow-y-auto"
                        >
                          <button 
                            onClick={() => { setSelectedSetlistId('all'); setIsExportMenuOpen(false); }}
                            className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-surface-container transition-colors ${selectedSetlistId === 'all' ? 'text-primary' : 'text-on-background/70'}`}
                          >
                            全部数据 (所有节目单)
                          </button>
                          {setlists.map(s => (
                            <button 
                              key={s.id}
                              onClick={() => { setSelectedSetlistId(s.id); setIsExportMenuOpen(false); }}
                              className={`w-full text-left px-4 py-3 text-sm font-bold hover:bg-surface-container transition-colors ${selectedSetlistId === s.id ? 'text-primary' : 'text-on-background/70'}`}
                            >
                              {s.name}
                            </button>
                          ))}
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="flex items-center gap-3 p-4 bg-background rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-bold text-on-background">包含批注信息</span>
                  </label>
                  <label className="flex items-center gap-3 p-4 bg-background rounded-xl cursor-pointer hover:bg-surface-container transition-colors">
                    <input type="checkbox" defaultChecked className="w-4 h-4 accent-primary" />
                    <span className="text-sm font-bold text-on-background">按乐器自动归档</span>
                  </label>
                </div>
              </div>
              
              <button 
                onClick={handleExport}
                disabled={isExporting}
                className={`w-full bg-primary text-on-primary py-5 rounded-2xl flex items-center justify-center gap-3 active:scale-[0.98] shadow-xl shadow-primary/20 transition-all ${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary-dark'}`}
              >
                {isExporting ? <RefreshCw className="animate-spin" /> : <FolderArchive className="w-5 h-5" />}
                <span className="font-bold tracking-wide uppercase">
                  {isExporting ? `正在打包 (${exportProgress}%)` : '开始导出 ZIP 包'}
                </span>
              </button>
            </div>

            <div className="md:col-span-5 flex flex-col gap-6">
              <div className="bg-surface-container-high rounded-2xl p-8 flex-1 flex flex-col justify-center border border-outline-variant/10 shadow-lg">
                <div className="flex justify-between items-end mb-4">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">存档引擎状态</h3>
                    <p className="text-2xl font-headline font-bold">{isExporting ? '正在处理...' : '就绪'}</p>
                  </div>
                  <span className="text-4xl font-headline font-light text-primary">{isExporting ? exportProgress : 0}<span className="text-lg opacity-50">%</span></span>
                </div>
                <div className="w-full h-3 bg-surface-container-low rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-primary to-tertiary rounded-full shadow-[0_0_12px_rgba(137,172,255,0.4)] transition-all duration-300"
                    style={{ width: `${isExporting ? exportProgress : 0}%` }}
                  ></div>
                </div>
                <div className="mt-6 flex items-center gap-3 py-2 px-3 bg-background/40 rounded-lg">
                  <RefreshCw className={`text-tertiary w-4 h-4 ${isExporting ? 'animate-spin' : ''}`} />
                  <span className="text-[10px] text-on-background/50 font-mono uppercase">
                    {isExporting ? '正在处理: score_data_bundle.zip' : '等待导出任务...'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <Info className="text-primary w-5 h-5" />
            <h2 className="font-headline font-bold text-xl tracking-tight">关于合拍</h2>
          </div>
          <div className="bg-surface-container-high rounded-2xl p-6 border border-outline-variant/10 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary font-bold text-xl">合</div>
                <div>
                  <p className="font-bold text-on-background">合拍 (Nocturne Sync)</p>
                  <p className="text-xs text-on-background/50">Version 2.4.0 (Build 20240414)</p>
                </div>
              </div>
              <button 
                onClick={() => showMessage('当前已是最新版本')}
                className="px-4 py-2 bg-surface-container text-on-background/70 rounded-xl text-xs font-bold hover:bg-primary/10 hover:text-primary transition-all"
              >
                检查更新
              </button>
            </div>
            <div className="h-px bg-outline-variant/10" />
            <div className="flex flex-wrap gap-6 text-xs font-bold text-on-background/40 uppercase tracking-widest">
              <button className="hover:text-primary transition-colors">用户协议</button>
              <button className="hover:text-primary transition-colors">隐私政策</button>
              <button className="hover:text-primary transition-colors">开源许可</button>
            </div>
          </div>
        </section>
      </main>

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
