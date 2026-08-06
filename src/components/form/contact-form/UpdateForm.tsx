/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import {
  ResponseContact,
  TaskItem,
  TaskStatus,
  useGetContactResponsesQuery,
  useGetTasksQuery,
  useUpdateContactMutation,
  useUpdateContactStageMutation,
  useUpdateTaskMutation,
} from '@/app/redux/api/contactApi';
import { useGetStagesByPipelineIdQuery } from '@/app/redux/api/pipelineApi';
import { toast } from 'react-toastify';
import VeryShortSpinnerPrimary from '@/components/ui/loaders/veryShortSpinnerPrimary';
import CardSwiper from '@/components/ui/swiper/CardSwiper';
import { Modal } from "@/components/ui/modal";
import TaskTabs from '@/components/pipeline/TaskTabs';
import TaskCard from '@/components/pipeline/TaskCard';
import ContactResponseTabs from '@/components/pipeline/ContactResponseTabs';
import ContactResponseCard from '@/components/pipeline/ContactResponseCard';
import SourceAutocomplete from './SourceAutocomplete';
import { useModal } from '@/hooks/useModal';

interface UpdateContactFormProps {
  contact: ResponseContact;
}

interface ContactFormData {
  name: string;
  email: string;
  phone: string;
  notes?: string;
  businessName?: string;
  source?: string;
  preferredVisitingTime?: string;
  numberOfPeople?: string;
  preferredNightsAndDays?: string;
}

