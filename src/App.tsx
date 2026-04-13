/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import LibraryView from './components/LibraryView';
import SetlistView from './components/SetlistView';
import SyncView from './components/SyncView';
import SettingsView from './components/SettingsView';
import ReaderView from './components/ReaderView';
import BottomNav from './components/BottomNav';

export type View = 'library' | 'setlist' | 'sync' | 'settings' | 'reader';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('library');
  const [selectedScore, setSelectedScore] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(true);

  const handleOpenScore = (scoreId: string) => {
    setSelectedScore(scoreId);
    setCurrentView('reader');
  };

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
                setIsAdmin={setIsAdmin} 
                onViewChange={setCurrentView}
              />
            )}
            {currentView === 'setlist' && <SetlistView onOpenScore={handleOpenScore} />}
            {currentView === 'sync' && <SyncView />}
            {currentView === 'settings' && (
              <SettingsView 
                isAdmin={isAdmin} 
                setIsAdmin={setIsAdmin} 
              />
            )}
            {currentView === 'reader' && (
              <ReaderView 
                onBack={() => setCurrentView('library')} 
                scoreId={selectedScore}
                isAdmin={isAdmin}
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
