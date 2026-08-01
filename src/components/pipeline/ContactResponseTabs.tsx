"use client";

import React, { useState } from "react";

import { ContactResponseItem, useGetContactResponsesQuery } from "@/app/redux/api/contactApi";
import VeryShortSpinnerPrimary from "../ui/loaders/veryShortSpinnerPrimary";
import ContactResponseCard from "./ContactResponseCard";
import ContactResponseForm from "./ContactResponseForm";

interface Contact {
  _id: string;
  name?: string;
}

interface ContactResponseTabsProps {
  contact: Contact;
  onClose: () => void;
}

export default function ContactResponseTabs({ contact, onClose }: ContactResponseTabsProps) {
  const [activeTab, setActiveTab] = useState("add-response");
  const [editingResponse, setEditingResponse] = useState<ContactResponseItem | null>(null);
  const [page, setPage] = useState(1);

  const { data, isFetching, error } = useGetContactResponsesQuery({ contactId: contact._id, page, limit: 20 });
  const responses = data?.responses ?? [];

  const resetEdit = () => {
    setEditingResponse(null);
  };

  const handleSaved = () => {
    resetEdit();
    setActiveTab("view-responses");
  };

  const handleEdit = (response: ContactResponseItem) => {
    setEditingResponse(response);
    setActiveTab("add-response");
  };

  return (
    <div>
      <ul className="flex flex-wrap text-sm font-medium text-center text-gray-500 border-b border-gray-200 dark:border-gray-700 dark:text-gray-400">
        <li className="me-2">
          <button
            type="button"
            onClick={() => setActiveTab("add-response")}
            className={`inline-block p-4 rounded-t-lg ${
              activeTab === "add-response"
                ? "text-blue-600 bg-gray-100 active dark:bg-gray-800 dark:text-blue-500"
                : "hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            }`}
          >
            {editingResponse ? "Edit Response" : "Add Response"}
          </button>
        </li>
        <li className="me-2">
          <button
            type="button"
            onClick={() => {
              setActiveTab("view-responses");
              resetEdit();
            }}
            className={`inline-block p-4 rounded-t-lg ${
              activeTab === "view-responses"
                ? "text-blue-600 bg-gray-100 active dark:bg-gray-800 dark:text-blue-500"
                : "hover:text-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            }`}
          >
            View Responses
          </button>
        </li>
      </ul>

      <div className="p-4">
        {activeTab === "add-response" && (
          <ContactResponseForm
            contact={contact}
            editingResponse={editingResponse}
            onClose={onClose}
            onCancelEdit={resetEdit}
            onSaved={handleSaved}
          />
        )}

        {activeTab === "view-responses" && (
          <div className="space-y-4">
            {isFetching && (
              <div className="flex justify-center">
                <VeryShortSpinnerPrimary />
              </div>
            )}
            {error && <p className="text-sm text-red-500">Failed to load responses.</p>}
            {!isFetching && responses.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">No responses logged for {contact.name || "this contact"} yet.</p>
            )}
            {responses.map((response) => (
              <ContactResponseCard key={response._id} response={response} onEdit={handleEdit} />
            ))}
            {data && data.pagination.page < data.pagination.totalPages && (
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setPage((current) => current + 1)}
                  disabled={isFetching}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  Load more
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