const UpdateContactForm: React.FC<UpdateContactFormProps> = ({ contact }) => {
  const [updateContact, { isLoading: isUpdating }] = useUpdateContactMutation();
  const [updateContactStage, { isLoading: isStageUpdating }] = useUpdateContactStageMutation();
  const [updateTask, { isLoading: isTaskUpdating }] = useUpdateTaskMutation();
  const { data: tasksData, isLoading: isTasksLoading, error: tasksError } = useGetTasksQuery({ contactId: contact._id });
  const { data: responsesData, isLoading: isResponsesLoading, error: responsesError } = useGetContactResponsesQuery({ contactId: contact._id, limit: 4 });
  const { isOpen: isResponseModalOpen, openModal: openResponseModal, closeModal: closeResponseModal } = useModal();
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    email: '',
    phone: '',
    notes: '',
    businessName: '',
    source: '',
    preferredVisitingTime: '',
    numberOfPeople: '',
    preferredNightsAndDays: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState<string>('');
  const { isOpen: isNotesModalOpen, openModal: openNotesModal, closeModal: closeNotesModal } = useModal();
  const DEFAULT_PIPELINE_ID = process.env.NEXT_PUBLIC_DEFAULT_PIPELINE || '6858217887f5899a7e6fc6f1';
  const { data: stagesData, isLoading: isStagesLoading, error: stagesError } = useGetStagesByPipelineIdQuery(DEFAULT_PIPELINE_ID, {
    skip: !DEFAULT_PIPELINE_ID,
  });


  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name || '',
        email: contact.email || '',
        phone: contact.phone || '',
        notes: contact.notes || '',
        businessName: contact.businessName || '',
        source: contact.source || '',
        preferredVisitingTime: contact.preferredVisitingTime || '',
        numberOfPeople: contact.numberOfPeople !== undefined && contact.numberOfPeople !== null ? String(contact.numberOfPeople) : '',
        preferredNightsAndDays: contact.preferredNightsAndDays || '',
      });
      const pipelineEntry = Array.isArray(contact.pipelinesActive) && contact.pipelinesActive.length > 0
        ? contact.pipelinesActive.find(entry => entry.pipeline_id?.toString() === DEFAULT_PIPELINE_ID)
        : null;
      setSelectedStage(pipelineEntry?.stage_id?.toString() || '');
    }
  }, [contact, DEFAULT_PIPELINE_ID]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStage(e.target.value);
  };

  const handleFormSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    try {
      const payload = {
        id: contact._id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        notes: formData.notes,
        businessName: formData.businessName,
        source: formData.source,
        preferredVisitingTime: formData.preferredVisitingTime,
        numberOfPeople: formData.numberOfPeople,
        preferredNightsAndDays: formData.preferredNightsAndDays,
        tags: contact.tags || [], // Preserve existing tags
      };

      // Update contact details first
      const contactResult = await updateContact(payload).unwrap();
      if (contactResult.success) {
        toast.success('Contact updated successfully');
      }

      // Check if stage has changed and update if necessary
      const pipelineEntry = Array.isArray(contact.pipelinesActive) && contact.pipelinesActive.length > 0
        ? contact.pipelinesActive.find(entry => entry.pipeline_id?.toString() === DEFAULT_PIPELINE_ID)
        : null;
      const currentStageId = pipelineEntry?.stage_id?.toString() || '';
      const stageChanged = selectedStage && selectedStage !== currentStageId;

      if (stageChanged) {
        const stageResult = await updateContactStage({
          contactId: contact._id,
          stageId: selectedStage,
        }).unwrap();
        if (stageResult.success) {
          toast.success('Contact stage updated successfully');
        }
      }
    } catch (error: any) {
      console.error('Error updating contact:', error);
      const errorMessage = error.data?.message || error.data?.error || 'Failed to update contact';
      const errorDetails = error?.data?.errors?.join(', ') || '';
      const finalMessage = errorMessage.includes('VersionError')
        ? 'Failed to update contact due to concurrent modification. Please try again.'
        : errorDetails ? `${errorMessage}: ${errorDetails}` : errorMessage;
      setError(finalMessage);
      toast.error(finalMessage);
      // Revert stage selection on error
      const pipelineEntry = Array.isArray(contact.pipelinesActive) && contact.pipelinesActive.length > 0
        ? contact.pipelinesActive.find(entry => entry.pipeline_id?.toString() === DEFAULT_PIPELINE_ID)
        : null;
      setSelectedStage(pipelineEntry?.stage_id?.toString() || '');
    }
  };

  const handleTaskStatusChange = async (task: TaskItem, status: TaskStatus) => {
    try {
      await updateTask({ id: task._id, status }).unwrap();
      toast.success('Task status updated');
    } catch (error: any) {
      toast.error(error?.data?.error || 'Failed to update task status');
    }
  };

  return (
    <>    <Modal isOpen={isNotesModalOpen} onClose={closeNotesModal} className="max-w-[600px] p-6">
        <TaskTabs contact={contact} onClose={closeNotesModal} />
      </Modal>
      <Modal isOpen={isResponseModalOpen} onClose={closeResponseModal} className="max-w-[600px] p-6">
        <ContactResponseTabs contact={contact} onClose={closeResponseModal} />
      </Modal>
    <div className="space-y-6 sticky top-1 md:top-20">
      
      <form onSubmit={handleFormSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="name"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Name
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
          />
        </div>
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Email
          </label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
          />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Phone
          </label>
          <input
            type="text"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            required
          />
        </div>
        <div>
          <label
            htmlFor="businessName"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Business Name
          </label>
          <input
            type="text"
            id="businessName"
            name="businessName"
            value={formData.businessName}
            onChange={handleInputChange}
            className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          />
        </div>
        <SourceAutocomplete
          label="Source"
          value={formData.source || ''}
          onChange={(title) => setFormData((prev) => ({ ...prev, source: title }))}
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <label
              htmlFor="preferredVisitingTime"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
            >
              Preferred Visiting Time
            </label>
            <input
              type="text"
              id="preferredVisitingTime"
              name="preferredVisitingTime"
              value={formData.preferredVisitingTime}
              onChange={handleInputChange}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label
              htmlFor="numberOfPeople"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
            >
              Number Of People
            </label>
            <input
              type="number"
              id="numberOfPeople"
              name="numberOfPeople"
              min="0"
              value={formData.numberOfPeople}
              onChange={handleInputChange}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
          <div>
            <label
              htmlFor="preferredNightsAndDays"
              className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
            >
              Preferred Nights &amp; Days
            </label>
            <input
              type="text"
              id="preferredNightsAndDays"
              name="preferredNightsAndDays"
              value={formData.preferredNightsAndDays}
              onChange={handleInputChange}
              className="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>
        </div>
        <div>
          <label
            htmlFor="stage"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Stage
          </label>
          {isStagesLoading ? (
            <div className="flex justify-center">
              <VeryShortSpinnerPrimary />
            </div>
          ) : stagesError ? (
            <p className="text-red-500 text-sm">
              Failed to load stages: {(stagesError as any)?.data?.error || 'Unknown error'}
            </p>
          ) : stagesData?.data && stagesData.data.length > 0 ? (
            <div className="relative">
              <select
                value={selectedStage}
                onChange={handleStageChange}
                disabled={isStageUpdating || isUpdating}
                className="appearance-none bg-transparent border w-full border-gray-300 rounded-lg px-4 py-2.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 dark:bg-gray-900 dark:border-gray-700 dark:text-white dark:focus:ring-brand-800"
              >
                <option value="" disabled>Select a stage</option>
                {stagesData.data
                  .map((stage) => (
                    <option key={stage._id} value={stage._id}>
                      {stage.name}
                    </option>
                  ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <svg
                  className="w-4 h-4 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              No stages available for this pipeline.
            </p>
          )}
        </div>
        <div>
          <label
            htmlFor="notes"
            className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-white"
          >
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            className="dark:bg-dark-900 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            rows={2}
          />
        </div>
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={isUpdating || isStageUpdating}
          className="w-full h-11 rounded-lg bg-brand-500 text-white font-medium text-sm hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:bg-brand-600 dark:hover:bg-brand-700 disabled:opacity-50"
        >
          {isUpdating || isStageUpdating ? 'Updating...' : 'Submit'}
        </button>
      </form>

      <div className="mt-6">
        <div className='flex justify-between mb-4 items-center'>
           <h2 className="text-lg font-semibold text-start text-gray-900 dark:text-white">
             Contact Tasks
           </h2>
            <button
              type="button"
              role="button"
              onClick={openNotesModal}
              className="inline-flex items-center justify-center font-medium gap-1 rounded-lg transition px-5 py-2.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:text-white"
            >
              Add +
            </button>
        </div>
       
        {isTasksLoading ? (
          <div className="flex justify-center">
            <VeryShortSpinnerPrimary />
          </div>
        ) : tasksError ? (
          <p className="text-red-500 text-sm">
            Failed to load contact tasks: {(tasksError as any)?.data?.message || 'Unknown error'}
          </p>
        ) : tasksData?.tasks && tasksData.tasks.length > 0 ? (
          <CardSwiper
            items={tasksData.tasks}
            getKey={(task) => task._id}
            renderItem={(task) => (
              <TaskCard
                task={task}
                isUpdating={isTaskUpdating}
                onStatusChange={handleTaskStatusChange}
              />
            )}
          />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No tasks linked to this contact.
          </p>
        )}
      </div>

      <div className="mt-6">
        <div className='flex justify-between mb-4 items-center'>
           <h2 className="text-lg font-semibold text-start text-gray-900 dark:text-white">
             Call Responses
           </h2>
            <button
              type="button"
              role="button"
              onClick={openResponseModal}
              className="inline-flex items-center justify-center font-medium gap-1 rounded-lg transition px-5 py-2.5 text-sm bg-brand-500 text-white shadow-theme-xs hover:bg-brand-600 disabled:bg-brand-300 disabled:text-white"
            >
              Add +
            </button>
        </div>

        {isResponsesLoading ? (
          <div className="flex justify-center">
            <VeryShortSpinnerPrimary />
          </div>
        ) : responsesError ? (
          <p className="text-red-500 text-sm">
            Failed to load call responses: {(responsesError as any)?.data?.error || 'Unknown error'}
          </p>
        ) : responsesData?.responses && responsesData.responses.length > 0 ? (
          <CardSwiper
            items={responsesData.responses}
            getKey={(response) => response._id}
            renderItem={(response) => <ContactResponseCard response={response} />}
          />
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No call responses logged for this contact.
          </p>
        )}
      </div>

    </div>
    </>
  );
};

export default UpdateContactForm;
