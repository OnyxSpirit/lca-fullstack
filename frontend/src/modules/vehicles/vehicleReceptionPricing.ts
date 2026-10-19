export interface VehicleReceptionPricingForm{
  salePrice:string|number;
  minimumPrice:string|number;
  hasReceptionDefect:boolean;
  receptionDefectDescription:string;
  receptionDefectDiscount:string|number;
  receptionDefectDiscountReason:string;
}

const finite=(value:string|number)=>value===''?0:Number(value);
export function receptionPricing(form:VehicleReceptionPricingForm){
  const initial=finite(form.salePrice),discount=form.hasReceptionDefect?finite(form.receptionDefectDiscount):0,minimum=finite(form.minimumPrice),final=initial-discount;
  let error:string|null=null;
  if(!Number.isFinite(initial)||initial<=0)error='Le prix de vente initial doit être strictement positif.';
  else if(!Number.isFinite(discount)||discount<0)error='La réduction doit être un montant positif ou nul.';
  else if(!form.hasReceptionDefect&&discount>0)error='Une réduction exige un défaut déclaré.';
  else if(form.hasReceptionDefect&&!form.receptionDefectDescription.trim())error='Décrivez le défaut constaté.';
  else if(discount>=initial)error='La réduction doit être inférieure au prix de vente initial.';
  else if(discount>0&&!form.receptionDefectDiscountReason.trim())error='Indiquez le motif de la réduction.';
  else if(final<=0)error='Le prix de vente après réduction doit être strictement positif.';
  else if(minimum>0&&final<minimum)error='Le prix après réduction ne peut pas être inférieur au prix minimum.';
  return{initial,discount,final,error};
}
