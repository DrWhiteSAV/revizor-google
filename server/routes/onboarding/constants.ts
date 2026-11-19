export const DIRECTOR_STEP_IDS = [
  "profile",
  "duties",
  "telegram",
  "company",
  "employees",
  "schedules",
  "reports",
  "report_rules",
  "projects",
  "tasks",
  "project_rules",
  "tariffs",
  "referral",
] as const;

export const TEAM_STEP_IDS = [
  "profile",
  "telegram",
  "duties",
  "schedule",
  "test_report",
  "test_project",
  "test_tasks",
] as const;

export type OnboardingType = "director" | "manager" | "employee";
