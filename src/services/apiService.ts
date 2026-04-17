import axios from 'axios';

// 基础链接：开发环境指向本地，生产环境指向群晖 NAS IP/域名
const API_BASE = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: API_BASE,
});

// 请求拦截器：自动注入 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nocturne_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiService = {
  // 获取文件绝对路径
  getFileUrl: (path: string) => {
    if (!path) return '';
    return `${API_BASE}/${path.replace(/\\/g, '/')}`;
  },

  // 认证相关
  auth: {
    login: (credentials: any) => api.post('/api/auth/login', credentials),
    register: (userData: any) => api.post('/api/auth/register', userData),
  },
  
  // 乐谱管理
  scores: {
    list: () => api.get('/api/scores'),
    upload: (formData: FormData) => api.post('/api/scores', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
  },
  
  // 元数据同步 (Zustand 级别同步)
  metadata: {
    get: (key: string) => api.get(`/api/metadata/${key}`),
    save: (key: string, value: any) => api.post('/api/metadata', { key, value }),
  }
};
