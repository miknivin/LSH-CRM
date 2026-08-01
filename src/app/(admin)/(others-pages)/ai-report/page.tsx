import AiReportPageContent from "@/components/page-components/AiReportPageContent";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Metadata } from "next";
import React from "react";
import { getAppMetaTitle } from "@/app/lib/utils/metadata";

export const metadata: Metadata = {
  title: getAppMetaTitle("LSH-CRM | AI Report"),
  description: "AI Report",
};

export default function page() {
  return (
    <div>
      <PageBreadcrumb pageTitle="AI Report" />
      <AiReportPageContent />
    </div>
  );
}
