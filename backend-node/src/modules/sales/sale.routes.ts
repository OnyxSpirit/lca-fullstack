import { Router } from 'express';
import { authorize } from '../../middleware/authorize.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import * as service from './sale.service.js';

export const saleRouter=Router();
const READ=['SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT','DELIVERY_MANAGER','ACCOUNTANT'];
const WRITE=['SUPER_ADMIN','DIRECTOR','SALES_MANAGER','SALES_AGENT'];
saleRouter.get('/sales',authorize(...READ),asyncHandler(async(req,res)=>res.json(await service.list(req.query,req))));
saleRouter.get('/sales/:id',authorize(...READ),asyncHandler(async(req,res)=>res.json(await service.one(String(req.params.id),req))));
saleRouter.post('/sales',authorize(...WRITE),asyncHandler(async(req,res)=>res.status(201).json(await service.create(req.body,req))));
saleRouter.patch('/sales/:id',authorize(...WRITE),asyncHandler(async(req,res)=>res.json(await service.update(String(req.params.id),req.body,req))));
saleRouter.patch('/sales/:id/status',authorize(...WRITE),asyncHandler(async(req,res)=>res.json(await service.updateStatus(String(req.params.id),req.body.status,req.body.reason,req))));
