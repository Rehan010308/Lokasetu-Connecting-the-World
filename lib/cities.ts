import type { Geo } from './types';

/* ===========================================================================
   WHERE PEOPLE ACTUALLY ARE
   ---------------------------------------------------------------------------
   The previous build had six Bengaluru localities and nothing else, and every
   worker, client and job sat on the exact centroid of one of them. Two
   consequences, both visible in the product:

     1. It was a Bengaluru app wearing a national name.
     2. Distance between a worker and a job was frequently EXACTLY zero, so
        the feed said "0 m away" — a number no real system ever produces, and
        the fastest way to make a demo look fake.

   Fixed by having a real place hierarchy (city → locality) and by scattering
   every entity deterministically around its locality centre, so two people in
   Koramangala are near each other without being on the same square metre.
   =========================================================================== */

export interface Locality {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface City {
  id: string;
  name: string;
  state: string;
  localities: Locality[];
}

const L = (id: string, name: string, lat: number, lng: number): Locality => ({ id, name, lat, lng });

export const CITIES: City[] = [
  { id: 'blr', name: 'Bengaluru', state: 'Karnataka', localities: [
    L('blr_koramangala', 'Koramangala', 12.9352, 77.6245),
    L('blr_hsr', 'HSR Layout', 12.9121, 77.6446),
    L('blr_indiranagar', 'Indiranagar', 12.9784, 77.6408),
    L('blr_jayanagar', 'Jayanagar', 12.9250, 77.5938),
    L('blr_whitefield', 'Whitefield', 12.9698, 77.7500),
    L('blr_marathahalli', 'Marathahalli', 12.9591, 77.6974),
    L('blr_btm', 'BTM Layout', 12.9166, 77.6101),
    L('blr_rajajinagar', 'Rajajinagar', 12.9915, 77.5550),
  ]},
  { id: 'mum', name: 'Mumbai', state: 'Maharashtra', localities: [
    L('mum_andheri', 'Andheri', 19.1197, 72.8468),
    L('mum_bandra', 'Bandra', 19.0596, 72.8295),
    L('mum_powai', 'Powai', 19.1176, 72.9060),
    L('mum_dadar', 'Dadar', 19.0178, 72.8478),
    L('mum_thane', 'Thane', 19.2183, 72.9781),
    L('mum_borivali', 'Borivali', 19.2307, 72.8567),
  ]},
  { id: 'del', name: 'Delhi NCR', state: 'Delhi', localities: [
    L('del_saket', 'Saket', 28.5245, 77.2066),
    L('del_dwarka', 'Dwarka', 28.5921, 77.0460),
    L('del_rohini', 'Rohini', 28.7495, 77.0565),
    L('del_lajpat', 'Lajpat Nagar', 28.5677, 77.2433),
    L('del_karolbagh', 'Karol Bagh', 28.6519, 77.1909),
    L('del_noida', 'Noida', 28.5355, 77.3910),
    L('del_gurugram', 'Gurugram', 28.4595, 77.0266),
  ]},
  { id: 'chn', name: 'Chennai', state: 'Tamil Nadu', localities: [
    L('chn_tnagar', 'T. Nagar', 13.0418, 80.2341),
    L('chn_adyar', 'Adyar', 13.0012, 80.2565),
    L('chn_velachery', 'Velachery', 12.9756, 80.2207),
    L('chn_annanagar', 'Anna Nagar', 13.0850, 80.2101),
    L('chn_tambaram', 'Tambaram', 12.9249, 80.1000),
    L('chn_sholinganallur', 'Sholinganallur', 12.9010, 80.2279),
  ]},
  { id: 'hyd', name: 'Hyderabad', state: 'Telangana', localities: [
    L('hyd_gachibowli', 'Gachibowli', 17.4401, 78.3489),
    L('hyd_madhapur', 'Madhapur', 17.4485, 78.3908),
    L('hyd_banjara', 'Banjara Hills', 17.4126, 78.4448),
    L('hyd_kukatpally', 'Kukatpally', 17.4849, 78.4138),
    L('hyd_secunderabad', 'Secunderabad', 17.4399, 78.4983),
    L('hyd_lbnagar', 'LB Nagar', 17.3457, 78.5522),
  ]},
  { id: 'pun', name: 'Pune', state: 'Maharashtra', localities: [
    L('pun_kothrud', 'Kothrud', 18.5074, 73.8077),
    L('pun_hinjewadi', 'Hinjewadi', 18.5913, 73.7389),
    L('pun_vimannagar', 'Viman Nagar', 18.5679, 73.9143),
    L('pun_koregaon', 'Koregaon Park', 18.5362, 73.8939),
    L('pun_baner', 'Baner', 18.5590, 73.7868),
    L('pun_hadapsar', 'Hadapsar', 18.5089, 73.9260),
  ]},
  { id: 'kol', name: 'Kolkata', state: 'West Bengal', localities: [
    L('kol_saltlake', 'Salt Lake', 22.5867, 88.4174),
    L('kol_ballygunge', 'Ballygunge', 22.5261, 88.3654),
    L('kol_howrah', 'Howrah', 22.5958, 88.2636),
    L('kol_newtown', 'New Town', 22.5800, 88.4600),
    L('kol_behala', 'Behala', 22.4989, 88.3095),
    L('kol_dumdum', 'Dum Dum', 22.6200, 88.4200),
  ]},
  { id: 'amd', name: 'Ahmedabad', state: 'Gujarat', localities: [
    L('amd_satellite', 'Satellite', 23.0300, 72.5100),
    L('amd_navrangpura', 'Navrangpura', 23.0370, 72.5600),
    L('amd_bopal', 'Bopal', 23.0300, 72.4700),
    L('amd_maninagar', 'Maninagar', 22.9960, 72.6000),
    L('amd_vastrapur', 'Vastrapur', 23.0350, 72.5290),
    L('amd_chandkheda', 'Chandkheda', 23.1100, 72.5900),
  ]},
  { id: 'koc', name: 'Kochi', state: 'Kerala', localities: [
    L('koc_kakkanad', 'Kakkanad', 10.0159, 76.3419),
    L('koc_edappally', 'Edappally', 10.0261, 76.3086),
    L('koc_fortkochi', 'Fort Kochi', 9.9658, 76.2422),
    L('koc_palarivattom', 'Palarivattom', 10.0067, 76.3060),
    L('koc_aluva', 'Aluva', 10.1081, 76.3517),
    L('koc_vyttila', 'Vyttila', 9.9680, 76.3180),
  ]},
  { id: 'cbe', name: 'Coimbatore', state: 'Tamil Nadu', localities: [
    L('cbe_rspuram', 'R.S. Puram', 11.0090, 76.9490),
    L('cbe_peelamedu', 'Peelamedu', 11.0270, 77.0020),
    L('cbe_saibaba', 'Saibaba Colony', 11.0230, 76.9430),
    L('cbe_gandhipuram', 'Gandhipuram', 11.0180, 76.9660),
    L('cbe_singanallur', 'Singanallur', 11.0000, 77.0300),
    L('cbe_vadavalli', 'Vadavalli', 11.0270, 76.9010),
  ]},
  { id: 'mys', name: 'Mysuru', state: 'Karnataka', localities: [
    L('mys_vijayanagar', 'Vijayanagar', 12.3200, 76.6200),
    L('mys_kuvempunagar', 'Kuvempunagar', 12.2870, 76.6200),
    L('mys_gokulam', 'Gokulam', 12.3200, 76.6360),
    L('mys_hebbal', 'Hebbal', 12.3500, 76.6100),
    L('mys_jpnagar', 'J.P. Nagar', 12.2830, 76.6400),
    L('mys_bogadi', 'Bogadi', 12.3140, 76.6000),
  ]},
  { id: 'vel', name: 'Vellore', state: 'Tamil Nadu', localities: [
    L('vel_katpadi', 'Katpadi', 12.9700, 79.1370),
    L('vel_sathuvachari', 'Sathuvachari', 12.9430, 79.1600),
    L('vel_gandhinagar', 'Gandhi Nagar', 12.9240, 79.1350),
    L('vel_bagayam', 'Bagayam', 12.8900, 79.1300),
    L('vel_thorapadi', 'Thorapadi', 12.9060, 79.1500),
    L('vel_fort', 'Vellore Fort', 12.9192, 79.1325),
  ]},
];

export const ALL_LOCALITIES: Locality[] = CITIES.flatMap((c) => c.localities);

export function city(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}

export function locality(id: string): Locality | undefined {
  return ALL_LOCALITIES.find((l) => l.id === id);
}

export function cityOfLocality(localityId: string): City | undefined {
  return CITIES.find((c) => c.localities.some((l) => l.id === localityId));
}

/* --------------------------------------------------------------- scatter */

/** Deterministic 32-bit hash. Same seed, same point, every render. */
function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * A real address inside a locality, derived from an id.
 *
 * Everybody in Koramangala should be *near* the middle of Koramangala, not
 * *at* it. Without this, distanceKm() between a worker and a job in the same
 * area is exactly 0 and the UI prints "0 m away".
 *
 * Deterministic on purpose: the same worker must not teleport between renders,
 * and the server and the client must agree. Math.random() would break both.
 */
export function scatter(base: Locality, seed: string, spreadKm = 1.7): Geo {
  const h = hash(seed);
  const angle = ((h % 3600) / 3600) * Math.PI * 2;
  /* sqrt keeps the points evenly spread over the disc instead of clumping
     in the middle, and the floor keeps anyone from landing on the centroid */
  const r = (0.25 + Math.sqrt(((h >>> 12) % 1000) / 1000) * 0.75) * spreadKm;

  const dLat = (r / 111) * Math.cos(angle);
  const dLng = (r / (111 * Math.cos((base.lat * Math.PI) / 180))) * Math.sin(angle);

  const c = cityOfLocality(base.id);
  return {
    lat: Number((base.lat + dLat).toFixed(5)),
    lng: Number((base.lng + dLng).toFixed(5)),
    areaName: c ? `${base.name}, ${c.name}` : base.name,
    localityId: base.id,
    cityId: c?.id,
  };
}

/** The locality centre itself, for a city-level view. */
export function geoOf(localityId: string): Geo | undefined {
  const l = locality(localityId);
  if (!l) return undefined;
  const c = cityOfLocality(localityId);
  return {
    lat: l.lat, lng: l.lng,
    areaName: c ? `${l.name}, ${c.name}` : l.name,
    localityId: l.id,
    cityId: c?.id,
  };
}
