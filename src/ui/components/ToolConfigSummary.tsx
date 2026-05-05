import type { currentTool } from "../../config/tool";

type ToolConfigSummaryProps = {
  tool: typeof currentTool;
};

export function ToolConfigSummary(props: ToolConfigSummaryProps) {
  return (
    <section className="panel">
      <h2>このテンプレートで置き換える項目</h2>
      <div className="meta-list">
        <div className="meta-row">
          <span className="muted">ツール ID</span>
          <strong>{props.tool.id}</strong>
        </div>
        <div className="meta-row">
          <span className="muted">リポジトリ</span>
          <strong>{props.tool.fullRepo}</strong>
        </div>
        <div className="meta-row">
          <span className="muted">タグ</span>
          <strong>{props.tool.tags.join(", ")}</strong>
        </div>
      </div>
    </section>
  );
}
