'use client';

import { useMemo } from 'react';

export type Session = {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string;
  };
  connectionId: string;
};

export const staticSession: Session = {
  user: {
    id: 'template-user',
    name: 'Template User',
    email: 'template@orbit.email',
    image: '/adam.jpg',
  },
  connectionId: 'template-connection',
};

export const useSession = () => {
  const data = useMemo(() => staticSession, []);
  return {
    data,
    isPending: false,
    refetch: async () => ({ data }),
  };
};

export const getSession = async (_options?: unknown) => ({ data: staticSession });

export const signIn = Object.assign(async () => ({ data: staticSession }), {
  social: async (_options?: unknown) => ({ data: staticSession }),
});
export const signUp = async (_options?: unknown) => ({ data: staticSession });
export const signOut = async ({ fetchOptions }: { fetchOptions?: { onSuccess?: () => void } } = {}) => {
  fetchOptions?.onSuccess?.();
  return { data: null };
};

export const $fetch = async () => null;
