'use client';

import React, { useEffect, useState } from 'react';
import TimelineItem from './TimeLineItem';
import { ResponseActivity, useGetContactActivitiesQuery } from './../../../app/redux/api/contactApi';
import VeryShortSpinnerPrimary from '../loaders/veryShortSpinnerPrimary';

interface TimelineProps {
  contactId: string;
}

const LIMIT = 5;

const Timeline: React.FC<TimelineProps> = ({ contactId }) => {
  const [page, setPage] = useState(1);
  const [activities, setActivities] = useState<ResponseActivity[]>([]);

  const { data, isFetching, error } = useGetContactActivitiesQuery(
    { contactId, page, limit: LIMIT },
    { skip: !contactId }
  );

  useEffect(() => {
    if (!data) return;
    setActivities((prev) => {
      if (page === 1) return data.activities;
      const existingIds = new Set(prev.map((activity) => activity._id));
      return [...prev, ...data.activities.filter((activity) => !existingIds.has(activity._id))];
    });
  }, [data, page]);

  const hasMore = data ? data.pagination.page < data.pagination.totalPages : false;

  if (error) {
    return <p className="text-sm text-red-500">Failed to load activity timeline.</p>;
  }

  if (!isFetching && activities.length === 0) {
    return <p className="text-sm text-gray-500 dark:text-gray-400">No activity recorded yet.</p>;
  }

  return (
    <div>
      <ol className="relative border-s border-gray-200 dark:border-gray-700">
        {activities.map((activity) => (
          <TimelineItem key={activity._id} activity={activity} />
        ))}
      </ol>

      {isFetching && (
        <div className="flex justify-center py-2">
          <VeryShortSpinnerPrimary />
        </div>
      )}

      {!isFetching && hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            More
          </button>
        </div>
      )}
    </div>
  );
};

export default Timeline;
