import{Router}from'express';
import{asyncHandler}from'../../middleware/error-handler.js';
import{agencyContext,selectActiveAgency,serializeAgencyContext}from'./agency-rbac.service.js';
import{refreshRealtimeSession}from'../../realtime/socket.js';

export const agencyRbacRouter=Router();
agencyRbacRouter.get('/rbac/agencies',asyncHandler(async(request,response)=>{const context=await agencyContext(request);response.json({activeAgencyId:context.activeAgencyId,agencies:context.agencies})}));
agencyRbacRouter.get('/rbac/agency-context',asyncHandler(async(request,response)=>response.json(serializeAgencyContext(await agencyContext(request)))));
agencyRbacRouter.put('/rbac/agency-context',asyncHandler(async(request,response)=>{const context=await selectActiveAgency(request.user!.sub,request.user!.sid,String(request.body?.agencyId??''));await refreshRealtimeSession(request.user!.sid);response.json(serializeAgencyContext(context))}));
