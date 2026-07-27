'use client';

import * as React from 'react';
import { ExternalLink, Loader2, Smartphone } from 'lucide-react';

import { useDebouncedValue } from '@/lib/use-debounced-value';

const URL_PATTERN = /^https?:\/\/.+/;

export function PhonePreview({ url }: { url: string }) {
  const debouncedUrl = useDebouncedValue(url.trim(), 600);
  const isValidUrl = URL_PATTERN.test(debouncedUrl);
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
  }, [debouncedUrl]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="border-foreground/80 bg-foreground/80 relative aspect-[9/19.5] w-56 shrink-0 rounded-[2.25rem] border-[10px] shadow-lg">
        <div className="bg-foreground/80 absolute top-0 left-1/2 z-10 h-5 w-24 -translate-x-1/2 rounded-b-xl" />
        <div className="bg-background relative h-full w-full overflow-hidden rounded-[1.5rem]">
          {!isValidUrl ? (
            <div className="text-muted-foreground flex h-full flex-col items-center justify-center gap-2 p-4 text-center text-xs">
              <Smartphone className="size-6" />
              Enter a website URL to preview it here
            </div>
          ) : (
            <>
              {!loaded && (
                <div className="bg-background absolute inset-0 z-10 flex items-center justify-center">
                  <Loader2 className="text-muted-foreground size-5 animate-spin" />
                </div>
              )}
              <iframe
                key={debouncedUrl}
                src={debouncedUrl}
                title="Website preview"
                className="h-full w-full border-0"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
                onLoad={() => setLoaded(true)}
              />
            </>
          )}
        </div>
      </div>

      {isValidUrl && (
        <div className="text-muted-foreground max-w-56 space-y-1 text-center text-xs">
          <p>Live preview — some sites block embedding and may appear blank here.</p>
          <a
            href={debouncedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground inline-flex items-center gap-1 font-medium hover:underline"
          >
            Open in new tab
            <ExternalLink className="size-3" />
          </a>
        </div>
      )}
    </div>
  );
}
