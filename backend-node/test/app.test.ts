import assert from 'node:assert/strict';
import { test } from 'node:test';
import request from 'supertest';
import { createApp } from '../src/app.js';

test('une route inconnue renvoie un JSON 404',async()=>{const response=await request(createApp()).get('/inconnue');assert.equal(response.status,404);assert.match(response.body.message,/Route introuvable/);});
test('les routes métier refusent un appel sans JWT',async()=>{const response=await request(createApp()).get('/api/users');assert.equal(response.status,401);assert.equal(response.body.message,'Jeton manquant');});
test('la déconnexion exige un access token',async()=>{const response=await request(createApp()).post('/api/auth/logout').send({refreshToken:'12345678901234567890'});assert.equal(response.status,401);});
test('la connexion valide les entrées avant MySQL',async()=>{const response=await request(createApp()).post('/api/auth/login').send({email:'invalide',password:'court'});assert.equal(response.status,400);});
test('CORS autorise uniquement le frontend configuré',async()=>{const response=await request(createApp()).options('/api/users').set('Origin','http://localhost:3000').set('Access-Control-Request-Method','GET');assert.equal(response.headers['access-control-allow-origin'],'http://localhost:3000');});
