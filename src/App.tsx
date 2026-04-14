/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LibraryView from './components/LibraryView';
import SetlistView from './components/SetlistView';
import SyncView from './components/SyncView';
import SettingsView from './components/SettingsView';
import ReaderView from './components/ReaderView';
import BottomNav from './components/BottomNav';
import ProfileView from './components/ProfileView';

import RecentPerformancesView from './components/RecentPerformancesView';
import { storageService } from './services/storageService';

export type View = 'library' | 'setlist' | 'sync' | 'settings' | 'reader' | 'recent' | 'profile';

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
      const meta = await storageService.getMetadata();
      setIsAdmin(meta.userRole === 'admin' || meta.userRole === 'sub-admin');
      setUserProfile(meta.profile);
    };
    loadInitial();
  }, []);

  const handleSetIsAdmin = async (val: boolean) => {
    setIsAdmin(val);
    await storageService.saveMetadata({ userRole: val ? 'admin' : 'member' });
    // Notify other components via BroadcastChannel if needed, 
    // but SyncView already listens to metadata or initialIsAdmin
  };

  useEffect(() => {
    const channel = new BroadcastChannel('nocturne-sync');
    channel.onmessage = (event) => {
      const { type, data } = event.data;
      if (type === 'PUSH_SCORE' && !isAdmin) {
        handleOpenScore(data.scoreId, true);
      }
    };
    return () => channel.close();
  }, [isAdmin]);

  return (
    <div className="min-h-screen bg-background text-on-background font-body flex flex-col overflow-hidden">
      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
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
