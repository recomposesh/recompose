import { TuxMark } from '../components/tux-mark';
import { UbuntuMark } from '../components/ubuntu-mark';
import { downloadHref } from '../lib/download-targets';

export function LinuxButtons() {
  return (
    <div className="flex w-full max-w-90 flex-col items-stretch gap-3 md:w-auto md:max-w-none md:flex-row md:items-center">
      <a
        href={downloadHref['linux-appimage']}
        className="download-button justify-center bg-fd-primary text-fd-primary-foreground transition-opacity hover:opacity-85"
      >
        <TuxMark className="size-4.25" />
        download AppImage
      </a>
      <a
        href={downloadHref['linux-deb']}
        className="download-button justify-center border border-stage-ring bg-stage-card text-fd-foreground transition-colors hover:bg-fd-accent"
      >
        <span className="flex size-5.5 items-center justify-center rounded-chip bg-ubuntu text-white">
          <UbuntuMark className="size-4.5" />
        </span>
        Debian / Ubuntu (.deb)
      </a>
    </div>
  );
}
