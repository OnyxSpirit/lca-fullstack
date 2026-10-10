import assert from 'node:assert/strict';
import test from 'node:test';
import {
  CUSTOMER_IDENTITY_AMBIGUOUS_MESSAGE,
  findCustomerIdentityMatches,
  isCustomerIdentityDuplicate,
  normalizeCustomerEmail,
  normalizeCustomerPhone,
  resolveUnambiguousCustomer,
} from '../src/modules/customers/customer-identity.js';
import {errorHandler} from '../src/middleware/error-handler.js';

test('IDENTITY-01 normalisations métier email et téléphone',()=>{
  assert.equal(normalizeCustomerEmail(' Jean@Example.com '),'jean@example.com');
  assert.equal(normalizeCustomerEmail('   '),null);
  assert.equal(normalizeCustomerPhone('06 123-45.67'),'061234567');
  assert.notEqual(normalizeCustomerPhone('061234567'),normalizeCustomerPhone('+242061234567'));
  assert.equal(normalizeCustomerPhone(null),null);
});

test('IDENTITY-02 la recherche est exacte, par agence et indépendante du RBAC',async()=>{
  let sql='',params:unknown[]=[];
  const connection={execute:async(statement:string,values?:unknown[])=>{sql=statement;params=values??[];return [[{id:7,email_match:1,phone_match:0}],[]] as any;}};
  const result=await findCustomerIdentityMatches(connection as any,'12',' A@EXAMPLE.COM ','06-12',null);
  assert.deepEqual(result,[{id:'7',emailMatch:true,phoneMatch:false}]);
  assert.match(sql,/agency_id=\?/);
  assert.doesNotMatch(sql,/LIKE|assigned_user|concession|permission/i);
  assert.deepEqual(params.slice(0,3),['a@example.com','0612','12']);
});

test('IDENTITY-03 email A et téléphone B est un conflit sans choix arbitraire',()=>{
  assert.throws(()=>resolveUnambiguousCustomer([
    {id:'1',emailMatch:true,phoneMatch:false},
    {id:'2',emailMatch:false,phoneMatch:true},
  ]),error=>Boolean(error&&typeof error==='object'&&'status'in error&&(error as any).status===409&&(error as Error).message===CUSTOMER_IDENTITY_AMBIGUOUS_MESSAGE));
  assert.equal(resolveUnambiguousCustomer([{id:'1',emailMatch:true,phoneMatch:true}]),'1');
});

test('IDENTITY-04 seul 1062 des index identité customer est classé',()=>{
  assert.equal(isCustomerIdentityDuplicate({code:'ER_DUP_ENTRY',sqlMessage:"Duplicate entry for key 'uq_customer_agency_normalized_email'"}),true);
  assert.equal(isCustomerIdentityDuplicate({code:'ER_DUP_ENTRY',sqlMessage:"Duplicate entry for key 'customer_code'"}),false);
  assert.equal(isCustomerIdentityDuplicate({code:'ER_NO_REFERENCED_ROW_2'}),false);
});

test('IDENTITY-05 le mapping HTTP est générique et ne transforme pas les autres 1062',()=>{
  const invoke=(error:unknown)=>{let status=0,body:any;const response={status(value:number){status=value;return this},json(value:unknown){body=value;return this}};errorHandler(error,{method:'POST',path:'/api/customers',originalUrl:'/api/customers'} as any,response as any,()=>undefined);return{status,body}};
  const identity=invoke({code:'ER_DUP_ENTRY',sqlMessage:"Duplicate entry 'secret@example.com' for key 'uq_customer_agency_normalized_email'"});
  assert.equal(identity.status,409);assert.deepEqual(identity.body,{statusCode:409,message:'Un client avec ces coordonnées existe déjà dans cette agence.'});assert.doesNotMatch(JSON.stringify(identity.body),/secret|uq_customer/i);
  const unrelated=invoke({code:'ER_DUP_ENTRY',sqlMessage:"Duplicate entry for key 'customer_code'"});
  assert.equal(unrelated.status,500);assert.equal(unrelated.body.message,'Erreur interne du serveur');
});
