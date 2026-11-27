import { useId, useState } from 'react';
import { Search } from 'lucide-react';
import type { CityLocation } from '../types';
import { QUICK_INDIAN_CITIES } from '../data/breatheWisePresets';
import { useCitySearch } from '../hooks/useCitySearch';

interface CitySearchSectionProps {
  location: CityLocation;
  onSelectCity: (city: CityLocation) => void;
}

/** City geocoding search combobox and quick Indian city preset chips. */
export function CitySearchSection({ location, onSelectCity }: CitySearchSectionProps) {
  const { query, setQuery, results, searching, searchError, clearSearch } = useCitySearch();
  const [openDropdown, setOpenDropdown] = useState<boolean>(false);
  const inputId = useId();
  const listboxId = useId();

  return (
    <section
      aria-label="All-India city search and quick city chips"
      className="border border-slate-200 bg-white p-6"
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
        <div className="relative lg:col-span-5">
          <label htmlFor={inputId} className="sr-only">
            Search any Indian city via Open-Meteo Geocoding
          </label>
          <div className="relative flex items-center">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute left-3 h-4 w-4 text-slate-500"
            />
            <input
              id={inputId}
              type="search"
              value={query}
              onFocus={() => setOpenDropdown(true)}
              onBlur={() => window.setTimeout(() => setOpenDropdown(false), 180)}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpenDropdown(true);
              }}
              placeholder="Search any Indian city (Gurugram, Jalandhar, Lucknow…)"
              role="combobox"
              aria-expanded={openDropdown && (results.length > 0 || searching)}
              aria-controls={listboxId}
              aria-autocomplete="list"
              className="w-full rounded-md border border-slate-300 bg-slate-50 py-2 pr-3 pl-9 text-sm text-slate-900 placeholder:text-slate-500 focus:border-teal-700 focus:bg-white focus:outline-none"
            />
          </div>
          {openDropdown && (searching || results.length > 0 || searchError) && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Geocoding city matches"
              className="absolute right-0 left-0 z-20 mt-1 max-h-60 overflow-auto border border-slate-200 bg-white py-1 shadow-sm"
            >
              {searching && (
                <li className="px-3 py-2 text-xs text-slate-600">
                  Searching Open-Meteo Geocoding…
                </li>
              )}
              {searchError && <li className="px-3 py-2 text-xs text-red-700">{searchError}</li>}
              {!searching &&
                results.map((city) => (
                  <li key={city.id} role="option" aria-selected={false}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        onSelectCity(city);
                        clearSearch();
                        setOpenDropdown(false);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-slate-900 hover:bg-slate-100"
                    >
                      <span className="font-medium">
                        {city.name}
                        {city.admin1 ? `, ${city.admin1}` : ''}
                      </span>
                      <span className="font-mono text-xs text-slate-600 tabular-nums">
                        {city.country}
                      </span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>

        <div
          className="flex flex-wrap items-center gap-1.5 lg:col-span-7"
          role="group"
          aria-label="Quick Indian city chips"
        >
          <span className="mr-1 text-xs font-medium text-slate-600">Quick Cities:</span>
          {QUICK_INDIAN_CITIES.map((city) => {
            const selected = location.name === city.name;
            return (
              <button
                key={city.id}
                type="button"
                aria-pressed={selected}
                onClick={() => onSelectCity(city)}
                className={`rounded-md border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
                  selected
                    ? 'border-teal-800 bg-teal-800 text-white'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {city.name}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
