import React from 'react';
import { motion } from 'motion/react';
import { X, BookOpen, Music, Share2, Shield, Zap, Download, RefreshCw, Cpu } from 'lucide-react';

import pkg from '../../package.json';

interface HelpManualProps {
  onClose: () => void;
}

export default function HelpManual({ onClose }: HelpManualProps) {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 sm:p-8">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="relative w-full max-w-4xl h-[85vh] hardware-card p-0 flex flex-col overflow-hidden border-primary/20 shadow-[0_0_50px_rgba(137,172,255,0.15)]"
      >
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between bg-primary/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20">
              <BookOpen className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-headline font-black text-on-background tracking-tighter uppercase">Nocturne Sync 帮助手册</h2>
              <p className="text-[10px] font-mono text-primary font-bold tracking-widest">USER DOCUMENTATION v{pkg.version}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full text-on-background/40 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-12 custom-scrollbar">
          {/* Section: Overview */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Zap className="w-5 h-5" />
              <h3 className="text-lg font-bold">系统概述</h3>
            </div>
            <p className="text-sm text-on-background/70 leading-relaxed">
              Nocturne Sync 是一款专为职业交响乐团、弦乐团及室内乐组设计的数字化智能阅谱解决方案。通过高度集成的云端技术与本地 IndexedDB 缓存机制，确保在复杂的演出环境下依然能够提供极致的稳定性与实时响应。
            </p>
          </section>

          {/* Section: Library */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Music className="w-5 h-5" />
              <h3 className="text-lg font-bold">乐谱库管理</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <h4 className="text-sm font-bold mb-2">多级分类</h4>
                <p className="text-xs text-on-background/50 leading-relaxed">支持通过“文件夹”与“标签”双重维度管理乐谱。声部标签（如：1st Violin）会自动关联节目单的分发逻辑。</p>
              </div>
              <div className="p-4 bg-white/5 rounded-2xl border border-white/5">
                <h4 className="text-sm font-bold mb-2">本地缓存</h4>
                <p className="text-xs text-on-background/50 leading-relaxed">所有乐谱在首次打开后均会自动加密缓存至本地 IndexedDB。即便在无网络环境中，已缓存的乐谱仍可秒开。</p>
              </div>
            </div>
          </section>

          {/* Section: Sync */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <RefreshCw className="w-5 h-5" />
              <h3 className="text-lg font-bold">实时排练同步</h3>
            </div>
            <p className="text-sm text-on-background/70 leading-relaxed">
              这是系统的核心功能。当加入群组（Group）后，主控端（指挥或声部首席）发出的翻页、标注更新指令将通过 WebSocket 瞬间下发给所有成员。
            </p>
            <ul className="list-disc list-inside text-xs text-on-background/50 space-y-2 pl-2">
              <li>确保“系统设置 - 同步中心 - 接收实时推送”已开启。</li>
              <li>在排练厅内，建议将“推流协议延迟阈值”设置为 200ms 以获得最佳体验。</li>
            </ul>
          </section>

          {/* Section: Backup */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Download className="w-5 h-5" />
              <h3 className="text-lg font-bold">演出应急备份 (Pro)</h3>
            </div>
            <p className="text-sm text-on-background/70 leading-relaxed">
              为了应对极端的网络崩溃，系统提供了一键打包功能。在“数据与安全”版块，您可以选择当前演出的节目单，系统会自动按声部文件夹结构生成 ZIP 压缩包下载。
            </p>
            <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
              <p className="text-xs font-bold text-primary mb-1 italic">专家建议：</p>
              <p className="text-[10px] text-primary/70 italic">在进入正式演出场馆前，务必全库同步一次，并下载一份应急备份包存储于备份平板中。</p>
            </div>
          </section>

          {/* Section: Admin */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Shield className="w-5 h-5" />
              <h3 className="text-lg font-bold">管理员职能</h3>
            </div>
            <div className="space-y-3">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex-shrink-0 flex items-center justify-center text-[10px] font-mono text-primary border border-white/5 underline">01</div>
                <div>
                  <p className="text-xs font-bold">曲库分类管理</p>
                  <p className="text-[10px] text-on-background/40">批量配置乐谱标签，确保节目单自动匹配正确声部。</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-lg bg-white/5 flex-shrink-0 flex items-center justify-center text-[10px] font-mono text-primary border border-white/5 underline">02</div>
                <div>
                  <p className="text-xs font-bold">成员审计</p>
                  <p className="text-[10px] text-on-background/40">审核申请升权的成员，控制乐团数据的泄露风险。</p>
                </div>
              </div>
            </div>
          </section>

          {/* Section: Developer */}
          <section className="space-y-4">
            <div className="flex items-center gap-2 text-primary">
              <Cpu className="w-5 h-5" />
              <h3 className="text-lg font-bold">开发者模式</h3>
            </div>
            <p className="text-sm text-on-background/70 leading-relaxed">
              如果您需要手动配置私有部署的后端地址（Server Interface Override），请转至“关于与支持”，连续点击“当前版本”行 7 次即可解锁开发者选项。
            </p>
          </section>

          {/* Footer Info */}
          <div className="pt-12 text-center space-y-4">
            <div className="h-px bg-white/5 w-24 mx-auto" />
            <p className="text-[10px] text-on-background/30 uppercase tracking-[0.3em]">Nocturne Sync • Masterpiece of Harmony</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="p-6 bg-background/50 border-t border-white/5">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-primary text-on-primary rounded-2xl text-sm font-bold tracking-widest uppercase hover:brightness-110 shadow-lg shadow-primary/20 transition-all"
          >
            我已了解
          </button>
        </div>
      </motion.div>
    </div>
  );
}
