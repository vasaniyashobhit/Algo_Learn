import { useRef } from 'react';
import { cn } from '../../lib/cn.js';

export const STUCK_TABS = [
  { id: 'text', label: 'Text' },
  { id: 'url', label: 'Link' },
  { id: 'pdf', label: 'PDF' },
  { id: 'image', label: 'Image' },
];

const KEYS = { ArrowRight: 1, ArrowLeft: -1 };

const BASE = 'border-0 p-[0.9rem] font-display text-step-lead leading-none font-bold uppercase tracking-[0.08em]';
const IDLE = 'bg-band-2 text-ink-soft hover:text-ink';
const ACTIVE = 'bg-band text-ink shadow-[inset_0_4px_0_var(--plate)]';

export const tabId = (id) => `stuck-tab-${id}`;
export const panelId = (id) => `stuck-panel-${id}`;

/** The four input tabs (WAI-ARIA tabs: arrow keys, Home and End move and select). */
export const StuckTabs = ({ value, onChange }) => {
  const refs = useRef({});
  const move = (event) => {
    const index = STUCK_TABS.findIndex((tab) => tab.id === value);
    let next = null;
    if (KEYS[event.key]) next = (index + KEYS[event.key] + STUCK_TABS.length) % STUCK_TABS.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = STUCK_TABS.length - 1;
    if (next === null) return;
    event.preventDefault();
    const { id } = STUCK_TABS[next];
    onChange(id);
    refs.current[id]?.focus();
  };

  return (
    <div role="tablist" aria-label="How to share the problem" className="grid grid-cols-4" onKeyDown={move}>
      {STUCK_TABS.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              refs.current[tab.id] = node;
            }}
            type="button"
            role="tab"
            id={tabId(tab.id)}
            aria-selected={selected}
            aria-controls={panelId(tab.id)}
            tabIndex={selected ? 0 : -1}
            className={cn(BASE, selected ? ACTIVE : IDLE)}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
