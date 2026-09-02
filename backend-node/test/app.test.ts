import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';

const token=(roles:string[],agencyId:string|null='1')=>jwt.sign({sub:'10',email:'test@lca.local',roles,agencyId},env.jwt.accessSecret,{expiresIn:'5m'});

test('une route inconnue renvoie un JSON 404',async()=>{const response=await request(createApp()).get('/inconnue');assert.equal(response.status,404);assert.match(response.body.message,/Route introuvable/);});
test('les routes métier refusent un appel sans JWT',async()=>{const response=await request(createApp()).get('/api/users');assert.equal(response.status,401);assert.equal(response.body.message,'Jeton manquant');});
test('la déconnexion exige un access token',async()=>{const response=await request(createApp()).post('/api/auth/logout').send({refreshToken:'12345678901234567890'});assert.equal(response.status,401);});
test('la connexion valide les entrées avant MySQL',async()=>{const response=await request(createApp()).post('/api/auth/login').send({email:'invalide',password:'court'});assert.equal(response.status,400);});
test('CORS autorise uniquement le frontend configuré',async()=>{const response=await request(createApp()).options('/api/users').set('Origin','http://localhost:3000').set('Access-Control-Request-Method','GET');assert.equal(response.headers['access-control-allow-origin'],'http://localhost:3000');});
test('le CRM refuse un rôle sans permission',async()=>{const response=await request(createApp()).get('/api/leads').set('Authorization',`Bearer ${token(['TECHNICIAN'])}`);assert.equal(response.status,403);});
test('la création CRM valide le corps avant MySQL',async()=>{const response=await request(createApp()).post('/api/leads').set('Authorization',`Bearer ${token(['SALES_AGENT'])}`).send({firstName:'Test'});assert.equal(response.status,400);assert.match(response.body.message,/title/);});
test('le CRM refuse une priorité inconnue avant MySQL',async()=>{const response=await request(createApp()).post('/api/leads').set('Authorization',`Bearer ${token(['SALES_AGENT'])}`).send({title:'Test',lastName:'Prospect',phone:'0600000000',priority:'critique'});assert.equal(response.status,400);assert.match(response.body.message,/Priorité CRM invalide/);});
test('un réceptionniste ne peut pas changer une étape commerciale',async()=>{const response=await request(createApp()).patch('/api/leads/1/stage').set('Authorization',`Bearer ${token(['RECEPTIONIST'])}`).send({stage:'won'});assert.equal(response.status,403);});
test('la création d’activité exige un prospect',async()=>{const response=await request(createApp()).post('/api/activities').set('Authorization',`Bearer ${token(['SALES_AGENT'])}`).send({type:'call',subject:'Appel'});assert.equal(response.status,400);assert.match(response.body.message,/leadId/);});
test('les identifiants CRM sont strictement numériques',async()=>{const response=await request(createApp()).get('/api/leads/invalide').set('Authorization',`Bearer ${token(['DIRECTOR'],null)}`);assert.equal(response.status,400);});
test('les notifications exigent une authentification',async()=>{const response=await request(createApp()).get('/api/notifications');assert.equal(response.status,401);});
test('le module clients refuse un rôle sans accès',async()=>{const response=await request(createApp()).get('/api/customers').set('Authorization',`Bearer ${token(['PARTS_MANAGER'])}`);assert.equal(response.status,403);});
test('la création client valide le métier avant MySQL',async()=>{const response=await request(createApp()).post('/api/customers').set('Authorization',`Bearer ${token(['RECEPTIONIST'])}`).send({customerType:'individual',firstName:'Sans nom'});assert.equal(response.status,400);assert.match(response.body.message,/nom est requis/);});
test('les identifiants clients sont strictement numériques',async()=>{const response=await request(createApp()).get('/api/customers/invalide').set('Authorization',`Bearer ${token(['DIRECTOR'],null)}`);assert.equal(response.status,400);});
test('le stock refuse un rôle sans permission',async()=>{const response=await request(createApp()).get('/api/vehicles').set('Authorization',`Bearer ${token(['ACCOUNTANT'])}`);assert.equal(response.status,403);});
test('un réceptionniste ne peut pas créer un véhicule',async()=>{const response=await request(createApp()).post('/api/vehicles').set('Authorization',`Bearer ${token(['RECEPTIONIST'])}`).send({});assert.equal(response.status,403);});
test('la création véhicule valide le VIN avant MySQL',async()=>{const response=await request(createApp()).post('/api/vehicles').set('Authorization',`Bearer ${token(['SALES_MANAGER'])}`).send({vin:'COURT'});assert.equal(response.status,400);assert.match(response.body.message,/VIN/);});
test('une photo catalogue est obligatoire',async()=>{const response=await request(createApp()).post('/api/vehicles').set('Authorization',`Bearer ${token(['SALES_MANAGER'])}`).send({vin:'WBA12345678901234',brand:'Test',model:'Photo'});assert.equal(response.status,400);assert.match(response.body.message,/photo catalogue/);});
test('les identifiants véhicules sont strictement numériques',async()=>{const response=await request(createApp()).get('/api/vehicles/invalide').set('Authorization',`Bearer ${token(['DIRECTOR'],null)}`);assert.equal(response.status,400);});
