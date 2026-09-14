/*
 * Real imagery used on the landing page, built by scripts/build_landing_assets.py.
 * LRO NAC orthophoto and DTM: NASA/GSFC/Arizona State University.
 * OHRC and IIRS: ISRO / ISSDC (Chandrayaan-2).
 */
import nacSite from '../../assets/lunar/nac-site.webp';
import ohrcSite from '../../assets/lunar/ohrc-site.webp';
import ohrcBrightCrater from '../../assets/lunar/ohrc-bright-crater.webp';
import ohrcCraterField from '../../assets/lunar/ohrc-crater-field.webp';
import ohrcSlope from '../../assets/lunar/ohrc-slope.webp';
import ohrcAt5m from '../../assets/lunar/ohrc-at-5m.webp';
import nacCrater from '../../assets/lunar/nac-crater.webp';
import nacBoulders from '../../assets/lunar/nac-boulders.webp';
import dtmSunEast from '../../assets/lunar/dtm-sun-east.webp';
import dtmSunWest from '../../assets/lunar/dtm-sun-west.webp';
import overlaySite from '../../assets/lunar/overlay-site.webp';
import heatmapLocal from '../../assets/lunar/heatmap-local.webp';
import heatmapGlobal from '../../assets/lunar/heatmap-global.webp';
import iirsPatch from '../../assets/lunar/iirs-patch.webp';

export const LUNAR = {
  nacSite,
  ohrcSite,
  ohrcBrightCrater,
  ohrcCraterField,
  ohrcSlope,
  ohrcAt5m,
  nacCrater,
  nacBoulders,
  dtmSunEast,
  dtmSunWest,
  overlaySite,
  heatmapLocal,
  heatmapGlobal,
  iirsPatch,
};

/** Held-out error bands shared by the landing visuals (same thresholds as the workstation). */
export const bandColour = (errorPx: number | null) =>
  errorPx === null ? '#64748B' : errorPx < 0.5 ? '#176B87' : errorPx < 1 ? '#5FA8C2' : errorPx < 2 ? '#E3A93B' : '#D0605E';
