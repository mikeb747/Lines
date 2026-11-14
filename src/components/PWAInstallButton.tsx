import React, { useEffect, useState } from 'react';
import { Download, CheckCircle2, Smartphone, WifiOff } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener(
        'beforeinstallprompt',
        handleBeforeInstallPrompt
      );
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg"
    >
      <WifiOff className="h-3.5 w-3.5 shrink-0" />
      <span>Offline Mode — Local calibration engine & cached catalog active</span>
    </div>
  );
};

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isIOS: boolean;
  onTriggerNativeInstall: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isIOS,
  onTriggerNativeInstall,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pwa-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <Smartphone className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
            <h3
              id="pwa-modal-title"
              className="text-base font-semibold text-slate-900 dark:text-slate-100"
            >
              Offline Progressive Web App (PWA) & GitHub Pages
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            Close
          </button>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          SpectroCal runs 100% client-side with an embedded NIST Neon I emission
          catalog and Workbox service worker. Once installed or hosted on GitHub
          Pages, optical test bays without internet access can audit calibration
          files and compute grating step sizes offline.
        </p>

        <div className="mt-4 space-y-2.5 border-t border-slate-200 pt-4 text-xs text-slate-700 dark:border-slate-800 dark:text-slate-300">
          {isInstallable ? (
            <div className="space-y-3">
              <p className="font-medium text-emerald-700 dark:text-emerald-400">
                Browser supports direct standalone installation:
              </p>
              <button
                type="button"
                onClick={() => {
                  onTriggerNativeInstall();
                  onClose();
                }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-cyan-700"
              >
                <Download className="h-4 w-4" />
                Install Standalone App Now
              </button>
            </div>
          ) : isIOS ? (
            <div className="space-y-1.5">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Install on iOS / iPadOS Safari:
              </p>
              <p>1. Tap the Share button in the Safari toolbar.</p>
              <p>2. Select Add to Home Screen to launch in standalone mode.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="font-semibold text-slate-900 dark:text-slate-100">
                Desktop Installation &amp; Automated GitHub Actions Deployment:
              </p>
              <p>
                • In Chrome or Edge, click the Install SpectroCal icon in the
                address bar (when opened outside an embedded preview frame).
              </p>
              <p>
                • A GitHub Actions workflow is included at{' '}
                <code className="font-mono text-slate-900 dark:text-slate-100">
                  .github/workflows/deploy-pwa.yml
                </code>
                . In your GitHub repository, go to{' '}
                <strong>Settings → Pages → Build and deployment</strong> and set
                Source to <strong>GitHub Actions</strong> to auto-test, build,
                and publish the PWA on every push to{' '}
                <code className="font-mono text-slate-900 dark:text-slate-100">
                  main
                </code>
                .
              </p>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-slate-900 px-4 py-2 text-xs font-medium text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
