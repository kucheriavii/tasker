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
  imageIds: string[];
}

/** Tree node built client-side. */
export interface Task extends TaskRow {
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
