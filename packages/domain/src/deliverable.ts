export type DeliverableKind = "poster" | "document" | "spreadsheet" | "presentation";
export type DeliverableFormat = "docx" | "xlsx" | "pptx" | "pdf" | "image";

export interface DeliverableSection {
  id: string;
  title: string;
  content: string[];
}

export interface DeliverableExportTarget {
  format: DeliverableFormat;
  purpose: string;
}

export interface DeliverablePlan {
  schemaVersion: 1;
  kind: DeliverableKind;
  title: string;
  templateId: string;
  brandTokens: Record<string, string>;
  sections: DeliverableSection[];
  accessibilityRequirements: string[];
  validationRules: string[];
  reviewGateIds: string[];
  exportTargets: DeliverableExportTarget[];
}

export interface ApprovedDeliverablePlan {
  plan: DeliverablePlan;
  approvedGateIds: string[];
  approvedBy: string;
}
