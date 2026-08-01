"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";

import {
  ContactResponseActivity,
  ContactResponseItem,
  useCreateContactResponseMutation,
  useUpdateContactResponseMutation,
} from "@/app/redux/api/contactApi";

interface Contact {
  _id: string;
  name?: string;
}

interface ContactResponseFormProps {
  contact: Contact;
  editingResponse: ContactResponseItem | null;
  onClose: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
}

const activityOptions: ContactResponseActivity[] = [
  "HAD_CONVERSATION",
  "CALLED_NOT_PICKED",
  "CALLED_INVALID",
  "CALLED_SWITCHED_OFF",
  "WHATSAPP_COMMUNICATED",
  "ONLINE_MEETING_SCHEDULED",
  "OFFLINE_MEETING_SCHEDULED",
  "ONLINE_MEETING_CONFIRMED",
  "OFFLINE_MEETING_CONFIRMED",
  "PROPOSAL_SHARED",
  "PAYMENT_DONE_ADVANCE",
  "PAYMENT_DONE_PENDING",
  "FULL_PAYMENT_DONE",
  "PAYMENT_DONE_MONTHLY",
  "OTHER",
];

const meetingActivities: ContactResponseActivity[] = [
  "ONLINE_MEETING_SCHEDULED",
  "OFFLINE_MEETING_SCHEDULED",
  "ONLINE_MEETING_CONFIRMED",
  "OFFLINE_MEETING_CONFIRMED",
];

const formatLocalDateTime = (date: Date) => {
  const offsetMinutes = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offsetMinutes * 60000);
  return localDate.toISOString().slice(0, 16);
};

export default function ContactResponseForm({ contact, editingResponse, onClose, onCancelEdit, onSaved }: ContactResponseFormProps) {
  const [activity, setActivity] = useState<ContactResponseActivity>("HAD_CONVERSATION");
  const [note, setNote] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [addToCalendar, setAddToCalendar] = useState(false);
  const [minDate, setMinDate] = useState("");

  const [createContactResponse, { isLoading: isCreating }] = useCreateContactResponseMutation();
  const [updateContactResponse, { isLoading: isUpdating }] = useUpdateContactResponseMutation();

  const isMeetingActivity = meetingActivities.includes(activity);
  const isSaving = isCreating || isUpdating;

  useEffect(() => {
    setMinDate(formatLocalDateTime(new Date()));
  }, []);

  useEffect(() => {
    if (editingResponse) {
      setActivity(editingResponse.activity);
      setNote(editingResponse.note || "");
      setMeetingDate(editingResponse.meetingScheduledDate ? formatLocalDateTime(new Date(editingResponse.meetingScheduledDate)) : "");
      setAddToCalendar(false);
    } else {
      setActivity("HAD_CONVERSATION");
      setNote("");
      setMeetingDate("");
      setAddToCalendar(false);
    }
  }, [editingResponse]);

  const handleActivityChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const value = event.target.value as ContactResponseActivity;
    setActivity(value);
    if (!meetingActivities.includes(value)) {
      setMeetingDate("");
      setAddToCalendar(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isMeetingActivity && !meetingDate) {
      toast.error("Please select a meeting date");
      return;
    }

    try {
      if (editingResponse) {
        await updateContactResponse({
          contactId: contact._id,
          responseId: editingResponse._id,
          activity,
          note,
          meetingScheduledDate: meetingDate ? new Date(meetingDate).toISOString() : null,
        }).unwrap();
        toast.success("Response updated");
      } else {
        await createContactResponse({
          contactId: contact._id,
          activity,
          note,
          meetingScheduledDate: meetingDate ? new Date(meetingDate).toISOString() : null,
          addToCalendar,
        }).unwrap();
        toast.success("Response added");
      }
      onSaved();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(error?.data?.error || `Failed to ${editingResponse ? "update" : "add"} response`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-lg font-semibold text-start text-gray-900 dark:text-white">
        {editingResponse ? "Edit Response" : "Add Response"} for {contact.name || "Contact"}
      </h2>

      <div>
        <label htmlFor="activity" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">
          Activity
        </label>
        <select
          id="activity"
          value={activity}
          onChange={handleActivityChange}
          required
          className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        >
          {activityOptions.map((option) => (
            <option key={option} value={option}>
              {option.replace(/_/g, " ").toLowerCase()}
            </option>
          ))}
        </select>
      </div>

      {isMeetingActivity && (
        <div>
          <label htmlFor="meetingDate" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">
            Meeting Date
          </label>
          <input
            type="datetime-local"
            id="meetingDate"
            value={meetingDate}
            min={minDate}
            onChange={(event) => setMeetingDate(event.target.value)}
            required
            className="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
          />
        </div>
      )}

      <div>
        <label htmlFor="note" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white">
          Note
        </label>
        <textarea
          id="note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="Add note..."
          rows={4}
          maxLength={1000}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
        />
      </div>

      {!editingResponse && isMeetingActivity && (
        <label className="flex items-center gap-3 rounded-lg border border-gray-200 p-3 text-sm text-gray-700 dark:border-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={addToCalendar}
            onChange={(event) => setAddToCalendar(event.target.checked)}
            disabled={!meetingDate}
            className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500 disabled:opacity-50"
          />
          <span>Add meeting to calendar</span>
        </label>
      )}

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={editingResponse ? onCancelEdit : onClose}
          className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
        >
          {editingResponse ? "Cancel Edit" : "Close"}
        </button>
        <button
          type="submit"
          disabled={isSaving}
          className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : editingResponse ? "Update Response" : "Save Response"}
        </button>
      </div>
    </form>
  );
}
