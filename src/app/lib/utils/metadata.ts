export function getAppMetaTitle(defaultTitle: string) {
  return process.env.NEXT_PUBLIC_TEST_MODE === "true"
    ? "LSH-CRM"
    : defaultTitle;
}
