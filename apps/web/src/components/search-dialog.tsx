import type { SharedProps } from 'fumadocs-ui/contexts/search';

import { useDocsSearch } from 'fumadocs-core/search/client';
import {
  SearchDialog as Dialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
} from 'fumadocs-ui/components/dialog/search';

import { searchClient } from '../lib/search-client';

export function SearchDialog({ open, onOpenChange, dialogHandle }: SharedProps) {
  const { search, setSearch, query } = useDocsSearch({ client: searchClient });

  return (
    <Dialog
      search={search}
      onSearchChange={setSearch}
      isLoading={query.isLoading}
      open={open}
      onOpenChange={onOpenChange}
      dialogHandle={dialogHandle}
    >
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList items={query.data === 'empty' ? null : query.data} />
      </SearchDialogContent>
    </Dialog>
  );
}
