import { WindowsMark } from '../components/windows-mark';
import { downloadHref } from '../lib/download-targets';

export function WindowsButtons() {
  return (
    <div className="flex items-center gap-3">
      <a
        href={downloadHref.windows}
        className="download-button bg-fd-primary text-fd-primary-foreground transition-opacity hover:opacity-85"
      >
        <WindowsMark className="size-4.25" />
        download for Windows
      </a>
    </div>
  );
}
