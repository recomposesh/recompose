import { AppleMark } from '../components/apple-mark';
import { TuxMark } from '../components/tux-mark';
import { UbuntuMark } from '../components/ubuntu-mark';
import { WindowsMark } from '../components/windows-mark';

const tileFrame = 'flex size-9 items-center justify-center rounded-tile';

export function PlatformTile({ target }: { target: string }) {
  if (target.startsWith('mac')) {
    return (
      <span className={`${tileFrame} bg-fd-primary text-fd-primary-foreground`}>
        <AppleMark className="-mt-0.5 size-4.5" />
      </span>
    );
  }

  if (target === 'windows') {
    return (
      <span className={`${tileFrame} bg-windows text-white`}>
        <WindowsMark className="size-4.5" />
      </span>
    );
  }

  if (target === 'linux-appimage') {
    return (
      <span className={`${tileFrame} bg-tux text-tile`}>
        <TuxMark className="size-4.5" />
      </span>
    );
  }

  return (
    <span className={`${tileFrame} bg-ubuntu text-white`}>
      <UbuntuMark className="size-4.5" />
    </span>
  );
}
