import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';
import App from './App';
import { db } from './db';
import { ErrorBoundary } from './components/ErrorBoundary';
import './index.css';

const root = createRoot(document.getElementById('root')!);

function Fatal({ message }: { message: string }) {
  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-3 bg-ink-900 px-8 text-center">
      <p className="text-[20px] font-bold">Storage unavailable</p>
      <p className="text-[15px] leading-snug text-white/60">
        CalDemon saves your data on this device but couldn't open its storage. If you're in Private Browsing, switch to a normal Safari tab or open the app from your Home Screen.
      </p>
      <p className="text-[12px] text-white/30">{message}</p>
      <button type="button" className="mt-3 h-11 rounded-2xl bg-violet-500 px-6 font-semibold" onClick={() => location.reload()}>
        Try again
      </button>
    </div>
  );
}

db.open()
  .then(() => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
    // Ask the browser to keep data even when storage is low (granted automatically for installed apps on iOS).
    navigator.storage?.persist?.().catch(() => undefined);
  })
  .catch((e: Error) => root.render(<Fatal message={e?.message ?? String(e)} />));

registerSW({ immediate: true });
