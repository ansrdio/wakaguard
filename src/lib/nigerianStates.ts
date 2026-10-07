/**
 * Nigerian States
 * 36 states + FCT (Federal Capital Territory)
 */
export const NIGERIAN_STATES = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT', // Federal Capital Territory (Abuja)
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
] as const;

export type NigerianState = typeof NIGERIAN_STATES[number];

/**
 * Available states - All 36 Nigerian states + FCT
 */
export const PILOT_STATES: NigerianState[] = [
  'Abia',
  'Adamawa',
  'Akwa Ibom',
  'Anambra',
  'Bauchi',
  'Bayelsa',
  'Benue',
  'Borno',
  'Cross River',
  'Delta',
  'Ebonyi',
  'Edo',
  'Ekiti',
  'Enugu',
  'FCT',
  'Gombe',
  'Imo',
  'Jigawa',
  'Kaduna',
  'Kano',
  'Katsina',
  'Kebbi',
  'Kogi',
  'Kwara',
  'Lagos',
  'Nasarawa',
  'Niger',
  'Ogun',
  'Ondo',
  'Osun',
  'Oyo',
  'Plateau',
  'Rivers',
  'Sokoto',
  'Taraba',
  'Yobe',
  'Zamfara',
];

/**
 * State name variations and normalization map
 * Maps various forms of state names to our standard format
 */
export const STATE_NORMALIZATION_MAP: Record<string, NigerianState> = {
  // Standard names (lowercase for case-insensitive matching)
  'abia': 'Abia',
  'adamawa': 'Adamawa',
  'akwa ibom': 'Akwa Ibom',
  'anambra': 'Anambra',
  'bauchi': 'Bauchi',
  'bayelsa': 'Bayelsa',
  'benue': 'Benue',
  'borno': 'Borno',
  'cross river': 'Cross River',
  'delta': 'Delta',
  'ebonyi': 'Ebonyi',
  'edo': 'Edo',
  'ekiti': 'Ekiti',
  'enugu': 'Enugu',
  'gombe': 'Gombe',
  'imo': 'Imo',
  'jigawa': 'Jigawa',
  'kaduna': 'Kaduna',
  'kano': 'Kano',
  'katsina': 'Katsina',
  'kebbi': 'Kebbi',
  'kogi': 'Kogi',
  'kwara': 'Kwara',
  'lagos': 'Lagos',
  'nasarawa': 'Nasarawa',
  'niger': 'Niger',
  'ogun': 'Ogun',
  'ondo': 'Ondo',
  'osun': 'Osun',
  'oyo': 'Oyo',
  'plateau': 'Plateau',
  'rivers': 'Rivers',
  'sokoto': 'Sokoto',
  'taraba': 'Taraba',
  'yobe': 'Yobe',
  'zamfara': 'Zamfara',
  
  // FCT variations
  'fct': 'FCT',
  'federal capital territory': 'FCT',
  'abuja': 'FCT',
  'abuja fct': 'FCT',
  'abuja federal capital territory': 'FCT',
  
  // Common variations
  'akwa-ibom': 'Akwa Ibom',
  'cross-river': 'Cross River',
  'niger state': 'Niger',
};

/**
 * Normalize a state name to match our standard format
 */
export function normalizeStateName(stateName: string): NigerianState | null {
  const normalized = stateName.toLowerCase().trim().replace(/\s+/g, ' ');
  return (
    STATE_NORMALIZATION_MAP[normalized] ||
    // Map services return most states with the word on the end, as in "Lagos State"
    STATE_NORMALIZATION_MAP[normalized.replace(/ state$/, '')] ||
    null
  );
}

/**
 * Geographic centers for Nigerian states (lat, lng)
 * Used for map centering and default locations
 */
export const STATE_CENTERS: Record<NigerianState, { lat: number; lng: number; zoom: number }> = {
  // Pilot states (zoom 11 for detailed view)
  'Lagos': { lat: 6.5244, lng: 3.3792, zoom: 11 },
  'Rivers': { lat: 4.8156, lng: 7.0498, zoom: 11 },
  'Kano': { lat: 12.0022, lng: 8.5920, zoom: 11 },
  'Oyo': { lat: 7.3775, lng: 3.9470, zoom: 11 },
  'Enugu': { lat: 6.4584, lng: 7.5464, zoom: 11 },
  'Kaduna': { lat: 10.5105, lng: 7.4165, zoom: 11 },
  'FCT': { lat: 9.0765, lng: 7.3986, zoom: 11 },
  'Akwa Ibom': { lat: 5.0380, lng: 7.9090, zoom: 11 },
  // Other states (for future expansion)
  'Abia': { lat: 5.4527, lng: 7.5248, zoom: 10 },
  'Adamawa': { lat: 9.3265, lng: 12.3984, zoom: 10 },
  'Anambra': { lat: 6.2209, lng: 6.9370, zoom: 10 },
  'Bauchi': { lat: 10.3158, lng: 9.8442, zoom: 10 },
  'Bayelsa': { lat: 4.7719, lng: 6.0699, zoom: 10 },
  'Benue': { lat: 7.3364, lng: 8.7435, zoom: 10 },
  'Borno': { lat: 11.8846, lng: 13.1510, zoom: 10 },
  'Cross River': { lat: 5.8744, lng: 8.5981, zoom: 10 },
  'Delta': { lat: 5.6806, lng: 5.9146, zoom: 10 },
  'Ebonyi': { lat: 6.2649, lng: 8.0137, zoom: 10 },
  'Edo': { lat: 6.3405, lng: 5.6173, zoom: 10 },
  'Ekiti': { lat: 7.7190, lng: 5.3110, zoom: 10 },
  'Gombe': { lat: 10.2904, lng: 11.1670, zoom: 10 },
  'Imo': { lat: 5.5720, lng: 7.0588, zoom: 10 },
  'Jigawa': { lat: 12.2230, lng: 9.5615, zoom: 10 },
  'Katsina': { lat: 12.9908, lng: 7.6177, zoom: 10 },
  'Kebbi': { lat: 11.4966, lng: 4.1975, zoom: 10 },
  'Kogi': { lat: 7.7330, lng: 6.6939, zoom: 10 },
  'Kwara': { lat: 8.9670, lng: 4.3833, zoom: 10 },
  'Nasarawa': { lat: 8.5402, lng: 7.7199, zoom: 10 },
  'Niger': { lat: 9.9315, lng: 5.5933, zoom: 10 },
  'Ogun': { lat: 6.9978, lng: 3.4717, zoom: 10 },
  'Ondo': { lat: 6.9147, lng: 5.1478, zoom: 10 },
  'Osun': { lat: 7.5629, lng: 4.5200, zoom: 10 },
  'Plateau': { lat: 9.2182, lng: 9.5179, zoom: 10 },
  'Sokoto': { lat: 13.0622, lng: 5.2339, zoom: 10 },
  'Taraba': { lat: 7.9996, lng: 10.7738, zoom: 10 },
  'Yobe': { lat: 12.2940, lng: 11.9659, zoom: 10 },
  'Zamfara': { lat: 12.1704, lng: 6.2237, zoom: 10 },
};

/**
 * Default Nigeria center (for when no state is selected)
 */
export const NIGERIA_CENTER = { lat: 9.0820, lng: 8.6753, zoom: 6 };
