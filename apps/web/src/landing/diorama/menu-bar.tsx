import { Search, Wifi } from 'lucide-react';

import { AppleMark } from '../../components/apple-mark';

export function MenuBar() {
  return (
    <div className="absolute inset-x-0 top-0 flex h-9.5 items-center justify-between bg-menubar px-4.5 pt-0.5 text-control leading-none text-black/85 backdrop-blur-2xl dark:text-white/90">
      <span className="flex items-center gap-4">
        <AppleMark className="size-3.5" />
        <span className="font-medium">Recompose</span>
        <span className="flex gap-3.5 opacity-80">
          <span>File</span>
          <span>Edit</span>
          <span>View</span>
          <span>Window</span>
          <span>Help</span>
        </span>
      </span>
      <span className="flex items-center gap-3.5">
        <Wifi className="size-3" />
        <Search className="size-3" />
        <span>Wed 21:41</span>
      </span>
    </div>
  );
}
