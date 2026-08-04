'use client';

import { QueryCache, QueryClient, QueryClientProvider, hashKey } from '@tanstack/react-query';
import demoThreads from '@/components/mail/demo.json';
import { defaultUserSettings } from '@/lib/static-settings';
import { staticSession, type Session } from '@/lib/auth-client';
import type { ParsedMessage } from '@/types';
import type { PropsWithChildren } from 'react';
import { toast } from 'sonner';

const labels = [
  { id: 'important', name: 'Important', type: 'system' },
  { id: 'updates', name: 'Updates', type: 'system' },
  { id: 'personal', name: 'Personal', type: 'system' },
  { id: 'promotions', name: 'Promotions', type: 'system' },
  { id: 'work', name: 'Work', type: 'user' },
];

const toMessage = (thread: any): ParsedMessage => ({
  id: thread.id,
  threadId: thread.threadId ?? thread.id,
  title: thread.title ?? thread.subject,
  subject: thread.subject ?? thread.title,
  tags: thread.tags ?? [],
  sender: thread.sender ?? { name: 'Orbit', email: 'hello@orbit.email' },
  to: [{ name: staticSession.user.name, email: staticSession.user.email }],
  cc: [],
  bcc: [],
  tls: true,
  receivedOn: thread.receivedOn ?? new Date().toISOString(),
  unread: Boolean(thread.unread),
  body: thread.body ?? '',
  processedHtml: thread.decodedBody ?? `<p>${thread.body ?? ''}</p>`,
  blobUrl: '',
  decodedBody: thread.decodedBody,
  attachments: [],
});

const staticThreads = (demoThreads as any[]).map(toMessage);
const staticThread = (id?: string) => {
  const latest = staticThreads.find((thread) => thread.id === id) ?? staticThreads[0];
  return {
    id: latest?.threadId ?? 'template-thread',
    latest,
    messages: latest ? [latest] : [],
    hasUnread: latest?.unread ?? false,
  };
};

const staticData: Record<string, any> = {
  'mail.listThreads': { threads: staticThreads, nextPageToken: null },
  'mail.get': (input: { id?: string }) => staticThread(input?.id),
  'mail.count': [
    { label: 'inbox', count: staticThreads.length },
    { label: 'draft', count: 2 },
    { label: 'sent', count: 4 },
    { label: 'spam', count: 1 },
    { label: 'bin', count: 0 },
    { label: 'archive', count: 3 },
    { label: 'unread', count: staticThreads.filter((thread) => thread.unread).length },
  ],
  'mail.getEmailAliases': [{ email: staticSession.user.email, name: staticSession.user.name, primary: true }],
  'settings.get': { settings: defaultUserSettings },
  'settings.save': { success: true },
  'labels.list': labels,
  'connections.list': [{ id: staticSession.connectionId, email: staticSession.user.email, name: staticSession.user.name }],
  'brain.getState': { enabled: true },
  'brain.getLabels': labels.map((label) => label.name),
  'brain.generateSummary': 'This static template email is ready to preview without a backend.',
  'drafts.get': {
    id: 'template-draft',
    to: ['teammate@example.com'],
    subject: 'Draft preview',
    body: 'This is a static draft in the template.',
  },
  'notes.list': [],
};

const getStaticValue = async (path: string, input?: unknown) => {
  const value = staticData[path];
  if (typeof value === 'function') return value(input);
  if (value !== undefined) return value;
  return { success: true };
};

const createProcedure = (path: string) => ({
  queryKey: (input?: unknown) => [path, input],
  queryOptions: (input?: unknown, options: Record<string, unknown> = {}) => ({
    ...options,
    queryKey: [path, input],
    queryFn: () => getStaticValue(path, input),
  }),
  infiniteQueryOptions: (input?: unknown, options: Record<string, unknown> = {}) => ({
    ...options,
    queryKey: [path, input],
    queryFn: () => getStaticValue(path, input),
    initialPageParam: '',
  }),
  mutationOptions: (options: Record<string, unknown> = {}) => ({
    ...options,
    mutationFn: (input?: unknown) => getStaticValue(path, input),
  }),
});

const createTRPCProxy = (path: string[] = []): any =>
  new Proxy(() => undefined, {
    get(_target, property) {
      if (typeof property !== 'string') return undefined;
      if (['queryKey', 'queryOptions', 'infiniteQueryOptions', 'mutationOptions'].includes(property)) {
        return (createProcedure(path.join('.')) as any)[property];
      }
      if (property === 'query' || property === 'mutate') {
        return (input?: unknown) => getStaticValue(path.join('.'), input);
      }
      return createTRPCProxy([...path, property]);
    },
  });

export const makeQueryClient = (session: Session | null) =>
  new QueryClient({
    queryCache: new QueryCache({
      onError: (err, { meta }) => {
        if (meta && meta.noGlobalError === true) return;
        if (meta && typeof meta.customError === 'string') toast.error(meta.customError);
        else toast.error(err.message || 'Something went wrong');
      },
    }),
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
        queryKeyHashFn: (queryKey) =>
          hashKey([
            session
              ? { userId: session.user.id, connectionId: session.connectionId }
              : { userId: null, connectionId: null },
            ...queryKey,
          ]),
        gcTime: 1000 * 60 * 60 * 24,
      },
      mutations: {
        onError: (err) => toast.error(err.message),
      },
    },
  });

const queryClient = makeQueryClient(staticSession);
const trpc = createTRPCProxy();

export const useTRPC = () => trpc;
export const useTRPCClient = () => trpcClient;
export const trpcClient = trpc;

export function QueryProvider({ children }: PropsWithChildren) {
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
