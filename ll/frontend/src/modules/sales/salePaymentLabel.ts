export const salePaymentLabel=(amountPaid:number,balanceDue:number)=>
  amountPaid<=0?null:balanceDue<=0?'Soldé':'Acompte';
