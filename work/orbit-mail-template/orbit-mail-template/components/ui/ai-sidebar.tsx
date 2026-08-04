'use client';

import { ResizablePanel } from '@/components/ui/resizable';
import { Button } from '@/components/ui/button';
import { X } from '@/components/icons/icons';
import { useQueryState } from 'nuqs';
import { cn } from '@/lib/utils';

interface AISidebarProps {
  className?: string;
}

export function useAISidebar() {
  const [open, setOpen] = useQueryState('aiSidebar');
  return {
    open: !!open,
    setOpen: (nextOpen: boolean) => setOpen(nextOpen ? 'true' : null),
    toggleOpen: () => setOpen((prev) => (prev === 'true' ? null : 'true')),
  };
}

const examplePrompts = [
  'Summarize this inbox',
  'Draft a reply to Alex',
  'Find recent invoices',
  'Show unread work emails',
];

export function AISidebar({ className }: AISidebarProps) {
  const { open, setOpen } = useAISidebar();

  if (!open) return null;

  return (
    <>
      <div className="w-[1px] opacity-0" />
      <ResizablePanel
        defaultSize={22}
        minSize={22}
        maxSize={35}
        className="bg-panelLight dark:bg-panelDark mb-1 mr-1 hidden h-[calc(98vh+10px)] border-[#E7E7E7] shadow-sm md:rounded-2xl md:border md:shadow-sm xl:block dark:border-[#252525]"
      >
        <div className={cn('flex h-[calc(98vh+6px)] flex-col', className)}>
          <div className="flex items-center justify-between border-b border-[#E7E7E7] px-3 py-3 dark:border-[#252525]">
            <div>
              <p className="text-sm font-medium">AI Assistant</p>
              <p className="text-muted-foreground text-xs">Static template preview</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
              <X className="h-4 w-4 fill-current" />
            </Button>
          </div>

          <div className="flex flex-1 flex-col gap-4 p-4">
            <div className="rounded-xl border bg-white p-3 text-sm shadow-sm dark:border-[#252525] dark:bg-[#1f1f1f]">
              This template keeps the assistant UI without calling any backend. Wire this panel to
              your own AI service when you are ready.
            </div>

            <div className="grid gap-2">
              {examplePrompts.map((prompt) => (
                <button
                  key={prompt}
                  className="hover:bg-muted rounded-lg border bg-white px-3 py-2 text-left text-sm transition-colors dark:border-[#252525] dark:bg-[#1f1f1f]"
                >
                  {prompt}
                </button>
              ))}
            </div>

            <div className="mt-auto rounded-xl border border-dashed p-3 text-xs text-muted-foreground dark:border-[#252525]">
              Static data only. No chat API, auth, billing, sockets, or analytics are used here.
            </div>
          </div>
        </div>
      </ResizablePanel>
    </>
  );
}

export default AISidebar;
