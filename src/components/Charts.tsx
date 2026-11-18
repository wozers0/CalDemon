import { useId } from 'react';

export interface Datum {
  label: string;
  value: number;
  highlight?: boolean;
}

/** Rounded bar chart in SVG. */
export function BarChart({ data, height = 150, color = '#8b5cf6', format = (v: number) => String(Math.round(v)) }: { data: Datum[]; height?: number; color?: string; format?: (v: number) => string }) {
  const id = useId().replace(/:/g, '');
  const max = Math.max(1, ...data.map((d) => d.value));
  const w = 320;
  const chartH = height - 34;
  const slot = w / data.length;
  const bw = Math.min(26, slot * 0.56);
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Bar chart">
      <defs>
        <linearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".35" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" x2={w} y1={14 + chartH * (1 - f)} y2={14 + chartH * (1 - f)} stroke="rgba(255,255,255,.05)" />
      ))}
      {data.map((d, i) => {
        const h = d.value > 0 ? Math.max(4, (d.value / max) * chartH) : 0;
        const x = i * slot + (slot - bw) / 2;
        const y = 14 + chartH - h;
        return (
          <g key={i}>
            <rect x={x} y={14} width={bw} height={chartH} rx={bw / 2.6} fill="rgba(255,255,255,.035)" />
            {h > 0 && (
              <rect x={x} y={y} width={bw} height={h} rx={Math.min(bw / 2.6, h / 2)} fill={d.highlight ? color : `url(#b${id})`} style={{ transition: 'all .6s ease' }} />
            )}
            {d.highlight && d.value > 0 && (
              <text x={x + bw / 2} y={Math.max(10, y - 5)} textAnchor="middle" fontSize="10" fontWeight="700" fill="#fff">
                {format(d.value)}
              </text>
            )}
            <text x={x + bw / 2} y={height - 4} textAnchor="middle" fontSize="11" fill={d.highlight ? '#fff' : 'rgba(255,255,255,.45)'} fontWeight={d.highlight ? 700 : 500}>
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** Smooth area line chart in SVG. */
export function LineChart({ data, height = 170, color = '#8b5cf6', format = (v: number) => String(Math.round(v)) }: { data: Datum[]; height?: number; color?: string; format?: (v: number) => string }) {
  const id = useId().replace(/:/g, '');
  const w = 320;
  const top = 26;
  const bottom = height - 22;
  const max = Math.max(1, ...data.map((d) => d.value)) * 1.1;
  const pts = data.map((d, i) => ({
    x: data.length === 1 ? w / 2 : 12 + (i * (w - 24)) / (data.length - 1),
    y: bottom - (d.value / max) * (bottom - top),
    d,
  }));
  const path = pts.map((p, i) => {
    if (i === 0) return `M${p.x},${p.y}`;
    const prev = pts[i - 1];
    const cx = (prev.x + p.x) / 2;
    return `C${cx},${prev.y} ${cx},${p.y} ${p.x},${p.y}`;
  }).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" role="img" aria-label="Line chart">
      <defs>
        <linearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity=".45" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1="0" x2={w} y1={bottom - (bottom - top) * f} y2={bottom - (bottom - top) * f} stroke="rgba(255,255,255,.05)" />
      ))}
      {pts.length > 1 && <path d={`${path} L${last.x},${bottom} L${pts[0].x},${bottom} Z`} fill={`url(#a${id})`} />}
      {pts.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" />}
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={i === pts.length - 1 ? 5 : 3} fill={i === pts.length - 1 ? '#fff' : color} stroke={color} strokeWidth="2" />
      ))}
      {last && last.d.value > 0 && (
        <g>
          <rect x={Math.min(w - 64, Math.max(0, last.x - 32))} y={Math.max(0, last.y - 26)} width="64" height="18" rx="9" fill="rgba(255,255,255,.1)" />
          <text x={Math.min(w - 32, Math.max(32, last.x))} y={Math.max(13, last.y - 13)} textAnchor="middle" fontSize="10.5" fontWeight="700" fill="#fff">
            {format(last.d.value)}
          </text>
        </g>
      )}
      {pts.map((p, i) => (
        <text key={`l${i}`} x={p.x} y={height - 4} textAnchor="middle" fontSize="11" fill="rgba(255,255,255,.45)">
          {p.d.label}
        </text>
      ))}
    </svg>
  );
}
