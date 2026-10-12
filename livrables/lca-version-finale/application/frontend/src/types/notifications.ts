export type NotificationDeliveryStatus='queued'|'sent'|'failed';export type NotificationPriority='low'|'normal'|'high'|'urgent';
export interface NotificationRecord{id:string;subject:string;message:string;deliveryStatus:NotificationDeliveryStatus;eventType:string|null;referenceType:string|null;referenceId:string|null;priority:NotificationPriority;createdAt:string;readAt:string|null;isRead:boolean;isOwn:boolean;linkRoute:string}
export type NotificationScope='mine'|'agency'|'concession'|'global';
export interface NotificationFilters{page:number;pageSize:number;scope?:NotificationScope;unreadOnly?:boolean;eventType?:string;referenceType?:string;priority?:NotificationPriority;from?:string;to?:string}
export interface NotificationListResponse{scope:NotificationScope;items:NotificationRecord[];page:number;pageSize:number;total:number;unreadCount:number}
