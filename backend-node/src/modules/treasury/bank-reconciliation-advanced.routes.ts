import{Router}from'express';import{asyncHandler}from'../../middleware/error-handler.js';import{requireAgencyPermission as permit}from'../rbac/agency-authorization.js';import*as s from'./bank-reconciliation-advanced.service.js';
export const bankReconciliationAdvancedRouter=Router();
bankReconciliationAdvancedRouter.get('/treasury/bank-reconciliation/dashboard',permit('treasury.reconciliation.dashboard'),asyncHandler(async(r,res)=>res.json(await s.dashboard(r))));
bankReconciliationAdvancedRouter.post('/treasury/bank-reconciliation/groups',permit('treasury.reconciliation.reconcile'),asyncHandler(async(r,res)=>res.status(201).json(await s.reconcileMany(r,r.body))));
bankReconciliationAdvancedRouter.post('/treasury/bank-reconciliation/groups/:id/cancel',permit('treasury.reconciliation.cancel'),asyncHandler(async(r,res)=>res.json(await s.cancelGroup(r,String(r.params.id),r.body?.reason))));
bankReconciliationAdvancedRouter.get('/treasury/bank-reconciliation/discrepancies',permit('treasury.reconciliation.view'),asyncHandler(async(r,res)=>res.json(await s.discrepancies(r))));
bankReconciliationAdvancedRouter.post('/treasury/bank-reconciliation/discrepancies',permit('treasury.reconciliation.discrepancy.manage'),asyncHandler(async(r,res)=>res.status(201).json(await s.createDiscrepancy(r,r.body))));
