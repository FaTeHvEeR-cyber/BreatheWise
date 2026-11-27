interface PanelSkeletonProps {
  label?: string;
}

export function PanelSkeleton({ label = 'Loading air quality workspace…' }: PanelSkeletonProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="space-y-6 border border-slate-200 bg-white p-6"
    >
      <span className="sr-only">{label}</span>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="space-y-3 lg:col-span-5">
          <div className="h-4 w-36 bg-slate-200" />
          <div className="h-14 w-44 bg-slate-200" />
          <div className="h-3 w-full bg-slate-100" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:col-span-7">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div key={idx} className="space-y-2 border border-slate-100 bg-slate-50 p-3">
              <div className="h-3 w-16 bg-slate-200" />
              <div className="h-6 w-20 bg-slate-200" />
              <div className="h-3 w-24 bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
      <div className="h-44 w-full bg-slate-100" />
    </div>
  );
}
