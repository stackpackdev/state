import { defineStore, z, getDefaultActor } from 'state-agent';
import type { User } from '../types';

// Fake user database
const FAKE_USERS: Record<string, User> = {
  admin: { id: 'u1', name: 'Alice Admin', email: 'alice@example.com' },
  user: { id: 'u2', name: 'Bob User', email: 'bob@example.com' },
};

export const auth = defineStore({
  name: 'auth',
  schema: z.object({
    user: z.union([
      z.object({ id: z.string(), name: z.string(), email: z.string() }),
      z.null(),
    ]),
    isAuthenticated: z.boolean(),
    isLoading: z.boolean(),
    error: z.union([z.string(), z.null()]),
  }),
  initial: {
    user: null as User | null,
    isAuthenticated: false,
    isLoading: false,
    error: null as string | null,
  },
  when: {
    isLoading: (s) => s.isLoading,
    hasError: (s) => s.error !== null,
  },
  gates: {
    isAuthenticated: (s) => s.isAuthenticated,
    isGuest: (s) => !s.isAuthenticated,
  },
  computed: {
    userName: (s) => s.user?.name ?? 'Guest',
  },
});

export async function login(username: string, _password: string): Promise<void> {
  const actor = getDefaultActor();
  auth.store.update((draft) => {
    draft.isLoading = true;
    draft.error = null;
  }, actor);

  await new Promise((r) => setTimeout(r, 500));

  const user = FAKE_USERS[username];
  if (user) {
    auth.store.update((draft) => {
      draft.user = user;
      draft.isAuthenticated = true;
      draft.isLoading = false;
      draft.error = null;
    }, actor);
  } else {
    auth.store.update((draft) => {
      draft.isLoading = false;
      draft.error = 'Invalid username or password';
    }, actor);
  }
}

export function logout(): void {
  const actor = getDefaultActor();
  auth.store.reset({
    user: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,
  }, actor);
}
