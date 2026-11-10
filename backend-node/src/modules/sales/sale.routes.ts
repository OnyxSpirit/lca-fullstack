import { Router } from 'express';
import { asyncHandler } from '../../middleware/error-handler.js';
import {assertAgencyBusinessPermission,requireAgencyBusinessPermission,requireAnyAgencyBusinessPermission} from '../rbac/agency-authorization.js';
import * as service from './sale.service.js';

export const saleRouter=Router();

saleRouter.get('/sales',requireAgencyBusinessPermission('sales.view'),asyncHandler(async(request,response)=>response.json(await service.list(request.query,request))));
saleRouter.get('/sales/config/direct-tax',requireAgencyBusinessPermission('sales.create'),asyncHandler(async(request,response)=>response.json(await service.config(request))));
saleRouter.get('/sales/:id',requireAgencyBusinessPermission('sales.view'),asyncHandler(async(request,response)=>response.json(await service.one(String(request.params.id),request,'sales.view'))));
saleRouter.get('/vehicles/:id/warranty-proposal',requireAgencyBusinessPermission('sales.create'),asyncHandler(async(request,response)=>response.json(await service.vehicleWarrantyProposal(String(request.params.id),request))));
saleRouter.get('/sales/vehicles/:id/pricing-guard',requireAgencyBusinessPermission('sales.create'),asyncHandler(async(request,response)=>response.json(await service.vehiclePricingGuard(String(request.params.id),request))));
saleRouter.post('/sales',requireAgencyBusinessPermission('sales.create'),asyncHandler(async(request,response)=>response.status(201).json(await service.create(request.body,request))));
saleRouter.patch('/sales/:id',requireAgencyBusinessPermission('sales.update'),asyncHandler(async(request,response)=>response.json(await service.update(String(request.params.id),request.body,request))));
saleRouter.patch('/sales/:id/warranty',requireAgencyBusinessPermission('sales.update'),asyncHandler(async(request,response)=>response.json(await service.updateWarranty(String(request.params.id),request.body,request))));
saleRouter.patch('/sales/:id/status',requireAnyAgencyBusinessPermission(['sales.confirm','sales.cancel']),asyncHandler(async(request,response)=>{
  const permission=request.body?.status==='cancelled'?'sales.cancel':'sales.confirm';
  await assertAgencyBusinessPermission(request,permission);
  response.json(await service.updateStatus(String(request.params.id),request.body?.status,request.body?.reason,request,permission));
}));
saleRouter.post('/sales/:id/archive',requireAgencyBusinessPermission('sales.confirm'),asyncHandler(async(request,response)=>response.json(await service.retryArchive(String(request.params.id),request))));
