/**
 * Guest & User ID Resolution Utility
 * 
 * Provides stable 11-digit system user IDs:
 * - For registered users: returns their 11-digit database user ID.
 * - For unauthenticated guests: generates and persists an 11-digit guest ID in localStorage.
 * - Builds standardized ProTalk routing chat_id: ii_rr<USER_ID><entity_type>
 */

export function getOrCreateGuestUserId(): string {
  if (typeof window === 'undefined') {
    return '91827364501';
  }

  // 1. If user is logged in, use their real numeric ID / UID
  const userStr = localStorage.getItem('rr_user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      if (user?.uid && /^\d+$/.test(String(user.uid))) {
        return String(user.uid);
      }
      if (user?.id) {
        const idStr = String(user.id);
        if (/^\d+$/.test(idStr)) {
          return idStr;
        }
        if (/system[-_]?admin|admin/i.test(idStr)) {
          return '91827364501';
        }
      }
    } catch {}
  }

  // 2. Otherwise use or generate an 11-digit guest ID
  let guestId = localStorage.getItem('rr_guest_user_id');
  if (!guestId || !/^\d{11}$/.test(guestId)) {
    // Generate 11-digit random number starting with 7 (e.g. 79182938471)
    const random10 = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    guestId = `7${random10}`;
    localStorage.setItem('rr_guest_user_id', guestId);
  }

  return guestId;
}

/**
 * Returns current effective user ID (registered or guest)
 */
export function getEffectiveUserId(): string {
  return getOrCreateGuestUserId();
}

/**
 * Builds chat_id strictly according to the macro rule:
 * ii_rr<USER_ID><entity_type>
 * 
 * Examples:
 * - getFormattedChatId('chat') -> 'ii_rr79182938471chat'
 * - getFormattedChatId('revisor', '91827364501') -> 'ii_rr91827364501revisor'
 * - getFormattedChatId('task', 'system-admin') -> 'ii_rr91827364501task'
 */
export function getFormattedChatId(entityType: string = '', explicitUserId?: string | number): string {
  let userId = explicitUserId ? String(explicitUserId) : getEffectiveUserId();
  userId = userId.replace(/^ii_rr/i, '').trim();
  if (/^system[-_]?admin$/i.test(userId) || /^admin$/i.test(userId) || !/\d/.test(userId)) {
    userId = '91827364501';
  }
  const cleanId = String(userId).replace(/[^a-zA-Z0-9_]/g, '');
  const cleanEntity = entityType ? entityType.replace(/[^a-zA-Z0-9_]/g, '') : '';
  return `ii_rr${cleanId || '91827364501'}${cleanEntity}`;
}
