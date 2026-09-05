import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';
export class CreateSaleDto {
  @IsString() customerId!: string; @IsString() vehicleId!: string; @IsString() agencyId!: string;
  @IsOptional() @IsString() opportunityId?: string; @IsOptional() @IsString() salespersonId?: string;
  @IsNumber() @Min(0) vehiclePrice!: number; @IsOptional() @IsNumber() @Min(0) discount?: number;
  @IsOptional() @IsNumber() @Min(0) taxTotal?: number; @IsOptional() @IsNumber() @Min(0) depositAmount?: number;
  @IsOptional() @IsString() notes?: string;
}
export class CreateReservationDto {
  @IsString() customerId!: string; @IsString() vehicleId!: string; @IsOptional() @IsString() saleId?: string;
  @IsOptional() @IsNumber() @Min(0) amount?: number; @IsOptional() @IsString() expiresAt?: string; @IsOptional() @IsString() notes?: string;
}
export class UpdateSaleStatusDto { @IsIn(['draft','reserved','ordered','confirmed','preparation','ready_for_delivery','delivered','cancelled']) status!: string; }
