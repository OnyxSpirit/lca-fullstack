import assert from'node:assert/strict';
import test from'node:test';
import{roleContract}from'../src/modules/users/user.service.js';

test('RBAC-R03/R04 le contrat API normalise les booléens MySQL du rôle',()=>{
 const inactive=roleContract({id:17,is_system:0,is_active:0,user_count:'2'}as any);
 const active=roleContract({id:18,is_system:1,is_active:1,user_count:3}as any);
 assert.deepEqual({id:inactive.id,isSystem:inactive.is_system,isActive:inactive.is_active,count:inactive.user_count},{id:'17',isSystem:false,isActive:false,count:2});
 assert.deepEqual({id:active.id,isSystem:active.is_system,isActive:active.is_active,count:active.user_count},{id:'18',isSystem:true,isActive:true,count:3});
});

test('RBAC-R30 le contrat conserve les autres propriétés du rôle',()=>{
 const role=roleContract({id:9,code:'AUDIT_ROLE',name:'Audit',description:'Test',is_system:0,is_active:0}as any);
 assert.equal(role.code,'AUDIT_ROLE');assert.equal(role.name,'Audit');assert.equal(role.description,'Test');
});
