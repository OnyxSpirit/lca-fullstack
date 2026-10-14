import assert from'node:assert/strict';
import test from'node:test';
import{activityInstant,formatActivityDate}from'../src/modules/activity/activityDate';

test('ACT-TZ-01 interprète une date MySQL sans suffixe comme un instant UTC unique',()=>{
 assert.equal(activityInstant('2026-09-30 23:30:00').toISOString(),'2026-09-30T23:30:00.000Z');
 assert.equal(activityInstant('2026-09-30T23:30:00Z').toISOString(),'2026-09-30T23:30:00.000Z');
});

test('ACT-TZ-02 reste identique quel que soit le fuseau du navigateur',()=>{
 const previous=process.env.TZ,values:string[]=[];
 try{for(const browserZone of['UTC','America/New_York','Asia/Tokyo']){process.env.TZ=browserZone;values.push(formatActivityDate('2026-09-30 23:30:00','Africa/Brazzaville'))}}finally{process.env.TZ=previous}
 assert.equal(new Set(values).size,1);
 assert.match(values[0]!,/01\/10\/2026/);
 assert.match(values[0]!,/00:30:00/);
});

test('ACT-TZ-03 distingue correctement les instants de part et autre de minuit métier',()=>{
 assert.match(formatActivityDate('2026-09-30 22:59:59','Africa/Brazzaville'),/30\/09\/2026/);
 assert.match(formatActivityDate('2026-09-30 23:00:00','Africa/Brazzaville'),/01\/10\/2026/);
});
