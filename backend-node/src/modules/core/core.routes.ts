import { Router } from 'express';
import { requirePermission } from '../../middleware/require-permission.js';
import { one as accessibleSale } from '../sales/sale.service.js';
import { asyncHandler } from '../../middleware/error-handler.js';
import { renderSaleOrderDocument } from '../documents/commercial-document.js';

export const coreRouter = Router();

coreRouter.get('/documents/business/sale/:id/pdf',requirePermission('sales.view'),asyncHandler(async(request,response)=>{
  const sale=await accessibleSale(String(request.params.id),request);
  const pdf=await renderSaleOrderDocument(String(request.params.id));
  response.setHeader('Content-Type','application/pdf');
  response.setHeader('Content-Disposition',`${request.query.download==='true'?'attachment':'inline'}; filename="bon-commande-${sale.sale_number}.pdf"`);
  response.send(pdf);
}));
