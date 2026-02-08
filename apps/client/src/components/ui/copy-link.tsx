import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyLinkProps {
  url: string;
  className?: string;
}

export function CopyLink({ url, className }: CopyLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = url;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className={cn('flex gap-2', className)}>
      <Input
        value={url}
        readOnly
        className="flex-1"
        onClick={(e) => e.currentTarget.select()}
      />
      <Button
        type="button"
        variant={copied ? 'default' : 'outline'}
        onClick={handleCopy}
        className="min-w-24"
      >
        {copied ? (
          <>
            <Check className="mr-2 size-4" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="mr-2 size-4" />
            Copy
          </>
        )}
      </Button>
    </div>
  );
}
