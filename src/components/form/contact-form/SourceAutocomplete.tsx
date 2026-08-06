"use client";

import React, { useEffect, useRef, useState } from "react";
import { useCreateSourceMutation, useGetSourcesQuery } from "@/app/redux/api/sourceApi";

interface SourceAutocompleteProps {
  value: string;
  onChange: (title: string) => void;
  label?: string | null;
  placeholder?: string;
}

export default function SourceAutocomplete({
  value,
  onChange,
  label = "Source",
  placeholder = "Search or add a source...",
}: SourceAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { data, isFetching } = useGetSourcesQuery({ search: query }, { skip: !isOpen });
  const [createSource, { isLoading: isCreating }] = useCreateSourceMutation();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const sources = data?.sources ?? [];
  const trimmedQuery = query.trim();
  const hasExactMatch = sources.some((source) => source.title.toLowerCase() === trimmedQuery.toLowerCase());

  const handleSelect = (title: string) => {
    onChange(title);
    setQuery(title);
    setIsOpen(false);
  };

  const handleCreate = async () => {
    if (!trimmedQuery) return;
    try {
      const result = await createSource({ title: trimmedQuery }).unwrap();
      handleSelect(result.source.title);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      // Surfaced implicitly — the dropdown just stays open for another try.
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      {label && (
        <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">{label}</label>
      )}
      <input
        type="text"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(event.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        placeholder={placeholder}
        className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
      />
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-lg border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900">
          <ul className="max-h-56 overflow-y-auto py-2 text-sm text-gray-700 custom-scrollbar dark:text-gray-200">
            {isFetching ? (
              <li className="px-4 py-2">Loading...</li>
            ) : sources.length > 0 ? (
              sources.map((source) => (
                <li key={source._id}>
                  <button
                    type="button"
                    className="block w-full px-4 py-2 text-left hover:bg-gray-100 dark:hover:bg-white/5"
                    onClick={() => handleSelect(source.title)}
                  >
                    {source.title}
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-2 text-gray-500">No sources found</li>
            )}
            {trimmedQuery && !hasExactMatch && (
              <li className="border-t border-gray-100 dark:border-gray-700">
                <button
                  type="button"
                  disabled={isCreating}
                  className="flex w-full items-center gap-1.5 px-4 py-2 text-left text-brand-600 hover:bg-gray-100 disabled:opacity-50 dark:text-brand-400 dark:hover:bg-white/5"
                  onClick={handleCreate}
                >
                  {isCreating ? "Adding..." : `+ Add "${trimmedQuery}" as new source`}
                </button>
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
