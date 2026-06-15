import { useEffect, useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { useConstructionStore } from '../store/useConstructionStore';

export function WarningAlert() {
  const { hasWarning, warningMessage, clearWarning } = useConstructionStore();
  const [showBorderFlash, setShowBorderFlash] = useState(false);

  useEffect(() => {
    if (hasWarning) {
      setShowBorderFlash(true);
      const flashInterval = setInterval(() => {
        setShowBorderFlash((prev) => !prev);
      }, 500);

      return () => clearInterval(flashInterval);
    } else {
      setShowBorderFlash(false);
    }
  }, [hasWarning]);

  if (!hasWarning) return null;

  return (
    <>
      <div
        className={`fixed inset-0 pointer-events-none z-50 transition-opacity duration-300 ${
          showBorderFlash ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute inset-0 border-8 border-red-500 animate-pulse" />
      </div>

      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-bounce">
        <div className="bg-red-600 text-white px-6 py-4 rounded-xl shadow-2xl flex items-center gap-4 max-w-lg">
          <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center animate-pulse">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <p className="font-bold text-lg">异常预警</p>
            <p className="text-sm text-red-100">{warningMessage}</p>
          </div>
          <button
            onClick={clearWarning}
            className="w-8 h-8 rounded-full bg-red-500 hover:bg-red-400 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div
        className={`fixed top-0 left-0 right-0 h-1 bg-red-500 z-40 ${
          showBorderFlash ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-200`}
      />
      <div
        className={`fixed bottom-0 left-0 right-0 h-1 bg-red-500 z-40 ${
          showBorderFlash ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-200`}
      />
      <div
        className={`fixed top-0 bottom-0 left-0 w-1 bg-red-500 z-40 ${
          showBorderFlash ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-200`}
      />
      <div
        className={`fixed top-0 bottom-0 right-0 w-1 bg-red-500 z-40 ${
          showBorderFlash ? 'opacity-100' : 'opacity-0'
        } transition-opacity duration-200`}
      />
    </>
  );
}
