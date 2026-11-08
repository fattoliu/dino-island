/** Finished cars are instances, never catalog templates. All mutations return new state.
 * readFleet reports recoverable warnings and never writes. Unknown vehicle/livery IDs
 * are retained so a temporarily smaller catalog cannot erase a child's collection.
 * Malformed/unsupported saves remain untouched: canSave=false and saveFleet refuses
 * that state (and its derived states) until a deliberate recovery outside this API.
 */
export const STORAGE_KEY = 'little-car-workshop.fleet.v1';
const protectedStates = new WeakSet();
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const identifier = value => typeof value === 'string' && value.trim().length > 0;
const emptyFleet = () => ({version: 1, cars: [], nextId: 1});
const templateFor = (catalog, id) => Array.isArray(catalog) ? catalog.find(vehicle => vehicle.id === id) : undefined;
const liveriesFor = vehicle => vehicle?.liveries?.length ? vehicle.liveries : [{id: 'default'}];

function normalize(raw, catalog) {
  const fleet = emptyFleet(), warnings = [];
  let canSave = true;
  if (raw === null || raw === undefined) return {fleet, warnings, canSave};
  if (!isRecord(raw) || raw.version !== 1 || !Array.isArray(raw.cars)) {
    protectedStates.add(fleet);
    return {fleet, warnings: ['Saved fleet has an unsupported or malformed format.'], canSave: false};
  }
  fleet.nextId = Number.isSafeInteger(raw.nextId) && raw.nextId > 0 ? raw.nextId : 1;
  // Reserve all original IDs before repairing duplicates, so repairs cannot steal one.
  const reserved = new Set(raw.cars.filter(isRecord).map(car => car.id).filter(identifier));
  const seen = new Set();
  for (const value of raw.cars) {
    if (!isRecord(value) || !identifier(value.vehicleId) || !identifier(value.liveryId)) {
      warnings.push('A malformed car was omitted from the visible collection; the original save is protected.');
      canSave = false;
      continue;
    }
    let id = value.id;
    if (!identifier(id) || seen.has(id)) {
      id = allocateId(fleet, reserved);
      reserved.add(id);
      warnings.push('A missing or duplicate car ID was repaired.');
    }
    seen.add(id);
    const createdAt = typeof value.createdAt === 'number' && Number.isFinite(value.createdAt) && value.createdAt >= 0 ? value.createdAt : 0;
    if (createdAt !== value.createdAt) warnings.push('A car with an invalid creation time was recovered.');
    fleet.cars.push({id, vehicleId: value.vehicleId, liveryId: value.liveryId, createdAt});
    const template = templateFor(catalog, value.vehicleId);
    if (!template) warnings.push(`Unavailable vehicle template retained: ${value.vehicleId}`);
    else if (!liveriesFor(template).some(livery => livery.id === value.liveryId)) warnings.push(`Unavailable livery retained: ${value.liveryId}`);
  }
  if (!canSave) protectedStates.add(fleet);
  return {fleet, warnings, canSave};
}
function allocateId(fleet, occupied = new Set(fleet.cars.map(car => car.id))) {
  let counter = Number.isSafeInteger(fleet.nextId) && fleet.nextId > 0 ? fleet.nextId : 1;
  while (occupied.has(`car-${counter}`)) counter = counter === Number.MAX_SAFE_INTEGER ? 1 : counter + 1;
  fleet.nextId = counter === Number.MAX_SAFE_INTEGER ? 1 : counter + 1;
  return `car-${counter}`;
}
function copyFleet(fleet) {
  const copy = {...fleet, cars: fleet.cars.map(car => ({...car}))};
  if (protectedStates.has(fleet)) protectedStates.add(copy);
  return copy;
}
export function createFleet(raw = null, catalog = []) { return normalize(raw, catalog).fleet; }
export function readFleet(storage, catalog = []) {
  try {
    const serialized = storage.getItem(STORAGE_KEY);
    const parsed = serialized === null ? null : JSON.parse(serialized);
    if (serialized !== null && parsed === null) throw new TypeError('Saved fleet is null.');
    const result = normalize(parsed, catalog);
    return {...result, ok: result.canSave, error: result.canSave ? null : new Error('Original fleet save protected from overwrite.')};
  } catch (error) {
    const fleet = emptyFleet();
    protectedStates.add(fleet);
    return {fleet, ok: false, error, warnings: ['Could not read the saved collection. Original data has not been changed.'], canSave: false};
  }
}
export function saveFleet(storage, fleet) {
  if (protectedStates.has(fleet)) return {ok: false, error: new Error('Refusing to overwrite a damaged or unreadable original fleet save.')};
  try {
    if (!isRecord(fleet) || fleet.version !== 1 || !Array.isArray(fleet.cars)) throw new TypeError('Invalid fleet state.');
    storage.setItem(STORAGE_KEY, JSON.stringify(fleet));
    return {ok: true, error: null};
  } catch (error) { return {ok: false, error}; }
}
export function addFinishedCar(fleet, vehicleId, liveryId = 'default', catalog = [], now = Date.now()) {
  const template = templateFor(catalog, vehicleId);
  if (!template) throw new RangeError(`Unknown vehicle: ${vehicleId}`);
  if (!liveriesFor(template).some(livery => livery.id === liveryId)) throw new RangeError(`Unknown livery: ${liveryId}`);
  if (typeof now !== 'number' || !Number.isFinite(now) || now < 0) throw new RangeError('Invalid creation time.');
  const next = copyFleet(fleet);
  next.cars.push({id: allocateId(next), vehicleId, liveryId, createdAt: now});
  return next;
}
export function changeCarLivery(fleet, instanceId, liveryId, catalog = []) {
  const car = findCar(fleet, instanceId);
  if (!car) throw new RangeError(`Unknown car: ${instanceId}`);
  const template = templateFor(catalog, car.vehicleId);
  if (!template || !liveriesFor(template).some(livery => livery.id === liveryId)) throw new RangeError(`Unknown livery: ${liveryId}`);
  const next = copyFleet(fleet);
  next.cars.find(instance => instance.id === instanceId).liveryId = liveryId;
  return next;
}
export function findCar(fleet, instanceId) { return fleet.cars.find(car => car.id === instanceId) ?? null; }
