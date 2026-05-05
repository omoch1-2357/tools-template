import { useEffect, useMemo, useState } from "react";

import { hasToolStateContent, initialToolState } from "../../tool/toolState";
import type { AuthUser } from "../auth/types";
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

export function useToolState(user: AuthUser | null, authEnabled: boolean): UseToolStateResult {
  const [state, setState] = useState<ToolState>(initialToolState);
  const [localStateCache, setLocalStateCache] = useState<ToolState>(initialToolState);
  const [loading, setLoading] = useState(authEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function load() {
      const nextLocalState = loadLocalState();
      if (active) {
        setLocalStateCache(nextLocalState);
      }

      if (!user) {
        setState(nextLocalState);
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
          setError(
            nextError instanceof Error ? nextError.message : "データを読み込めませんでした。",
          );
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
      if (!saveLocalState(nextState)) {
        setError("この環境ではローカル保存できませんでした。");
      } else {
        setLocalStateCache(nextState);
      }
    }
  }

  async function save() {
    const nextState = {
      ...state,
      draftUpdatedAt: new Date().toISOString(),
    };

    setSaving(true);
    setError(null);
    setState(nextState);

    try {
      if (user) {
        await saveCloudState(user, nextState);
      } else {
        if (!saveLocalState(nextState)) {
          throw new Error("この環境ではローカル保存できませんでした。");
        }
        setLocalStateCache(nextState);
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

    if (!hasToolStateContent(localStateCache)) {
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveCloudState(user, localStateCache);
      setState(localStateCache);
      clearLocalState();
      setLocalStateCache(initialToolState);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "同期できませんでした。");
    } finally {
      setSaving(false);
    }
  }

  async function reset() {
    const nextState = initialToolState;

    if (!user) {
      clearLocalState();
      setLocalStateCache(initialToolState);
      setState(nextState);
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await saveCloudState(user, nextState);
      setState(nextState);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "リセットできませんでした。");
    } finally {
      setSaving(false);
    }
  }

  const lastSavedLabel = useMemo(() => {
    if (!state.draftUpdatedAt) {
      return "未保存";
    }

    return new Date(state.draftUpdatedAt).toLocaleString("ja-JP");
  }, [state.draftUpdatedAt]);

  return {
    state,
    loading,
    saving,
    error,
    setDraft,
    save,
    syncLocalToCloud,
    hasLocalData: hasToolStateContent(localStateCache),
    lastSavedLabel,
    reset,
  };
}
