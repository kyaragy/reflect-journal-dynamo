import type {
  CreateTodoLabelInput,
  CreateTodoTaskInput,
  TodoLabel,
  TodoSnapshot,
  TodoTask,
  UpdateTodoLabelInput,
  UpdateTodoTaskInput,
} from '../domain/todo';

export type TodoSnapshotRange = {
  from: string;
  to: string;
};

export interface TodoRepository {
  getSnapshot(range?: TodoSnapshotRange): Promise<TodoSnapshot>;
  createTask(input: CreateTodoTaskInput): Promise<TodoTask>;
  updateTask(taskId: string, input: UpdateTodoTaskInput): Promise<TodoTask | null>;
  reorderTasks(taskIds: string[]): Promise<void>;
  deleteTask(taskId: string): Promise<void>;
  createLabel(input: CreateTodoLabelInput): Promise<TodoLabel>;
  updateLabel(labelId: string, input: UpdateTodoLabelInput): Promise<TodoLabel | null>;
  deleteLabel(labelId: string): Promise<void>;
}
