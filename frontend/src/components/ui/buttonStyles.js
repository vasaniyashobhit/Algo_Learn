import { cn } from '../../lib/cn.js';

const BASE =
  'inline-flex items-center justify-center gap-2 border-[1.5px] rounded-cut ' +
  'font-display text-base leading-none font-bold uppercase tracking-[0.06em] no-underline ' +
  'transition-colors duration-[160ms] ease-broadcast disabled:opacity-50';

// Padding sits with the variant (and the wide size) so no two padding classes ever compete.
const PADDING = { normal: 'px-[1.1rem] py-[0.6rem]', tight: 'px-[0.2rem] py-[0.6rem]', wide: 'w-full px-[1.1rem] py-[0.85rem]' };

// Hover rules use not-disabled so a disabled or loading button never changes colour.
export const BUTTON_VARIANTS = {
  plate: 'border-plate bg-plate text-plate-ink not-disabled:hover:border-ink not-disabled:hover:bg-ink not-disabled:hover:text-ground',
  outline: 'border-ink bg-transparent text-ink not-disabled:hover:bg-ink not-disabled:hover:text-ground',
  text: 'border-transparent bg-transparent text-ink-soft not-disabled:hover:text-ink',
  // On the yellow plate: Plate Ink in both themes, never the theme's ink (The Plate Ink Rule).
  onPlate: 'border-plate-ink bg-transparent text-plate-ink not-disabled:hover:bg-plate-ink not-disabled:hover:text-plate',
};

const paddingFor = (variant, wide) => {
  if (wide) return PADDING.wide;
  return variant === 'text' ? PADDING.tight : PADDING.normal;
};

export const buttonClass = ({ variant = 'outline', wide = false, className } = {}) => {
  const known = BUTTON_VARIANTS[variant] ? variant : 'outline';
  return cn(BASE, BUTTON_VARIANTS[known], paddingFor(known, wide), className);
};
