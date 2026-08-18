import { WindowsMark } from '../components/windows-mark';
import { downloadHref } from '../lib/download-targets';

export function WindowsButtons() {
  return (
    <div className="flex w-full max-w-90 flex-col items-stretch gap-3 md:w-auto md:max-w-none md:flex-row md:items-center">
      <a
        href={downloadHref.windows}
        className="download-button justify-center bg-fd-primary text-fd-primary-foreground transition-opacity hover:opacity-85"
      >
        <WindowsMark className="size-4.25" />
        download for Windows
      </a>
    </div>
  );
}
