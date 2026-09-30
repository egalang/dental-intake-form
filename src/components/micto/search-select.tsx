"use client";

/**
 * @title Search Select
 * @description A beautiful searchable combobox supporting single/multi selection.
 * @categories react, component
 */
import { Check, ChevronsUpDown, X } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

// --- Types ---

export type SearchSelectSize = "compact" | "default" | "large";

export interface SearchSelectOption {
  value: string;
  label: string;
  description?: string;
  avatar?: string;
  [key: string]: unknown;
}

export interface SearchSelectProps {
  /** Mode A: The static list of values to search locally */
  options?: SearchSelectOption[];

  /** Seed/Initial options for async mode to populate labels before search runs */
  initialOptions?: SearchSelectOption[];

  /** Mode B: Fired when typing. Returns a promise resolving list of search results. */
  onSearch?: (query: string) => Promise<SearchSelectOption[]>;

  /** Currently selected value (string in single mode, array of strings in multi mode) */
  value?: string | string[];

  /** Event fired when selections change */
  onChange?: (value: string | string[] | undefined) => void;

  /** Support selecting multiple options simultaneously */
  multiple?: boolean;

  /** Placeholder text displayed inside trigger and search input */
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;

  /** Disable the entire combobox selection */
  disabled?: boolean;

  /** Size variant: 'compact' (h-8 matches Input), 'default' (min-h-10), or 'large' (min-h-12) */
  size?: SearchSelectSize;

  className?: string;
}

// --- Size Variant Configurations ---

const sizeStyles: Record<
  SearchSelectSize,
  {
    container: string;
    text: string;
    badge: string;
    badgeClose: string;
    icon: string;
    avatar: string;
  }
> = {
  compact: {
    container: "h-8 min-h-8 px-2.5 py-1 text-xs",
    text: "text-xs font-normal",
    badge: "py-0 pr-0.5 pl-1.5 text-[11px]",
    badgeClose: "h-3 w-3",
    icon: "h-3.5 w-3.5",
    avatar: "h-3.5 w-3.5",
  },
  default: {
    container: "h-auto min-h-10 px-3 py-2 text-sm",
    text: "text-sm font-normal",
    badge: "py-0.5 pr-1 pl-2 text-xs",
    badgeClose: "h-3 w-3",
    icon: "h-4 w-4",
    avatar: "h-4 w-4",
  },
  large: {
    container: "h-auto min-h-12 px-4 py-2.5 text-base md:text-sm",
    text: "text-base md:text-sm font-normal",
    badge: "py-1 pr-1.5 pl-2.5 text-sm",
    badgeClose: "h-4 w-4",
    icon: "h-5 w-5",
    avatar: "h-5 w-5",
  },
};

// --- Debounce Hook (Zero-Dependency) ---

function useDebounce<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);
  React.useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

// --- Component ---

