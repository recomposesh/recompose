import { TuxMark } from '../components/tux-mark';
import { UbuntuMark } from '../components/ubuntu-mark';
import { downloadHref } from '../lib/download-targets';

export function LinuxButtons() {
  return (
    <div className="flex items-center gap-3">
      <a
        href={downloadHref['linux-appimage']}
        className="download-button bg-fd-primary text-fd-primary-foreground transition-opacity hover:opacity-85"
      >
        <TuxMark className="size-4.25" />
        download AppImage
      </a>
      <a
        href={downloadHref['linux-deb']}
        className="download-button border border-stage-ring bg-stage-card text-fd-foreground transition-colors hover:bg-fd-accent"
      >
        <span className="flex size-5.5 items-center justify-center rounded-chip bg-ubuntu text-white">
          <UbuntuMark className="size-4.5" />
        </span>
        Debian / Ubuntu (.deb)
      </a>
    </div>
  );
}
