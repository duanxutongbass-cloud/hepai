import { Menu, Bell, Settings, Network, StickyNote, FolderArchive, History, BarChart, Activity, User, RefreshCw, UserCheck, Users, CheckCircle2, AlertCircle, CheckCircle, X, ChevronRight, Shield, Palette, Globe, Type, Database, Info, FileJson, DownloadCloud, Trash2, ChevronDown, Radio, Server, LogOut } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { storageService, Setlist } from '../services/storageService';
import { getServerUrl, setServerUrl } from '../services/apiService';

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
    };
    loadData();
  }, []);

  const showMessage = (text: string, type: 'info' | 'error' = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3000);
  };

  const markAllAsRead = async () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    await storageService.saveMetadata({ notifications: updated });
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
        {/* Profile Section */}
        <section className="hardware-card p-6 cursor-pointer" onClick={() => onViewChange('profile')}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-bold text-3xl border-2 border-primary/20 overflow-hidden">
                {avatarUrl ? <img src={avatarUrl} className="w-full h-full object-cover" /> : (userProfile?.name || '音')[0]}
              </div>
              <div>
                <h2 className="text-2xl font-headline font-bold text-on-background">{userProfile?.name || '音乐家'}</h2>
                <span className="px-3 py-1 bg-primary text-on-primary rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {isAdmin ? '系统管理员' : '普通成员'}
                </span>
              </div>
            </div>
            <ChevronRight className="w-6 h-6 text-primary" />
          </div>
        </section>

        {/* Server Config */}
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <Server className="text-primary w-5 h-5 shadow-[0_0_10px_rgba(137,172,255,0.4)]" />
            <h2 className="font-headline font-bold text-xl uppercase tracking-tight">基础设施控制</h2>
          </div>
          <div className="hardware-card p-6 space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="mono-label mb-1">Server Interface</p>
                <p className="text-xs text-on-background/50">当前后端服务接入点</p>
              </div>
            </div>
            {isEditingServer ? (
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={serverUrl}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  className="flex-1 bg-background border border-primary/30 rounded-xl px-4 py-2 text-sm font-mono focus:border-primary focus:outline-none transition-all"
                />
                <button onClick={handleUpdateServer} className="bg-primary text-on-primary px-4 py-2 rounded-xl text-xs font-bold hover:brightness-110">保存</button>
                <button onClick={() => setIsEditingServer(false)} className="bg-surface-container text-on-background/50 px-4 py-2 rounded-xl text-xs font-bold">取消</button>
              </div>
            ) : (
              <div className="flex items-center justify-between p-4 bg-background/50 rounded-xl border border-white/5 group">
                <code className="text-xs text-primary font-mono tracking-wider">{getServerUrl() || '自动识别'}</code>
                <button onClick={() => setIsEditingServer(true)} className="text-primary font-bold text-[10px] uppercase tracking-widest hover:underline">
                  调整
                </button>
              </div>
            )}
          </div>
        </section>

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
              Build v1.2.1 • Professional Grade
            </p>
          </div>
        </div>
      </main>

      {/* Toast */}
      {message && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[200] px-6 py-3 bg-primary text-on-primary rounded-2xl shadow-2xl">
          <span className="font-bold text-sm">{message.text}</span>
        </div>
      )}
    </div>
  );
}
