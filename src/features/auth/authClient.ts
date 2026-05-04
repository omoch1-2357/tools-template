import {
  GithubAuthProvider,
  onAuthStateChanged,
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

export function mapFirebaseUser(user: User): AuthUser {
  return {
    uid: user.uid,
    displayName: user.displayName,
    email: user.email,
  };
}

export function subscribeAuthState(callback: (user: AuthUser | null) => void) {
  if (!auth) {
    return undefined;
  }

  return onAuthStateChanged(auth, (nextUser) => {
    callback(nextUser ? mapFirebaseUser(nextUser) : null);
  });
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
