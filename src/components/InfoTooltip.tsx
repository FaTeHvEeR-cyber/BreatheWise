import { type ReactElement, useId } from 'react';
import { Info } from 'lucide-react';

interface InfoTooltipProps {
  readonly label: string;
  readonly content: string;
  readonly align?: 'left' | 'right';
}

/** Accessible hover/focus info tooltip button with ARIA description binding. */
export function InfoTooltip({ label, content, align = 'right' }: InfoTooltipProps): ReactElement {
  const tooltipId = useId();
  const alignClass = align === 'left' ? 'left-0' : 'right-0';

  return (
    <span className="group relative inline-flex items-center">
      <button
        type="button"
        aria-label={label}
        aria-describedby={tooltipId}
        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-slate-500 transition-colors hover:text-teal-800 focus:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-teal-700"
      >
        <Info aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      <span
        id={tooltipId}
        role="tooltip"
        className={`pointer-events-none invisible absolute bottom-full z-30 mb-2 w-64 rounded-md bg-slate-900 px-3 py-2 text-left text-[11px] leading-relaxed font-normal text-white opacity-0 shadow-md transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100 ${alignClass}`}
      >
        {content}
      </span>
    </span>
  );
}
