"use client";

import React, { useState } from "react";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import type { Swiper as SwiperInstance } from "swiper";
import "swiper/css";
import "swiper/css/pagination";

interface CardSwiperProps<T> {
  items: T[];
  getKey: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
}

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

export default function CardSwiper<T>({ items, getKey, renderItem }: CardSwiperProps<T>) {
  const [swiper, setSwiper] = useState<SwiperInstance | null>(null);
  const [isBeginning, setIsBeginning] = useState(true);
  const [isEnd, setIsEnd] = useState(items.length <= 1);

  return (
    <div>
      <Swiper
        modules={[Pagination]}
        spaceBetween={24}
        slidesPerView={1}
        breakpoints={{
          768: {
            slidesPerView: 2,
          },
        }}
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
        {items.map((item) => (
          <SwiperSlide key={getKey(item)}>{renderItem(item)}</SwiperSlide>
        ))}
      </Swiper>

      {items.length > 1 && (
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
