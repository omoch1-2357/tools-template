import type { AuthUser } from "../../features/auth/types";

type PersistencePanelProps = {
  user: AuthUser | null;
  authLoading: boolean;
  authEnabled: boolean;
  saving: boolean;
  hasLocalData: boolean;
  lastSavedLabel: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onSyncLocalToCloud: () => Promise<void> | void;
};

export function PersistencePanel(props: PersistencePanelProps) {
  return (
    <>
      <div className="status-grid">
        <StatusBlock label="保存先" value={props.user ? "Cloud" : "Local"} />
        <StatusBlock label="状態" value={props.saving ? "保存中" : "準備完了"} />
        <StatusBlock label="最終保存" value={props.lastSavedLabel} />
      </div>

      <div className="auth-box">
        {props.authLoading ? (
          <p className="muted">認証状態を確認中です。</p>
        ) : props.user ? (
          <>
            <p className="auth-box__title">
              {props.user.displayName ?? props.user.email ?? "ログイン済み"}
            </p>
            <p className="muted">GitHub アカウントで同期できます。</p>
            <div className="button-row">
              <button
                className="secondary-button"
                onClick={props.onSyncLocalToCloud}
                disabled={!props.hasLocalData || props.saving}
              >
                ローカル内容を同期
              </button>
              <button className="secondary-button" onClick={props.onSignOut}>
                ログアウト
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="auth-box__title">未ログインでも使えます。</p>
            <p className="muted">別端末でも使いたいときだけ GitHub でログインしてください。</p>
            <button
              className="primary-button"
              onClick={props.onSignIn}
              disabled={!props.authEnabled}
            >
              GitHub でログイン
            </button>
            {!props.authEnabled ? (
              <p className="notice">Firebase 設定未投入のため認証は無効です。</p>
            ) : null}
          </>
        )}
      </div>
    </>
  );
}

function StatusBlock(props: { label: string; value: string }) {
  return (
    <div className="status-block">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  );
}
