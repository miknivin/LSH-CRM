import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export interface SourceItem {
  _id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

interface GetSourcesRequest {
  search?: string;
}

interface GetSourcesResponse {
  sources: SourceItem[];
}

interface CreateSourceRequest {
  title: string;
}

interface CreateSourceResponse {
  message: string;
  source: SourceItem;
}

export const sourceApi = createApi({
  reducerPath: "sourceApi",
  baseQuery: fetchBaseQuery({
    baseUrl: "/api",
    credentials: "include",
  }),
  tagTypes: ["Sources"],
  endpoints: (builder) => ({
    getSources: builder.query<GetSourcesResponse, GetSourcesRequest | void>({
      query: (params) => ({
        url: `/sources${params?.search ? `?search=${encodeURIComponent(params.search)}` : ""}`,
        method: "GET",
      }),
      providesTags: ["Sources"],
    }),
    createSource: builder.mutation<CreateSourceResponse, CreateSourceRequest>({
      query: (body) => ({
        url: "/sources",
        method: "POST",
        body,
      }),
      invalidatesTags: ["Sources"],
    }),
  }),
});

export const { useGetSourcesQuery, useCreateSourceMutation } = sourceApi;
