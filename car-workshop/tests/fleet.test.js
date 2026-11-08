import test from 'node:test';
import assert from 'node:assert/strict';
import {STORAGE_KEY, createFleet, readFleet, saveFleet, addFinishedCar, changeCarLivery, findCar} from '../fleet-state.js';
const catalog = [{id: 'suv', liveries: [{id: 'default'}, {id: 'blue'}]}, {id: 'truck', liveries: [{id: 'default'}, {id: 'orange'}]}];
function storage(initial = null) {
  let value = initial;
  return {getItem(key) { assert.equal(key, STORAGE_KEY); return value; }, setItem(key, next) { assert.equal(key, STORAGE_KEY); value = next; }};
}
const car = (id = 'car-1', extra = {}) => ({id, vehicleId: 'suv', liveryId: 'default', createdAt: 12, ...extra});
test('empty collection and successful storage round trip', () => {
  const disk = storage();
  assert.deepEqual(readFleet(disk, catalog).fleet, {version: 1, cars: [], nextId: 1});
  const fleet = addFinishedCar(createFleet(), 'suv', 'default', catalog, 123);
  assert.equal(saveFleet(disk, fleet).ok, true);
  const reload = readFleet(disk, catalog);
  assert.equal(reload.ok, true);
  assert.deepEqual(reload.fleet, fleet);
  assert.equal(addFinishedCar(reload.fleet, 'suv', 'blue', catalog).cars[1].id, 'car-2');
});
test('unlimited same-template and same-livery independent instances', () => {
  let fleet = createFleet();
  for (let i = 0; i < 1200; i++) fleet = addFinishedCar(fleet, 'suv', 'default', catalog, i);
  assert.equal(new Set(fleet.cars.map(car => car.id)).size, 1200);
  const changed = changeCarLivery(fleet, fleet.cars[0].id, 'blue', catalog);
  assert.equal(changed.cars[0].liveryId, 'blue');
  assert.equal(changed.cars[1].liveryId, 'default');
  assert.equal(fleet.cars[0].liveryId, 'default');
  const disk = storage(); saveFleet(disk, changed);
  assert.equal(readFleet(disk, catalog).fleet.cars.length, 1200);
  assert.equal(catalog[0].liveries[0].id, 'default');
});
test('valid cars survive alongside corrupt records without overwriting original', () => {
  const serialized = JSON.stringify({version: 1, cars: [car(), null, {vehicleId: 99}], nextId: 2});
  const disk = storage(serialized), result = readFleet(disk, catalog);
  assert.equal(result.fleet.cars.length, 1);
  assert.equal(result.canSave, false);
  assert.equal(saveFleet(disk, result.fleet).ok, false);
  const added = addFinishedCar(result.fleet, 'suv', 'default', catalog);
  assert.equal(saveFleet(disk, added).ok, false);
  assert.equal(disk.getItem(STORAGE_KEY), serialized);
});
test('unreadable and future-version records remain protected', () => {
  for (const initial of ['not json', 'null', '[]', '42', '{"version":2,"cars":[]}', '{"version":1,"cars":null}']) {
    const disk = storage(initial), result = readFleet(disk, catalog);
    assert.equal(result.ok, false); assert.equal(result.canSave, false);
    assert.equal(saveFleet(disk, result.fleet).ok, false);
    assert.equal(disk.getItem(STORAGE_KEY), initial);
  }
});
test('duplicate/missing IDs repair without deleting or stealing later IDs', () => {
  const fleet = createFleet({version: 1, nextId: 1, cars: [car(), car(), car('car-2'), car(null)]}, catalog);
  assert.equal(fleet.cars.length, 4);
  assert.equal(new Set(fleet.cars.map(car => car.id)).size, 4);
  assert.equal(fleet.cars[2].id, 'car-2');
  assert.equal(addFinishedCar(fleet, 'suv', 'default', catalog).cars.length, 5);
});
test('temporarily unknown templates and liveries are retained exactly', () => {
  const raw = {version: 1, nextId: 4, cars: [car('car-1', {vehicleId: 'retired'}), car('car-2', {liveryId: 'holiday'})]};
  const disk = storage(JSON.stringify(raw)), loaded = readFleet(disk, catalog);
  assert.deepEqual(loaded.fleet, raw); assert.equal(loaded.canSave, true); assert.equal(loaded.warnings.length, 2);
  saveFleet(disk, loaded.fleet);
  assert.deepEqual(JSON.parse(disk.getItem(STORAGE_KEY)), raw);
});
test('storage privacy and quota exceptions are reported and do not alter in-memory collection', () => {
  const blocked = {getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('QuotaExceededError'); }};
  assert.equal(readFleet(blocked, catalog).canSave, false);
  const fleet = addFinishedCar(createFleet(), 'truck', 'orange', catalog);
  const result = saveFleet(blocked, fleet);
  assert.equal(result.ok, false); assert.match(result.error.message, /Quota/); assert.equal(fleet.cars.length, 1);
});
test('invalid requests do not mutate valid state; lookup uses instance ID', () => {
  const fleet = addFinishedCar(createFleet(), 'suv', 'default', catalog, 100);
  assert.throws(() => addFinishedCar(fleet, 'unknown', 'default', catalog), RangeError);
  assert.throws(() => addFinishedCar(fleet, 'suv', 'orange', catalog), RangeError);
  assert.throws(() => addFinishedCar(fleet, 'suv', 'default', catalog, NaN), RangeError);
  assert.throws(() => changeCarLivery(fleet, 'absent', 'blue', catalog), RangeError);
  assert.throws(() => changeCarLivery(fleet, 'car-1', 'orange', catalog), RangeError);
  assert.equal(findCar(fleet, 'car-1'), fleet.cars[0]); assert.equal(findCar(fleet, 'suv'), null);
  assert.equal(fleet.cars[0].liveryId, 'default');
});
test('unsafe counters and malformed timestamps recover to valid deterministic values', () => {
  const fleet = createFleet({version: 1, nextId: Infinity, cars: [car('car-1', {createdAt: 'bad'})]}, catalog);
  assert.equal(fleet.cars[0].createdAt, 0);
  assert.equal(addFinishedCar(fleet, 'suv', 'default', catalog).cars[1].id, 'car-2');
  fleet.nextId = Number.MAX_SAFE_INTEGER;
  const next = addFinishedCar(fleet, 'suv', 'default', catalog);
  assert.equal(next.nextId, 1);
  assert.equal(addFinishedCar(next, 'suv', 'default', catalog).cars.at(-1).id, 'car-2');
});
