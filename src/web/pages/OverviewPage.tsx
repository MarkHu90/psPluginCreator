import { useProjectStore } from '../store/projectStore';
import { CheckboxField } from '../components/CheckboxField';
import { SelectField } from '../components/SelectField';
import { TextField } from '../components/TextField';

export function OverviewPage() {
  const spec = useProjectStore((store) => store.spec);
  const update = useProjectStore((store) => store.update);
  if (!spec) return null;

  const oauthEnabled = spec.plugin.oauth?.enabled ?? false;
  const level = spec.plugin.oauth?.accessLevelV1Api ?? 'NONE';

  return (
    <section>
      <h2>插件信息</h2>
      <div className="form-section">
        <TextField label="名称" value={spec.plugin.name} onChange={(value) => update('plugin.name', value)} />
        <TextField label="描述" value={spec.plugin.description} onChange={(value) => update('plugin.description', value)} />
        <TextField label="版本" value={spec.plugin.version} onChange={(value) => update('plugin.version', value)} />
        <TextField label="DB 名称" value={spec.plugin.dbName} onChange={(value) => update('plugin.dbName', value)} />
        <TextField label="DB 描述" value={spec.plugin.dbDescription} onChange={(value) => update('plugin.dbDescription', value)} />
        <TextField label="DB 版本" value={spec.plugin.dbVersion} onChange={(value) => update('plugin.dbVersion', value)} />
        <TextField label="导航版本" value={spec.plugin.navVersion} onChange={(value) => update('plugin.navVersion', value)} />
        <TextField label="发布者名称" value={spec.plugin.publisher.name} onChange={(value) => update('plugin.publisher.name', value)} />
        <TextField label="发布者邮箱" value={spec.plugin.publisher.email} onChange={(value) => update('plugin.publisher.email', value)} />
        <CheckboxField
          label="启用 OAuth"
          checked={oauthEnabled}
          onChange={(enabled) =>
            update('plugin.oauth', { enabled, accessLevelV1Api: level })
          }
        />
        {oauthEnabled ? (
          <SelectField
            label="V1 API 访问级别"
            value={level}
            options={[
              { value: 'NONE', label: 'NONE' },
              { value: 'READ', label: 'READ' },
              { value: 'FULL', label: 'FULL' },
            ]}
            onChange={(value) =>
              update('plugin.oauth', { enabled: true, accessLevelV1Api: value })
            }
          />
        ) : null}
      </div>

      <div className="form-section">
        <h2>摘要</h2>
        <p>表 {spec.tables.length} · 页面 {spec.pages.length} · 导航文件 {spec.navigation.length} · raw 文件 {spec.rawFiles.length}</p>
      </div>
    </section>
  );
}
