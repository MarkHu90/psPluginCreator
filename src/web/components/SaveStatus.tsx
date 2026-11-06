import { useProjectStore } from '../store/projectStore';

const LABELS: Record<string, string> = {
  idle: '',
  dirty: '有未保存修改',
  saving: '保存中…',
  saved: '已保存',
  conflict: '保存冲突',
  error: '保存失败',
};

export function SaveStatus() {
  const state = useProjectStore((store) => store.saveState);
  if (!LABELS[state]) return null;
  return <span className={`save-status save-${state}`}>{LABELS[state]}</span>;
}
