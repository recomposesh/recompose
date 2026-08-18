import { AppleMark } from '../components/apple-mark';
import { downloadHref } from '../lib/download-targets';

export function MacButtons() {
  return (
    <div className="flex items-center gap-3">
      <a
        href={downloadHref['mac-arm64']}
        className="download-button bg-fd-primary text-fd-primary-foreground transition-opacity hover:opacity-85"
      >
        <AppleMark className="-mt-0.5 size-4.25" />
        download for Apple Silicon
      </a>
      <a
        href={downloadHref['mac-x64']}
        className="download-button border border-stage-ring bg-stage-card text-fd-foreground transition-colors hover:bg-fd-accent"
      >
        <AppleMark className="-mt-0.5 size-4.25" />
        Intel Mac
      </a>
    </div>
  );
}
