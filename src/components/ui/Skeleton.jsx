// Skeleton.jsx - Skeleton loader component
// Pulsing placeholder for loading states

export function Skeleton({ className = "", style = {} }) {
  return (
    <div
      className={`bg-[#252525] animate-pulse rounded-xl ${className}`}
      style={style}
    />
  );
}

// Pre-built skeleton variants
export function SkeletonCard({ className = "" }) {
  return <Skeleton className={`h-24 w-full ${className}`} />;
}

export function SkeletonRow({ className = "" }) {
  return <Skeleton className={`h-12 w-full ${className}`} />;
}

export function SkeletonText({ width = "75%", className = "" }) {
  return <Skeleton className={`h-4 ${className}`} style={{ width }} />;
}

// Multiple skeleton rows for lists
export function SkeletonList({ rows = 3, gap = "gap-3" }) {
  return (
    <div className={`flex flex-col ${gap}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </div>
  );
}

// Form skeleton (label + input)
export function SkeletonForm({ fields = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-12 w-full" />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
