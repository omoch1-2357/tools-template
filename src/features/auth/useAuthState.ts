import { useEffect, useState } from "react";

import { isFirebaseConfigured } from "../../lib/firebase/client";
import { subscribeAuthState } from "./authClient";
import type { AuthUser } from "./types";

type AuthState = {
  user: AuthUser | null;
  loading: boolean;
  authEnabled: boolean;
};

export function useAuthState(): AuthState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(isFirebaseConfigured);

  useEffect(() => {
    return subscribeAuthState((nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  return {
    user,
    loading,
    authEnabled: isFirebaseConfigured,
  };
}
