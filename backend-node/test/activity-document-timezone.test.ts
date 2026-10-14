import assert from'node:assert/strict';
import test from'node:test';
import{activityDocumentDate}from'../src/modules/activity/activity-document.js';

test('ACT-PDF-TZ-01 le PDF interprète MySQL en UTC et applique le fuseau configuré une seule fois',()=>{
 const value=activityDocumentDate('2026-09-30 23:30:00','Africa/Brazzaville');
 assert.match(value,/01\/10\/2026/);
 assert.match(value,/00:30:00/);
});

test('ACT-PDF-TZ-02 le rendu PDF respecte un autre fuseau métier configuré',()=>{
 const utc=activityDocumentDate('2026-09-30 23:30:00','UTC');
 const business=activityDocumentDate('2026-09-30 23:30:00','Africa/Brazzaville');
 assert.notEqual(utc,business);
 assert.match(utc,/30\/09\/2026/);
 assert.match(business,/01\/10\/2026/);
});
