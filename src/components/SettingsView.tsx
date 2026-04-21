import { Menu, Bell, Settings, Network, StickyNote, FolderArchive, History, BarChart, Activity, User, RefreshCw, UserCheck, Users, CheckCircle2, AlertCircle, CheckCircle, X, ChevronRight, Shield, Palette, Globe, Type, Database, Info, FileJson, DownloadCloud, Trash2, ChevronDown, Radio, Server, LogOut, Music, Zap, ShieldAlert, Archive } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storageService, Setlist, ScoreData } from '../services/storageService';
import { getServerUrl, setServerUrl } from '../services/apiService';
import JSZip from 'jszip';
import { openDB } from 'idb';
import HelpManual from './HelpManual';

interface SettingsViewProps {
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
  onViewChange: (view: any) => void;
  onLogout: () => void;
}

export default function SettingsView({ isAdmin, setIsAdmin, onViewChange, onLogout }: SettingsViewProps) {
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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [serverUrl, setServerUrlInput] = useState(getServerUrl());
  const [isEditingServer, setIsEditingServer] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [adminModal, setAdminModal] = useState<'folders' | 'roles' | 'sync' | null>(null);
  const [isShowingManual, setIsShowingManual] = useState(false);
  
  // Real-time stats states
  const [scoreCount, setScoreCount] = useState<number>(0);
  const [totalStorage, setTotalStorage] = useState<string>('0MB');

  // States for the newly restored logic
  const [keepScreenOn, setKeepScreenOn] = useState(true);
  const [turnMode, setTurnMode] = useState('滑动');
  const [defaultBpm, setDefaultBpm] = useState(120);
  const [tickSound, setTickSound] = useState('电子');
  const [realtimePush, setRealtimePush] = useState(true);
  const [notifConfig, setNotifConfig] = useState<any>({ system: true, score: true, chat: false });

  useEffect(() => {
    if (userProfile?.avatar instanceof Blob) {
      const url = URL.createObjectURL(userProfile.avatar);
      setAvatarUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    setAvatarUrl(null);
  }, [userProfile?.avatar]);

  const handleUpdateServer = () => {
    if (!serverUrl.startsWith('http')) {
      return showMessage('请输入正确的地址 (以 http:// 开头)', 'error');
    }
    setServerUrl(serverUrl);
    showMessage('服务器地址已更新，正在重新连接...');
    setIsEditingServer(false);
  };

  useEffect(() => {
    const loadData = async () => {
      const meta = await storageService.getMetadata();
      setUserProfile(meta.profile);
      setSetlists(meta.setlists || []);
      setNotifications(meta.notifications || []);
      if (meta.pedalConfig) setPedalConfig(meta.pedalConfig);
      
      // Load restored preferences
      if (meta.theme) setTheme(meta.theme);
      if (meta.language) setLanguage(meta.language);
      if (meta.fontSize) setFontSize(meta.fontSize);
      if (meta.keepScreenOn !== undefined) setKeepScreenOn(meta.keepScreenOn);
      if (meta.turnMode) setTurnMode(meta.turnMode);
      if (meta.defaultBpm) setDefaultBpm(meta.defaultBpm);
      if (meta.tickSound) setTickSound(meta.tickSound);
      if (meta.realtimePush !== undefined) setRealtimePush(meta.realtimePush);
      if (meta.notifConfig) setNotifConfig(meta.notifConfig);

      // Calculate real-time stats
      const allScores = await storageService.getAllScores();
      setScoreCount(allScores.length);
      
      let bytes = 0;
      allScores.forEach(s => {
        if (s.blob) bytes += s.blob.size;
      });
      const mb = (bytes / (1024 * 1024)).toFixed(1);
      setTotalStorage(`${mb}MB`);
    };
    loadData();
  }, []);

  const updatePreference = async (key: string, value: any, setter: (v: any) => void) => {
    setter(value);
    await storageService.saveMetadata({ [key]: value });
  };

  const translateKey = (key: string) => {
    const map: Record<string, string> = {
      'ArrowRight': '右方向键',
      'ArrowLeft': '左方向键',
      'PageDown': '向下翻页键',
      'PageUp': '向上翻页键',
      'Space': '空格键',
      'Enter': '向后回车'
    };
    return map[key] || key;
  };

  const showMessage = (text: string, type: 'info' | 'error' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const markAllAsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    await storageService.saveMetadata({ notifications: updated });
  };

  const handleExport = async () => {
    setIsExporting(true);
    setExportProgress(0);
    
    try {
      const zip = new JSZip();
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const zipLabel = selectedSetlistId === 'all' ? '全库备份' : (setlists.find(s => s.id === selectedSetlistId)?.name || '节目单');
      const root = zip.folder(`Nocturne_Backup_${zipLabel}`);

      if (selectedSetlistId === 'all') {
        const allScores = await storageService.getAllScores();
        if (allScores.length === 0) throw new Error('库中暂无乐谱');
        
        for (let i = 0; i < allScores.length; i++) {
          const score = allScores[i];
          if (score.blob) {
            const folderPath = score.folder || '未分类';
            root?.folder(folderPath)?.file(`${score.title}.pdf`, score.blob);
          }
          setExportProgress(Math.round(((i + 0.1) / allScores.length) * 90));
        }
      } else {
        const setlist = setlists.find(s => s.id === selectedSetlistId);
        if (!setlist) throw new Error('未找到对应节目单');
        
        const setlistFolder = root?.folder(setlist.name);
        for (let i = 0; i < setlist.program.length; i++) {
          const scoreId = setlist.program[i];
          const score = await storageService.getScore(scoreId);
          if (score?.blob) {
            // 按声部标签分类归纳
            const partType = score.tags?.[0] || '通用声部';
            setlistFolder?.folder(partType)?.file(`${score.title}.pdf`, score.blob);
          }
          setExportProgress(Math.round(((i + 0.1) / setlist.program.length) * 90));
        }
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Nocturne_${zipLabel}_${timestamp}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      setExportProgress(100);
      setTimeout(() => {
        setIsExporting(false);
        showMessage('离线应急包 已成功打包下载');
      }, 500);
    } catch (err: any) {
      console.error('Export failed:', err);
      setIsExporting(false);
      showMessage(err.message || '打包导出失败', 'error');
    }
  };

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-4 sm:px-6 py-3 sm:py-4 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-3 sm:gap-4">
          <h1 className="text-lg sm:text-xl font-bold text-primary tracking-widest uppercase font-headline">系统设置</h1>
        </div>
        <div className="flex items-center gap-2 sm:gap-4">
          <button 
            onClick={() => setIsShowingNotifications(!isShowingNotifications)}
            className="p-1.5 sm:p-2 hover:bg-surface-container-high rounded-full text-primary transition-all relative"
          >
            <Bell className="w-5 h-5 sm:w-6 sm:h-6" />
            {notifications.filter(n => !n.read).length > 0 && <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-error rounded-full" />}
          </button>
          <div onClick={() => onViewChange('profile')} className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20 overflow-hidden cursor-pointer">
            {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : (userProfile?.name || '音')[0]}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 space-y-8">
        {/* Usage Stats Card */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: '库中乐谱', value: scoreCount.toString(), icon: StickyNote },
            { label: '云端同步', value: '100%', icon: RefreshCw },
            { label: '存储占用', value: totalStorage, icon: Database },
            { label: '系统状态', value: '良好', icon: Shield },
          ].map((stat, i) => (
            <div key={i} className="hardware-card p-4 flex flex-col items-center justify-center text-center">
              <stat.icon className="w-4 h-4 text-primary/40 mb-2" />
              <p className="text-lg font-headline font-bold text-on-background">{stat.value}</p>
              <p className="text-[9px] font-mono text-primary/60 uppercase tracking-tighter">{stat.label}</p>
            </div>
          ))}
        </section>

        {/* Profile Section */}
        <section className="hardware-card p-6 cursor-pointer" onClick={() => onViewChange('profile')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl border-2 border-primary/20 overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : (userProfile?.name || '音')[0]}
              </div>
              <div>
                <h2 className="text-2xl font-headline font-bold text-on-background">{userProfile?.name || '音乐家'}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setIsAdmin(!isAdmin); }}
                    className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all ${
                      isAdmin ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-background/40 hover:bg-primary/20 hover:text-primary'
                    }`}
                  >
                    {isAdmin ? '系统管理员' : '普通成员 (点击切权)'}
                  </button>
                  <span className="text-[10px] text-on-background/30 font-mono">UID: 890124</span>
                </div>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-primary" />
          </div>
        </section>

        {/* Preferences Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Palette className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
            <h2 className="font-headline font-bold text-xl uppercase tracking-tight">视觉与语言</h2>
          </div>
          <div className="hardware-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">Visual Theme</p>
                <p className="text-xs text-on-background/50">沉浸式视觉主题</p>
              </div>
              <div className="flex bg-background/50 rounded-xl p-1 border border-white/5">
                {(['dark', 'light', 'system'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => updatePreference('theme', t, setTheme)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      theme === t ? 'bg-primary text-on-primary' : 'text-on-background/40'
                    }`}
                  >
                    {t === 'dark' ? '深夜' : t === 'light' ? '明亮' : '自动'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">Interface Language</p>
                <p className="text-xs text-on-background/50">系统显示语言</p>
              </div>
              <div className="flex bg-background/50 rounded-xl p-1 border border-white/5">
                {(['zh', 'en'] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => updatePreference('language', l, setLanguage)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      language === l ? 'bg-primary text-on-primary' : 'text-on-background/40'
                    }`}
                  >
                    {l === 'zh' ? '中文' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">UI Density / Scaling</p>
                <p className="text-xs text-on-background/50">界面信息密度与缩放</p>
              </div>
              <div className="flex bg-background/50 rounded-xl p-1 border border-white/5">
                {(['small', 'medium', 'large'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => updatePreference('fontSize', s, setFontSize)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      fontSize === s ? 'bg-primary text-on-primary' : 'text-on-background/40'
                    }`}
                  >
                    {s === 'small' ? '紧凑' : s === 'medium' ? '标准' : '舒适'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Floating Notification Panel */}
        <AnimatePresence>
          {isShowingNotifications && (
            <motion.div 
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-20 right-4 sm:right-6 w-[calc(100%-32px)] sm:w-80 z-[100] hardware-card shadow-2xl p-0 overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="text-xs font-bold uppercase tracking-wider">系统通知日志</span>
                </div>
                <button onClick={() => setIsShowingNotifications(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-on-background/40">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {notifications.length === 0 ? (
                  <div className="py-12 text-center">
                    <History className="w-8 h-8 text-on-background/10 mx-auto mb-2" />
                    <p className="text-[10px] text-on-background/20 font-bold uppercase tracking-widest">暂无记录</p>
                  </div>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-3 bg-white/5 rounded-xl border border-white/5">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] font-bold text-primary uppercase tracking-tighter">{n.type === 'upload' ? '曲库更新' : n.type === 'request' ? '权限申请' : '系统通知'}</span>
                        <span className="text-[9px] text-on-background/20 font-mono">{new Date(n.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-xs font-bold text-on-background/80 mb-0.5">{n.title}</p>
                      <p className="text-[10px] text-on-background/40 line-clamp-2 leading-relaxed">{n.message}</p>
                    </div>
                  ))
                )}
              </div>
              {notifications.length > 0 && (
                <button 
                  onClick={markAllAsRead}
                  className="w-full py-3 bg-background/50 border-t border-white/5 text-[10px] font-bold text-primary uppercase tracking-widest hover:bg-primary/5 transition-all"
                >
                  标记全部已读
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Reader Preferences */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Type className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
            <h2 className="font-headline font-bold text-xl uppercase tracking-tight">阅谱习惯设置</h2>
          </div>
          <div className="hardware-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">Auto-Lock Prevention</p>
                <p className="text-xs text-on-background/50">阅谱模式下保持屏幕常亮</p>
              </div>
              <button 
                onClick={() => updatePreference('keepScreenOn', !keepScreenOn, setKeepScreenOn)}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${
                  keepScreenOn ? 'bg-primary shadow-[0_0_10px_rgba(137,172,255,0.3)]' : 'bg-white/10'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                  keepScreenOn ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">Page Turning Animation</p>
                <p className="text-xs text-on-background/50">翻页时的过渡效果</p>
              </div>
              <div className="flex bg-background/50 rounded-xl p-1 border border-white/5">
                {['无', '滑动', '翻书'].map((mode) => (
                  <button
                    key={mode}
                    onClick={() => updatePreference('turnMode', mode, setTurnMode)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      turnMode === mode ? 'bg-primary text-on-primary' : 'text-on-background/40'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Metronome Settings */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Music className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
            <h2 className="font-headline font-bold text-xl uppercase tracking-tight">节拍器预设</h2>
          </div>
          <div className="hardware-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">Default Tempo</p>
                <p className="text-xs text-on-background/50">新乐谱的默认起始速度</p>
              </div>
              <div className="flex items-center gap-3">
                <input 
                  type="range" 
                  className="w-32 accent-primary" 
                  value={defaultBpm}
                  onChange={(e) => updatePreference('defaultBpm', parseInt(e.target.value), setDefaultBpm)} 
                  min={40} 
                  max={220} 
                />
                <span className="text-[10px] font-mono text-primary font-bold">{defaultBpm} BPM</span>
              </div>
            </div>

            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">节拍器音色 (音色)</p>
                <p className="text-xs text-on-background/50">打击声音源选择</p>
              </div>
              <div className="flex bg-background/50 rounded-xl p-1 border border-white/5">
                {['电子', '木鱼', '重音'].map((sound) => (
                  <button
                    key={sound}
                    onClick={() => updatePreference('tickSound', sound, setTickSound)}
                    className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${
                      tickSound === sound ? 'bg-primary text-on-primary' : 'text-on-background/40'
                    }`}
                  >
                    {sound}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Hardware Interface Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Activity className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
            <h2 className="font-headline font-bold text-xl uppercase tracking-tight">硬件接口控制</h2>
          </div>
          <div className="hardware-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">蓝牙踏板同步 (踏板)</p>
                <p className="text-xs text-on-background/50">控制蓝牙翻页踏板的响应状态</p>
              </div>
              <button 
                onClick={() => setPedalConfig({ ...pedalConfig, enabled: !pedalConfig.enabled })}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${
                  pedalConfig.enabled ? 'bg-primary shadow-[0_0_10px_rgba(137,172,255,0.3)]' : 'bg-white/10'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                  pedalConfig.enabled ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-background/40 p-4 rounded-xl border border-white/5 group hover:border-primary/20 transition-all">
                <p className="text-[10px] font-mono text-primary/50 uppercase tracking-widest mb-2">下一页映射 (后翻)</p>
                <div className="flex flex-wrap gap-2">
                  {pedalConfig?.nextPageKeys.map((key: string) => (
                    <span key={key} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-mono">
                      {translateKey(key)}
                    </span>
                  ))}
                  <button className="px-2 py-0.5 border border-white/10 rounded text-[10px] text-on-background/30 hover:border-primary/30 hover:text-primary transition-all">
                    + 添加
                  </button>
                </div>
              </div>
              <div className="bg-background/40 p-4 rounded-xl border border-white/5 group hover:border-primary/20 transition-all">
                <p className="text-[10px] font-mono text-primary/50 uppercase tracking-widest mb-2">上一页映射 (前翻)</p>
                <div className="flex flex-wrap gap-2">
                  {pedalConfig?.prevPageKeys.map((key: string) => (
                    <span key={key} className="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded text-[10px] font-mono">
                      {translateKey(key)}
                    </span>
                  ))}
                  <button className="px-2 py-0.5 border border-white/10 rounded text-[10px] text-on-background/30 hover:border-primary/30 hover:text-primary transition-all">
                    + 添加
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Administration Section (Only for Admin) */}
        {isAdmin && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Shield className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
              <h2 className="font-headline font-bold text-xl uppercase tracking-tight">管理员控制台</h2>
            </div>
            <div className="hardware-card overflow-hidden">
              <button 
                onClick={() => setAdminModal('folders')}
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 border-b border-white/5 group transition-colors"
              >
                <div className="flex items-center gap-4">
                  <FolderArchive className="w-5 h-5 text-on-background/40 group-hover:text-primary transition-colors" />
                  <div className="text-left">
                    <p className="text-sm font-bold uppercase tracking-wide">曲库分类管理</p>
                    <p className="text-[10px] text-on-background/30">管理文件夹、标签和默认声部配置</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-on-background/20" />
              </button>
              
              <button 
                onClick={() => setAdminModal('roles')}
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 border-b border-white/5 group transition-colors"
              >
                <div className="flex items-center gap-4">
                  <UserCheck className="w-5 h-5 text-on-background/40 group-hover:text-primary transition-colors" />
                  <div className="text-left">
                    <p className="text-sm font-bold uppercase tracking-wide">成员角色审计</p>
                    <p className="text-[10px] text-on-background/30">审核乐团成员的升权申请与权限配额</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-on-background/20" />
              </button>

              <button 
                onClick={() => setAdminModal('sync')}
                className="w-full flex items-center justify-between p-5 hover:bg-white/5 group transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Network className="w-5 h-5 text-on-background/40 group-hover:text-primary transition-colors" />
                  <div className="text-left">
                    <p className="text-sm font-bold uppercase tracking-wide">多端同步策略</p>
                    <p className="text-[10px] text-on-background/30">配置主控台推送协议与延迟缓冲阈值</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-on-background/20" />
              </button>
            </div>
          </section>
        )}

        {/* Sync & Groups Hub */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Users className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
            <h2 className="font-headline font-bold text-xl uppercase tracking-tight">乐团与同步中心</h2>
          </div>
          <div className="hardware-card p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">当前活跃组群 (活跃)</p>
                <p className="text-xs text-on-background/50">当前加入且活跃的排练群组</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-lg">爱乐乐团-弦乐组</span>
                <button onClick={() => onViewChange('sync')} className="text-xs font-bold text-primary underline">切换</button>
              </div>
            </div>
            
            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">同步推送状态 (Sync)</p>
                <p className="text-xs text-on-background/50">接收来自指挥或首席的实时翻页指令</p>
              </div>
              <button 
                onClick={() => updatePreference('realtimePush', !realtimePush, setRealtimePush)}
                className={`w-12 h-6 rounded-full relative transition-all duration-300 ${
                  realtimePush ? 'bg-primary shadow-[0_0_10px_rgba(137,172,255,0.3)]' : 'bg-white/10'
                }`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${
                  realtimePush ? 'right-1' : 'left-1'
                }`} />
              </button>
            </div>
          </div>
        </section>

        {/* Global Notifications Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Bell className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
            <h2 className="font-headline font-bold text-xl uppercase tracking-tight">通知中心配置</h2>
          </div>
          <div className="hardware-card p-6 space-y-6">
            {[
              { id: 'system', label: '系统广播与公告', desc: '接收服务器维护、版本更新及重要系统提示', checked: notifConfig.system },
              { id: 'score', label: '乐谱分发提醒', warn: true, desc: '当有人为您分配了新的声部乐谱时发送通知', checked: notifConfig.score },
              { id: 'chat', label: '排练聊天室消息', desc: '接收已加入群组的实时对话提醒', checked: notifConfig.chat },
            ].map((n, i) => (
              <div key={n.id} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-on-background/80 mb-1">{n.label}</p>
                    <p className="text-[10px] text-on-background/40 max-w-[200px] leading-relaxed">{n.desc}</p>
                  </div>
                  <button 
                    onClick={() => updatePreference('notifConfig', { ...notifConfig, [n.id]: !n.checked }, setNotifConfig)}
                    className={`w-10 h-5 rounded-full relative transition-all ${n.checked ? 'bg-primary' : 'bg-white/10'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${n.checked ? 'right-0.5' : 'left-0.5'}`} />
                  </button>
                </div>
                {i < 2 && <div className="h-px bg-white/5" />}
              </div>
            ))}
          </div>
        </section>

        {/* Data Management */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <ShieldAlert className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
            <h2 className="font-headline font-bold text-xl uppercase tracking-tight">演出应急与数据安全</h2>
          </div>
          <div className="hardware-card p-6 space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="mono-label mb-1">Emergency Offline Backup</p>
                  <p className="text-xs text-on-background/50">导出分声部归纳的乐谱压缩包，以防演出意外</p>
                </div>
                <div className="flex items-center gap-2">
                  <select 
                    value={selectedSetlistId}
                    onChange={(e) => setSelectedSetlistId(e.target.value)}
                    className="bg-background border border-white/10 rounded-lg px-3 py-1.5 text-[10px] font-bold outline-none focus:border-primary/50 transition-all cursor-pointer"
                  >
                    <option value="all">全库导出 (按文件夹归类)</option>
                    {setlists.map(s => (
                      <option key={s.id} value={s.id}>{s.name} (按声部归类)</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleExport}
                    disabled={isExporting}
                    className="flex items-center gap-2 px-5 py-1.5 bg-primary text-on-primary rounded-xl text-xs font-bold hover:brightness-110 disabled:opacity-50 shadow-lg shadow-primary/20"
                  >
                    {isExporting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Archive className="w-4 h-4" />}
                    {isExporting ? `${exportProgress}%` : '打包下载'}
                  </button>
                </div>
              </div>
              <div className="p-4 bg-primary/5 rounded-xl border border-primary/10">
                <p className="text-[10px] text-primary/70 leading-relaxed font-medium">
                  💡 <span className="font-bold">方案说明：</span>系统将根据您的选择，自动抓取乐谱文件并生成标准 ZIP 压缩包。
                  {selectedSetlistId === 'all' 
                    ? ' 全库模式将按照您在“曲库”中设置的文件夹结构进行整理。' 
                    : ' 节目单模式将严格按照乐谱的“声部标签”进行自动归放。'}
                </p>
              </div>
            </div>
            
            <div className="h-px bg-white/5" />

            <div className="flex items-center justify-between p-4 bg-error/5 rounded-xl border border-error/10">
              <div>
                <p className="text-xs font-bold text-error mb-1 uppercase tracking-wider">Storage Purge</p>
                <p className="text-[10px] text-error/60 leading-relaxed">删除所有本地缓存的乐谱和用户元数据。此操作不可逆。</p>
              </div>
              <button 
                onClick={async () => {
                  if (confirm('确定要清除所有本地数据吗？此操作将导致所有已下载乐谱和标注丢失。')) {
                    const db = await (openDB as any)('nocturne-db', 3);
                    const tx = db.transaction(['scores', 'metadata'], 'readwrite');
                    await tx.objectStore('scores').clear();
                    await tx.objectStore('metadata').clear();
                    await tx.done;
                    showMessage('本地存储已清空，正在重启应用...');
                    setTimeout(() => window.location.reload(), 2000);
                  }
                }}
                className="px-4 py-2 border border-error/30 text-error rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-error/10 transition-all font-mono"
              >
                清除本地缓存
              </button>
            </div>
          </div>
        </section>

        {/* Nocturne Lab (1.1.0 Style) */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Zap className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
            <h2 className="font-headline font-bold text-xl uppercase tracking-tight">Nocturne 实战实验室</h2>
          </div>
          <div className="hardware-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">AI Score Analysis</p>
                <p className="text-xs text-on-background/50">实验性：使用 AI 自动识别乐谱速度和调性</p>
              </div>
              <span className="text-[9px] font-bold text-primary/40 uppercase tracking-widest border border-primary/20 px-2 py-0.5 rounded">Beta</span>
            </div>
            <div className="h-px bg-white/5" />
            <div className="flex items-center justify-between">
              <div>
                <p className="mono-label mb-1">Ultra-Low Latency Mode</p>
                <p className="text-xs text-on-background/50">实验性：为排练同步优化的极低延迟网络协议</p>
              </div>
              <div className="flex bg-background/50 rounded-xl p-1 border border-white/5">
                <button className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase bg-primary text-on-primary">开启</button>
                <button className="px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase text-on-background/40">关闭</button>
              </div>
            </div>
          </div>
        </section>

        {/* About & Support */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Info className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
            <h2 className="font-headline font-bold text-xl uppercase tracking-tight">关于与支持</h2>
          </div>
          <div className="hardware-card overflow-hidden">
            <div className="p-5 border-b border-white/5 flex items-center justify-between transition-colors active:bg-white/5" onClick={() => {
              const newCount = tapCount + 1;
              setTapCount(newCount);
              if (newCount >= 7) {
                setIsEditingServer(true);
                showMessage('开发者模式：基础设施控制已启用');
                setTapCount(0);
              }
            }}>
              <div className="flex items-center gap-4">
                <FileJson className="w-5 h-5 text-on-background/30" />
                <p className="text-sm font-bold opacity-80">当前版本</p>
              </div>
              <p className="text-xs font-mono text-primary select-none">v1.2.3-Stable (Pro)</p>
            </div>
            <div 
              onClick={() => setIsShowingManual(true)}
              className="p-5 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors"
            >
              <div className="flex items-center gap-4">
                <Globe className="w-5 h-5 text-on-background/30" />
                <p className="text-sm font-bold opacity-80">官方网站 / 帮助手册</p>
              </div>
              <ChevronRight className="w-4 h-4 text-on-background/10" />
            </div>
            <div className="p-5 border-b border-white/5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors">
              <div className="flex items-center gap-4">
                <Shield className="w-5 h-5 text-on-background/30" />
                <p className="text-sm font-bold opacity-80">隐私协议与数据条款</p>
              </div>
              <ChevronRight className="w-4 h-4 text-on-background/10" />
            </div>
            <div className="p-5 flex flex-col items-center justify-center text-center py-8 space-y-2">
               <p className="text-[10px] text-on-background/20 font-bold tracking-widest uppercase mb-1">Designed by</p>
               <h3 className="text-lg font-headline font-black text-primary tracking-tighter shadow-sm">DXTHUO STUDIO</h3>
               <p className="text-[9px] text-on-background/20 leading-relaxed max-w-[240px]">为乐界打造极致的同步阅谱体验</p>
            </div>
          </div>
        </section>

        {/* Hidden Developer Mode: Server Config */}
        {isEditingServer && (
          <section className="space-y-4">
            <div className="flex items-center gap-3">
              <Server className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
              <h2 className="font-headline font-bold text-xl uppercase tracking-tight">开发者选项</h2>
            </div>
            <div className="hardware-card p-6 space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="mono-label mb-1">Server Interface Override</p>
                  <p className="text-xs text-on-background/50">强制覆盖后端服务接入点</p>
                </div>
              </div>
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={serverUrl}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  className="flex-1 bg-background border border-primary/30 rounded-xl px-4 py-2 text-sm font-mono focus:border-primary focus:outline-none transition-all"
                />
                <button onClick={handleUpdateServer} className="bg-primary text-on-primary px-4 py-2 rounded-xl text-xs font-bold hover:brightness-110">应用并重启</button>
                <button onClick={() => setIsEditingServer(false)} className="bg-surface-container text-on-background/50 px-4 py-2 rounded-xl text-xs font-bold">关闭</button>
              </div>
            </div>
          </section>
        )}

        {/* Logout and Version */}
        <div className="pt-8 space-y-8">
          <button 
            onClick={onLogout}
            className="w-full p-5 bg-error/5 text-error border border-error/20 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-error/10 transition-all active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5" />
            安全退出系统
          </button>

          <div className="text-center py-4">
            <div className="inline-block px-4 py-1.5 rounded-full border border-white/5 bg-surface-bright mb-2">
              <p className="text-[10px] font-mono font-bold text-primary tracking-[0.4em] uppercase">
                NOCTURNE SYNC
              </p>
            </div>
            <p className="text-[9px] font-mono text-on-background/20 uppercase tracking-widest">
              Build v1.2.3 • Professional Grade
            </p>
          </div>
        </div>
      </main>

      {/* Admin Modals */}
      <AnimatePresence>
        {adminModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6 shadow-2xl">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setAdminModal(null)}
              className="absolute inset-0 bg-background/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg hardware-card p-0 overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
                <h3 className="font-headline font-bold text-lg uppercase tracking-tight flex items-center gap-2">
                  {adminModal === 'folders' && <><FolderArchive className="w-5 h-5 text-primary" /> 曲库分类管理</>}
                  {adminModal === 'roles' && <><UserCheck className="w-5 h-5 text-primary" /> 成员角色审计</>}
                  {adminModal === 'sync' && <><Network className="w-5 h-5 text-primary" /> 多端同步策略</>}
                </h3>
                <button onClick={() => setAdminModal(null)} className="p-2 hover:bg-white/10 rounded-full text-on-background/40 transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-8 space-y-6">
                {adminModal === 'folders' && (
                  <div className="space-y-4">
                    <p className="text-xs text-on-background/60 text-center leading-relaxed">正在同步文件夹层级结构与声部标签数据库...</p>
                    <div className="space-y-2">
                      {['第一小提琴', '第二小提琴', '中提琴', '大提琴', '低音提琴'].map(part => (
                        <div key={part} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                          <span className="text-xs font-bold">{part}</span>
                          <span className="text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded cursor-pointer">配置标签</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {adminModal === 'roles' && (
                  <div className="text-center py-8 space-y-4">
                    <UserCheck className="w-12 h-12 text-primary/20 mx-auto" />
                    <p className="text-xs text-on-background/40">当前暂无待处理的升权申请</p>
                    <button className="px-6 py-2 bg-primary/10 text-primary rounded-xl text-xs font-bold border border-primary/20">查看所有已授权成员</button>
                  </div>
                )}
                {adminModal === 'sync' && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <p className="mono-label">推流协议延迟阈值</p>
                      <input type="range" className="w-full accent-primary" min={50} max={1000} defaultValue={200} />
                      <div className="flex justify-between text-[10px] text-on-background/40 font-mono">
                        <span>50ms (极低延迟)</span>
                        <span>1000ms (强力缓冲)</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold opacity-80">启用集群心跳同步</p>
                      <button className="w-10 h-5 rounded-full bg-primary relative"><div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full" /></button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-background/50 border-t border-white/5 flex gap-3">
                <button 
                  onClick={() => {
                    showMessage('设置已保存并同步至服务器');
                    setAdminModal(null);
                  }}
                  className="flex-1 py-3 bg-primary text-on-primary rounded-xl text-xs font-bold hover:brightness-110 shadow-lg shadow-primary/20"
                >
                  保存更改
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {message && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-primary text-on-primary rounded-2xl shadow-2xl">
          <span className="font-bold text-sm">{message.text}</span>
        </div>
      )}

      {/* Help Manual Overlay */}
      <AnimatePresence>
        {isShowingManual && (
          <HelpManual onClose={() => setIsShowingManual(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
