/* eslint-disable @typescript-eslint/no-explicit-any */
import { createApi, fetchBaseQuery, retry } from "@reduxjs/toolkit/query/react";
import { IContact } from "@/app/models/Contact";
import { FilterParams } from "@/components/tables/ContactTableOne";
import { userApi } from "./userApi";


export interface ResponseActivity {
  _id: string;
  action:
    | 'CONTACT_CREATED'
    | 'CONTACT_UPDATED'
    | 'TAG_ADDED'
    | 'TAG_REMOVED'
    | 'NOTE_ADDED'
    | 'NOTE_UPDATED'
    | 'PIPELINE_ADDED'
    | 'PIPELINE_STAGE_UPDATED'
    | 'PIPELINE_STAGE_CHANGED'
    | 'ASSIGNED_TO_UPDATED'
    | 'TASK_CREATED'
    | 'TASK_UPDATED'
    | 'TASK_DELETED'
    | 'REMARK_ADDED'
    | 'CONTACT_RESPONSE_ADDED'
    | 'CONTACT_RESPONSE_UPDATED';
  user: { _id: string; name: string; email?: string };
  details: Record<string, unknown>;
  createdAt: string;
  meetingScheduledDate?:any
}
export type ResponseContact = Omit<IContact, "uid" | "activities"> & {
  _id: string;
  activities: ResponseActivity[];
};

export type TaskStatus = "open" | "in_progress" | "done";
export type TaskPriority = "low" | "medium" | "high";
export type TaskType = "contact_linked" | "custom";

