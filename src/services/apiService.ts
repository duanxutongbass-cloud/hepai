import axios from 'axios';

// 基础链接：优先使用相对路径，这在 Docker/NAS 环境下最稳健
const API_BASE = ''; 

const api = axios.create({
  baseURL: API_BASE,
});

// 如果确实需要手动切换地址，可以通过此方法
export const setServerUrl = (url: string) => {
  const formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  localStorage.setItem('nocturne_server_url', formattedUrl);
  window.location.reload();
};

export const getServerUrl = () => {
  const stored = localStorage.getItem('nocturne_server_url');
  return stored || window.location.origin;
};

// 请求拦截器：自动注入 Token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nocturne_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器：自动解包获取 data，简化组件逻辑
api.interceptors.response.use((response) => {
  return response.data;
}, (error) => {
  return Promise.reject(error);
});

export const apiService = {
  // 获取文件绝对路径
  getFileUrl: (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = getServerUrl();
    return `${baseUrl}/${path.replace(/\\/g, '/')}`;
  },

  // 认证相关
  auth: {
    login: (credentials: any) => api.post('/api/auth/login', credentials) as Promise<any>,
    register: (userData: any) => api.post('/api/auth/register', userData) as Promise<any>,
  },
  
  // 乐谱管理
  scores: {
    list: () => api.get('/api/scores') as Promise<any>,
    upload: (formData: FormData) => api.post('/api/scores', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }) as Promise<any>,
  },
  
  // 元数据同步
  metadata: {
    get: (key: string) => api.get(`/api/metadata/${key}`) as Promise<any>,
    save: (key: string, value: any) => api.post('/api/metadata', { key, value }) as Promise<any>,
  }
};
