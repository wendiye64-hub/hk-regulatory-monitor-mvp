import { createHkexSources } from './lib/collectors/hkex.mjs';
import { createHkmaSources } from './lib/collectors/hkma.mjs';

// Add future authorities by creating a collector module and registering it here.
// Each source must expose: source_id, label, and an async collect() function.
export const sources = [
  ...createHkexSources(),
  ...createHkmaSources()
];
