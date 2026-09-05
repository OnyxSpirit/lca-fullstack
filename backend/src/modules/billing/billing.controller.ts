import { Body, Controller, ForbiddenException, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiProduces, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthUser, CurrentUser } from '../../common/decorators/current-user.decorator';
import { BillingService } from './billing.service';
import { CreateInvoiceDto, CreatePaymentDto } from './billing.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { NotificationsService } from '../notifications/notifications.service';
@ApiTags('invoices') @ApiBearerAuth() @Controller('invoices')
export class BillingController {
  constructor(private readonly service: BillingService,private readonly notifications:NotificationsService) {}
  @Get() all(@CurrentUser()user:AuthUser) { return this.service.list(user.roles.some(r=>['SUPER_ADMIN','DIRECTOR'].includes(r))?null:user.agencyId); }
  @Get('payment-methods') methods() { return this.service.paymentMethods(); }
  @Roles('SUPER_ADMIN','DIRECTOR','ACCOUNTANT') @Get('export/accounting') async accounting(@Query('from')from:string,@Query('to')to:string,@Res()response:Response){const csv=await this.service.accountingCsv(from,to);response.setHeader('Content-Type','text/csv; charset=utf-8');response.setHeader('Content-Disposition','attachment; filename="journal-comptable.csv"');response.end(csv)}
  @Get(':id') async one(@Param('id') id: string,@CurrentUser()user:AuthUser) { const result:any=await this.service.detail(id);if(!user.roles.some(r=>['SUPER_ADMIN','DIRECTOR'].includes(r))&&String(result.agency_id)!==String(user.agencyId))throw new ForbiddenException('Facture rattachée à une autre agence');return result; }
  @Roles('SUPER_ADMIN','DIRECTOR','ACCOUNTANT','SERVICE_MANAGER','SERVICE_ADVISOR') @Post() async create(@Body() dto: CreateInvoiceDto) { const result:any=await this.service.create(dto);await this.notifications.create({roleCodes:['ACCOUNTANT','DIRECTOR'],agencyId:dto.agencyId,subject:'Nouvelle facture',message:`La facture ${result.invoice_number} a été émise.`,referenceType:'invoice',referenceId:String(result.id)});return result; }
  @Roles('SUPER_ADMIN','DIRECTOR','ACCOUNTANT') @Post(':id/payments') async pay(@Param('id') id: string, @Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser) { const result:any=await this.service.pay(id, dto, user.sub);await this.notifications.create({roleCodes:['ACCOUNTANT','DIRECTOR'],agencyId:String(result.agency_id),subject:'Paiement enregistré',message:`Un paiement de ${dto.amount} XAF a été enregistré sur ${result.invoice_number}.`,referenceType:'invoice',referenceId:id});return result; }
  @Get(':id/pdf') @ApiProduces('application/pdf')
  async pdf(@Param('id') id: string, @Query('download') download: string, @Res() response: Response) {
    const file = await this.service.pdfBuffer(id); response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Content-Disposition', `${download === 'true' ? 'attachment' : 'inline'}; filename="${file.filename}"`);
    response.setHeader('Content-Length', file.buffer.length); response.end(file.buffer);
  }
}