export function SearchSelect({
  options = [],
  initialOptions = [],
  onSearch,
  value,
  onChange,
  multiple = false,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  size = "default",
  className,
}: SearchSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [searchResults, setSearchResults] = React.useState<
    SearchSelectOption[]
  >([]);
  const [persistedOptions, setPersistedOptions] = React.useState<
    SearchSelectOption[]
  >([]);
  const [isLoading, setIsLoading] = React.useState(false);

  const attemptedValuesRef = React.useRef(new Set<string>());
  const styles = sizeStyles[size] ?? sizeStyles.default;

  // Derived map of all known options across props, search results, and persisted selections
  const allKnownOptions = React.useMemo(() => {
    const map = new Map<string, SearchSelectOption>();
    for (const opt of [
      ...options,
      ...initialOptions,
      ...persistedOptions,
      ...searchResults,
    ]) {
      if (opt?.value != null) {
        map.set(String(opt.value), opt);
      }
    }
    return map;
  }, [options, initialOptions, persistedOptions, searchResults]);

  // Normalized selected values as array of strings
  const selectedValues = React.useMemo(() => {
    if (value === undefined || value === null || value === "") {
      return [];
    }

    const arr = Array.isArray(value) ? value : [value];
    return arr.map(String);
  }, [value]);

  // Helper to safely append new search results to persisted options
  const mergePersistedOptions = React.useCallback(
    (newItems: SearchSelectOption[]) => {
      if (!newItems || newItems.length === 0) return;
      setPersistedOptions((prev) => {
        const existingMap = new Map(prev.map((o) => [String(o.value), o]));
        let added = false;
        for (const item of newItems) {
          if (item?.value != null && !existingMap.has(String(item.value))) {
            existingMap.set(String(item.value), item);
            added = true;
          }
        }
        return added ? Array.from(existingMap.values()) : prev;
      });
    },
    [],
  );

  // Pre-fetch default options if onSearch is defined and selected values are missing from cache
  React.useEffect(() => {
    if (!onSearch || selectedValues.length === 0) {
      return;
    }

    const unattemptedMissing = selectedValues.filter(
      (val) =>
        !allKnownOptions.has(val) && !attemptedValuesRef.current.has(val),
    );

    if (unattemptedMissing.length === 0) {
      return;
    }

    for (const val of unattemptedMissing) {
      attemptedValuesRef.current.add(val);
    }

    let isMounted = true;
    const fetchInitial = async () => {
      try {
        const results = await onSearch("");
        if (isMounted && results?.length) {
          mergePersistedOptions(results);
        }
      } catch (err) {
        console.error("SearchSelect initial fetch error:", err);
      }
    };

    void fetchInitial();

    return () => {
      isMounted = false;
    };
  }, [selectedValues, onSearch, allKnownOptions, mergePersistedOptions]);

  const debouncedQuery = useDebounce(searchQuery, 300);

  // Handle Async Searching (when dropdown menu is open)
  React.useEffect(() => {
    if (!onSearch || !open) {
      return;
    }

    let isMounted = true;
    const fetchResults = async () => {
      setIsLoading(true);

      try {
        const results = await onSearch(debouncedQuery);

        if (isMounted) {
          setSearchResults(results);
          mergePersistedOptions(results);
        }
      } catch (error) {
        console.error("SearchSelect fetching error:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchResults();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, onSearch, open, mergePersistedOptions]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (disabled) {
      setOpen(false);
      return;
    }
    setOpen(nextOpen);
    if (!nextOpen) {
      setSearchQuery("");
    }
  };

  // Determine displayed options for the command list
  const displayedOptions = React.useMemo(() => {
    if (!onSearch) {
      return options;
    }
    if (searchResults.length > 0) {
      return searchResults;
    }
    if (searchQuery.trim() !== "") {
      return [];
    }
    return options.length > 0 ? options : initialOptions;
  }, [onSearch, options, searchResults, searchQuery, initialOptions]);

  const handleSelect = (itemValue: string) => {
    if (disabled) {
      return;
    }
    if (multiple) {
      const alreadySelected = selectedValues.includes(itemValue);
      const nextValue = alreadySelected
        ? selectedValues.filter((v) => v !== itemValue)
        : [...selectedValues, itemValue];
      onChange?.(nextValue);
    } else {
      onChange?.(itemValue);
      handleOpenChange(false);
    }
  };

  const handleRemove = (itemValue: string, e: React.MouseEvent) => {
    if (disabled) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();

    if (multiple) {
      onChange?.(selectedValues.filter((v) => v !== itemValue));
    } else {
      onChange?.(undefined);
    }
  };

  // Resolve matching Option labels for rendering
  const getSelectedLabels = React.useMemo(() => {
    return selectedValues.map((val) => {
      const cached = allKnownOptions.get(val);
      return cached ? cached : { value: val, label: val };
    });
  }, [selectedValues, allKnownOptions]);

  return (
    <Popover open={disabled ? false : open} onOpenChange={handleOpenChange} modal={true}>
      <PopoverTrigger asChild disabled={disabled}>
        <div
          role="combobox"
          aria-expanded={disabled ? false : open}
          aria-disabled={disabled}
          aria-controls="radix-combobox"
          tabIndex={disabled ? -1 : 0}
          className={cn(
            "flex w-full min-w-0 items-center justify-between rounded-lg border border-input bg-background font-normal shadow-xs ring-offset-background transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-hidden",
            styles.container,
            disabled
              ? "cursor-not-allowed opacity-50 pointer-events-none hover:bg-transparent"
              : "cursor-pointer hover:bg-muted/10",
            selectedValues.length === 0 && "text-muted-foreground",
            className,
          )}
          onClick={(e) => {
            if (disabled) {
              e.preventDefault();
              e.stopPropagation();
            }
          }}
          onKeyDown={(e) => {
            if (disabled) {
              e.preventDefault();
              return;
            }

            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOpenChange(!open);
            }
          }}
        >
          <div className="flex flex-1 min-w-0 flex-wrap items-center gap-1.5">
            {getSelectedLabels.length === 0 ? (
              <span className={styles.text}>{placeholder}</span>
            ) : multiple ? (
              getSelectedLabels.map((item) => (
                <Badge
                  key={item.value}
                  variant="secondary"
                  className={cn(
                    "flex max-w-50 items-center gap-1 rounded-md border border-muted-foreground/10 font-medium",
                    styles.badge,
                  )}
                >
                  <span className="truncate">{item.label}</span>
                  <button
                    type="button"
                    disabled={disabled}
                    className={cn(
                      "ml-0.5 rounded-full p-0.5 text-muted-foreground outline-hidden transition-colors hover:bg-muted hover:text-foreground",
                      disabled && "cursor-not-allowed opacity-50 pointer-events-none",
                    )}
                    onClick={(e) => {
                      if (disabled) {
                        e.preventDefault();
                        e.stopPropagation();
                        return;
                      }
                      handleRemove(item.value, e);
                    }}
                    onKeyDown={(e) => {
                      if (disabled) return;
                      if (e.key === "Enter") {
                        handleRemove(item.value, (e as unknown) as React.MouseEvent);
                      }
                    }}
                  >
                    <X className={styles.badgeClose} />
                  </button>
                </Badge>
              ))
            ) : (
              <div className="flex min-w-0 items-center gap-2">
                {getSelectedLabels[0]?.avatar && (
                  <img
                    src={getSelectedLabels[0].avatar}
                    alt={getSelectedLabels[0].label}
                    className={cn("rounded-full object-cover", styles.avatar)}
                  />
                )}
                <span className={cn("truncate", styles.text)}>{getSelectedLabels[0]?.label}</span>
              </div>
            )}
          </div>
          <ChevronsUpDown className={cn("ml-2 shrink-0 opacity-50", styles.icon)} />
        </div>
      </PopoverTrigger>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) overflow-hidden rounded-xl border p-0 shadow-xl"
        align="start"
      >
        <Command
          className="p-0"
          shouldFilter={!onSearch}
          filter={(val, search, keywords) => {
            const extendValue = val + " " + (keywords ?? []).join(" ");

            if (extendValue.toLowerCase().includes(search.toLowerCase())) {
              return 1;
            }

            return 0;
          }}
        >
          <CommandInput
            placeholder={searchPlaceholder}
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-10 border-none focus:ring-0"
          />
          <CommandList className="max-h-75 overflow-y-auto p-1">
            {isLoading ? (
              <div className="flex flex-col gap-2.5 px-4 py-6">
                {/* Visual Premium Skeletons */}
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-[60%] animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-[40%] animate-pulse rounded bg-muted" />
                  </div>
                </div>
                <div className="flex items-center gap-3 opacity-60">
                  <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3.5 w-[45%] animate-pulse rounded bg-muted" />
                    <div className="h-2.5 w-[30%] animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </CommandEmpty>
                <CommandGroup className="p-0">
                  {displayedOptions.map((item) => {
                    const itemValueStr = String(item.value);
                    const isSelected = selectedValues.includes(itemValueStr);

                    return (
                      <CommandItem
                        key={itemValueStr}
                        value={itemValueStr}
                        keywords={[item.label, item.description || ""]}
                        onSelect={() => handleSelect(itemValueStr)}
                        className="flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2.5 hover:bg-accent data-[selected=true]:bg-accent"
                      >
                        <div className="flex min-w-0 flex-1 items-center gap-3">
                          {item.avatar && (
                            <img
                              src={item.avatar}
                              alt={item.label}
                              className="h-8 w-8 shrink-0 rounded-full border border-muted object-cover"
                            />
                          )}
                          <div className="flex min-w-0 flex-col leading-tight">
                            <span className="truncate text-sm font-medium text-foreground">
                              {item.label}
                            </span>
                            {item.description && (
                              <span className="mt-0.5 truncate text-xs text-muted-foreground">
                                {item.description}
                              </span>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="ml-2 h-4 w-4 shrink-0 text-primary" />
                        )}
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