export interface TaskItem {
  _id: string;
  title: string;
  description?: string | null;
  type: TaskType;
  contactId?: string | { _id: string; name?: string } | null;
  assignedTo?: Array<{ _id: string; name: string; email?: string } | string>;
  dueDate?: string | null;
  dueTime?: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  owner: { _id: string; name: string; email?: string } | string;
  createdBy: { _id: string; name: string; email?: string } | string;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLogItem {
  _id: string;
  contactId: string;
  event: string;
  description: string;
  performedBy: { _id: string; name: string; email?: string } | string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface FilterContactsResponse {
  message: string;
  contacts: ResponseContact[];
  pagination: Pagination;
}



interface FilterContactsRequest {
  page?: number;
  limit?: number;
  keyword?: string;
  filter?: FilterParams;
}

interface ContactRequest {
  name: string;
  email: string;
  phone: string;
  userId: string;
  notes?: string;
  tags?: string[];
  preferredVisitingTime?: string;
  numberOfPeople?: number | string;
  preferredNightsAndDays?: string;
}

interface CreateContactApiResponse {
  message: string;
  contact: IContact;
}

interface UpdateContactsPipelineResponse {
  success: boolean;
  message: string;
  data: ResponseContact[];
}

interface UpdateContactsPipelineRequest {
  contactIds: string[];
  pipelineId: string;
  stageId: string;
  userId: string;
}

interface BatchUpdateContactDragRequest {
  updates: {
    contactId: string;
    pipelineId: string;
    stageId: string;
    order: number;
    userId?: string;
  }[];
}

interface BatchUpdateContactDragResponse {
  success: boolean;
  data: ResponseContact[];
}

interface UpdateContactRequest {
  id: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  tags?: { name: string }[]; // Send only name, backend sets user
  businessName?: string;
  preferredVisitingTime?: string;
  numberOfPeople?: number | string;
  preferredNightsAndDays?: string;
}

interface UpdateContactApiResponse {
  success: boolean;
  data: ResponseContact;
}

interface GetContactByIdResponse {
  success: boolean;
  data: ResponseContact;
  contact: ResponseContact;
  tasks: TaskItem[];
  activityLogs: ActivityLogItem[];
}

interface AssignContactsRequest {
  contactIds: string[];
  userIds: string[];
  assignType: "every" | "equally" | "roundRobin";
  isAddAsNewLead?: boolean;
}

interface AssignContactsResponse {
  message: string;
}

interface UpdateProbabilityResponse {
  message: string;
  contact: {
    _id: string;
    probability: number;
  };
}

interface UpdateContactNotesRequest {
  id: string;
  tags?: { name: string; user?: string }[];
  notes?: string;
}

interface UpdateContactNotesResponse {
  message: string;
  contact: ResponseContact;
}

export interface Tag {
  user: string;
  name: string;
}
interface GetContactNotesAndTagsResponse {
  message: string;
  notes: string;
  tags: Tag[];
}

interface ContactPayload {
  contacts: any[];
  assignedUsers: string[];
  assignType: "every" | "equally" | "roundRobin";
  addToPipeline: boolean;
}

interface CheckDuplicatesRequest {
  contacts: Partial<IContact>[];
}

interface CheckDuplicatesResponse {
  totalContacts: number;
  duplicateCount: number;
  newCount: number;
  duplicates: { email: string; name: string; phone: string }[];
  newContacts: { email: string; name: string; phone: string }[];
}

interface BulkImportContactsResponse {
  message: string;
  contacts: ResponseContact[];
  failed: { contact: any; error: string }[];
}

interface UpdateContactStageResponse {
  success: boolean;
  message: string;
  contact: ResponseContact;
}

interface CreateTaskRequest {
  title: string;
  description?: string;
  type: TaskType;
  contactId?: string | null;
  assignedTo?: string[];
  dueDate?: string | null;
  dueTime?: string | null;
  priority?: TaskPriority;
  status?: TaskStatus;
  addToCalendar?: boolean;
}

interface UpdateTaskRequest extends Partial<CreateTaskRequest> {
  id: string;
}

interface TaskResponse {
  message?: string;
  task: TaskItem;
}

interface TasksResponse {
  tasks: TaskItem[];
  pagination: Pagination;
}

interface GetTasksRequest {
  contactId?: string;
  assignedTo?: string;
  status?: TaskStatus;
  page?: number;
  limit?: number;
  dueStartDate?: string;
  dueEndDate?: string;
  updatedStartDate?: string;
  updatedEndDate?: string;
}

const getTaskContactId = (task?: TaskItem) => {
  const contactId = task?.contactId;
  if (!contactId) return "LIST";
  return typeof contactId === "string" ? contactId : contactId._id;
};

interface UpdateContactStageRequest {
  contactId: string;
  stageId: string;
}

export type ContactResponseActivity =
  | "HAD_CONVERSATION"
  | "CALLED_NOT_PICKED"
  | "CALLED_INVALID"
  | "CALLED_SWITCHED_OFF"
  | "WHATSAPP_COMMUNICATED"
  | "ONLINE_MEETING_SCHEDULED"
  | "OFFLINE_MEETING_SCHEDULED"
  | "ONLINE_MEETING_CONFIRMED"
  | "OFFLINE_MEETING_CONFIRMED"
  | "PROPOSAL_SHARED"
  | "PAYMENT_DONE_ADVANCE"
  | "PAYMENT_DONE_PENDING"
  | "FULL_PAYMENT_DONE"
  | "PAYMENT_DONE_MONTHLY"
  | "OTHER";

export interface ContactResponseItem {
  _id: string;
  contact: string;
  activity: ContactResponseActivity;
  note?: string;
  meetingScheduledDate?: string | null;
  createdBy: { _id: string; name: string; email?: string } | string;
  createdAt: string;
  updatedAt: string;
}

interface CreateContactResponseRequest {
  contactId: string;
  activity: ContactResponseActivity;
  note?: string;
  meetingScheduledDate?: string | null;
  addToCalendar?: boolean;
}

interface UpdateContactResponseRequest {
  contactId: string;
  responseId: string;
  activity: ContactResponseActivity;
  note?: string;
  meetingScheduledDate?: string | null;
}

interface ContactResponseMutationResponse {
  message: string;
  response: ContactResponseItem;
}

interface GetContactResponsesRequest {
  contactId: string;
  page?: number;
  limit?: number;
}

interface ContactResponsesResponse {
  responses: ContactResponseItem[];
  pagination: Pagination;
}

const getContactResponseTagId = (response?: ContactResponseItem) => response?.contact || "LIST";

interface GetContactActivitiesRequest {
  contactId: string;
  page?: number;
  limit?: number;
}

interface ContactActivitiesResponse {
  activities: ResponseActivity[];
  pagination: Pagination;
}


// `maxRetries: 0` here means every endpoint keeps its current no-retry
// behavior by default (the retry loop bails out before a second attempt) —
// endpoints opt into retries individually via `extraOptions`, see
// `retryTransientErrors` below.
const baseQueryWithRetry = retry(
  fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
  }),
  { maxRetries: 0 }
);

// Only retry network drops / timeouts / 5xx — never a 4xx (validation,
// auth, "not found"), since retrying those just repeats the same failure.
// Used for endpoints where losing the request matters, e.g. a sales rep's
// logged call outcome on a flaky connection.
const isTransientError = (error: any) => {
  if (!error) return false;
  if (error.status === "FETCH_ERROR" || error.status === "TIMEOUT_ERROR") return true;
  return typeof error.status === "number" && error.status >= 500;
};

const retryTransientErrors = {
  retryCondition: (error: any, _args: any, { attempt }: { attempt: number }) =>
    attempt <= 3 && isTransientError(error),
};

