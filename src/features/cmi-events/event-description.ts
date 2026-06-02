const CMI_EVENT_SUMMARY_MAX_LENGTH = 220;

export const buildCmiEventSummaryFromDescription = (description: string) => {
  const firstMeaningfulLine = description
    .trim()
    .split(/\n+/)
    .map(line => line.trim())
    .find(Boolean) ?? '';
  const singleLineSummary = firstMeaningfulLine.replace(/\s+/g, ' ');

  return singleLineSummary.length > CMI_EVENT_SUMMARY_MAX_LENGTH
    ? singleLineSummary.slice(0, CMI_EVENT_SUMMARY_MAX_LENGTH).trimEnd()
    : singleLineSummary;
};

export const buildCmiEventDescriptionDraft = (summary: string, detailBody?: string | null) => {
  const trimmedSummary = summary.trim();
  const trimmedDetailBody = detailBody?.trim() ?? '';

  if (!trimmedDetailBody) return trimmedSummary;
  if (!trimmedSummary || trimmedDetailBody.includes(trimmedSummary)) return trimmedDetailBody;

  return `${trimmedSummary}\n\n${trimmedDetailBody}`;
};
