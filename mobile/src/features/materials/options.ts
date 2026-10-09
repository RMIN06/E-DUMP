import type { MaterialKind, ReportReason } from "../../api/materials";

export const kindOptions: { value: MaterialKind; label: string }[] = [
  { value: "slides", label: "Slides" },
  { value: "notes", label: "Notes" },
  { value: "assignment", label: "Assignment" },
  { value: "past_paper", label: "Past paper" },
  { value: "book", label: "Book" },
  { value: "other", label: "Other" },
];
export const reportOptions: { value: ReportReason; label: string }[] = [
  { value: "wrong_subject", label: "Wrong subject" },
  { value: "inappropriate", label: "Inappropriate" },
  { value: "copyright", label: "Copyright" },
  { value: "duplicate", label: "Duplicate" },
  { value: "other", label: "Other" },
];
export const kindLabel = (value: MaterialKind) =>
  kindOptions.find((option) => option.value === value)?.label ?? "Other";
