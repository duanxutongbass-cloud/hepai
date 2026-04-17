import { User, Shield, Mail, MapPin, Music, Camera, ChevronRight, Settings, LogOut, Award, Clock, Heart, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { storageService, UserRole } from '../services/storageService';

interface ProfileViewProps {
  onBack: () => void;
  onViewChange: (view: any) => void;
  userProfile: any;
  onLogout: () => void;
}

export default function ProfileView({ onBack, onViewChange, userProfile, onLogout }: ProfileViewProps) {
  const [userRole, setUserRole] = useState<UserRole>('member');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [instruments, setInstruments] = useState<string[]>([]);
  const [orchestra, setOrchestra] = useState('');
  const [avatar, setAvatar] = useState<Blob | undefined>(undefined);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (avatar instanceof Blob) {
      const url = URL.createObjectURL(avatar);
      setAvatarUrl(url);
      return () => URL.revokeObjectURL(url);
    } else {
      setAvatarUrl(null);
    }
  }, [avatar]);

  useEffect(() => {
    const loadData = async () => {
      const meta = await storageService.getMetadata();
      setUserRole(meta.userRole || 'member');
      if (meta.profile) {
        setUserName(meta.profile.name);
        setUserEmail(meta.profile.email);
        setInstruments(meta.profile.instruments || []);
        setOrchestra(meta.profile.orchestra || '');
        setAvatar(meta.profile.avatar);
      }
    };
    loadData();
  }, []);

  const handleSave = async () => {
    await storageService.saveMetadata({
      profile: {
        name: userName,
        email: userEmail,
        instruments: instruments,
        orchestra: orchestra,
        avatar: avatar
      }
    });
    setIsEditing(false);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatar(file);
    }
  };

  const stats = [
    { label: '排练时长', value: '128h', icon: Clock, color: 'text-blue-500' },
    { label: '收藏乐谱', value: '42', icon: Heart, color: 'text-red-500' },
    { label: '演出场次', value: '15', icon: Award, color: 'text-amber-500' },
  ];

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-outline-variant/10">
        <button onClick={onBack} className="p-2 hover:bg-surface-container rounded-full transition-colors">
          <ChevronRight className="w-6 h-6 rotate-180" />
        </button>
        <h1 className="font-headline font-bold text-lg">个人中心</h1>
        <button 
          onClick={() => isEditing ? handleSave() : setIsEditing(true)} 
          className="text-primary font-bold text-sm"
        >
          {isEditing ? '保存' : '编辑'}
        </button>
      </header>

      <main className="px-6 py-8 max-w-2xl mx-auto space-y-8">
        {/* Profile Header */}
        <section className="flex flex-col items-center text-center space-y-4">
          {!userProfile ? (
            <div className="w-full py-8 space-y-4">
              <div className="w-20 h-20 bg-surface-container rounded-full flex items-center justify-center mx-auto">
                <User className="w-10 h-10 text-on-background/20" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-headline font-bold">尚未登录</h2>
                <p className="text-xs text-on-background/40">登录以同步您的乐谱和批注</p>
              </div>
              <button 
                onClick={() => onViewChange('auth')}
                className="px-8 py-3 bg-primary text-on-primary rounded-2xl font-bold shadow-lg shadow-primary/20"
              >
                立即登录 / 注册
              </button>
            </div>
          ) : (
            <>
              <div className="relative group">
                <div className="w-32 h-32 bg-primary/10 rounded-full flex items-center justify-center border-4 border-background shadow-xl overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <User className="w-16 h-16 text-primary" />
                  )}
                </div>
                <label className="absolute bottom-0 right-0 p-2 bg-primary text-on-primary rounded-full shadow-lg cursor-pointer hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
              </div>
              <div className="w-full">
                {isEditing ? (
                  <input 
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    className="text-2xl font-headline font-bold text-on-background bg-surface-container rounded-xl px-4 py-2 text-center w-full outline-none focus:ring-2 ring-primary/20"
                    placeholder="输入姓名"
                  />
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <h2 className="text-2xl font-headline font-bold text-on-background">{userName || '未设置姓名'}</h2>
                  </div>
                )}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className={`px-3 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                    userRole === 'admin' ? 'bg-primary text-on-primary' : 
                    userRole === 'sub-admin' ? 'bg-secondary text-on-secondary' : 
                    'bg-surface-container text-on-background/50'
                  }`}>
                    {userRole === 'admin' ? '主管理员' : userRole === 'sub-admin' ? '二级管理员' : '乐团成员'}
                  </span>
                </div>
              </div>
            </>
          )}
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-3 gap-4">
          {stats.map(stat => (
            <div key={stat.label} className="bg-surface-container-high p-4 rounded-2xl border border-outline-variant/5 text-center space-y-1">
              <stat.icon className={`w-5 h-5 mx-auto ${stat.color}`} />
              <div className="text-xl font-headline font-bold">{stat.value}</div>
              <div className="text-[10px] font-bold text-on-background/30 uppercase tracking-tighter">{stat.label}</div>
            </div>
          ))}
        </section>

        {/* Info List */}
        <section className="bg-surface-container-high rounded-3xl border border-outline-variant/10 overflow-hidden">
          <div className="p-4 border-b border-outline-variant/5 flex items-center gap-4">
            <Mail className="w-5 h-5 text-on-background/30" />
            <div className="flex-1">
              <div className="text-[10px] font-bold text-on-background/30 uppercase tracking-widest">电子邮箱</div>
              {isEditing ? (
                <input 
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="text-sm font-medium bg-transparent border-b border-primary/20 w-full outline-none"
                />
              ) : (
                <div className="text-sm font-medium">{userEmail}</div>
              )}
            </div>
          </div>
          <div className="p-4 border-b border-outline-variant/5 flex items-center gap-4">
            <Music className="w-5 h-5 text-on-background/30" />
            <div className="flex-1">
              <div className="text-[10px] font-bold text-on-background/30 uppercase tracking-widest">主要乐器</div>
              {isEditing ? (
                <input 
                  value={instruments.join(', ')}
                  onChange={(e) => setInstruments(e.target.value.split(',').map(s => s.trim()))}
                  className="text-sm font-medium bg-transparent border-b border-primary/20 w-full outline-none"
                  placeholder="用逗号分隔"
                />
              ) : (
                <div className="text-sm font-medium">{instruments.join(' / ') || '未设置'}</div>
              )}
            </div>
          </div>
          <div className="p-4 flex items-center gap-4">
            <MapPin className="w-5 h-5 text-on-background/30" />
            <div className="flex-1">
              <div className="text-[10px] font-bold text-on-background/30 uppercase tracking-widest">所属乐团</div>
              {isEditing ? (
                <input 
                  value={orchestra}
                  onChange={(e) => setOrchestra(e.target.value)}
                  className="text-sm font-medium bg-transparent border-b border-primary/20 w-full outline-none"
                />
              ) : (
                <div className="text-sm font-medium">{orchestra}</div>
              )}
            </div>
          </div>
        </section>

        {/* Action List */}
        <section className="space-y-2">
          <button 
            onClick={() => onViewChange('settings')}
            className="w-full flex items-center justify-between p-4 bg-surface-container-high rounded-2xl border border-outline-variant/5 hover:bg-surface-bright transition-colors"
          >
            <div className="flex items-center gap-4">
              <Settings className="w-5 h-5 text-primary" />
              <span className="font-bold text-sm">系统设置</span>
            </div>
            <ChevronRight className="w-4 h-4 text-on-background/20" />
          </button>
          <button 
            onClick={onLogout}
            className="w-full flex items-center justify-between p-4 bg-surface-container-high rounded-2xl border border-outline-variant/5 hover:bg-surface-bright transition-colors text-error"
          >
            <div className="flex items-center gap-4">
              <LogOut className="w-5 h-5" />
              <span className="font-bold text-sm">退出登录</span>
            </div>
          </button>
        </section>
      </main>
    </div>
  );
}
