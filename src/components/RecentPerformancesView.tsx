import { Clock, Calendar, ChevronRight, Music, ArrowLeft } from 'lucide-react';
import { useState, useEffect } from 'react';
import { storageService, Setlist } from '../services/storageService';
import { motion } from 'motion/react';

interface RecentPerformancesViewProps {
  onOpenSetlist: (id: string) => void;
  onBack: () => void;
}

export default function RecentPerformancesView({ onOpenSetlist, onBack }: RecentPerformancesViewProps) {
  const [performances, setPerformances] = useState<Setlist[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadPerformances = async () => {
      const meta = await storageService.getMetadata();
      const allSetlists = meta.setlists || [];
      // Sort by proximity to current time (closest to now first)
      const now = Date.now();
      const sorted = [...allSetlists].sort((a, b) => {
        const dateA = a.performanceDate || a.createdAt;
        const dateB = b.performanceDate || b.createdAt;
        return Math.abs(dateA - now) - Math.abs(dateB - now);
      });
      setPerformances(sorted);
      setIsLoading(false);
    };
    loadPerformances();
  }, []);

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <header className="sticky top-0 z-50 flex items-center gap-4 w-full px-6 py-4 bg-background/80 backdrop-blur-md border-b border-outline-variant/10">
        <button onClick={onBack} className="p-2 hover:bg-surface-container rounded-xl transition-all text-primary">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="font-headline font-bold text-xl tracking-tight text-primary uppercase">最近演出</h1>
      </header>

      <main className="max-w-3xl mx-auto px-6 pt-8">
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : performances.length === 0 ? (
          <div className="py-20 text-center text-on-background/30">
            <Clock className="w-16 h-16 mx-auto mb-4 opacity-20" />
            <p className="font-headline font-bold text-lg">暂无演出记录</p>
          </div>
        ) : (
          <div className="space-y-4">
            {performances.map((perf, index) => (
              <motion.div
                key={perf.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={async () => {
                  await storageService.saveMetadata({ activeSetlistId: perf.id });
                  onOpenSetlist(perf.id);
                }}
                className="group flex items-center gap-4 bg-surface-container-high hover:bg-surface-bright transition-all duration-300 p-5 rounded-2xl cursor-pointer border border-outline-variant/5 hover:border-primary/20"
              >
                <div className="w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center text-primary flex-shrink-0 group-hover:scale-110 transition-transform">
                  <Calendar className="w-7 h-7" />
                </div>
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-headline font-bold text-lg truncate group-hover:text-primary transition-colors">{perf.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/5 text-primary rounded-lg border border-primary/10">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{perf.performanceDate ? formatDate(perf.performanceDate) : '未设置时间'}</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-secondary/5 text-secondary rounded-lg border border-secondary/10">
                      <Music className="w-3.5 h-3.5" />
                      <span className="text-xs font-bold">{perf.program.length} 首曲目</span>
                    </div>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-on-background/20 group-hover:text-primary transition-all group-hover:translate-x-1" />
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
