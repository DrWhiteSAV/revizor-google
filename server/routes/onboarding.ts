import { Router } from "express";
import { getDb } from "../../src/db/initDb";
import {
  DIRECTOR_STEP_IDS,
  TEAM_STEP_IDS,
  type OnboardingType,
  ensureOnboardingTable,
  resolveOnboardingType,
  safeParseJson,
  resolveUserScope,
  seedOnboardingForUser,
  auditOnboardingSteps,
  buildStepsPayload,
} from "./onboarding/audit";
import { verifyOnboardingStep } from "./onboarding/verify";
import { executeOnboardingAiAction } from "./onboarding/aiActions";

export { DIRECTOR_STEP_IDS, TEAM_STEP_IDS, seedOnboardingForUser, resolveOnboardingType };
export type { OnboardingType };

const router = Router();

// 1. GET /api/onboarding/:userId
router.get("/:userId", async (req, res) => {
  try {
    const db = await getDb();
    await ensureOnboardingTable(db);
    const { userId } = req.params;
    const audited = await auditOnboardingSteps(db, userId);
    const { scope, stepAudit } = audited;

    let row = await db.get("SELECT * FROM user_onboarding WHERE id = ? OR user_id = ? LIMIT 1", [
      scope.effectiveUserId,
      scope.effectiveUserId,
    ]);

    if (!row) {
      row = await seedOnboardingForUser(db, {
        id: scope.effectiveUserId,
        role: scope.role,
      });
    }

    const stepsState = safeParseJson<Record<string, string>>(row?.steps_state, {});
    const skippedSteps = safeParseJson<string[]>(row?.skipped_steps, []);
    const draftInputs = safeParseJson<Record<string, any>>(row?.draft_inputs, {});
    const testArtifacts = safeParseJson<Record<string, any>>(row?.test_artifacts, {});
    const normalizedType = scope.onboardingType;
    const steps = buildStepsPayload(normalizedType, stepAudit, stepsState, skippedSteps);
    const completedCount = steps.filter((s) => s.status === "completed").length;

    res.json({
      success: true,
      onboarding: {
        user_id: scope.effectiveUserId,
        onboarding_type: normalizedType,
        role: scope.role,
        current_step_id: row?.current_step_id || steps[0]?.id || "profile",
        is_completed: Boolean(row?.is_completed) || (steps.length > 0 && completedCount === steps.length),
        is_minimized: Boolean(row?.is_minimized),
        steps_state: stepsState,
        skipped_steps: skippedSteps,
        draft_inputs: draftInputs,
        test_artifacts: testArtifacts,
        steps,
        completed_count: completedCount,
        total_count: steps.length,
        context: {
          user: {
            id: scope.effectiveUserId,
            name: audited.userName,
            email: audited.userEmail,
            phone: audited.userPhone,
            position: audited.userPosition,
            timezone: audited.userTimezone,
            role: scope.role,
            duties: audited.duties,
            telegramHandle: audited.tgHandle,
            telegram_id: audited.tgId,
            referralCode: audited.refCode,
            invitedUsersCount: audited.invitedCount,
            payment_balance: Number(scope.user?.payment_balance || 0),
            local_bonus: Number(scope.user?.local_bonus || 0),
            referral_bonus: Number(scope.user?.referral_bonus || 0),
            welcome_bonus: Number(scope.user?.welcome_bonus || 0),
            trial_ends_at: scope.user?.trial_ends_at || null,
            projects_limit: Number(scope.user?.projects_limit || 10),
            projects_used: Number(scope.user?.projects_used || 0),
            tasks_limit: Number(scope.user?.tasks_limit || 50),
            tasks_used: Number(scope.user?.tasks_used || 0),
            reports_limit: Number(scope.user?.reports_limit || 50),
            reports_used: Number(scope.user?.reports_used || 0),
          },
          company: audited.company || {
            id: scope.companyId,
            name: scope.user?.company || "Моя Организация",
            description: "",
            products: "",
          },
          departments: audited.departments.slice(0, 12),
          employees: audited.employees.slice(0, 15),
          scheduleTemplates: audited.scheduleTemplates.slice(0, 8),
          mySchedule: audited.mySchedule || null,
          reportTemplates: audited.reportTemplates.slice(0, 10),
          reportRules: audited.reportRules.slice(0, 10),
          projects: audited.projects.slice(0, 10),
          tasks: audited.tasks.slice(0, 15),
          taskRules: audited.taskRules.slice(0, 10),
          savedChats: audited.savedChats.slice(0, 10),
        },
      },
    });
  } catch (error: any) {
    console.error("GET /api/onboarding error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 2. POST /api/onboarding/:userId/step
router.post("/:userId/step", async (req, res) => {
  try {
    const db = await getDb();
    await ensureOnboardingTable(db);
    const { userId } = req.params;
    const {
      current_step_id,
      step_id,
      status,
      draft_key,
      draft_value,
      is_minimized,
      is_completed,
    } = req.body || {};

    const scope = await resolveUserScope(db, userId);
    const effectiveId = scope.effectiveUserId;

    let row = await db.get("SELECT * FROM user_onboarding WHERE id = ? OR user_id = ? LIMIT 1", [
      effectiveId,
      effectiveId,
    ]);
    if (!row) {
      row = await seedOnboardingForUser(db, { id: effectiveId, role: scope.role });
    }

    const stepsState = safeParseJson<Record<string, string>>(row?.steps_state, {});
    let skippedSteps = safeParseJson<string[]>(row?.skipped_steps, []);
    const draftInputs = safeParseJson<Record<string, any>>(row?.draft_inputs, {});

    if (step_id && status) {
      stepsState[step_id] = status;
      if (status === "skipped") {
        if (!skippedSteps.includes(step_id)) skippedSteps.push(step_id);
      } else {
        skippedSteps = skippedSteps.filter((s) => s !== step_id);
      }
    }

    if (draft_key !== undefined) {
      draftInputs[draft_key] = draft_value;
    }

    const nextStepId = current_step_id !== undefined ? current_step_id : (row?.current_step_id || "profile");
    const nextMinimized = is_minimized !== undefined ? (is_minimized ? 1 : 0) : (row?.is_minimized || 0);
    const nowIso = new Date().toISOString();
    const nextCompleted = is_completed !== undefined ? (is_completed ? 1 : 0) : (row?.is_completed || 0);
    const completedAt = row?.completed_at || (nextCompleted === 1 ? nowIso : null);

    await db.run(
      `UPDATE user_onboarding SET
        onboarding_type = ?,
        role = ?,
        current_step_id = ?,
        steps_state = ?,
        skipped_steps = ?,
        draft_inputs = ?,
        is_minimized = ?,
        is_completed = ?,
        completed_at = ?,
        updated_at = ?
      WHERE id = ?`,
      [
        scope.onboardingType,
        scope.role,
        nextStepId,
        JSON.stringify(stepsState),
        JSON.stringify(skippedSteps),
        JSON.stringify(draftInputs),
        nextMinimized,
        nextCompleted,
        completedAt,
        nowIso,
        effectiveId,
      ]
    );

    const audited = await auditOnboardingSteps(db, effectiveId);
    const steps = buildStepsPayload(scope.onboardingType, audited.stepAudit, stepsState, skippedSteps);

    res.json({
      success: true,
      current_step_id: nextStepId,
      is_minimized: Boolean(nextMinimized),
      is_completed: Boolean(nextCompleted),
      steps,
    });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 3. POST /api/onboarding/:userId/verify
router.post("/:userId/verify", async (req, res) => {
  try {
    const db = await getDb();
    await ensureOnboardingTable(db);
    const result = await verifyOnboardingStep(db, req.params.userId, req.body);
    res.status(result.status).json(result.payload);
  } catch (error: any) {
    console.error("POST /api/onboarding/verify error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 4. POST /api/onboarding/:userId/ai-action
router.post("/:userId/ai-action", async (req, res) => {
  try {
    const db = await getDb();
    await ensureOnboardingTable(db);
    const result = await executeOnboardingAiAction(db, req.params.userId, req.body);
    res.status(result.status).json(result.payload);
  } catch (error: any) {
    console.error("POST /api/onboarding/ai-action error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 5. POST /api/onboarding/:userId/cleanup-tests
router.post("/:userId/cleanup-tests", async (req, res) => {
  try {
    const db = await getDb();
    await ensureOnboardingTable(db);
    const { userId } = req.params;
    const scope = await resolveUserScope(db, userId);
    const row = await db.get("SELECT * FROM user_onboarding WHERE id = ? LIMIT 1", [scope.effectiveUserId]);
    const artifacts = safeParseJson<Record<string, any>>(row?.test_artifacts, {});

    if (artifacts.test_report_id) {
      await db.run("DELETE FROM reports WHERE id = ?", [artifacts.test_report_id]);
    }
    if (artifacts.test_task_id) {
      await db.run("DELETE FROM tasks WHERE id = ?", [artifacts.test_task_id]);
    }
    if (artifacts.test_project_id) {
      await db.run("DELETE FROM projects WHERE id = ?", [artifacts.test_project_id]);
    }

    await db.run("UPDATE user_onboarding SET test_artifacts = '{}', updated_at = ? WHERE id = ?", [
      new Date().toISOString(),
      scope.effectiveUserId,
    ]);

    res.json({ success: true, message: "Учебные тестовые артефакты очищены." });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// 6. POST /api/onboarding/:userId/reset
router.post("/:userId/reset", async (req, res) => {
  try {
    const db = await getDb();
    await ensureOnboardingTable(db);
    const { userId } = req.params;
    const scope = await resolveUserScope(db, userId);
    await db.run(
      `UPDATE user_onboarding SET
        current_step_id = 'profile',
        steps_state = '{}',
        skipped_steps = '[]',
        is_completed = 0,
        is_minimized = 0,
        completed_at = NULL,
        updated_at = ?
      WHERE id = ?`,
      [new Date().toISOString(), scope.effectiveUserId]
    );
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
