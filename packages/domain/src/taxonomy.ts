export type TaxonomyEntityKind =
  | "category"
  | "strategy"
  | "capability"
  | "constraint"
  | "deliverable"
  | "audience";

export type StrategyMaturity = "experimental" | "emerging" | "stable" | "established";
export type StrategyRisk = "low" | "medium" | "high";

export interface TaxonomyEntity {
  id: string;
  version: string;
  title: string;
  description: string;
}

export interface Category extends TaxonomyEntity {
  parentId?: string;
}

export interface Capability extends TaxonomyEntity {}

export interface Constraint extends TaxonomyEntity {}

export interface Deliverable extends TaxonomyEntity {}

export interface Audience extends TaxonomyEntity {}

export interface StrategyEvidence {
  source: string;
  summary: string;
}

export interface Strategy extends TaxonomyEntity {
  categoryId: string;
  capabilityIds: string[];
  constraintIds: string[];
  deliverableIds: string[];
  audienceIds: string[];
  prerequisites: string[];
  conflicts: string[];
  compatibleWith: string[];
  evidence: StrategyEvidence[];
  maturity: StrategyMaturity;
  license: string;
  risk: StrategyRisk;
}

export interface TaxonomyCatalog {
  schemaVersion: 1;
  namespace: string;
  categories: Category[];
  strategies: Strategy[];
  capabilities: Capability[];
  constraints: Constraint[];
  deliverables: Deliverable[];
  audiences: Audience[];
}

export interface TaxonomyValidationIssue {
  path: string;
  message: string;
}

export interface TaxonomyValidationResult {
  valid: boolean;
  issues: TaxonomyValidationIssue[];
  catalog?: TaxonomyCatalog;
}
