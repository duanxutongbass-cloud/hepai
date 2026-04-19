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
    <nav className="fixed bottom-0 w-full z-50 flex justify-around items-center px-6 pb-6 pt-3 bg-black/80 backdrop-blur-2xl border-t border-white/5 shadow-[0_-10px_40px_-10px_rgba(0,0,0,0.5)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = currentView === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onViewChange(item.id as View)}
            className={`flex flex-col items-center justify-center transition-all relative group ${
              isActive ? 'text-primary' : 'text-white/30 hover:text-white'
            }`}
          >
            {isActive && (
              <div className="absolute top-[-14px] w-8 h-[2px] bg-primary shadow-[0_0_10px_var(--color-primary-glow)]" />
            )}
            <Icon className={`w-5 h-5 mb-1 ${isActive ? 'scale-110' : ''}`} />
            {item.hasBadge && (
              <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-secondary rounded-full border border-black shadow-[0_0_8px_rgba(255,112,67,0.5)]" />
            )}
            <span className="mono-label !text-[8px]">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
