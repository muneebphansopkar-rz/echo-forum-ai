'use client';

import { useState, type FormEvent } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SearchInputProps {
  initialValue?: string;
  onSubmit: (q: string) => void;
}

export function SearchInput({
  initialValue = '',
  onSubmit,
}: SearchInputProps): JSX.Element {
  const [value, setValue] = useState(initialValue);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit(value.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <label htmlFor="forum-search-input" className="sr-only">
        Search posts
      </label>
      <div className="relative flex-1">
        <SearchIcon
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <input
          id="forum-search-input"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Search posts by title or body…"
          className="block w-full rounded-md border border-border bg-card py-2 pl-9 pr-3 text-sm shadow-sm outline-none transition-colors focus:border-primary"
        />
      </div>
      <Button type="submit" size="default">
        <SearchIcon className="mr-1.5 h-3.5 w-3.5" aria-hidden />
        Search
      </Button>
    </form>
  );
}
