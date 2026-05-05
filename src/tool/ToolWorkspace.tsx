import type { ToolState } from "../features/tool-state/types";

type ToolWorkspaceProps = {
  state: ToolState;
  loading: boolean;
  saving: boolean;
  error: string | null;
  onDraftChange: (value: string) => void;
  onReset: () => Promise<void> | void;
  onSave: () => Promise<void> | void;
};

// Tool authors should start here: replace this placeholder with the tool-specific UI.
export function ToolWorkspace(props: ToolWorkspaceProps) {
  return (
    <section className="panel">
      <h2>ツール本体</h2>
      <p className="muted">この領域を各ツールの UI に置き換えてください。</p>

      <div className="tool-form">
        <textarea
          value={props.state.draft}
          onChange={(event) => props.onDraftChange(event.target.value)}
          placeholder="ここを各ツールの入力欄や計算 UI に置き換えます。"
        />

        <div className="tool-form__footer">
          <p className="muted">文字数: {props.state.draft.length}</p>

          <div className="button-row">
            <button className="ghost-button" onClick={props.onReset} disabled={props.saving}>
              リセット
            </button>
            <button
              className="primary-button"
              onClick={props.onSave}
              disabled={props.saving || props.loading}
            >
              保存
            </button>
          </div>
        </div>

        {props.error ? <p className="error">{props.error}</p> : null}
      </div>
    </section>
  );
}
