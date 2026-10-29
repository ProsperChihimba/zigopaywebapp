export function ComingSoon({ what, milestone }: { what: string; milestone: number }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
      <p className="text-base font-medium">{what}</p>
      <p className="mt-1 text-sm text-muted">Arrives in milestone {milestone} of the build.</p>
    </div>
  );
}
