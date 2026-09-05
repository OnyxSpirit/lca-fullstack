import { IsBoolean,IsIn,IsNumber,IsOptional,IsString,Min } from 'class-validator';
export class CreateDeliveryDto{@IsString()saleId!:string;@IsString()scheduledAt!:string;@IsOptional()@IsString()customerNotes?:string;}
export class CompleteChecklistDto{@IsBoolean()completed!:boolean;@IsOptional()@IsString()notes?:string;}
export class SignDeliveryDto{@IsString()signerName!:string;@IsString()signatureData!:string;@IsOptional()@IsNumber()@Min(0)mileageAtDelivery?:number;}
export class DeliveryStatusDto{@IsIn(['planned','preparing','quality_control','ready','delivered','cancelled'])status!:string;}
