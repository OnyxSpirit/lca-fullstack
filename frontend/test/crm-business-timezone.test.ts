import assert from'node:assert/strict';
import test from'node:test';
import{appointmentDateError,appointmentInputValue,appointmentIso}from'../src/modules/crm/crmAppointmentPolicy.ts';
import{businessDateTimeInputValue,businessLocalDateTimeToIso,businessNowInput}from'../src/lib/businessDateTime.ts';

const expected=new Map([
  ['08:00','2026-10-23T07:00:00.000Z'],
  ['10:00','2026-10-23T09:00:00.000Z'],
  ['15:30','2026-10-23T14:30:00.000Z'],
  ['23:55','2026-10-23T22:55:00.000Z'],
  ['00:05','2026-10-22T23:05:00.000Z'],
]);

for(const timezone of['Africa/Brazzaville','UTC','America/New_York']){
  test(`les horaires métier restent identiques avec un navigateur ${timezone}`,()=>{
    process.env.TZ=timezone;
    for(const[time,iso]of expected){
      assert.equal(businessLocalDateTimeToIso(`2026-10-23T${time}`),iso);
      assert.equal(appointmentIso(`2026-10-23T${time}`),iso);
      assert.equal(businessDateTimeInputValue(iso),`2026-10-23T${time}`);
      assert.equal(appointmentInputValue(iso),`2026-10-23T${time}`);
    }
  });
}

test('les validations futures comparent des instants et non le fuseau du navigateur',()=>{
  process.env.TZ='America/New_York';
  assert.equal(appointmentDateError('2026-10-23T10:00',new Date('2026-10-23T08:59:59.000Z')),null);
  assert.equal(appointmentDateError('2026-10-23T10:00',new Date('2026-10-23T09:00:00.000Z')),'Le rendez-vous doit être planifié dans le futur.');
  assert.equal(businessNowInput(1,new Date('2026-10-22T23:04:00.000Z')),'2026-10-23T00:05');
});

test('les dates civiles invalides sont refusées',()=>{
  assert.throws(()=>businessLocalDateTimeToIso('2026-02-30T10:00'),/invalides/);
  assert.equal(appointmentDateError('2026-02-30T10:00',new Date(0)),'La date et l’heure sont invalides.');
});
