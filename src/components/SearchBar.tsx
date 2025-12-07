import { Search, X } from "lucide-react";

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  resultCount: number;
  totalCount: number;
}

export function SearchBar({ value, onChange, resultCount, totalCount }: SearchBarProps) {
  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search by name, extension, or department..."
          className="search-input pl-12 pr-12"
        />
        {value && (
          <button
            onClick={() => onChange('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <div className="mt-3 flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          {value ? (
            <>
              Showing <span className="font-medium text-foreground">{resultCount}</span> of {totalCount} extensions
            </>
          ) : (
            <>
              <span className="font-medium text-foreground">{totalCount}</span> extensions available
            </>
          )}
        </span>
      </div>
    </div>
  );
}
