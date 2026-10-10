export const REPAIR_ORDER_IN_WORKSHOP_STATUSES=['in_progress','quality_control'] as const;

export const isRepairOrderInWorkshop=(status:string):boolean=>(REPAIR_ORDER_IN_WORKSHOP_STATUSES as readonly string[]).includes(status);
