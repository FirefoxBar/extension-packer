import type { PlatformContext } from '../types.js';
import { amo } from './amo.js';
import { crx } from './crx.js';
import { cws } from './cws.js';
import { edge } from './edge.js';
import { xpi } from './xpi.js';

export { amo, crx, cws, edge, xpi };

export type PlatformPacker = (context: PlatformContext) => Promise<string>;

export const platforms: Record<string, PlatformPacker> = {
  amo,
  cws,
  xpi,
  edge,
  crx,
};
