import { useState } from 'react';
import { motion } from 'motion/react';
import { Mail, Lock, User, ArrowRight, ChevronLeft, ShieldCheck, Music, Globe, Cloud, AlertCircle } from 'lucide-react';
import { apiService } from '../services/apiService';

interface AuthViewProps {
  onBack: () => void;
  onSuccess: (user: any) => void;
}

export default function AuthView({ onBack, onSuccess }: AuthViewProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        const response = await apiService.auth.login({ email, password });
        localStorage.setItem('nocturne_token', response.token);
        onSuccess(response.user);
      } else {
        await apiService.auth.register({ email, password, name });
        // 注册成功后自动尝试登录
        const loginResponse = await apiService.auth.login({ email, password });
        localStorage.setItem('nocturne_token', loginResponse.token);
        onSuccess(loginResponse.user);
      }
    } catch (err: any) {
      console.error('Auth Full Error:', err);
      let errorMsg = '连接失败：请检查 NAS 上的 4000 端口映射或防火墙设置';
      
      if (err.response) {
        // 请求发出了，服务器也响应了，但状态码超出了 2xx 范围
        console.log('Error Data:', err.response.data);
        console.log('Error Status:', err.response.status);
        errorMsg = err.response.data?.detail || err.response.data?.error || `服务器错误 (${err.response.status})`;
      } else if (err.request) {
        // 请求发出了，但没有收到响应
        console.warn('No response received:', err.request);
        errorMsg = '无法连接到服务器：请确保您正在访问的是 NAS 的内网 IP，且 Docker 容器正在运行';
      } else {
        // 在设置请求时触发了一些错误
        errorMsg = `请求配置错误: ${err.message}`;
      }
      
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="p-6 flex items-center gap-4">
        <button onClick={onBack} className="p-2 hover:bg-surface-container rounded-full transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="font-headline font-bold text-xl">{isLogin ? '欢迎回来' : '创建账号'}</h1>
      </header>

      <main className="flex-1 px-6 py-8 max-w-md mx-auto w-full space-y-8">
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Music className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-headline font-bold">Nocturne Reader</h2>
          <p className="text-sm text-on-background/50">专业乐团乐谱管理与协作平台</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 rounded-2xl flex items-center gap-3 text-sm font-bold ${error.includes('成功') ? 'bg-primary/10 text-primary' : 'bg-error/10 text-error'}`}
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p>{error}</p>
            </motion.div>
          )}

          {!isLogin && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest ml-4">姓名</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-background/30" />
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 ring-primary/20 transition-all"
                  placeholder="您的姓名"
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest ml-4">电子邮箱</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-background/30" />
              <input 
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 ring-primary/20 transition-all"
                placeholder="example@mail.com"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-on-background/40 uppercase tracking-widest ml-4">密码</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-on-background/30" />
              <input 
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-high border border-outline-variant/10 rounded-2xl py-4 pl-12 pr-4 outline-none focus:ring-2 ring-primary/20 transition-all"
                placeholder="••••••••"
                required
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary text-on-primary py-4 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
            ) : (
              <>
                {isLogin ? '登录' : '注册'}
                <ArrowRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-bold text-primary hover:underline"
          >
            {isLogin ? '没有账号？立即注册' : '已有账号？直接登录'}
          </button>
        </div>

        <div className="pt-8 grid grid-cols-3 gap-4">
          <div className="text-center space-y-1">
            <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center mx-auto">
              <Cloud className="w-5 h-5 text-on-background/40" />
            </div>
            <p className="text-[8px] font-bold text-on-background/40 uppercase">云端同步</p>
          </div>
          <div className="text-center space-y-1">
            <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center mx-auto">
              <ShieldCheck className="w-5 h-5 text-on-background/40" />
            </div>
            <p className="text-[8px] font-bold text-on-background/40 uppercase">数据安全</p>
          </div>
          <div className="text-center space-y-1">
            <div className="w-10 h-10 bg-surface-container rounded-full flex items-center justify-center mx-auto">
              <Globe className="w-5 h-5 text-on-background/40" />
            </div>
            <p className="text-[8px] font-bold text-on-background/40 uppercase">多端支持</p>
          </div>
        </div>
      </main>
    </div>
  );
}
