import { Menu, RefreshCw, Radio, CheckCircle, Filter, SortAsc, Piano, Music, Download, BatteryWarning, BatteryLow, Activity } from 'lucide-react';

export default function SyncView() {
  const members = [
    { name: '张小明', role: '钢琴 / 第一部', battery: 85, progress: 100, status: 'normal' },
    { name: '李华', role: '小提琴 / 首席', battery: 12, progress: 100, status: 'low-battery' },
    { name: '王大力', role: '大提琴', battery: 92, progress: 64, status: 'downloading' },
    { name: '陈静', role: '长笛', battery: 55, progress: 100, status: 'normal' },
    { name: '周杰', role: '打击乐', battery: 4, progress: 100, status: 'critical-battery' },
    { name: '赵雷', role: '调音师', battery: 100, progress: 100, status: 'normal' },
  ];

  return (
    <div className="pb-24">
      <header className="sticky top-0 z-50 flex justify-between items-center w-full px-6 py-4 bg-background/80 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Menu className="text-primary cursor-pointer w-6 h-6" />
          <h1 className="font-headline font-bold text-lg tracking-tight text-primary uppercase">排练同步大厅</h1>
        </div>
        <div className="flex items-center gap-4">
          <RefreshCw className="text-primary cursor-pointer w-6 h-6" />
        </div>
      </header>

      <main className="px-6 max-w-7xl mx-auto space-y-8 pt-4">
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 items-stretch">
          <div className="md:col-span-8 bg-surface-container-high rounded-xl p-8 flex flex-col justify-between relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
            <div className="relative z-10">
              <h2 className="font-headline text-on-background/50 text-xs font-bold uppercase tracking-[0.2em] mb-4">主节拍</h2>
              <div className="flex items-end gap-4">
                <span className="font-headline text-8xl md:text-9xl font-bold text-primary tracking-tighter">128</span>
                <span className="font-headline text-2xl text-primary/40 mb-4">BPM</span>
              </div>
            </div>
            <div className="relative z-10 mt-8 flex flex-wrap items-center gap-4">
              <button className="bg-surface-container hover:bg-surface-bright text-primary font-headline px-8 py-4 rounded-xl font-bold text-lg transition-all active:scale-95 uppercase tracking-widest border border-outline-variant/10">
                手动打拍
              </button>
              <div className="flex-grow"></div>
              <div className="flex items-center gap-4 bg-background/50 p-4 rounded-xl border border-outline-variant/15">
                <span className="text-sm font-medium text-on-background/70">同步节拍给全员</span>
                <div className="w-12 h-6 bg-secondary rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 grid grid-rows-2 gap-6">
            <div className="bg-secondary p-6 rounded-xl flex flex-col justify-between relative overflow-hidden">
              <Radio className="absolute -right-4 -bottom-4 w-32 h-32 text-on-secondary/10" />
              <h3 className="text-on-secondary font-bold text-lg font-headline tracking-tight">广播状态</h3>
              <div className="text-on-secondary font-headline text-4xl font-bold">正在直播推送</div>
              <p className="text-on-secondary/70 text-sm">当前正在向 12 台设备广播数据</p>
            </div>
            <div className="bg-surface-container-high p-6 rounded-xl flex flex-col justify-between border border-outline-variant/10">
              <h3 className="text-on-background/50 font-bold text-xs uppercase tracking-widest">网络延迟</h3>
              <div className="flex items-end justify-between">
                <div className="text-tertiary font-headline text-5xl font-bold">12<span className="text-xl ml-1 font-light opacity-50">ms</span></div>
                <div className="bg-tertiary/10 text-tertiary px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                  <CheckCircle className="w-3 h-3 fill-tertiary/20" />
                  极佳
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-headline font-bold text-on-background tracking-tight">连接成员 (12)</h2>
            <div className="flex gap-2">
              <button className="bg-surface-container-high text-primary p-2 rounded-lg hover:bg-surface-bright">
                <Filter className="w-5 h-5" />
              </button>
              <button className="bg-surface-container-high text-primary p-2 rounded-lg hover:bg-surface-bright">
                <SortAsc className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member, idx) => (
              <div 
                key={idx}
                className={`bg-surface-container-high rounded-xl p-5 border-l-4 transition-all hover:bg-surface-bright group ${
                  member.status.includes('battery') ? 'border-secondary' : 'border-primary'
                } ${member.status === 'critical-battery' ? 'bg-secondary/5' : ''}`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="text-on-background font-bold text-lg">{member.name}</div>
                    <div className="text-on-background/50 text-sm flex items-center gap-1">
                      {member.role.includes('钢琴') ? <Piano className="w-3 h-3" /> : <Music className="w-3 h-3" />}
                      {member.role}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-headline font-bold flex items-center gap-1 justify-end ${
                      member.status.includes('battery') ? 'text-secondary' : 'text-on-background'
                    }`}>
                      {member.status === 'critical-battery' && <BatteryWarning className="w-4 h-4" />}
                      {member.status === 'low-battery' && <BatteryLow className="w-4 h-4" />}
                      {member.battery}%
                    </div>
                    <div className="text-[10px] uppercase font-bold tracking-tighter text-on-background/30">电池电量</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-medium text-on-background/50 mb-1">
                    <span className="flex items-center gap-1">
                      {member.status === 'downloading' && <Download className="w-3 h-3 animate-bounce" />}
                      乐谱同步进度
                    </span>
                    <span>{member.progress}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-background rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${member.status === 'downloading' ? 'bg-primary' : 'bg-tertiary'}`}
                      style={{ width: `${member.progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
