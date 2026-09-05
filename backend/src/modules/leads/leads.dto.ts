import { IsEmail, IsIn, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
export class CreateLeadDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() companyName?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() source?: string;
  @IsOptional() @IsString() assignedUserId?: string;
  @IsString() title!: string;
  @IsOptional() @IsNumber() @Min(0) expectedValue?: number;
  @IsOptional() @IsNumber() @Min(0) @Max(100) probability?: number;
  @IsOptional() @IsString() notes?: string;
}
export class UpdateLeadStageDto { @IsIn(['new','contacted','qualified','appointment','test_drive','offer','negotiation','won','lost']) stage!: string; @IsOptional() @IsString() lostReason?: string; }
