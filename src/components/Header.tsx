import type { WorkspaceId } from '../types';
import { useRovingTabs } from '../hooks/useRovingTabs';

export const WORKSPACE_TABS: ReadonlyArray<{ id: WorkspaceId; label: string }> = [
  { id: 'intake', label: 'Intake' },
  { id: 'routine', label: 'Routine' },
  { id: 'indoor', label: 'Indoor Lab' },
  { id: 'simulator', label: 'Simulator' },
  { id: 'community', label: 'Community' },
] as const;

const TAB_IDS: readonly WorkspaceId[] = WORKSPACE_TABS.map((t) => t.id);

interface HeaderProps {
  activeTab: WorkspaceId;
  onTabChange: (tab: WorkspaceId) => void;
  onOpenAudit: () => void;
}

export function Header({ activeTab, onTabChange, onOpenAudit }: HeaderProps) {
  const { registerTabRef, handleKeyDown } = useRovingTabs(TAB_IDS, onTabChange);

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-center justify-between gap-x-8 gap-y-1 px-4 py-2.5 md:flex-nowrap md:px-6 md:py-3">
        <a
          href="#main-content"
          onClick={(e) => {
            e.preventDefault();
            onTabChange('intake');
          }}
          className="font-display text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-700"
        >
          BreatheWise
        </a>

        <nav
          aria-label="Workspace navigation"
          className="order-3 w-full border-t border-slate-100 pt-1 md:order-2 md:w-auto md:flex-1 md:border-t-0 md:pt-0"
        >
          <div
            role="tablist"
            aria-label="BreatheWise workspaces"
            className="flex items-center justify-between gap-0.5 overflow-x-auto sm:gap-2 md:justify-center md:gap-6"
          >
            {WORKSPACE_TABS.map((tab, index) => {
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  ref={registerTabRef(tab.id)}
                  id={`tab-${tab.id}`}
                  role="tab"
                  type="button"
                  aria-selected={isSelected}
                  aria-controls={`panel-${tab.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => onTabChange(tab.id)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className={`relative rounded-sm px-1.5 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-700 sm:px-2 sm:text-sm md:px-2.5 md:py-2 ${
                    isSelected ? 'text-teal-800' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab.label}
                  {isSelected && (
                    <span
                      aria-hidden="true"
                      className="absolute right-1 bottom-0 left-1 h-0.5 bg-teal-700"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        <div className="order-2 shrink-0 md:order-3">
          <button
            type="button"
            onClick={onOpenAudit}
            className="rounded-md bg-teal-800 px-3.5 py-1.5 text-sm font-medium text-white whitespace-nowrap shrink-0 transition-colors hover:bg-teal-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 md:px-4 md:py-2"
          >
            CPCB Audit
          </button>
        </div>
      </div>
    </header>
  );
}
