'use client';

import { useMemo } from 'react';
import { createApiClient } from '@/lib/api-client';
import { useMockSession } from './use-mock-session';

export function useApiClient(): ReturnType<typeof createApiClient> {
  const session = useMockSession();
  return useMemo(
    () => createApiClient({ getAuthToken: () => session.token }),
    [session.token],
  );
}
