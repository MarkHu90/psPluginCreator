import { useProjectStore } from '../store/projectStore';

export function ConflictDialog() {
  const conflict = useProjectStore((store) => store.conflict);
  const reload = useProjectStore((store) => store.reload);
  const overwrite = useProjectStore((store) => store.overwrite);
  if (!conflict) return null;
  return (
    <div className="dialog-backdrop">
      <div className="dialog" role="dialog" aria-label="保存冲突">
        <h2>其他窗口已修改这个工程</h2>
        <p>服务器上有更新的版本。你可以载入服务器版本，或用自己的版本覆盖。</p>
        <div className="dialog-actions">
          <button type="button" onClick={() => void reload()}>
            载入服务器版本
          </button>
          <button type="button" className="danger" onClick={() => void overwrite()}>
            用我的版本覆盖
          </button>
        </div>
      </div>
    </div>
  );
}
