import { Menu, Bell, Settings, Network, StickyNote, FolderArchive, History, BarChart, Activity, User, RefreshCw, UserCheck, Users } from 'lucide-react';

interface SettingsViewProps {
  isAdmin: boolean;
  setIsAdmin: (isAdmin: boolean) => void;
}

export default function SettingsView({ isAdmin, setIsAdmin }: SettingsViewProps) {
  const members = [
    { name: 'Alex M.', img: 'https://i.pravatar.cc/150?u=alex' },
    { name: 'Sarah K.', img: 'https://i.pravatar.cc/150?u=sarah' },
    { name: 'David L.', img: 'https://i.pravatar.cc/150?u=david' },
    { name: 'Elena R.', img: 'https://i.pravatar.cc/150?u=elena' },
    { name: 'Marcus T.', img: 'https://i.pravatar.cc/150?u=marcus' },
  ];

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Menu className="text-primary cursor-pointer w-6 h-6" />
          <h1 className="text-xl font-bold text-primary tracking-widest uppercase font-headline">合拍</h1>
        </div>
        <div className="flex items-center gap-4">
          <Bell className="text-primary cursor-pointer w-6 h-6" />
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 space-y-8">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-surface-container-high rounded-xl p-8 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Activity className="w-32 h-32" />
            </div>
            <div className="relative z-10">
              <h2 className="font-headline font-bold text-3xl tracking-tight text-on-background mb-2">实时同步控制</h2>
              <p className="text-on-background/50 font-body mb-8 max-w-sm">将当前节目单实时推送至所有连接的成员设备。</p>
            </div>
            <button className="w-fit flex items-center gap-3 bg-secondary hover:bg-secondary/80 px-8 py-4 rounded-full text-on-secondary font-bold text-md uppercase tracking-widest shadow-xl active:scale-95 transition-all">
              推送给所有成员
            </button>
          </div>

          <div className="bg-surface-container rounded-xl p-8 flex flex-col items-center justify-center text-center border-l-4 border-tertiary">
            <div className="mb-4 relative">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle className="text-surface-container-high" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeWidth="8"></circle>
                <circle className="text-tertiary" cx="64" cy="64" fill="transparent" r="58" stroke="currentColor" strokeDasharray="364.42" strokeDashoffset="0" strokeWidth="8"></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-headline font-bold text-on-background">24/24</span>
                <span className="text-[10px] uppercase tracking-tighter text-tertiary font-bold">实时状态</span>
              </div>
            </div>
            <h3 className="text-lg font-bold font-headline mb-1">网络已同步</h3>
            <p className="text-xs text-on-background/50 font-body">所有成员正在接收实时数据流。</p>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 glass-panel rounded-xl p-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-headline font-semibold text-xl tracking-tight">身份与权限设置</h2>
              <UserCheck className="text-primary w-5 h-5" />
            </div>
            <div className="p-6 bg-surface-container-low rounded-2xl border border-outline-variant/10">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${isAdmin ? 'bg-primary/10 text-primary' : 'bg-on-background/5 text-on-background/30'}`}>
                    {isAdmin ? <UserCheck className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                  </div>
                  <div>
                    <p className="font-bold text-on-background">{isAdmin ? '管理员模式' : '成员模式'}</p>
                    <p className="text-xs text-on-background/50">{isAdmin ? '拥有完整管理权限，可上传、编辑及管理成员' : '仅限查看及使用乐谱，无法进行管理操作'}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsAdmin(!isAdmin)}
                  className={`w-12 h-6 rounded-full transition-all relative ${isAdmin ? 'bg-primary' : 'bg-outline-variant'}`}
                >
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${isAdmin ? 'right-1' : 'left-1'}`} />
                </button>
              </div>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col gap-6">
            <div className="bg-surface-container-high rounded-xl p-8 flex-1 flex flex-col justify-center">
              <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-4">当前身份状态</h3>
              <div className="flex items-center gap-4 p-4 bg-background/40 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border-2 border-primary/20">张</div>
                <div>
                  <p className="font-bold text-on-background text-lg">张三</p>
                  <p className="text-[10px] font-bold text-primary uppercase tracking-widest">{isAdmin ? '系统管理员' : '普通成员'}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-7 glass-panel rounded-xl p-8 space-y-6">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-headline font-semibold text-xl tracking-tight">导出配置</h2>
              <Settings className="text-primary w-5 h-5" />
            </div>
            <div className="space-y-4">
              <label className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
                    <Network className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-on-background">按乐器分类</p>
                    <p className="text-xs text-on-background/50">按乐器种类自动归档</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded border-2 border-primary flex items-center justify-center bg-primary/20">
                  <div className="w-2 h-2 bg-primary rounded-sm"></div>
                </div>
              </label>
              <label className="flex items-center justify-between p-4 bg-surface-container-low rounded-xl cursor-pointer hover:bg-surface-container-high transition-colors group">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-surface-container-high flex items-center justify-center">
                    <StickyNote className="text-primary w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-on-background">包含成员/管理员批注</p>
                    <p className="text-xs text-on-background/50">导出时保留所有标注信息</p>
                  </div>
                </div>
                <div className="w-6 h-6 rounded border-2 border-primary flex items-center justify-center bg-primary/20">
                  <div className="w-2 h-2 bg-primary rounded-sm"></div>
                </div>
              </label>
            </div>
            <div className="pt-4">
              <button className="w-full bg-surface-bright border border-outline-variant hover:border-primary py-5 rounded-xl flex items-center justify-center gap-3 active:scale-[0.98] transition-all group">
                <FolderArchive className="text-primary group-hover:scale-110 transition-transform" />
                <span className="font-bold text-on-background tracking-wide uppercase">一键生成并导出 ZIP 包</span>
              </button>
            </div>
          </div>

          <div className="md:col-span-5 flex flex-col gap-6">
            <div className="bg-surface-container-high rounded-xl p-8 flex-1 flex flex-col justify-center">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-primary mb-1">存档引擎</h3>
                  <p className="text-2xl font-headline font-bold">正在打包...</p>
                </div>
                <span className="text-4xl font-headline font-light text-primary">68<span className="text-lg opacity-50">%</span></span>
              </div>
              <div className="w-full h-3 bg-surface-container-low rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-primary to-tertiary w-[68%] rounded-full shadow-[0_0_12px_rgba(137,172,255,0.4)]"></div>
              </div>
              <div className="mt-6 flex items-center gap-3 py-2 px-3 bg-background/40 rounded-lg">
                <RefreshCw className="text-tertiary w-4 h-4 animate-spin-slow" />
                <span className="text-[10px] text-on-background/50 font-mono uppercase">正在处理: strings_section_final.pdf</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high transition-colors cursor-pointer border border-transparent hover:border-outline-variant/30">
                <History className="text-on-background/50 w-5 h-5" />
                <span className="text-[10px] font-bold uppercase text-on-background/50">历史记录</span>
              </div>
              <div className="bg-surface-container rounded-xl p-4 flex flex-col items-center justify-center gap-2 hover:bg-surface-container-high transition-colors cursor-pointer border border-transparent hover:border-outline-variant/30">
                <BarChart className="text-on-background/50 w-5 h-5" />
                <span className="text-[10px] font-bold uppercase text-on-background/50">报告</span>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-headline font-bold text-xl tracking-tight">在线成员</h2>
            <div className="flex items-center gap-2 px-3 py-1 bg-tertiary/10 rounded-full">
              <div className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></div>
              <span className="text-[10px] font-bold uppercase text-tertiary">实时动态</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {members.map((member, i) => (
              <div key={i} className="bg-surface-container-low p-4 rounded-xl flex flex-col items-center gap-3 border-l-2 border-tertiary">
                <img className="w-12 h-12 rounded-full object-cover border-2 border-surface-container-high" src={member.img} alt={member.name} />
                <span className="text-[10px] font-bold uppercase text-on-background">{member.name}</span>
              </div>
            ))}
            <div className="bg-surface-container-high/20 p-4 rounded-xl flex flex-col items-center justify-center gap-1 border border-dashed border-outline-variant">
              <span className="text-lg font-bold text-on-background/50">+19</span>
              <span className="text-[8px] font-bold uppercase text-on-background/50">已连接</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
