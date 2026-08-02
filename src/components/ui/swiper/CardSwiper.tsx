"use client";

import React, { useMemo, useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/pagination";

interface CardSwiperProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  // When set, groups `items` into pages of this size and lays each page out
  // as a grid (e.g. itemsPerSlide=4, gridCols=2 -> a 2x2 grid per slide)
  // instead of the default one-card-at-a-time carousel.
  itemsPerSlide?: number;
  gridCols?: 1 | 2 | 3 | 4;
}

// Tailwind's JIT scanner needs literal class names, not interpolated ones.
const GRID_COLS_CLASS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
};

const ChevronLeftIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 18 9 12 15 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="9 18 15 12 9 6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function CardSwiper<T>({ items, getKey, renderItem, itemsPerSlide, gridCols = 2 }: CardSwiperProps<T>) {
  const pages = useMemo(() => {
    if (!itemsPerSlide) return null;
    const groups: T[][] = [];
    for (let i = 0; i < items.length; i += itemsPerSlide) {
      groups.push(items.slice(i, i + itemsPerSlide));
    }
    return groups;
  }, [items, itemsPerSlide]);

  const slideCount = pages ? pages.length : items.length;

  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(slideCount <= 1);

  return (
    <div>
      <Swiper
        modules={[Pagination]}
        spaceBetween={24}
        slidesPerView={1}
        breakpoints={pages ? undefined : { 768: { slidesPerView: 2 } }}
        pagination={{ clickable: true }}
        onSwiper={(instance) => {
          setSwiper(instance);
          setIsBeginning(instance.isBeginning);
          setIsEnd(instance.isEnd);
        }}
        onSlideChange={(instance) => {
          setIsBeginning(instance.isBeginning);
          setIsEnd(instance.isEnd);
        }}
        className="mySwiper"
      >
        {pages
          ? pages.map((page, index) => (
              <SwiperSlide key={index}>
                <div className={`grid grid-cols-1 gap-4 ${GRID_COLS_CLASS[gridCols]}`}>
                  {page.map((item) => (
                    <React.Fragment key={getKey(item)}>{renderItem(item)}</React.Fragment>
                  ))}
                </div>
              </SwiperSlide>
            ))
          : items.map((item) => <SwiperSlide key={getKey(item)}>{renderItem(item)}</SwiperSlide>)}
      </Swiper>

      {slideCount > 1 && (
        <div className="mt-4 flex justify-center gap-2">
          <button
            type="button"
            onClick={() => swiper?.slidePrev()}
            disabled={isBeginning}
            aria-label="Previous"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronLeftIcon />
          </button>
          <button
            type="button"
            onClick={() => swiper?.slideNext()}
            disabled={isEnd}
            aria-label="Next"
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            <ChevronRightIcon />
          </button>
        </div>
      )}
    </div>
  );
}
