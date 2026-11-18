import { useId } from 'react';

/** CalDemon mascot emblem (original artwork). */
export function Logo({ size = 40, glow = false }: { size?: number; glow?: boolean }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" aria-hidden style={glow ? { filter: 'drop-shadow(0 0 14px rgba(139,92,246,.55))' } : undefined}>
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset=".45" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#5b21b6" />
        </linearGradient>
      </defs>
      <path d="M35 52C22 42 17 25 23 8c6 15 17 24 29 28z" fill={`url(#g${id})`} />
      <path d="M93 52c13-10 18-27 12-44-6 15-17 24-29 28z" fill={`url(#g${id})`} />
      <path d="M64 30c28 0 45 17 45 43 0 26-20 43-45 43S19 99 19 73c0-26 17-43 45-43z" fill={`url(#g${id})`} />
      <path d="M36 64l20 8-2 9c-9 0-16-6-18-17z" fill="#0b0a12" />
      <path d="M92 64l-20 8 2 9c9 0 16-6 18-17z" fill="#0b0a12" />
      <circle cx="49" cy="74" r="2.6" fill="#fff" />
      <circle cx="79" cy="74" r="2.6" fill="#fff" />
      <path d="M43 91q21 17 42 0q-21 9-42 0z" fill="#0b0a12" />
      <path d="M52 94.6l5 .9-2.3 5.2zM76 94.6l-5 .9 2.3 5.2z" fill="#fff" />
    </svg>
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    <span className={`font-extrabold tracking-tight ${className}`}>
      Cal<span className="text-violet-400">Demon</span>
    </span>
  );
}
