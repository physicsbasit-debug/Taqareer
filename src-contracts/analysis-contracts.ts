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


export interface SemanticAnalysisProfile {
  profileVersion: string;
  shape: string;
  unitOfAnalysis: AnalysisUnit | "group" | "row" | "statement" | string;
  dataNature: string;
  aggregationLevel: "individual" | "aggregated" | "document" | "unknown" | string;
  orientation: string;
  measureType: string;
  scaleDirection: string;
  analyzerId: string;
  recommendedTypeId: string;
  requiresScoreSettings: boolean;
  confidence: number;
  rationale: string;
  analysisFamilies: string[];
  columnRoles?: Record<string, unknown>;
  rowRoles?: {
    dataRowIndexes?: number[];
    aggregateRowIndexes?: number[];
  };
}

export interface AdaptiveAnalysisRoute {
  requestedTypeId: string;
  analyzerId: string;
  semanticProfileVersion: string | null;
}

export interface MultiSubjectAnalysisOptions {
  mode: "all" | "subject";
  subject?: string;
  includeSubjectTopTen: boolean;
  includeSchoolRanking: boolean;
}

export interface MultiSubjectRankingPolicy {
  gradeNumber: number;
  coreWeight: number;
  allWeight: number;
  requiredCoreSubjects: string[];
  missingCoreColumns: string[];
  eligibleCount: number;
  incompleteCount: number;
}

export interface MultiSubjectScopeContext {
  kind: "multi_subject_student_results";
  analysisMode: "all" | "subject";
  selectedSubject?: string;
  studentCount: number;
  subjectCount: number;
  grade?: string;
  period?: string;
  academicYear?: string;
  subjects: string[];
  targetGroup: string;
  rankingPolicy?: MultiSubjectRankingPolicy;
  limitation: string;
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
  scopeGuard?: {
    applied: boolean;
    adjusted?: boolean;
    scopeType?: string;
    sampleOnly?: boolean;
    visitCount?: number;
    populationLabel?: string;
    originalTargetGroup?: string;
    finalTargetGroup?: string;
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
