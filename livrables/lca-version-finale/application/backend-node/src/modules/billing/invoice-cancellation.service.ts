import type {PoolConnection,RowDataPacket} from'mysql2/promise';
import{HttpError}from'../../shared/http-error.js';

type CancellationActor={userId:string;ip:string|null;userAgent:string|null};

export async function cancelUnpaidInvoice(connection:PoolConnection,invoiceId:string,reason:string,actor:CancellationActor){
 const[rows]=await connection.execute<RowDataPacket[]>('SELECT id,status,amount_paid FROM invoices WHERE id=? FOR UPDATE',[invoiceId]),invoice=rows[0];
 if(!invoice)throw new HttpError(404,'Facture introuvable');
 const[payments]=await connection.execute<RowDataPacket[]>("SELECT p.id,p.amount,COALESCE((SELECT SUM(pr.amount) FROM payment_refunds pr WHERE pr.payment_id=p.id),0) refunded_amount FROM payments p WHERE p.invoice_id=? AND p.status='confirmed' FOR UPDATE",[invoiceId]);
 if(payments.some(payment=>Number(payment.amount)-Number(payment.refunded_amount)>.001)||Number(invoice.amount_paid)>0)throw new HttpError(409,'Une facture encaissée doit faire l’objet d’un avoir ou remboursement');
 if(invoice.status==='cancelled')throw new HttpError(409,'Facture déjà annulée');
 await connection.execute("UPDATE invoices SET status='cancelled',balance_due=0,cancellation_reason=?,cancelled_by=?,cancelled_at=NOW() WHERE id=?",[reason,actor.userId,invoiceId]);
 await connection.execute('INSERT INTO audit_logs(user_id,module,entity_type,entity_id,action,new_values,ip_address,user_agent) VALUES(?,?,?,?,?,?,?,?)',[actor.userId,'billing','invoice',invoiceId,'cancelled',JSON.stringify({reason}),actor.ip,actor.userAgent]);
}

export const cancellationActor=(request:{user?:{sub?:string};ip?:string|null;get(name:string):string|undefined}):CancellationActor=>({userId:String(request.user?.sub),ip:request.ip??null,userAgent:request.get('user-agent')?.slice(0,500)??null});
