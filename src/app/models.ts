export interface Status {
  id: string;
  name: string;
  /** Tasks with a "done" status are rendered struck-through (but stay in the list). */
  done: boolean;
  /** Cancelled tasks are muted and excluded from progress. */
  cancelled: boolean;
  /** "In progress" kind: when a subtask gets it (or done), all parent tasks switch to the first active status. */
  active: boolean;
}

/** Flat task as stored in SQLite / returned by the API. */
export interface TaskRow {
  id: string;
  parentId: string | null;
  title: string;
  description: string;
  statusId: string;
  collapsed: boolean;
  deletedAt: string | null;
  /** 'task' = short-term tasks tab; 'book' = long-term books/courses/playlists tab */
  kind: 'task' | 'book';
  /** Optional deadline (ISO datetime string YYYY-MM-DDTHH:mm) */
  dueAt: string | null;
  tags: string;
  userId?: string | null;
  imageIds: string[];
}

/** Tree node built client-side. */
export interface Task extends TaskRow {
  rootKind: 'task' | 'book';
  children: Task[];
  /** 0..1, share of finished leaf tasks in this subtree */
  progress: number;
  leafTotal: number;
  leafDone: number;
}

export interface ApiData {
  statuses: Status[];
  tasks: TaskRow[];
}

export interface LibraryNode {
  title: string;
  description?: string;
  children?: LibraryNode[];
}

export interface LibraryItem {
  id: string;
  kind: 'book' | 'playlist' | 'course' | 'other';
  title: string;
  description: string;
  sourceUrl: string;
  createdAt: string;
  totalItems: number;
  items: LibraryNode[];
}

export interface DebugProfile {
  id: string;
  name: string;
  role: 'user' | 'admin';
  avatar: string;
}

export const DEBUG_PROFILES: DebugProfile[] = [
  { id: 'user-olena', name: 'Олена (користувач)', role: 'user', avatar: '👩' },
  { id: 'user-taras', name: 'Тарас (користувач)', role: 'user', avatar: '👨' },
  { id: 'user-iryna', name: 'Ірина (користувач)', role: 'user', avatar: '👩‍🦰' },
  { id: 'admin-oleksiy', name: 'Олексій (адмін)', role: 'admin', avatar: '👑' },
  { id: 'admin-maria', name: 'Марія (адмін)', role: 'admin', avatar: '👑' },
];
