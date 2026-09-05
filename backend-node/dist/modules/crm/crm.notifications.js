import { createUserNotification, notifyRoles } from '../notifications/notification.service.js';
export async function notifyCrm(input) { let count = 0; if (input.assignedUserId && String(input.assignedUserId) !== String(input.actorUserId)) {
    try {
        if (await createUserNotification({ userId: String(input.assignedUserId), subject: input.subject, message: input.message, eventType: 'crm.lead_assigned', referenceType: 'lead', referenceId: input.leadId, priority: 'normal' }))
            count++;
    }
    catch (error) {
        console.error('Notification CRM non créée', error);
    }
} if (input.agencyId)
    count += await notifyRoles({ agencyId: input.agencyId, roles: ['SALES_MANAGER'], includeGlobalRoles: ['DIRECTOR', 'SUPER_ADMIN'], excludeUserIds: [input.actorUserId, input.assignedUserId ?? ''], subject: input.subject, message: input.message, eventType: 'crm.lead_assigned', referenceType: 'lead', referenceId: input.leadId, priority: 'normal' }); return count; }
