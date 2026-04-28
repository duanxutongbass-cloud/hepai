import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Music, 
  ChevronLeft,
  CheckCircle2,
  Activity,
  Disc,
  Feather,
  BookOpen,
  Box,
  Sparkles
} from 'lucide-react';
import { storageService } from '../services/storageService';

interface IconConcept {
  id: string;
  name: string;
  description: string;
  color: string;
  component: React.ReactNode;
}

export function IconSelectionView({ onBack }: { onBack: () => void }) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);

  useEffect(() => {
    const loadCurrent = async () => {
      const meta = await storageService.getMetadata();
      if (meta.brandIcon) setSelectedId(meta.brandIcon);
    };
    loadCurrent();
  }, []);

  const concepts: IconConcept[] = [
    {
      id: 'ink-script',
      name: '石墨墨水 (Graphite)',
      description: '极简的黑白对比，宛如墨水滴落在初制的五线谱纸上。冷静、纯粹、专业。',
      color: '#FFFFFF',
      component: (
        <div className="flex flex-col gap-3 w-20">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[1px] bg-on-background/20 w-full" />)}
          <motion.div 
            animate={{ 
              scale: [1, 1.2, 1],
              rotate: [0, 5, 0],
              borderRadius: ["40% 60% 70% 30% / 40% 50% 60% 50%", "60% 40% 30% 70% / 50% 60% 40% 60%", "40% 60% 70% 30% / 40% 50% 60% 50%"]
            }}
            transition={{ duration: 8, repeat: Infinity }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-on-background mix-blend-difference"
          />
        </div>
      )
    },
    {
      id: 'midnight-cello',
      name: '夜幕大提琴 (Midnight Cello)',
      description: '极简的大提琴轮廓线条，带有呼吸感的暗金边缘。代表匠心与深沉。',
      color: '#B45309',
      component: (
        <div className="relative flex items-center justify-center w-full h-full">
          <motion.svg 
            viewBox="0 0 24 24" 
            className="w-24 h-24 text-primary/40 fill-none" 
            stroke="currentColor" 
            strokeWidth="1"
          >
            <path d="M12 2v20M9 7c-2 0-3 2-3 5s1 5 3 5M15 7c2 0 3 2 3 5s-1 5-3 5" />
            <motion.path 
              d="M12 4c-3 0-5 2-5 8s2 8 5 8 5-2 5-8-2-8-5-8" 
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 3, repeat: Infinity, repeatType: "reverse" }}
              className="text-primary"
              strokeWidth="2"
            />
          </motion.svg>
        </div>
      )
    },
    {
      id: 'nocturne-wave',
      name: '夜曲波形 (Lunar Wave)',
      description: '动态音频波形，在起伏间隐约勾勒出新月的形状。',
      color: '#60A5FA',
      component: (
        <div className="relative flex items-center justify-center w-full h-full">
          <div className="flex gap-1 items-end h-16">
            {[1, 2, 4, 8, 4, 2, 1].map((h, i) => (
              <motion.div
                key={i}
                animate={{ height: [h * 4, h * 8, h * 4] }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.1 }}
                className="w-1.5 bg-primary rounded-full"
              />
            ))}
          </div>
          <motion.div 
            animate={{ opacity: [0.1, 0.3, 0.1] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute w-24 h-24 rounded-full border-r-4 border-primary/20 -rotate-12"
          />
        </div>
      )
    },
    {
      id: 'sync-baton',
      name: '同步指挥 (Sync Baton)',
      description: '指挥棒划破虚空的流光轨迹，代表着核心控制与实时同步。',
      color: '#89ACFF',
      component: (
        <div className="relative flex items-center justify-center w-full h-full">
          <motion.div 
            animate={{ rotate: [-20, 20, -20] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="w-32 h-1 bg-gradient-to-r from-primary to-transparent rounded-full origin-left"
          />
          <motion.div 
            animate={{ x: [0, 40, 0], opacity: [0, 1, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="absolute right-4 w-2 h-2 bg-primary rounded-full blur-sm"
          />
        </div>
      )
    },
    {
      id: 'score-geometry',
      name: '乐谱几何 (Geometry)',
      description: '等轴测视角的乐谱切片，代表专业、有序与数字化的管理。',
      color: '#1D4ED8',
      component: (
        <div className="relative flex items-center justify-center w-full h-full">
          <motion.div 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-24 h-24 border-2 border-primary/20 rotate-45 flex flex-col justify-around p-4"
          >
            {[1, 2, 3].map(i => <div key={i} className="h-0.5 bg-primary/40 w-full" />)}
          </motion.div>
          <div className="absolute w-24 h-24 border border-primary/10 rotate-45 translate-y-4 translate-x-4" />
        </div>
      )
    }
  ];

  const handleConfirm = async () => {
    if (selectedId) {
      await storageService.saveMetadata({ brandIcon: selectedId });
      onBack();
    }
  };

  return (
    <div className="min-h-screen bg-background p-6 sm:p-12 pb-32">
      <header className="max-w-5xl mx-auto flex items-center gap-6 mb-12">
        <button 
          onClick={onBack}
          className="p-3 hover:bg-white/5 rounded-2xl text-on-background/40 transition-all border border-white/5"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div>
          <h1 className="text-3xl font-headline font-black text-on-background uppercase tracking-tighter">图标方案评选</h1>
          <p className="text-xs font-mono text-primary font-bold tracking-widest mt-1 uppercase">Select your official brand identity</p>
        </div>
      </header>

      <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {concepts.map((concept) => (
          <motion.div
            key={concept.id}
            whileHover={{ y: -5 }}
            onClick={() => setSelectedId(concept.id)}
            className={`cursor-pointer hardware-card p-0 overflow-hidden flex flex-col transition-all duration-500 ${
              selectedId === concept.id ? 'ring-2 ring-primary border-transparent' : 'border-white/5'
            }`}
          >
            <div className="h-48 bg-primary/5 flex items-center justify-center p-8 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(137,172,255,0.1)_0%,transparent_70%)]" />
              {concept.component}
              {selectedId === concept.id && (
                <motion.div 
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="absolute top-4 right-4 text-primary"
                >
                  <CheckCircle2 className="w-6 h-6 fill-background" />
                </motion.div>
              )}
            </div>
            <div className="p-6 space-y-2 flex-1 flex flex-col">
              <h3 className="text-lg font-bold text-on-background flex items-center gap-2">
                {concept.name}
                {concept.id === 'master-baton' && <Sparkles className="w-4 h-4 text-primary" />}
              </h3>
              <p className="text-sm text-on-background/40 leading-relaxed italic flex-1">
                "{concept.description}"
              </p>
              <div className="pt-4 flex items-center justify-between">
                <span className="text-[10px] font-mono text-primary uppercase tracking-widest">Aesthetic Grade: AAA</span>
                <div className="flex gap-1">
                   {[1, 2, 3].map(i => <div key={i} className="w-2 h-2 rounded-full bg-primary/20" />)}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedId && (
          <motion.footer 
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 p-6 bg-background/80 backdrop-blur-xl border-t border-white/5 z-[200]"
          >
            <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-primary">已选中方案</p>
                  <p className="text-lg font-headline font-black text-on-background uppercase">{concepts.find(c => c.id === selectedId)?.name}</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  alert(`已记录您的选择：${concepts.find(c => c.id === selectedId)?.name}。我将开始处理发布资产。`);
                  onBack();
                }}
                className="w-full sm:w-auto px-12 py-4 bg-primary text-on-primary rounded-2xl font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-105 transition-all"
              >
                确认以此作为正式图标
              </button>
            </div>
          </motion.footer>
        )}
      </AnimatePresence>
    </div>
  );
}
