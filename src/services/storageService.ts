import { openDB, IDBPDatabase } from 'idb';

const DB_NAME = 'nocturne-db';
const STORE_NAME = 'scores';
const META_STORE = 'metadata';

export interface PlacedObject {
  id: string;
  type: 'symbol' | 'text' | 'fingering';
  content: string;
  x: number;
  y: number;
  color?: string;
  fontSize?: number;
}

export interface ScorePart {
  id: string;
  name: string;
  blob: Blob;
  assignedTo?: string[]; // Roles like 'Violin I', 'Cello'
  pendingRequests?: string[]; // User IDs requesting access
  tags?: string[];
}

export interface ScoreData {
  id: string;
  title: string;
  composer?: string;
  duration?: number; // Total seconds
  tags?: string[];
  folder?: string; // Folder name
  isFavorite?: boolean;
  lastViewedAt?: number;
  blob: Blob; // Main/Full score
  audioBlob?: Blob; // Recording
  coverBlob?: Blob; // Cover image
  type: 'single' | 'collection'; // Single part vs Collection of parts
  parts?: ScorePart[];
  updatedAt: number;
  uploaderId?: string;
  uploaderName?: string;
  allowDownload?: boolean;
  bpm?: number;
  key?: string;
  annotations?: { [page: number]: string }; // JSON string from CanvasDraw
  objects?: { [page: number]: PlacedObject[] };
  originalScoreId?: string; // If this is a member's copy of an admin score
}

export interface Setlist {
  id: string;
  name: string;
  program: string[]; // Array of score IDs in order
  createdAt: number;
  status?: 'active' | 'archived' | 'completed';
  imageBlob?: Blob;
  performanceDate?: number;
}

export interface GlobalSyncState {
  metronome?: {
    bpm: number;
    isPlaying: boolean;
    startTime: number;
  };
  pushedScoreId?: string;
  pushedAt?: number;
}

export interface RoleChangeRequest {
  id: string;
  userId: string;
  userName: string;
  requestedRole: string;
  timestamp: number;
  status: 'pending' | 'approved' | 'rejected';
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSystem?: boolean;
}

export type UserRole = 'admin' | 'sub-admin' | 'member';

export interface GroupInfo {
  id: string;
  name: string;
  inviteCode: string;
  mainAdminId: string;
  subAdminIds: string[];
  members: string[];
}

export interface UserProfile {
  name: string;
  email: string;
  instruments: string[];
  orchestra: string;
  avatar?: Blob;
}

export interface AppMetadata {
  roles: string[];
  partTags: string[];
  folders: string[];
  program?: string[]; // Legacy - keep for compatibility
  setlists?: Setlist[];
  activeSetlistId?: string;
  folderCovers?: { [folderName: string]: Blob };
  folderAliases?: { [userId: string]: { [originalName: string]: string } }; // Admin's local names for member folders
  notifications?: Notification[];
  syncState?: GlobalSyncState;
  roleRequests?: RoleChangeRequest[];
  groups?: GroupInfo[];
  activeGroupId?: string;
  chatHistory?: { [groupId: string]: ChatMessage[] };
  userRole?: UserRole;
  profile?: UserProfile;
}

export interface Notification {
  id: string;
  type: 'request' | 'upload' | 'system';
  title: string;
  message: string;
  timestamp: number;
  read: boolean;
  data?: any;
}

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 3, {
      upgrade(db, oldVersion) {
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

export const storageService = {
  async saveScore(score: ScoreData) {
    const db = await getDB();
    await db.put(STORE_NAME, score);
  },

  async getScore(id: string): Promise<ScoreData | undefined> {
    const db = await getDB();
    return db.get(STORE_NAME, id);
  },

  async getAllScores(): Promise<ScoreData[]> {
    const db = await getDB();
    return db.getAll(STORE_NAME);
  },

  async deleteScore(id: string) {
    const db = await getDB();
    await db.delete(STORE_NAME, id);
  },

  async getMetadata(): Promise<AppMetadata> {
    const db = await getDB();
    const roles = await db.get(META_STORE, 'roles') || ['第一小提琴', '第二小提琴', '中提琴', '大提琴', '低音提琴', '钢琴', '指挥'];
    const partTags = await db.get(META_STORE, 'partTags') || ['弦乐', '木管', '铜管', '打击乐', '键盘'];
    const folders = await db.get(META_STORE, 'folders') || ['夏季巡演 2024', '古典精选', '练习曲集'];
    const program = await db.get(META_STORE, 'program') || [];
    const setlists = await db.get(META_STORE, 'setlists') || [];
    const activeSetlistId = await db.get(META_STORE, 'activeSetlistId') || '';
    const syncState = await db.get(META_STORE, 'syncState') || {};
    const roleRequests = await db.get(META_STORE, 'roleRequests') || [];
    const groups = await db.get(META_STORE, 'groups') || [];
    const activeGroupId = await db.get(META_STORE, 'activeGroupId') || '';
    const chatHistory = await db.get(META_STORE, 'chatHistory') || {};
    const userRole = await db.get(META_STORE, 'userRole') || 'member';
    const profile = await db.get(META_STORE, 'profile') || { name: '音乐家', email: 'musician@example.com', instruments: ['钢琴', '小提琴'], orchestra: '爱乐交响乐团' };
    return { roles, partTags, folders, program, setlists, activeSetlistId, syncState, roleRequests, groups, activeGroupId, chatHistory, userRole, profile };
  },

  async saveMetadata(meta: Partial<AppMetadata>) {
    const db = await getDB();
    if (meta.roles) await db.put(META_STORE, meta.roles, 'roles');
    if (meta.partTags) await db.put(META_STORE, meta.partTags, 'partTags');
    if (meta.folders) await db.put(META_STORE, meta.folders, 'folders');
    if (meta.program) await db.put(META_STORE, meta.program, 'program');
    if (meta.setlists) await db.put(META_STORE, meta.setlists, 'setlists');
    if (meta.activeSetlistId !== undefined) await db.put(META_STORE, meta.activeSetlistId, 'activeSetlistId');
    if (meta.syncState) await db.put(META_STORE, meta.syncState, 'syncState');
    if (meta.roleRequests) await db.put(META_STORE, meta.roleRequests, 'roleRequests');
    if (meta.groups) await db.put(META_STORE, meta.groups, 'groups');
    if (meta.activeGroupId !== undefined) await db.put(META_STORE, meta.activeGroupId, 'activeGroupId');
    if (meta.chatHistory) await db.put(META_STORE, meta.chatHistory, 'chatHistory');
    if (meta.userRole) await db.put(META_STORE, meta.userRole, 'userRole');
    if (meta.profile) await db.put(META_STORE, meta.profile, 'profile');
  }
};
