import type{CreditNote}from'../../types';

export const creditNoteMaximum=(invoiceTotal:number,creditNotes:CreditNote[]=[]):number=>Math.max(0,invoiceTotal-creditNotes.filter(note=>['issued','applied'].includes(note.status)).reduce((sum,note)=>sum+note.amount,0));

export const isCreditNoteAmountValid=(value:string,maximum:number):boolean=>{
 const amount=Number(value);
 return value.trim()!==''&&Number.isFinite(amount)&&amount>0&&amount<=maximum;
};
