import { Library, ListMusic, RefreshCw, Settings } from 'lucide-react';
import { View } from '../App';
import { useState, useEffect } from 'react';
import { storageService } from '../services/storageService';

interface BottomNavProps {
  currentView: View;
  onViewChange: (view: View) => void;
}

export default function BottomNav({ currentView, onViewChange }: BottomNavProps) {
  const [hasUnreadChat, setHasUnreadChat] = useState(false);

  useEffect(() => {
    const channel = new BroadcastChannel('nocturne-sync');
    channel.onmessage = (event) => {
      if (event.data.type === 'CHAT_MESSAGE' && currentView !== 'sync') {
        setHasUnreadChat(true);
      }
    };
    return () => channel.close();
  }, [currentView]);

  useEffect(() => {
    if (currentView === 'sync') setHasUnreadChat(false);
  }, [currentView]);

  const navItems = [
    { id: 'library', label: '乐谱库', icon: Library },
    { id: 'setlist', label: '节目单', icon: ListMusic },
    { id: 'sync', label: '同步', icon: RefreshCw, hasBadge: hasUnreadChat },
    { id: 'settings', label: '设置', icon: Settings },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-4 pb-4 sm:pb-6 pt-2 bg-background/90 backdrop-blur-xl border-t border-outline-variant/15 shadow-[0_-4px_24px_-4px_rgba(0,0,0,0.12)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            className={`flex flex-col items-center justify-center transition-all relative group ${
              isActive ? 'text-secondary' : 'text-on-background/50 hover:text-tertiary'
            }`}
          >
            {isActive && (
              <div className="absolute -left-2 w-1 h-4 bg-primary rounded-full" />
            )}
            <Icon className={`w-6 h-6 ${isActive ? 'fill-secondary/20' : ''}`} />
            {item.hasBadge && (
              <span className="absolute top-0 right-0 w-2 h-2 bg-error rounded-full border border-background" />
            )}
            <span className="text-[10px] font-semibold tracking-wider uppercase mt-1">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
