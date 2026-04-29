import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, ArrowRight, ChevronLeft, ShieldCheck, Music, Globe, Cloud, AlertCircle, Settings, Server, Check } from 'lucide-react';
import { apiService, getServerUrl, setServerUrl } from '../services/apiService';

/**
 * 身份验证视图（登录/注册页面）
 */
interface AuthViewProps {
  onBack: () => void; // 返回上一页的回调
  onSuccess: (user: any) => void; // 登录/注册成功后的回调
}

export default function AuthView({ onBack, onSuccess }: AuthViewProps) {
  // 页面状态：isLogin 为 true 表示登录模式，false 表示注册模式
  const [isLogin, setIsLogin] = useState(true);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [serverUrlInput, setServerUrlInput] = useState(getServerUrl());
  
  // 表单输入项
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  // UI 交互状态
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const saveServerSettings = () => {
    setServerUrl(serverUrlInput);
    setShowServerSettings(false);
  };

  /**
   * 处理表单提交
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      if (isLogin) {
        // --- 登录逻辑 ---
        const response = await apiService.auth.login({ email, password });
        localStorage.setItem('nocturne_token', response.token); // 保存登录凭证
        onSuccess(response.user);
      } else {
        // --- 注册逻辑 ---
        await apiService.auth.register({ email, password, name });
        // 注册成功后
        setError('注册成功！正在为您自动登录...');
        
        // 注册成功后，为了用户体验，自动帮用户在后台调一次登录
        const loginResponse = await apiService.auth.login({ email, password });
        localStorage.setItem('nocturne_token', loginResponse.token);
        onSuccess(loginResponse.user);
      }
    } catch (err: any) {
      console.error('Auth Full Error:', err);
      const targetUrl = getServerUrl();
      let errorMsg = `连接失败 [${targetUrl}]：请检查 NAS 上的 4000 端口映射或防火墙设置`;
      
      if (err.response) {
        // 【服务器报错】比如：密码错误、邮箱已存在等
        console.log('Error Data:', err.response.data);
        errorMsg = err.response.data?.detail || err.response.data?.error || `服务器错误 (${err.response.status})`;
      } else if (err.request) {
        // 【网络断开】无法建立 TCP 连接（NAS IP 错或者防火墙拦了）
        errorMsg = `无法连接到服务器 (${targetUrl})：请确保您正在访问的是 NAS 的 IP (包含 http:// 和 4000 端口)，且 Docker 容器正在运行。`;
        
        // 专门针对 Mixed Content 的提示
        if (window.location.protocol === 'https:' && targetUrl.startsWith('http:')) {
          errorMsg += ' 注意：您正在使用 HTTPS 访问，无法连接到 HTTP 服务器。请尝试使用 https:// 或更换非加密浏览器访问。';
        }
      } else {
        // 【系统配置错误】
        errorMsg = `请求配置错误: ${err.message}`;
      }
      
      setError(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 顶部标题栏 */}
      <header className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-surface-container rounded-full transition-colors">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-headline font-bold text-xl">{isLogin ? '欢迎回来' : '创建账号'}</h1>
        </div>
        <button 
          onClick={() => setShowServerSettings(!showServerSettings)}
          className={`p-2 rounded-full transition-all ${showServerSettings ? 'bg-primary text-on-primary rotate-90' : 'hover:bg-surface-container text-on-background/40'}`}
        >
          <Settings className="w-6 h-6" />
        </button>
      </header>

      <main className="flex-1 px-6 py-8 max-w-md mx-auto w-full space-y-8 relative">
        {/* 服务器设置面板 */}
        <AnimatePresence>
          {showServerSettings && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -20 }}
              className="absolute inset-x-6 top-0 z-50 bg-surface-container-highest p-6 rounded-3xl border border-primary/20 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-primary">
                <Server className="w-5 h-5" />
                <h3 className="font-bold">服务器连接设置</h3>
              </div>
              <p className="text-[10px] text-on-background/50 leading-relaxed">
                如果您在内网环境或公网域名不可用，请手动输入您的 NAS IP 地址（需包含 http:// 和 4000 端口）。
              </p>
              <div className="space-y-2">
                <input 
                  type="text"
                  value={serverUrlInput}
                  onChange={(e) => setServerUrlInput(e.target.value)}
                  className="w-full bg-background border border-outline-variant/20 rounded-xl py-3 px-4 text-sm font-mono outline-none focus:ring-2 ring-primary/20"
                  placeholder="http://192.168.x.x:4000"
                />
                
                {window.location.protocol === 'https:' && serverUrlInput.startsWith('http:') && (
                  <div className="p-2 bg-amber-500/10 rounded-lg flex items-start gap-2 border border-amber-500/20">
                    <AlertCircle className="w-3 h-3 text-amber-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[9px] text-amber-500 leading-tight">
                      <b>Mixed Content 警告</b>：您正在通过 HTTPS 访问网页，无法连接 HTTP 地址。请尝试改用 https:// 或直接访问内网版网页。
                    </p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={async () => {
                      setIsLoading(true);
                      try {
                        await apiService.maintenance.testConnection(serverUrlInput);
                        alert('✅ 连接成功！服务器已响应');
                      } catch (e: any) {
                        alert(`❌ 连接失败：${e.message}\n请检查域名、端口转发或 HTTPS 证书配置。`);
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    className="bg-surface-container py-3 rounded-xl font-bold text-xs hover:bg-surface-container-high transition-colors"
                  >
                    测试连接
                  </button>
                  <button 
                    onClick={saveServerSettings}
                    className="bg-primary text-on-primary py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2"
                  >
                    <Check className="w-4 h-4" />
                    保存并应用
                  </button>
                  <button 
                    onClick={() => {
                      setServerUrlInput(window.location.origin);
                      localStorage.removeItem('nocturne_server_url');
                    }}
                    className="col-span-2 mt-2 py-2 text-[10px] font-bold text-primary/60 border border-primary/10 rounded-xl hover:bg-primary/5 transition-all"
                  >
                    重置为当前网页地址 (推荐)
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* LOGO 区域 */}
        <div className="text-center space-y-2">
          <div className="w-20 h-20 bg-primary/10 rounded-3xl flex items-center justify-center mx-auto mb-4">
            <Music className="w-10 h-10 text-primary" />
          </div>
          <h2 className="text-2xl font-headline font-bold">Nocturne Reader</h2>
          <p className="text-sm text-on-background/50">专业乐团乐谱管理与协作平台</p>
        </div>

        {/* 表单区域 */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 错误信息提示窗 */}
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

          {/* 注册模式下的“姓名”输入框 */}
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

          {/* 邮箱输入框 */}
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

          {/* 密码输入框 */}
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

          {/* 提交按钮 */}
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

        {/* 模式切换按钮 */}
        <div className="text-center">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm font-bold text-primary hover:underline"
          >
            {isLogin ? '没有账号？立即注册' : '已有账号？直接登录'}
          </button>
        </div>

        {/* 到底提示特征信息 */}
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
