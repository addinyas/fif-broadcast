import { useEffect, useRef } from 'react';

interface Props {
  onSuccess: (text: string) => void;
}

export default function Html5QrcodePlugin({ onSuccess }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<{ stop: () => Promise<void> } | null>(null);

  useEffect(() => {
    let mounted = true;

    import('html5-qrcode').then(({ Html5Qrcode }) => {
      if (!mounted || !containerRef.current) return;
      const scanner = new Html5Qrcode('qr-reader');
      scannerRef.current = scanner;

      scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          scanner.stop();
          onSuccess(decodedText);
        },
        () => {},
      ).catch(console.error);
    });

    return () => {
      mounted = false;
      scannerRef.current?.stop().catch(() => {});
    };
  }, [onSuccess]);

  return <div id="qr-reader" ref={containerRef} className="mx-auto w-full max-w-sm" />;
}
