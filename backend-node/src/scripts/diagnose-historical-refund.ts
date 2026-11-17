import {pool} from '../config/database.js';
import {diagnoseHistoricalRefund} from '../modules/billing/historical-refund-diagnostic.service.js';
const refundId=process.argv.find(x=>x.startsWith('--refund-id='))?.split('=')[1],paymentId=process.argv.find(x=>x.startsWith('--payment-id='))?.split('=')[1];
const connection=await pool.getConnection();
try{console.log(JSON.stringify(await diagnoseHistoricalRefund(connection,{refundId,paymentId}),null,2))}finally{connection.release();await pool.end()}
