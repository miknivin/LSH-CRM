"use client";

import React, { memo } from "react";

import { ContactResponseItem } from "@/app/redux/api/contactApi";
import EditIcon from "@/components/ui/flowbiteIcons/EditIcon";

interface ContactResponseCardProps {
  response: ContactResponseItem;
  onEdit?: (response: ContactResponseItem) => void;
}

const activityConfig: Record<string, { label: string; cls: string }> = {
  HAD_CONVERSATION: { label: "Had conversation", cls: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" },
  CALLED_NOT_PICKED: { label: "Called, not picked", cls: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400" },
  CALLED_INVALID: { label: "Called, invalid number", cls: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400" },
  CALLED_SWITCHED_OFF: { label: "Called, switched off", cls: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-400" },
  WHATSAPP_COMMUNICATED: { label: "WhatsApp communicated", cls: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" },
  ONLINE_MEETING_SCHEDULED: { label: "Online meeting scheduled", cls: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" },
  OFFLINE_MEETING_SCHEDULED: { label: "Offline meeting scheduled", cls: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" },
  ONLINE_MEETING_CONFIRMED: { label: "Online meeting confirmed", cls: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" },
  OFFLINE_MEETING_CONFIRMED: { label: "Offline meeting confirmed", cls: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" },
  PROPOSAL_SHARED: { label: "Proposal shared", cls: "bg-brand-50 text-brand-700 dark:bg-brand-500/15 dark:text-brand-300" },
  PAYMENT_DONE_ADVANCE: { label: "Advance payment done", cls: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" },
  PAYMENT_DONE_PENDING: { label: "Payment pending", cls: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400" },
  FULL_PAYMENT_DONE: { label: "Full payment done", cls: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" },
  PAYMENT_DONE_MONTHLY: { label: "Monthly payment done", cls: "bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-400" },
  OTHER: { label: "Other", cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" },
};

const getCreatedByName = (response: ContactResponseItem) =>
  typeof response.createdBy === "string" ? "Unknown" : response.createdBy?.name || "Unknown";

function ContactResponseCardComponent({ response, onEdit }: ContactResponseCardProps) {
  const config = activityConfig[response.activity] ?? { label: response.activity, cls: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300" };

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03]">
      <div className="mb-2.5 flex items-start justify-between gap-3">
        <span className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${config.cls}`}>
          {config.label}
        </span>
        {onEdit && (
          <button
            type="button"
            onClick={() => onEdit(response)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
            title="Edit response"
            aria-label="Edit response"
          >
            <EditIcon />
          </button>
        )}
      </div>

      {response.note && (
        <p className="mb-3 text-sm leading-relaxed text-gray-600 dark:text-gray-300">{response.note}</p>
      )}

      {response.meetingScheduledDate && (
        <p className="mb-2 text-xs text-gray-500 dark:text-gray-400">
          Meeting: {new Date(response.meetingScheduledDate).toLocaleString()}
        </p>
      )}

      <div className="my-3 h-px bg-gray-100 dark:bg-gray-800" />

      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>By {getCreatedByName(response)}</span>
        <span>{new Date(response.createdAt).toLocaleString()}</span>
      </div>
    </article>
  );
}

export default memo(ContactResponseCardComponent);
