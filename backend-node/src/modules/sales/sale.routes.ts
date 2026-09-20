import { Router } from 'express';
import { requirePermission } from '../../middleware/require-permission.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { assertPermission } from '../rbac/rbac.service.js';
import * as service from './sale.service.js';

export const saleRouter=Router();

saleRouter.get('/sales',requirePermission('sales.view'),asyncHandler(async(request,response)=>response.json(await service.list(request.query,request))));
saleRouter.get('/sales/:id',requirePermission('sales.view'),asyncHandler(async(request,response)=>response.json(await service.one(String(request.params.id),request,'sales.view'))));
saleRouter.post('/sales',requirePermission('sales.create'),asyncHandler(async(request,response)=>response.status(201).json(await service.create(request.body,request))));
saleRouter.patch('/sales/:id',requirePermission('sales.update'),asyncHandler(async(request,response)=>response.json(await service.update(String(request.params.id),request.body,request))));
saleRouter.patch('/sales/:id/status',asyncHandler(async(request,response)=>{
  const permission=request.body?.status==='cancelled'?'sales.cancel':'sales.confirm';
  await assertPermission(request,permission);
  response.json(await service.updateStatus(String(request.params.id),request.body?.status,request.body?.reason,request,permission));
}));
