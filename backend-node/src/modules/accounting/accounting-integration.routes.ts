import{Router}from'express';import{asyncHandler}from'../../middleware/error-handler.js';import{requireAgencyPermission as permit}from'../rbac/agency-authorization.js';import*as s from'./accounting-integration.service.js';
export const accountingIntegrationRouter=Router();
accountingIntegrationRouter.get('/accounting/integrations',permit('accounting.integration.view'),asyncHandler(async(r,res)=>res.json({items:await s.listEvents(r),labels:s.integrationEventLabels})));
accountingIntegrationRouter.post('/accounting/integrations/discover',permit('accounting.integration.retry'),asyncHandler(async(_r,res)=>res.json({discovered:await s.discover()})));
accountingIntegrationRouter.post('/accounting/integrations/:id/retry',permit('accounting.integration.retry'),asyncHandler(async(r,res)=>res.json(await s.retry(r,String(r.params.id)))));
accountingIntegrationRouter.get('/accounting/schemes',permit('accounting.scheme.view'),asyncHandler(async(_r,res)=>res.json({items:await s.listSchemes(),eventLabels:s.integrationEventLabels})));
accountingIntegrationRouter.post('/accounting/schemes',permit('accounting.scheme.manage'),asyncHandler(async(r,res)=>res.status(201).json(await s.saveScheme(r,r.body))));
accountingIntegrationRouter.patch('/accounting/schemes/:id/status',permit('accounting.scheme.manage'),asyncHandler(async(r,res)=>res.json(await s.toggleScheme(String(r.params.id),Boolean(r.body.active),r.user!.sub))));
