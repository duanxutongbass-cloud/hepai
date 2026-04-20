import { openDB, IDBPDatabase } from 'idb';
import { apiService } from './apiService';

/**
 * 【存储服务模块】
 * 
 * 这个模块非常关键，它实现了“离线优先”的存储策略：
 * 1. 使用 IndexedDB (浏览器自带的大型数据库) 在本地缓存乐谱数据，保证断网也能看谱。
 * 2. 如果检测到登录状态，会自动将本地的各种设置（书签、排序、分组）实时备份到您的 NAS 上。
 */

const DB_NAME = 'nocturne-db';
const STORE_NAME = 'scores';     // 存放乐谱 PDF 及其基本信息的仓库
const META_STORE = 'metadata';   // 存放应用配置、用户习惯、书签的仓库

// --- 类型定义 ---

export interface PlacedObject {
  id: string;
  type: 'symbol' | 'text' | 'fingering'; // 标注类型：符号、文本、指法
  content: string;
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
}

export interface ScoreData {
  id: string;
  title: string;
  composer?: string;
  tags?: string[];
  folder?: string;
  isFavorite?: boolean;
  blob?: Blob;       // 乐谱文件本身的二进制数据（用于离线查看）
  cloudUrl?: string; // 该乐谱在 NAS 上的下载链接
  annotations?: { [page: number]: string }; // 手写涂鸦数据
  objects?: { [page: number]: PlacedObject[] }; // 放置的符号数据
  updatedAt: number;
}

// ... 更多接口定义 (忽略，主要关注逻辑)

let dbPromise: Promise<IDBPDatabase> | null = null;

/**
 * 【初始化/连接数据库】
 */
function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 3, {
      upgrade(db, oldVersion) {
        // 如果用户是第一次打开应用，或者版本更新了，执行建表操作
        if (oldVersion < 1) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
        if (oldVersion < 3) {
          if (!db.objectStoreNames.contains(META_STORE)) {
            db.createObjectStore(META_STORE);
          }
        }
      },
    });
  }
  return dbPromise;
}

/**
 * 存储服务 API 集合
 */
export const storageService = {
  // 保存乐谱到本地数据库
  async saveScore(score: ScoreData) {
    const db = await getDB();
    await db.put(STORE_NAME, score);
  },

  // 获取单个乐谱信息
  async getScore(id: string): Promise<ScoreData | undefined> {
    const db = await getDB();
    return db.get(STORE_NAME, id);
  },

  // 获取所有本地缓存的乐谱
  async getAllScores(): Promise<ScoreData[]> {
    const db = await getDB();
    return db.getAll(STORE_NAME);
  },

  /**
   * 【核心同步逻辑：读取元数据】
   * 如果本地没数据，会提供一套“默认配置”。
   */
  async getMetadata(): Promise<any> {
    const db = await getDB();
    // 默认角色列表
    const roles = await db.get(META_STORE, 'roles') || ['第一小提琴', '第二小提琴', '中提琴', '大提琴', '低音提琴', '钢琴', '指挥'];
    // 默认分类标签
    const partTags = await db.get(META_STORE, 'partTags') || ['弦乐', '木管', '铜管', '打击乐', '键盘'];
    // 默认曲库文件夹
    const folders = await db.get(META_STORE, 'folders') || ['排练曲目', '演出曲目', '个人练习'];
    
    const userRole = await db.get(META_STORE, 'userRole') || 'member';
    const profile = await db.get(META_STORE, 'profile') || null;

    return { roles, partTags, folders, userRole, profile };
  },

  /**
   * 【核心同步逻辑：保存并备份到 NAS】
   * 每次您修改了设置（比如改了乐谱分类名），该函数会：
   * 1. 立即更新浏览器的本地数据库。
   * 2. 如果您登录了，顺便发一个网络请求把数据传回 NAS 备份。
   */
  async saveMetadata(meta: any) {
    const db = await getDB();
    const isLoggedIn = !!localStorage.getItem('nocturne_token');

    const saveAndSync = async (key: string, value: any) => {
      // 1. 存本地
      await db.put(META_STORE, value, key);
      // 2. 存云端 (异步进行，不影响本地流畅度)
      if (isLoggedIn) {
        apiService.metadata.save(key, value).catch(err => console.warn(`云端备份失败 [${key}]:`, err));
      }
    };

    // 遍历所有传进来的配置项进行保存
    for (const key in meta) {
      if (meta[key] !== undefined) {
        await saveAndSync(key, meta[key]);
      }
    }
  }
};
