import type { User } from "firebase/auth";
import { useEffect, useMemo, useState } from "react";
import { clearLocalState, loadLocalState, saveLocalState } from "./storage";
import { fetchCloudState, saveCloudState } from "./toolStateService";
import type { ToolState } from "./types";

type UseToolStateResult = {
  state: ToolState;
  loading: boolean;
  saving: boolean;
  error: string | null;
  setDraft: (value: string) => void;
  save: () => Promise<void>;
  syncLocalToCloud: () => Promise<void>;
  hasLocalData: boolean;
  lastSavedLabel: string;
  reset: () => Promise<void>;
};

const emptyState: ToolState = {
  draft: "",
  updatedAt: null,
};

export function useToolState(user: User | null, authEnabled: boolean): UseToolStateResult {
  const [state, setState] = useState<ToolState>(emptyState);
  const [loading, setLoading] = useState(authEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      if (!user) {
        setState(loadLocalState());
        setLoading(false);
        return;
      }

      try {
        const cloudState = await fetchCloudState(user);
        if (!active) {
          return;
        }

        setState(cloudState);
        setError(null);
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "データを読み込めませんでした。");
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => {
      active = false;
    };
  }, [user]);

  function setDraft(value: string) {
    const nextState = {
      ...state,
      draft: value,
    };

    setState(nextState);

    if (!user) {
      saveLocalState(nextState);
    }
  }

  async function save() {
    const nextState = {
      ...state,
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    setError(null);
    setState(nextState);

    try {
      if (user) {
        await saveCloudState(user, nextState);
      } else {
        saveLocalState(nextState);
      }
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "保存できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function syncLocalToCloud() {
    if (!user) {
      return;
    }

    const localState = loadLocalState();
    if (!localState.draft && !localState.updatedAt) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveCloudState(user, localState);
      setState(localState);
      clearLocalState();
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "同期できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    const nextState = emptyState;
    setState(nextState);

    if (!user) {
      clearLocalState();
      return;
    }

    await saveCloudState(user, nextState);
  }

  const lastSavedLabel = useMemo(() => {
    if (!state.updatedAt) {
      return "未保存";
    }

    return new Date(state.updatedAt).toLocaleString("ja-JP");
  }, [state.updatedAt]);

  const localState = loadLocalState();

  return {
    state,
    loading,
    saving,
    error,
    setDraft,
    save,
    syncLocalToCloud,
    hasLocalData: Boolean(localState.draft || localState.updatedAt),
    lastSavedLabel,
    reset,
  };
}
