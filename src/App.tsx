import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Device } from '@capacitor/device';
import { SplashScreen } from '@capacitor/splash-screen';

// 引入各个视图组件
import LibraryView from './components/LibraryView'; // 乐谱库
import SetlistView from './components/SetlistView'; // 节目单
import SyncView from './components/SyncView';       // 同步/排练大厅
import SettingsView from './components/SettingsView'; // 设置
import ReaderView from './components/ReaderView';     // 乐谱阅读器
import BottomNav from './components/BottomNav';       // 底部导航栏
import ProfileView from './components/ProfileView';   // 个人中心
import AuthView from './components/AuthView';         // 登录注册
import RecentPerformancesView from './components/RecentPerformancesView'; // 最近演出记录
import { IconSelectionView } from './components/IconSelectionView'; // 图标选择

// 引入服务层
import { apiService } from './services/apiService';
import { storageService } from './services/storageService';
import { ErrorBoundary } from './components/ErrorBoundary';

// 定义可能的视图类型
export type View = 'library' | 'setlist' | 'sync' | 'settings' | 'reader' | 'recent' | 'profile' | 'auth' | 'icons';

/**
 * 应用主入口组件
 */
export default function App() {
  // --- 状态管理 ---
  const [currentView, setCurrentView] = useState<View>('library'); // 当前显示的页面
  const [previousView, setPreviousView] = useState<View>('library'); // 记录上一个页面，用于“返回”功能
  const [selectedScore, setSelectedScore] = useState<string | null>(null); // 当前选中的乐谱 ID
  const [isAdmin, setIsAdmin] = useState(true); // 是否为管理员权限
  const [isPerformanceMode, setIsPerformanceMode] = useState(false); // 是否处于正式演出模式（全屏、屏蔽干扰）
  const [userProfile, setUserProfile] = useState<any>(null); // 当前登录的用户信息

  /**
   * 打开乐谱阅读器
   * @param scoreId 乐谱 ID
   * @param performance 是否开启演出模式
   */
  const handleOpenScore = (scoreId: string, performance: boolean = false) => {
    setPreviousView(currentView);
    setSelectedScore(scoreId);
    setIsPerformanceMode(performance);
    setCurrentView('reader');
  };

  /**
   * 【核心初始化逻辑】
   * 1. 判断登录状态
   * 2. 从 NAS 云端同步最新的用户配置（角色、分组等）
   * 3. 初始化移动端特定功能（状态栏、启动屏）
   */
  useEffect(() => {
    const loadInitial = async () => {
      const isLoggedIn = !!localStorage.getItem('nocturne_token');
      let meta = await storageService.getMetadata();

      if (isLoggedIn) {
        try {
          // 定义需要从云端强制同步的键名
          const keys = ['folders', 'roles', 'partTags', 'userRole', 'profile', 'brandIcon'] as const;
          for (const key of keys) {
            try {
              const cloudVal = await apiService.metadata.get(key);
              if (cloudVal) {
                // 将云端同步下来的数据保存到本地
                await storageService.saveMetadata({ [key]: cloudVal } as any);
              }
            } catch (syncErr) {
              console.warn(`云端同步失败: ${key}`, syncErr);
            }
          }
          // 同步完后重新加载本地元数据更新 UI
          meta = await storageService.getMetadata();
        } catch (err) {
          console.error('元数据全量同步失败:', err);
        }
      }

      // 设置全局权限标志
      setIsAdmin(meta.userRole === 'admin' || meta.userRole === 'sub-admin');
      setUserProfile(meta.profile);

      // --- Capacitor (移动端) 初始化 ---
      try {
        const info = await Device.getInfo();
        if (info.platform !== 'web') {
          // 如果在手机/平板运行，设置状态栏颜色
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#040a2f' });
          await SplashScreen.hide(); // 隐藏启动图
        }
      } catch (e) {
        // 在浏览器运行会报警告，属于正常现象
      }
    };
    loadInitial();
  }, []);

  /**
   * 设置管理员权限并持久化
   */
  const handleSetIsAdmin = async (val: boolean) => {
    setIsAdmin(val);
    await storageService.saveMetadata({ userRole: val ? 'admin' : 'member' });
  };

  /**
   * 退出登录逻辑
   */
  const handleLogout = async () => {
    setUserProfile(null);
    localStorage.removeItem('nocturne_token');
    await storageService.saveMetadata({ profile: null as any });
    setCurrentView('library');
  };

  /**
   * 【实时同步监听】
   * 监听来自广播通道的消息。例如：管理员在主控台上点击“推送乐谱”，
   * 成员的设备会自动强制跳转到该乐谱。
   */
  useEffect(() => {
    const channel = new BroadcastChannel('nocturne-sync');
    channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'PUSH_SCORE' && !isAdmin) {
        console.log('收到强制推送乐谱:', data.scoreId);
        handleOpenScore(data.scoreId, true);
      }
    };
    return () => channel.close();
  }, [isAdmin]);

  return (
    <div className="min-h-screen bg-background text-white font-sans flex flex-col overflow-hidden">
      {/* 主视图区域：带过场动画 */}
      <main className="flex-1 relative overflow-hidden">
        <ErrorBoundary>
          <AnimatePresence mode="wait">
            <motion.div
            key={currentView}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="h-full w-full overflow-y-auto custom-scrollbar"
          >
            {currentView === 'library' && (
              <LibraryView 
                onOpenScore={handleOpenScore} 
                isAdmin={isAdmin} 
                setIsAdmin={handleSetIsAdmin} 
                onViewChange={setCurrentView}
              />
            )}
            {currentView === 'setlist' && <SetlistView onOpenScore={handleOpenScore} isAdmin={isAdmin} onViewChange={setCurrentView} />}
            {currentView === 'recent' && (
              <RecentPerformancesView 
                onOpenSetlist={() => setCurrentView('setlist')} 
                onBack={() => setCurrentView('setlist')}
              />
            )}
            {currentView === 'sync' && <SyncView onViewChange={setCurrentView} isAdmin={isAdmin} />}
            {currentView === 'profile' && (
              <ProfileView 
                onBack={() => setCurrentView(previousView)} 
                onViewChange={setCurrentView} 
                userProfile={userProfile}
                onLogout={handleLogout}
              />
            )}
            {currentView === 'auth' && (
              <AuthView 
                onBack={() => setCurrentView(previousView)}
                onSuccess={async (user) => {
                  setUserProfile(user);
                  await storageService.saveMetadata({ profile: user });
                  setCurrentView('profile');
                }}
              />
            )}
            {currentView === 'settings' && (
              <SettingsView 
                isAdmin={isAdmin} 
                setIsAdmin={handleSetIsAdmin} 
                onViewChange={setCurrentView}
                onLogout={handleLogout}
              />
            )}
            {currentView === 'icons' && (
              <IconSelectionView onBack={() => setCurrentView('settings')} />
            )}
            {currentView === 'reader' && (
              <ReaderView 
                onBack={() => {
                  setCurrentView(previousView);
                  setIsPerformanceMode(false);
                }} 
                scoreId={selectedScore}
                isAdmin={isAdmin}
                onNavigateScore={(id) => setSelectedScore(id)}
                initialFullscreen={isPerformanceMode}
              />
            )}
          </motion.div>
        </AnimatePresence>
       </ErrorBoundary>
      </main>

      {/* 底部导航栏（在阅读模式下隐藏，给乐谱留出最大空间） */}
      {currentView !== 'reader' && (
        <BottomNav currentView={currentView} onViewChange={setCurrentView} />
      )}
    </div>
  );
}
