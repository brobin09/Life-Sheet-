export type PrimaryTab = 'balance_sheet' | 'income' | 'cash_flow' | 'trends' | 'goals';

interface TopBarProps {
  activeTab: PrimaryTab;
  onSelectTab: (tab: PrimaryTab) => void;
  onStartReview: () => void;
}

const NAV_ITEMS: Array<{ id: PrimaryTab; label: string }> = [
  { id: 'balance_sheet', label: 'Balance Sheet' },
  { id: 'income', label: 'Income' },
  { id: 'cash_flow', label: 'Cash Flow' },
  { id: 'trends', label: 'Trends' },
  { id: 'goals', label: 'Goals' },
];

export function TopBar({ activeTab, onSelectTab, onStartReview }: TopBarProps) {
  return (
    <header className="no-print sticky top-0 z-30 border-b border-[#E2DCD0] bg-[#FBF9F5]/95 backdrop-blur-xs">
      <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-8 px-5 py-3.5 sm:px-8">
        {/* Zone 1: Single-element brand wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('balance_sheet')}
          className="font-serif text-xl font-medium tracking-tight text-[#1C1917] whitespace-nowrap shrink-0 hover:text-[#1B4332] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B4332]"
        >
          Life Statements
        </button>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav
          aria-label="Primary statements"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`relative py-1 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1B4332] ${
                  isActive
                    ? 'text-[#1C1917] font-semibold'
                    : 'text-[#686259] hover:text-[#1C1917]'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute right-0 bottom-0 left-0 h-[1.5px] bg-[#1B4332]"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onStartReview}
            className="rounded-md bg-[#1B4332] px-4 py-2 text-sm font-medium text-[#FBF9F5] whitespace-nowrap shrink-0 hover:bg-[#143326] transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1B4332]"
          >
            Start Review
          </button>
        </div>
      </div>

      {/* Compact mobile navigation row */}
      <nav
        aria-label="Mobile statements"
        className="flex md:hidden items-center gap-5 overflow-x-auto border-t border-[#E2DCD0]/70 px-5 py-2 text-sm"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              className={`whitespace-nowrap shrink-0 py-1 cursor-pointer ${
                isActive
                  ? 'text-[#1C1917] font-semibold border-b border-[#1B4332]'
                  : 'text-[#686259]'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
