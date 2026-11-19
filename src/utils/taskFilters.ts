/**
 * Unified Task and Project Ownership Filter Utility
 * Ensures consistent and accurate "Мои" (Mine) and "От меня" (Assigned by Me) filtering across all cabinet views:
 * - Tasks Kanban Board
 * - Tasks Table View
 * - Galaxy / Planetary Map
 * - Projects Kanban Board
 * - Projects Table View
 * - Gantt Chart (Bitrix style)
 * - Revisor Review / Doctor
 */

export interface FilterUser {
  id?: string | number;
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  role?: string;
}

/**
 * Checks if a task is directly assigned to the current user as EXECUTOR.
 * "Мои" = задачи, которые мне надо выполнить.
 * Strictly checks executor designation. Does NOT include tasks created by the user for other employees.
 */
export function isTaskMine(task: any, currentUser: FilterUser | null | undefined): boolean {
  if (!task || !currentUser) return false;

  const myId = String(currentUser.id || '').trim();
  const rawName = currentUser.name || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`;
  const myName = rawName.trim().toLowerCase();

  // 1. Direct executor match by ID
  if (task.executorId && String(task.executorId).trim() === myId) return true;
  if (task.executor_id && String(task.executor_id).trim() === myId) return true;

  // 2. Direct executor match by name
  if (task.executorName && myName) {
    const execName = String(task.executorName).trim().toLowerCase();
    if (execName === myName || execName.includes(myName) || myName.includes(execName)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a task was assigned / created by the current user as AUTHOR / CREATOR.
 * "От меня" = поставленные мной задачи (которые я поручил другим сотрудникам или себе).
 */
export function isTaskFromMe(task: any, currentUser: FilterUser | null | undefined): boolean {
  if (!task || !currentUser) return false;

  const myId = String(currentUser.id || '').trim();
  const rawName = currentUser.name || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`;
  const myName = rawName.trim().toLowerCase();

  // 1. Author / Creator match by ID
  if (task.author_id && String(task.author_id).trim() === myId) return true;
  if (task.creator_id && String(task.creator_id).trim() === myId) return true;
  if (task.authorId && String(task.authorId).trim() === myId) return true;
  if (task.creatorId && String(task.creatorId).trim() === myId) return true;
  if (task.director_id && String(task.director_id).trim() === myId) return true;

  // 2. Author match by name
  const authorName = task.author_name || task.authorName;
  if (authorName && myName) {
    const aName = String(authorName).trim().toLowerCase();
    if (aName === myName || aName.includes(myName) || myName.includes(aName)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a project is directly managed by, or has active tasks assigned to the current user as executor.
 * "Мои проекты" filters to projects where the user is project manager or has tasks assigned to them to execute.
 */
export function isProjectMine(project: any, currentUser: FilterUser | null | undefined): boolean {
  if (!project || !currentUser) return false;

  const myId = String(currentUser.id || '').trim();
  const rawName = currentUser.name || `${currentUser.first_name || ''} ${currentUser.last_name || ''}`;
  const myName = rawName.trim().toLowerCase();

  // 1. Designated Project Manager by ID or name
  if (project.manager_id && String(project.manager_id).trim() === myId) return true;
  if (project.managerId && String(project.managerId).trim() === myId) return true;
  if (project.manager && myName) {
    const mgrName = String(project.manager).trim().toLowerCase();
    if (mgrName === myName || mgrName.includes(myName) || myName.includes(mgrName)) {
      return true;
    }
  }

  // 2. User has directly assigned tasks inside this project as executor
  if (Array.isArray(project.tasks) && project.tasks.length > 0) {
    const hasMyTask = project.tasks.some((t: any) => isTaskMine(t, currentUser));
    if (hasMyTask) return true;
  }

  return false;
}

/**
 * Checks if a project was created by or contains tasks assigned by the current user.
 * "Проекты от меня" filters to projects authored by user or containing tasks created by user.
 */
export function isProjectFromMe(project: any, currentUser: FilterUser | null | undefined): boolean {
  if (!project || !currentUser) return false;

  const myId = String(currentUser.id || '').trim();

  // 1. Project Author / Creator
  if (project.author_id && String(project.author_id).trim() === myId) return true;
  if (project.creator_id && String(project.creator_id).trim() === myId) return true;
  if (project.authorId && String(project.authorId).trim() === myId) return true;
  if (project.creatorId && String(project.creatorId).trim() === myId) return true;
  if (project.director_id && String(project.director_id).trim() === myId) return true;

  // 2. Contains tasks authored by user
  if (Array.isArray(project.tasks) && project.tasks.length > 0) {
    const hasTaskFromMe = project.tasks.some((t: any) => isTaskFromMe(t, currentUser));
    if (hasTaskFromMe) return true;
  }

  return false;
}
