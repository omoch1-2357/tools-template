import {
  getIdTokenResult,
  GithubAuthProvider,
  onIdTokenChanged,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";

import { auth, isFirebaseConfigured } from "../../lib/firebase/client";
import type { AuthUser } from "./types";

const provider = new GithubAuthProvider();
provider.setCustomParameters({
  allow_signup: "true",
});

export async function mapFirebaseUser(user: User, forceRefresh = false): Promise<AuthUser> {
  const tokenResult = await getIdTokenResult(user, forceRefresh);

  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
    isAdmin: tokenResult.claims.admin === true,
  };
}

export function subscribeAuthState(callback: (user: AuthUser | null) => void) {
  if (!auth) {
    return undefined;
  }

  let active = true;
  const unsubscribe = onIdTokenChanged(auth, (nextUser) => {
    if (!nextUser) {
      callback(null);
      return;
    }

    void mapFirebaseUser(nextUser)
      .then((mappedUser) => {
        if (active) {
          callback(mappedUser);
        }
      })
      .catch(() => {
        if (active) {
          callback({
            uid: nextUser.uid,
            displayName: nextUser.displayName,
            email: nextUser.email,
            isAdmin: false,
          });
        }
      });
  });

  return () => {
    active = false;
    unsubscribe();
  };
}

export async function refreshCurrentUserClaims() {
  if (!auth?.currentUser) {
    return null;
  }

  return mapFirebaseUser(auth.currentUser, true);
}

export async function signInWithGitHub() {
  if (!auth || !isFirebaseConfigured) {
    return;
  }

  await signInWithPopup(auth, provider);
}

export async function signOutUser() {
  if (!auth) {
    return;
  }

  await signOut(auth);
}
