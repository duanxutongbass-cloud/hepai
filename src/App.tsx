/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Device } from '@capacitor/device';
import { SplashScreen } from '@capacitor/splash-screen';
import LibraryView from './components/LibraryView';
import SetlistView from './components/SetlistView';
import SyncView from './components/SyncView';
import SettingsView from './components/SettingsView';
import ReaderView from './components/ReaderView';
import BottomNav from './components/BottomNav';
import ProfileView from './components/ProfileView';
import AuthView from './components/AuthView';
import { apiService } from './services/apiService';

import RecentPerformancesView from './components/RecentPerformancesView';
import { storageService } from './services/storageService';

export type View = 'library' | 'setlist' | 'sync' | 'settings' | 'reader' | 'recent' | 'profile' | 'auth';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('library');
  const [previousView, setPreviousView] = useState<View>('library');
  const [selectedScore, setSelectedScore] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);
  const [isPerformanceMode, setIsPerformanceMode] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const handleOpenScore = (scoreId: string, performance: boolean = false) => {
    setPreviousView(currentView);
    setSelectedScore(scoreId);
    setIsPerformanceMode(performance);
    setCurrentView('reader');
  };

  useEffect(() => {
    const loadInitial = async () => {
      const isLoggedIn = !!localStorage.getItem('nocturne_token');
      let meta = await storageService.getMetadata();

      if (isLoggedIn) {
        try {
          // Sync some core keys from cloud
          const keys = ['folders', 'roles', 'partTags', 'userRole', 'profile'] as const;
          for (const key of keys) {
            try {
              const cloudVal = await apiService.metadata.get(key);
              if (cloudVal) {
                await storageService.saveMetadata({ [key]: cloudVal } as any);
              }
            } catch (syncErr) {
              console.warn(`Failed to sync metadata key: ${key}`, syncErr);
            }
          }
          // Reload local meta
          meta = await storageService.getMetadata();
        } catch (err) {
          console.error('Failed to sync cloud metadata:', err);
        }
      }

      setIsAdmin(meta.userRole === 'admin' || meta.userRole === 'sub-admin');
      setUserProfile(meta.profile);

      // Capacitor Initialization
      try {
        const info = await Device.getInfo();
        if (info.platform !== 'web') {
          await StatusBar.setStyle({ style: Style.Dark });
          await StatusBar.setBackgroundColor({ color: '#040a2f' });
          await SplashScreen.hide();
        }
      } catch (e) {
        console.warn('Capacitor not available:', e);
      }
    };
    loadInitial();
  }, []);

  const handleSetIsAdmin = async (val: boolean) => {
    setIsAdmin(val);
    await storageService.saveMetadata({ userRole: val ? 'admin' : 'member' });
  };

  const handleLogout = async () => {
    console.log('Logging out...');
    setUserProfile(null);
    await storageService.saveMetadata({ profile: null as any });
    setCurrentView('library');
  };

  useEffect(() => {
    const channel = new BroadcastChannel('nocturne-sync');
    channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'PUSH_SCORE' && !isAdmin) {
        console.log('Received pushed score:', data.scoreId);
        handleOpenScore(data.scoreId, true);
      }
    };
    return () => channel.close();
  }, [isAdmin]);

  return (
    <div className="min-h-screen bg-background text-white font-sans flex flex-col overflow-hidden">
      <main className="flex-1 relative overflow-hidden">
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
                onOpenSetlist={(id) => {
                  setCurrentView('setlist');
                }} 
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
                  console.log('Login success, updating profile...', user);
                  setUserProfile(user);
                  await storageService.saveMetadata({ profile: user });
                  console.log('Metadata saved, switching to profile view');
                  setCurrentView('profile');
                }}
              />
            )}
            {currentView === 'settings' && (
              <SettingsView 
                isAdmin={isAdmin} 
                setIsAdmin={handleSetIsAdmin} 
                onViewChange={setCurrentView}
              />
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
      </main>

      {currentView !== 'reader' && (
        <BottomNav currentView={currentView} onViewChange={setCurrentView} />
      )}
    </div>
  );
}
