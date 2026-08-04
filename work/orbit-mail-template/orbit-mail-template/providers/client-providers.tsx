'use client';

import { SidebarProvider } from '@/components/ui/sidebar';
import { NuqsAdapter } from 'nuqs/adapters/next/app';
import { QueryProvider } from './query-provider';
import { useSettings } from '@/hooks/use-settings';
import CustomToaster from '@/components/ui/toast';
import { Provider as JotaiProvider } from 'jotai';
import type { PropsWithChildren } from 'react';
import { ThemeProvider } from 'next-themes';

export function ClientProviders({ children }: PropsWithChildren) {
  return (
    <NuqsAdapter>
      <JotaiProvider>
        <QueryProvider>
          <ThemeAndSidebarProviders>{children}</ThemeAndSidebarProviders>
        </QueryProvider>
      </JotaiProvider>
    </NuqsAdapter>
  );
}

function ThemeAndSidebarProviders({ children }: PropsWithChildren) {
  const { data } = useSettings();

  const theme = data?.settings.colorTheme || 'system';

  return (
    <ThemeProvider attribute="class" enableSystem disableTransitionOnChange defaultTheme={theme}>
      <SidebarProvider>
        {children}
        <CustomToaster />
      </SidebarProvider>
    </ThemeProvider>
  );
}
