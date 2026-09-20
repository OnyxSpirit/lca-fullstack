import {Router} from 'express';
import {requirePermission} from '../../middleware/require-permission.js';
import {asyncHandler} from '../../middleware/error-handler.js';
import * as service from './quotation.service.js';
import {renderQuotationDocument} from '../documents/commercial-document.js';
import {getEffectiveBusinessSettings} from '../settings/setting-resolver.js';

export const quotationRouter=Router();
quotationRouter.get('/quotations/config',requirePermission('quotations.create'),asyncHandler(async(request,response)=>{const config=await getEffectiveBusinessSettings(request.user!.agencyId!);response.json({defaultVatRate:config.vatRate,currencyCode:config.currencyCode,defaultTaxMode:'TAXABLE',defaultPriceInputMode:'HT'})}));
quotationRouter.get('/quotations',requirePermission('quotations.view'),asyncHandler(async(request,response)=>response.json(await service.list(request.query,request))));
quotationRouter.get('/quotations/opportunity/:opportunityId',requirePermission('quotations.view'),asyncHandler(async(request,response)=>response.json(await service.list({opportunityId:request.params.opportunityId},request))));
quotationRouter.get('/quotations/:id/pdf',requirePermission('quotations.view'),asyncHandler(async(request,response)=>{const quotation=await service.one(request.params.id,request,'quotations.view'),buffer=await renderQuotationDocument(quotation.id);response.setHeader('Content-Type','application/pdf');response.setHeader('Content-Disposition',`${request.query.download==='true'?'attachment':'inline'}; filename="devis-${quotation.quotationNumber}.pdf"`);response.end(buffer)}));
quotationRouter.get('/quotations/:id',requirePermission('quotations.view'),asyncHandler(async(request,response)=>response.json(await service.one(request.params.id,request,'quotations.view'))));
quotationRouter.post('/quotations',requirePermission('quotations.create'),asyncHandler(async(request,response)=>response.status(201).json(await service.create(request.body,request))));
quotationRouter.patch('/quotations/:id',requirePermission('quotations.update'),asyncHandler(async(request,response)=>response.json(await service.update(request.params.id,request.body,request))));
quotationRouter.post('/quotations/:id/validate',requirePermission('quotations.validate'),asyncHandler(async(request,response)=>response.json(await service.validate(request.params.id,request))));
quotationRouter.post('/quotations/:id/cancel',requirePermission('quotations.cancel'),asyncHandler(async(request,response)=>response.json(await service.cancel(request.params.id,request.body?.status,request.body?.reason,request))));
