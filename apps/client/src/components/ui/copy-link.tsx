import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Link } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CopyLinkProps {
  url: string;
  variant?: 'default' | 'compact';
  className?: string;
}

export function CopyLink({ url, variant = 'default', className }: CopyLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
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

  if (variant === 'compact') {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        className={className}
      >
        {copied ? (
          <>
            <Check className="mr-2 size-4" />
            Copied!
          </>
        ) : (
          <>
            <Link className="mr-2 size-4" />
            Copy link
          </>
        )}
      </Button>
    );
  }

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
