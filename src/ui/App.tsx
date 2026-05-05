import { currentTool } from "../config/tool";
import { signInWithGitHub, signOutUser } from "../features/auth/authClient";
import { useAuthState } from "../features/auth/useAuthState";
import { useToolState } from "../features/tool-state/useToolState";
import { ToolWorkspace } from "../tool/ToolWorkspace";
import { PersistencePanel } from "./components/PersistencePanel";
import { TemplateHero } from "./components/TemplateHero";
import { ToolConfigSummary } from "./components/ToolConfigSummary";

export function App() {
  const { user, loading: authLoading, authEnabled } = useAuthState();
  const {
    state,
    loading,
    saving,
    error,
    setDraft,
    save,
    syncLocalToCloud,
    hasLocalData,
    lastSavedLabel,
    reset,
  } = useToolState(user, authEnabled);

  return (
    <div className="shell">
      <TemplateHero tool={currentTool}>
        <PersistencePanel
          user={user}
          authLoading={authLoading}
          authEnabled={authEnabled}
          saving={saving}
          hasLocalData={hasLocalData}
          lastSavedLabel={lastSavedLabel}
          onSignIn={signInWithGitHub}
          onSignOut={signOutUser}
          onSyncLocalToCloud={syncLocalToCloud}
        />
      </TemplateHero>

      <main className="content">
        <ToolWorkspace
          state={state}
          loading={loading}
          saving={saving}
          error={error}
          onDraftChange={setDraft}
          onReset={reset}
          onSave={save}
        />
        <ToolConfigSummary tool={currentTool} />
      </main>
    </div>
  );
}
