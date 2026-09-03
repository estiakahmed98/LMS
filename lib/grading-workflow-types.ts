export interface GradingWorkflowRulePayload {
  name: string;
  courseId?: string | null;
  batchId?: string | null;
  studentId?: string | null;
  makerId?: string | null;
  requiresChecker: boolean;
  checkerId?: string | null;
  priority?: number;
  active?: boolean;
}

export interface GradingWorkflowRuleRow extends Required<Omit<GradingWorkflowRulePayload, "priority" | "active">> {
  id: string;
  priority: number;
  active: boolean;
  courseName: string | null;
  batchName: string | null;
  studentName: string | null;
  makerName: string | null;
  checkerName: string | null;
  updatedAt: string;
}

export interface GradingWorkflowOption {
  id: string;
  name: string;
  secondary?: string;
}

export interface GradingWorkflowConfiguration {
  rules: GradingWorkflowRuleRow[];
  options: {
    courses: GradingWorkflowOption[];
    batches: GradingWorkflowOption[];
    students: GradingWorkflowOption[];
    graders: GradingWorkflowOption[];
  };
}

export interface ResolvedGradingWorkflow {
  ruleId: string | null;
  ruleName: string | null;
  requiresChecker: boolean;
  checkerId: string | null;
  checkerName: string | null;
}
