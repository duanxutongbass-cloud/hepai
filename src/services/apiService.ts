import axios from 'axios';

/**
 * 后端 API 服务封装模块
 * 
 * 在 Docker/NAS 环境中，前端和后端通常运行在同一个网络下。
 * 使用相对路径（空字符串）可以利用浏览器的自动识别功能，
 * 避免因为 NAS IP 变动导致无法连接的情况。
 */
const API_BASE = ''; 

// 创建 Axios 实例
const api = axios.create();

/**
 * 手动设置服务器地址
 */
export const setServerUrl = (url: string) => {
  const formattedUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  localStorage.setItem('nocturne_server_url', formattedUrl);
  // 修改后刷新页面，让新的地址生效
  window.location.reload();
};

/**
 * 获取当前正在使用的服务器基础地址
 */
export const getServerUrl = () => {
  const stored = localStorage.getItem('nocturne_server_url');
  if (stored) return stored;

  // 生产环境：直接指向公网域名
  return 'http://dxtbass.huazo.xyz:4000'; 
};

// 【请求拦截器】
api.interceptors.request.use((config) => {
  // 动态注入基础 URL
  if (config.url && !config.url.startsWith('http')) {
    config.baseURL = getServerUrl();
  }

  const token = localStorage.getItem('nocturne_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

// 【响应拦截器】
// 服务器返回数据后，自动把数据包解开，让组件里拿到的直接就是结果。
api.interceptors.response.use((response) => {
  return response.data;
}, (error) => {
  return Promise.reject(error);
});

/**
 * 业务 API 汇总
 */
export const apiService = {
  /**
   * 将数据库里的文件路径转换为浏览器可以直接访问的完整 URL
   * 比如将 "uploads/test.pdf" 变成 "http://192.168.1.5:4000/uploads/test.pdf"
   */
  getFileUrl: (path: string) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = getServerUrl();
    return `${baseUrl}/${path.replace(/\\/g, '/')}`;
  },

  // 用户认证相关接口
  auth: {
    login: (credentials: any) => api.post('/api/auth/login', credentials) as Promise<any>,
    register: (userData: any) => api.post('/api/auth/register', userData) as Promise<any>,
  },
  
  // 乐谱资源管理
  scores: {
    list: () => api.get('/api/scores') as Promise<any>,
    upload: (formData: FormData) => api.post('/api/scores', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }) as Promise<any>,
  },
  
  // 云端同步的配置/元数据（比如最近阅读、书签等）
  metadata: {
    get: (key: string) => api.get(`/api/metadata/${key}`) as Promise<any>,
    save: (key: string, value: any) => api.post('/api/metadata', { key, value }) as Promise<any>,
  }
};
