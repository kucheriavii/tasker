export interface Status {
  id: string;
  name: string;
  /** Tasks with a "done" status are rendered struck-through (but stay in the list). */
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  statusId: string;
  collapsed: boolean;
  children: Task[];
}

export interface AppState {
  statuses: Status[];
  tasks: Task[];
}
