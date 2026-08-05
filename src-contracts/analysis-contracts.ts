export type DataModality =
  | "numeric_table"
  | "categorical_table"
  | "narrative_text"
  | "mixed"
  | "document_image";

export type AnalysisUnit =
  | "student"
  | "teacher"
  | "class"
  | "subject"
  | "school"
  | "program"
  | "form_response"
  | "visit";

export type ConfidenceLevel = "high" | "medium" | "low";
export type ReviewStatus = "pending" | "approved" | "edited" | "rejected";

export interface DocumentSourceMetadata {
  title?: string;
  school?: string;
  subject?: string;
  grade?: string;
  academicYear?: string;
  academicYearRaw?: string;
  reportDate?: string;
  region?: string;
  schoolCode?: string;
  directorate?: string;
  ministry?: string;
  printedBy?: string;
  aggregatedReport?: boolean;
  multiVisitReport?: boolean;
  visitCount?: number;
}

export interface NarrativeDocumentContext {
  aggregatedReport: boolean;
  entityScope:
    | "aggregated-multiple-visits-or-teachers"
    | "explicit-multiple-visits-and-teachers"
    | "single-or-unspecified";
  contradictionPolicy:
    | "treat-opposing-statements-as-contextual-variation-unless-same-entity-and-visit"
    | "compare-numeric-and-narrative-evidence-within-each-visit-only"
    | "standard";
}

export interface EvidenceReference {
  sourceId: string;
  fileName: string;
  page?: number;
  sheet?: string;
  row?: number;
  column?: string;
  cellRange?: string;
  originalText?: string;
  originalValue?: string | number;
  extractionConfidence?: number;
  transformation?: string;
}

export interface ValidationIssue {
  code: string;
  severity: "warning" | "repairable_error" | "critical_error";
  messageAr: string;
  evidence?: EvidenceReference[];
  suggestedFixAr?: string;
}

export interface FormTypeDefinition {
  id: string;
  version: string;
  nameAr: string;
  descriptionAr: string;
  educationalPurpose: string;
  unitOfAnalysis: AnalysisUnit;
  modality: DataModality;
  recognition: {
    titleSignals: string[];
    fieldSignals: string[];
    sectionSignals: string[];
    minimumConfidence: number;
  };
  requiredFields: string[];
  optionalFields: string[];
  analysisFamilies: string[];
  qualityToolRules: string[];
  allowedFindings: string[];
  forbiddenInferences: string[];
  reportTemplateId: string;
  privacyLevel: "normal" | "sensitive" | "highly_sensitive";
}

export interface AnalysisPlan {
  id: string;
  formTypeId: string;
  purposeAr: string;
  analyticalQuestionsAr: string[];
  deterministicTasks: string[];
  aiTasks: string[];
  qualityTools: Array<{
    toolId: string;
    reasonAr: string;
    prerequisitesSatisfied: boolean;
    warningsAr: string[];
  }>;
  requiredUserConfirmations: string[];
  limitationsAr: string[];
  status: "draft" | "confirmed" | "executed";
}

export interface ActionRecommendation {
  actionAr: string;
  targetGroupAr: string;
  targetGroupIds?: Array<"mastery" | "near_mastery" | "moderate_gap" | "deep_gap" | string>;
  ownerAr?: string;
  timeframeAr?: string;
  successIndicatorAr: string;
  successMetric?: {
    mode: "mastery_gain" | "segment_reduction" | "mastery_maintenance" | "custom";
    targetValue: number;
    targetSegmentId?: string;
  };
  numericGuard?: {
    applied: boolean;
    adjusted?: boolean;
    totalCount?: number;
    baselineCount?: number;
    eligibleCount?: number;
    feasibleGain?: number;
    targetCount?: number;
    targetRate?: number;
  };
  followUpToolAr: string;
  linkedFindingIds: string[];
}

export interface EducationalFinding {
  id: string;
  type: "fact" | "pattern" | "interpretation" | "hypothesis";
  titleAr: string;
  statementAr: string;
  evidence: EvidenceReference[];
  confidence: ConfidenceLevel;
  educationalImpactAr: string;
  recommendation?: ActionRecommendation;
  limitationsAr: string[];
  generatedBy: "deterministic" | "ai" | "hybrid";
  reviewStatus: ReviewStatus;
  modelTrace?: {
    provider: string;
    model: string;
    promptVersion: string;
    generatedAt: string;
  };
}
