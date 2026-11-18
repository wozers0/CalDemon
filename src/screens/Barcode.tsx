import { useEffect, useRef, useState } from 'react';
import { Barcode, CameraOff, Loader2, Plus, ScanLine, WifiOff } from 'lucide-react';
import { db } from '../db';
import { Button, Card, TextInput } from '../components/ui';
import { useOnline } from '../state/hooks';
import type { FoodItem } from '../types';
import { fmtNum } from '../lib/util';

interface Product extends FoodItem {
  barcode: string;
  brand?: string;
}

async function lookup(code: string): Promise<Product> {
  const local = await db.foods.where('barcode').equals(code).first();
  if (local) return { name: local.name, serving: local.serving, qty: 1, kcal: local.kcal, protein: local.protein, carbs: local.carbs, fat: local.fat, group: local.group, barcode: code };
  if (!navigator.onLine) throw new Error("You're offline. Products you've scanned before still work offline.");
  const res = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(code)}.json?fields=product_name,brands,nutriments,serving_size,serving_quantity`);
  if (!res.ok) throw new Error(res.status === 404 ? 'Product not found. Try searching or add it as a custom food.' : 'Lookup failed. Please try again.');
  const data = await res.json();
  if (data.status !== 1 || !data.product) throw new Error('Product not found. Try searching or add it as a custom food.');
  const p = data.product;
  const n = p.nutriments ?? {};
  const servingG = Number(p.serving_quantity) || 0;
  const per = servingG ? servingG / 100 : 1;
  const v = (key: string) => {
    const x = Number(n[`${key}_100g`]);
    return Number.isFinite(x) ? Math.round(x * per * 10) / 10 : 0;
  };
  const kcal = v('energy-kcal') || Math.round(v('energy') / 4.184);
  return {
    name: [p.product_name, p.brands?.split(',')[0]].filter(Boolean).join(' • ') || 'Scanned product',
    brand: p.brands,
    serving: servingG ? p.serving_size || `${servingG} g` : '100 g',
    qty: 1,
    kcal,
    protein: v('proteins'),
    carbs: v('carbohydrates'),
    fat: v('fat'),
    group: 'other',
    barcode: code,
  };
}

export function BarcodeTab({ onAdd, showCalories }: { onAdd: (item: FoodItem, barcode: string) => void; showCalories: boolean }) {
  const online = useOnline();
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [product, setProduct] = useState<Product | null>(null);

  const stop = () => {
    controlsRef.current?.stop();
    controlsRef.current = null;
    setScanning(false);
  };
  useEffect(() => stop, []);

  const find = async (c: string) => {
    const clean = c.replace(/\D/g, '');
    if (clean.length < 6) {
      setError('Enter the numbers under the barcode.');
      return;
    }
    setBusy(true);
    setError('');
    setProduct(null);
    try {
      setProduct(await lookup(clean));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const startScan = async () => {
    setCamError('');
    setError('');
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setCamError('The camera needs the app to be opened over HTTPS (for example your Netlify link). You can type the barcode number below instead.');
      return;
    }
    try {
      setScanning(true);
      const { BrowserMultiFormatReader } = await import('@zxing/browser');
      const reader = new BrowserMultiFormatReader();
      if (!videoRef.current) return;
      controlsRef.current = await reader.decodeFromConstraints({ video: { facingMode: 'environment' } }, videoRef.current, (result) => {
        if (result) {
          const text = result.getText();
          stop();
          setCode(text);
          void find(text);
        }
      });
    } catch (e) {
      stop();
      const name = (e as Error).name;
      setCamError(name === 'NotAllowedError' ? 'Camera access was denied. Allow it in Settings › Safari › Camera, or type the barcode below.' : "Couldn't start the camera. Type the barcode number below instead.");
    }
  };

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-white/[0.08] bg-black">
        <video ref={videoRef} playsInline muted autoPlay className={`h-full w-full object-cover ${scanning ? '' : 'hidden'}`} />
        {scanning ? (
          <>
            <div className="pointer-events-none absolute inset-x-10 top-1/2 h-24 -translate-y-1/2 rounded-2xl border-2 border-violet-400/80 shadow-[0_0_0_999px_rgba(0,0,0,.35)]" />
            <ScanLine className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 animate-pulse text-violet-300" />
            <button type="button" onClick={stop} className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-4 py-2 text-[14px] font-semibold backdrop-blur">Stop</button>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            {camError ? <CameraOff className="h-9 w-9 text-white/40" /> : <Barcode className="h-10 w-10 text-violet-300" />}
            <p className="text-[14px] leading-snug text-white/55">{camError || 'Scan a packaged food barcode to fill in nutrition automatically.'}</p>
            {!camError && <Button icon={ScanLine} onClick={startScan}>Start scanning</Button>}
          </div>
        )}
      </div>

      <div className="flex gap-2">
        <TextInput value={code} onChange={(e) => setCode(e.target.value)} placeholder="Or type barcode number" inputMode="numeric" onKeyDown={(e) => e.key === 'Enter' && find(code)} />
        <Button variant="secondary" onClick={() => find(code)} loading={busy} className="shrink-0">Look up</Button>
      </div>
      {!online && <p className="flex items-center gap-1.5 text-[13px] text-amber-300/80"><WifiOff className="h-4 w-4" /> Offline: only previously scanned products can be found.</p>}
      {busy && <p className="flex items-center gap-2 text-[14px] text-white/50"><Loader2 className="h-4 w-4 animate-spin" /> Looking up product…</p>}
      {error && <p className="rounded-2xl bg-rose-500/10 px-4 py-3 text-[14px] text-rose-200">{error}</p>}
      {product && (
        <Card className="animate-rise p-4">
          <p className="text-[16px] font-semibold">{product.name}</p>
          <p className="text-[13px] text-white/50">Per {product.serving}</p>
          <p className="tabular mt-2 text-[14px] text-white/75">
            {showCalories && <b className="text-white">{fmtNum(product.kcal)} kcal • </b>}P {fmtNum(product.protein)} g • C {fmtNum(product.carbs)} g • F {fmtNum(product.fat)} g
          </p>
          <Button full icon={Plus} className="mt-3" onClick={() => { onAdd(product, product.barcode); setProduct(null); setCode(''); }}>Add to meal</Button>
          <p className="mt-2 text-center text-[11px] text-white/30">Data from Open Food Facts</p>
        </Card>
      )}
    </div>
  );
}
