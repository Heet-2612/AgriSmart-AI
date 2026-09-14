import {
  useState,
  useRef,
  useEffect,
  forwardRef,
  useImperativeHandle,
  ChangeEvent,
  KeyboardEvent,
} from 'react';
import { Search, ChevronDown, Check, X, AlertCircle } from 'lucide-react';

export interface SearchableSelectProps {
  id: string;
  name: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  filterFn?: (options: string[], query: string) => string[];
  placeholder?: string;
  disabledPlaceholder?: string;
  disabled?: boolean;
  required?: boolean;
  error?: string;
  className?: string;
  noOptionsMessage?: string;
}

export const SearchableSelect = forwardRef<HTMLInputElement, SearchableSelectProps>(
  (
    {
      id,
      name,
      label,
      value,
      onChange,
      options,
      filterFn,
      placeholder = 'Type to search or select...',
      disabledPlaceholder = 'Disabled',
      disabled = false,
      required = false,
      error,
      className = '',
      noOptionsMessage = 'No matching options found',
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);

    const inputRef = useRef<HTMLInputElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const listboxRef = useRef<HTMLUListElement>(null);

    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Filter options based on search query
    const filteredOptions = filterFn
      ? filterFn(options, searchQuery)
      : searchQuery.trim()
      ? options.filter((opt) => opt.toLowerCase().includes(searchQuery.trim().toLowerCase()))
      : options;

    // Synchronize query when value changes externally
    useEffect(() => {
      if (value) {
        setSearchQuery(value);
      } else {
        setSearchQuery('');
      }
    }, [value]);

    // Close dropdown on outside click
    useEffect(() => {
      const handleOutsideClick = (e: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
          setIsOpen(false);
          // If query differs from standardized value, standardize or reset
          if (searchQuery.trim()) {
            const exactMatch = options.find(
              (opt) => opt.toLowerCase() === searchQuery.trim().toLowerCase()
            );
            if (exactMatch) {
              onChange(exactMatch);
              setSearchQuery(exactMatch);
            } else if (value) {
              setSearchQuery(value);
            }
          }
        }
      };

      document.addEventListener('mousedown', handleOutsideClick);
      return () => document.removeEventListener('mousedown', handleOutsideClick);
    }, [searchQuery, options, value, onChange]);

    // Keep highlighted index in view
    useEffect(() => {
      if (highlightedIndex >= 0 && listboxRef.current) {
        const item = listboxRef.current.children[highlightedIndex] as HTMLElement;
        item?.scrollIntoView?.({ block: 'nearest' });
      }
    }, [highlightedIndex]);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
      const q = e.target.value;
      setSearchQuery(q);
      setIsOpen(true);
      setHighlightedIndex(0);

      // Check for immediate exact match
      const exactMatch = options.find((opt) => opt.toLowerCase() === q.trim().toLowerCase());
      if (exactMatch) {
        onChange(exactMatch);
      } else {
        onChange(q);
      }
    };

    const handleSelectOption = (option: string) => {
      onChange(option);
      setSearchQuery(option);
      setIsOpen(false);
      setHighlightedIndex(-1);
      inputRef.current?.focus();
    };

    const handleClear = () => {
      onChange('');
      setSearchQuery('');
      setIsOpen(false);
      inputRef.current?.focus();
    };

    const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) =>
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(filteredOptions.length - 1);
        } else {
          setHighlightedIndex((prev) =>
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
        }
      } else if (e.key === 'Enter') {
        if (isOpen && highlightedIndex >= 0 && filteredOptions[highlightedIndex]) {
          e.preventDefault();
          handleSelectOption(filteredOptions[highlightedIndex]);
        }
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      } else if (e.key === 'Tab') {
        setIsOpen(false);
      }
    };

    return (
      <div ref={containerRef} className={`relative text-left ${className}`}>
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-slate-700 mb-1.5"
        >
          {label} {required && <span className="text-red-500" aria-hidden="true">*</span>}
        </label>

        <div className="relative">
          {/* Search Icon */}
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
            <Search size={15} aria-hidden="true" />
          </div>

          {/* Autocomplete Input */}
          <input
            ref={inputRef}
            id={id}
            name={name}
            type="text"
            role="combobox"
            aria-expanded={isOpen}
            aria-autocomplete="list"
            aria-controls={`${id}-listbox`}
            aria-haspopup="listbox"
            aria-required={required}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-error` : undefined}
            disabled={disabled}
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={() => {
              if (!disabled) setIsOpen(true);
            }}
            onKeyDown={handleKeyDown}
            placeholder={disabled ? disabledPlaceholder : placeholder}
            autoComplete="off"
            className={`w-full rounded-xl border bg-white py-2.5 pl-9 pr-16 text-sm text-slate-800 transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed ${
              error
                ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-500/20 hover:border-slate-300'
            }`}
          />

          {/* Action Icons (Clear / Dropdown Toggle) */}
          <div className="absolute inset-y-0 right-0 flex items-center pr-2.5 gap-1">
            {value && !disabled && (
              <button
                type="button"
                onClick={handleClear}
                aria-label="Clear selection"
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors"
              >
                <X size={14} aria-hidden="true" />
              </button>
            )}
            <button
              type="button"
              tabIndex={-1}
              disabled={disabled}
              onClick={() => {
                if (!disabled) {
                  setIsOpen((prev) => !prev);
                  inputRef.current?.focus();
                }
              }}
              aria-label="Toggle options dropdown"
              className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition-colors disabled:opacity-40"
            >
              <ChevronDown
                size={16}
                className={`transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Dropdown Menu */}
        {isOpen && !disabled && (
          <ul
            ref={listboxRef}
            id={`${id}-listbox`}
            data-testid={`${id}-listbox`}
            role="listbox"
            aria-label="Available options"
            className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-lg ring-1 ring-black/5 focus:outline-none text-xs sm:text-sm"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, idx) => {
                const isSelected = value.toLowerCase() === option.toLowerCase();
                const isHighlighted = idx === highlightedIndex;

                return (
                  <li
                    key={option}
                    id={`${id}-option-${idx}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => handleSelectOption(option)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`relative flex items-center justify-between px-3.5 py-2 cursor-pointer select-none transition-colors ${
                      isHighlighted
                        ? 'bg-emerald-50 text-emerald-900 font-medium'
                        : isSelected
                        ? 'bg-emerald-50/60 text-emerald-800 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{option}</span>
                    {isSelected && (
                      <Check size={15} className="text-emerald-600 shrink-0 ml-2" aria-hidden="true" />
                    )}
                  </li>
                );
              })
            ) : (
              <li className="px-3.5 py-3 text-center text-xs text-slate-400 italic">
                {noOptionsMessage}
              </li>
            )}
          </ul>
        )}

        {/* Error Message */}
        {error && (
          <p
            id={`${id}-error`}
            role="alert"
            className="mt-1.5 text-xs text-red-600 font-medium flex items-center gap-1"
          >
            <AlertCircle size={13} aria-hidden="true" />
            <span>{error}</span>
          </p>
        )}
      </div>
    );
  }
);

SearchableSelect.displayName = 'SearchableSelect';
