import {
  Bed, BookOpen, Calendar, Crown, Dumbbell, Flag, Flame, Gem, Hammer, Heart, Leaf, Moon, Rocket, Salad, Star, Sunrise, Trophy, Waves, Weight, Zap, Droplet, Lock,
} from 'lucide-react';
import type { BadgeDef, BadgeIcon } from '../data/badges';

const MAP: Record<BadgeIcon, typeof Trophy> = {
  dumbbell: Dumbbell, flame: Flame, crown: Crown, gem: Gem, calendar: Calendar, sunrise: Sunrise, moon: Moon, trophy: Trophy, weight: Weight,
  droplet: Droplet, waves: Waves, salad: Salad, book: BookOpen, bed: Bed, heart: Heart, zap: Zap, rocket: Rocket, hammer: Hammer, star: Star, flag: Flag, leaf: Leaf,
};

export function BadgeMedal({ badge, unlocked, size = 56 }: { badge: BadgeDef; unlocked: boolean; size?: number }) {
  const Icon = unlocked ? MAP[badge.icon] : Lock;
  return (
    <span
      className="relative grid shrink-0 place-items-center rounded-[30%]"
      style={{
        width: size, height: size,
        background: unlocked ? `radial-gradient(circle at 30% 25%, ${badge.color}55, ${badge.color}18 70%)` : 'rgba(255,255,255,.04)',
        boxShadow: unlocked ? `inset 0 0 0 1.5px ${badge.color}66, 0 6px 20px -6px ${badge.color}66` : 'inset 0 0 0 1px rgba(255,255,255,.08)',
        color: unlocked ? badge.color : 'rgba(255,255,255,.25)',
      }}
    >
      <Icon style={{ width: size * 0.44, height: size * 0.44 }} strokeWidth={2} />
    </span>
  );
}