export const contactApi = createApi({
  reducerPath: "contactApi",
  baseQuery: baseQueryWithRetry,
  tagTypes: ["Contacts", "Tasks", "ContactResponses", "ActivityLog"],
  endpoints: (builder) => ({
    createContact: builder.mutation<CreateContactApiResponse, ContactRequest>({
      query: (body) => ({
        url: "/contacts",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Contacts"],
      // Team member cards show assignedContacts/closedContacts counts
      // (userApi's "TeamMembers" tag) — a new contact can change those, but
      // it's a separate RTK Query api slice so invalidatesTags can't reach
      // it directly.
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(userApi.util.invalidateTags(["TeamMembers"]));
        } catch {
          // Contact creation failed — nothing to invalidate.
        }
      },
    }),
     bulkImportContacts: builder.mutation<BulkImportContactsResponse, ContactPayload>({
      query: (body) => ({
        url: "/contacts/bulk",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Contacts"],
      async onQueryStarted(_args, { dispatch, queryFulfilled }) {
        try {
          await queryFulfilled;
          dispatch(userApi.util.invalidateTags(["TeamMembers"]));
        } catch {
          // Bulk import failed outright — nothing to invalidate.
        }
      },
    }),
    getContacts: builder.query<FilterContactsResponse, FilterContactsRequest>({
      query: ({ page = 1, limit = 10, keyword = "", filter = {} }) => ({
        url: `/contacts/filter?page=${page}&limit=${limit}${keyword ? `&keyword=${encodeURIComponent(keyword)}` : ""}`,
        method: "POST",
        body: filter,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.contacts.map(({ _id }) => ({ type: "Contacts" as const, id: _id })),
              { type: "Contacts", id: "LIST" },
            ]
          : [{ type: "Contacts", id: "LIST" }],
    }),
    updateContactsPipeline: builder.mutation<UpdateContactsPipelineResponse, UpdateContactsPipelineRequest>({
      query: (body) => ({
        url: "/contacts/update-pipeline",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Contacts"],
    }),
    batchUpdateContactDrag: builder.mutation<BatchUpdateContactDragResponse, BatchUpdateContactDragRequest>({
      query: (body) => ({
        url: "/contacts/update-drag/batch",
        method: "PATCH",
        body,
      }),
      invalidatesTags: ["Contacts"],
    }),
    checkContactDuplicates: builder.mutation<CheckDuplicatesResponse, CheckDuplicatesRequest>({
      query: (body) => ({
        url: "/contacts/check-duplicates",
        method: "POST",
        body,
      }),
      invalidatesTags: [],
    }),
    getContactById: builder.query<GetContactByIdResponse, string>({
      query: (id) => ({
        url: `/contacts/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Contacts", id }],
    }),
    updateContact: builder.mutation<UpdateContactApiResponse, UpdateContactRequest>({
      query: ({ id, ...body }) => ({
        url: `/contacts/${id}`,
        method: "PUT",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Contacts", id }, { type: "Contacts", id: "LIST" }],
    }),
    assignContacts: builder.mutation<AssignContactsResponse, AssignContactsRequest>({
      query: (body) => ({
        url: "/contacts/assign",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Contacts"],
    }),
    updateProbability: builder.mutation<UpdateProbabilityResponse, { id: string; probability: number }>({
      query: ({ id, probability }) => ({
        url: `/contacts/probability/${id}`,
        method: "PATCH",
        body: { probability },
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Contacts", id }, { type: "Contacts", id: "LIST" }],
    }),
    updateContactNotes: builder.mutation<UpdateContactNotesResponse, UpdateContactNotesRequest>({
      query: ({ id, ...body }) => ({
        url: `/contacts/notes/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result, error, { id }) => [{ type: "Contacts", id }, { type: "Contacts", id: "LIST" }],
    }),
    getContactNotesAndTags: builder.query<GetContactNotesAndTagsResponse, string>({
      query: (id) => ({
        url: `/contacts/notes/${id}`,
        method: "GET",
      }),
      providesTags: (result, error, id) => [{ type: "Contacts", id }],
    }),
    updateContactStage: builder.mutation<UpdateContactStageResponse, UpdateContactStageRequest>({
      query: ({ contactId, stageId }) => ({
        url: `/contacts/${contactId}/stage`,
        method: "PATCH",
        body: { stageId },
      }),
      invalidatesTags: (result, error, { contactId }) => [
        { type: "Contacts", id: contactId },
        { type: "Contacts", id: "LIST" },
      ],
    }),
    createTask: builder.mutation<TaskResponse, CreateTaskRequest>({
      query: (body) => ({
        url: "/tasks",
        method: "POST",
        body,
      }),
      invalidatesTags: (result) => [
        { type: "Tasks", id: getTaskContactId(result?.task) },
        { type: "Contacts", id: getTaskContactId(result?.task) },
      ],
    }),
    getTasks: builder.query<TasksResponse, GetTasksRequest | void>({
      query: (params) => ({
        url: `/tasks${
          params
            ? `?${new URLSearchParams(
                Object.entries(params).reduce<Record<string, string>>((acc, [key, value]) => {
                  if (value) acc[key] = value;
                  return acc;
                }, {})
              ).toString()}`
            : ""
        }`,
        method: "GET",
      }),
      providesTags: (result, error, params) => [
        { type: "Tasks", id: params?.contactId || "LIST" },
      ],
    }),
    updateTask: builder.mutation<TaskResponse, UpdateTaskRequest>({
      query: ({ id, ...body }) => ({
        url: `/tasks/${id}`,
        method: "PATCH",
        body,
      }),
      invalidatesTags: (result) => [
        { type: "Tasks", id: "LIST" },
        { type: "Tasks", id: getTaskContactId(result?.task) },
        { type: "Contacts", id: getTaskContactId(result?.task) },
      ],
    }),
    deleteTask: builder.mutation<{ message: string }, { id: string; contactId?: string | null }>({
      query: ({ id }) => ({
        url: `/tasks/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: (result, error, { contactId }) => [
        { type: "Tasks", id: "LIST" },
        { type: "Tasks", id: contactId || "LIST" },
        { type: "Contacts", id: contactId || "LIST" },
      ],
    }),
    createContactResponse: builder.mutation<ContactResponseMutationResponse, CreateContactResponseRequest>({
      query: ({ contactId, ...body }) => ({
        url: `/contacts/${contactId}/response`,
        method: "POST",
        body,
      }),
      extraOptions: retryTransientErrors,
      invalidatesTags: (result, error, { contactId }) => [
        { type: "ContactResponses", id: contactId },
        { type: "Contacts", id: contactId },
        { type: "ActivityLog", id: contactId },
      ],
    }),
    getContactResponses: builder.query<ContactResponsesResponse, GetContactResponsesRequest>({
      query: ({ contactId, page = 1, limit = 20 }) => ({
        url: `/contacts/${contactId}/response?page=${page}&limit=${limit}`,
        method: "GET",
      }),
      providesTags: (result, error, { contactId }) => [{ type: "ContactResponses", id: contactId }],
    }),
    getContactResponseById: builder.query<{ message: string; response: ContactResponseItem }, { contactId: string; responseId: string }>({
      query: ({ contactId, responseId }) => ({
        url: `/contacts/${contactId}/response/${responseId}`,
        method: "GET",
      }),
      providesTags: (result, error, { contactId }) => [{ type: "ContactResponses", id: contactId }],
    }),
    updateContactResponse: builder.mutation<ContactResponseMutationResponse, UpdateContactResponseRequest>({
      query: ({ contactId, responseId, ...body }) => ({
        url: `/contacts/${contactId}/response/${responseId}`,
        method: "PUT",
        body,
      }),
      extraOptions: retryTransientErrors,
      invalidatesTags: (result) => [
        { type: "ContactResponses", id: getContactResponseTagId(result?.response) },
        { type: "ActivityLog", id: getContactResponseTagId(result?.response) },
      ],
    }),
    getContactActivities: builder.query<ContactActivitiesResponse, GetContactActivitiesRequest>({
      query: ({ contactId, page = 1, limit = 5 }) => ({
        url: `/contacts/${contactId}/activities?page=${page}&limit=${limit}`,
        method: "GET",
      }),
      providesTags: (result, error, { contactId }) => [{ type: "ActivityLog", id: contactId }],
    }),
  }),
});

export const {
  useCreateContactMutation,
  useBulkImportContactsMutation,
  useCheckContactDuplicatesMutation,
  useGetContactsQuery,
  useUpdateContactsPipelineMutation,
  useBatchUpdateContactDragMutation,
  useGetContactByIdQuery,
  useUpdateContactMutation,
  useAssignContactsMutation,
  useUpdateProbabilityMutation,
  useUpdateContactNotesMutation,
  useGetContactNotesAndTagsQuery,
  useUpdateContactStageMutation,
  useCreateTaskMutation,
  useGetTasksQuery,
  useUpdateTaskMutation,
  useDeleteTaskMutation,
  useCreateContactResponseMutation,
  useGetContactResponsesQuery,
  useGetContactResponseByIdQuery,
  useUpdateContactResponseMutation,
  useGetContactActivitiesQuery,
} = contactApi;
