import { useRestartForUpdate } from '../../../../shared/api';
import { Button, Icon } from '../../../../shared/ui';

type ReadyToRestartProps = {
  from: string;
  to: string;
};

export function ReadyToRestart({ from, to }: ReadyToRestartProps) {
  const { restart, restarting } = useRestartForUpdate();

  return (
    <section
      aria-label="Update ready"
      className="overflow-hidden rounded-panel border border-line-subtle bg-surface-card"
    >
      <div className="relative flex justify-center bg-accent/8 pt-3.5 pb-3">
        <Icon className="absolute inset-s-6 top-2.5 size-2.5 text-accent/70" name="spark" />
        <span className="flex size-6.5 items-center justify-center rounded-control border border-line-paper bg-surface-paper">
          <Icon className="size-3.5 text-accent-fill" name="arrow-up" />
        </span>
        <Icon className="absolute inset-e-7 bottom-2 size-2 text-accent/50" name="spark" />
      </div>
      <div className="flex flex-col items-center gap-2 px-3 pt-2 pb-3">
        <div className="flex flex-col items-center gap-0.5">
          <p className="text-body font-semibold">Update ready</p>
          <p className="font-mono text-mono-value text-ink-secondary">
            {from} → {to}
          </p>
        </div>
        <Button disabled={restarting} fullWidth onPress={restart} variant="primary">
          Restart to update
        </Button>
      </div>
    </section>
  );
}
