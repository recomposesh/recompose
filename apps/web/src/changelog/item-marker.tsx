export function ItemMarker({ breaking }: { breaking: boolean }) {
  if (breaking) {
    return <span className="w-2.5 shrink-0 font-mono text-sm leading-prose text-breaking">!</span>;
  }

  return (
    <span className="flex w-2.5 shrink-0 justify-start pt-2.5">
      <span className="size-1 rounded-full bg-stage-hush" />
    </span>
  );
}
