export type NotificationDeliveryStatus='queued'|'sent'|'failed';export type NotificationPriority='low'|'normal'|'high'|'urgent';
export interface NotificationRecord{id:string;subject:string;message:string;deliveryStatus:NotificationDeliveryStatus;eventType:string|null;referenceType:string|null;referenceId:string|null;priority:NotificationPriority;createdAt:string;readAt:string|null;isRead:boolean;linkRoute:string}
export interface NotificationFilters{page:number;pageSize:number;unreadOnly?:boolean;eventType?:string;referenceType?:string;priority?:NotificationPriority;from?:string;to?:string}
export interface NotificationListResponse{items:NotificationRecord[];page:number;pageSize:number;total:number;unreadCount:number}
