import { Menu, Bell, PlayCircle, GripVertical, Gauge, Music } from 'lucide-react';

interface SetlistViewProps {
  onOpenScore: (scoreId: string) => void;
}

export default function SetlistView({ onOpenScore }: SetlistViewProps) {
  const tracks = [
    { id: '1', title: '霓虹地平线', bpm: 124, key: 'A小调' },
    { id: '2', title: '午夜回响', bpm: 98, key: 'E大调' },
    { id: '3', title: '深渊脉动', bpm: 140, key: '升C小调' },
    { id: '4', title: '数字雨', bpm: 112, key: '升F小调' },
  ];

  return (
    <div className="pb-40">
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Menu className="text-primary cursor-pointer w-6 h-6" />
          <h1 className="font-headline font-bold text-lg tracking-tight text-primary uppercase">演出曲目单</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="text-primary cursor-pointer w-6 h-6" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-8">
        <div className="relative mb-12 overflow-hidden rounded-xl bg-surface-container-low p-8">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
          <div className="relative z-10">
            <span className="font-label text-xs uppercase tracking-[0.2em] text-tertiary mb-3 block">当前巡演</span>
            <h2 className="font-headline font-bold text-4xl md:text-5xl text-on-background tracking-tight">2024 上海站巡演</h2>
            <div className="mt-6 flex items-center gap-6">
              <div className="flex flex-col">
                <span className="font-label text-[10px] uppercase text-on-background/50 tracking-wider">曲目数</span>
                <span className="font-headline text-2xl font-semibold">12</span>
              </div>
              <div className="w-px h-8 bg-outline-variant/20"></div>
              <div className="flex flex-col">
                <span className="font-label text-[10px] uppercase text-on-background/50 tracking-wider">总时长</span>
                <span className="font-headline text-2xl font-semibold">54:20</span>
              </div>
              <div className="w-px h-8 bg-outline-variant/20"></div>
              <div className="flex flex-col">
                <span className="font-label text-[10px] uppercase text-on-background/50 tracking-wider">状态</span>
                <span className="font-headline text-2xl font-semibold text-tertiary">就绪</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-end mb-6">
            <h3 className="font-headline text-xl font-medium tracking-tight">演出顺序</h3>
            <span className="font-label text-xs text-on-background/50">拖动以调整顺序</span>
          </div>

          {tracks.map((track, index) => (
            <div 
              key={track.id}
              onClick={() => onOpenScore(track.id)}
              className="group flex items-center gap-4 bg-surface-container-high hover:bg-surface-bright transition-all duration-300 p-5 rounded-xl cursor-pointer"
            >
              <div className="font-headline text-2xl font-bold text-outline-variant group-hover:text-primary transition-colors">
                {(index + 1).toString().padStart(2, '0')}
              </div>
              <div className="flex-grow">
                <h4 className="font-headline text-lg font-semibold tracking-wide">{track.title}</h4>
                <div className="flex gap-4 mt-1">
                  <div className="flex items-center gap-1.5 bg-background px-2 py-0.5 rounded text-[10px] font-bold text-on-background/50 uppercase tracking-widest border border-outline-variant/10">
                    <Gauge className="w-3 h-3" /> {track.bpm} BPM
                  </div>
                  <div className="flex items-center gap-1.5 bg-background px-2 py-0.5 rounded text-[10px] font-bold text-on-background/50 uppercase tracking-widest border border-outline-variant/10">
                    <Music className="w-3 h-3" /> {track.key}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <div className="flex items-center gap-2 px-3 py-1 bg-surface-container rounded-full">
                  <div className="w-2 h-2 rounded-full bg-tertiary shadow-[0_0_8px_rgba(129,236,255,0.6)]"></div>
                  <span className="font-label text-[10px] font-semibold text-tertiary uppercase tracking-tighter">100% 可用</span>
                </div>
                <GripVertical className="text-outline-variant group-hover:text-on-background cursor-grab" />
              </div>
            </div>
          ))}
        </div>
      </main>

      <div className="fixed bottom-28 left-0 w-full px-6 flex justify-center z-40 pointer-events-none">
        <button className="pointer-events-auto bg-gradient-to-br from-secondary to-[#ffb28c] text-on-secondary px-10 py-5 rounded-full shadow-[0_8px_32px_rgba(255,117,32,0.3)] hover:shadow-[0_12px_48px_rgba(255,117,32,0.45)] transition-all duration-300 transform hover:-translate-y-1 active:scale-95 flex items-center gap-3">
          <PlayCircle className="w-6 h-6 fill-on-secondary/20" />
          <span className="font-headline font-bold text-lg tracking-wider uppercase">进入演出模式</span>
        </button>
      </div>
    </div>
  );
}
