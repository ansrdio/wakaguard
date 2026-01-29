import { NigerianState } from './nigerianStates';

export type LandmarkCategory = 
  | 'airport'
  | 'bridge'
  | 'market'
  | 'stadium'
  | 'university'
  | 'hospital'
  | 'government'
  | 'monument'
  | 'park'
  | 'mall'
  | 'hotel'
  | 'religious'
  | 'transport';

export interface Landmark {
  id: string;
  name: string;
  category: LandmarkCategory;
  lat: number;
  lng: number;
  state: NigerianState;
}

export const LANDMARK_ICONS: Record<LandmarkCategory, string> = {
  airport: '✈️',
  bridge: '🌉',
  market: '🏪',
  stadium: '🏟️',
  university: '🎓',
  hospital: '🏥',
  government: '🏛️',
  monument: '🗿',
  park: '🌳',
  mall: '🛒',
  hotel: '🏨',
  religious: '⛪',
  transport: '🚏',
};

export const LANDMARKS: Landmark[] = [
  // LAGOS
  { id: 'lag-1', name: 'Murtala Muhammed Airport', category: 'airport', lat: 6.5774, lng: 3.3212, state: 'Lagos' },
  { id: 'lag-2', name: 'Third Mainland Bridge', category: 'bridge', lat: 6.4698, lng: 3.4067, state: 'Lagos' },
  { id: 'lag-3', name: 'Lekki-Ikoyi Link Bridge', category: 'bridge', lat: 6.4394, lng: 3.4521, state: 'Lagos' },
  { id: 'lag-4', name: 'Eko Atlantic', category: 'monument', lat: 6.4095, lng: 3.4106, state: 'Lagos' },
  { id: 'lag-5', name: 'National Stadium Surulere', category: 'stadium', lat: 6.4969, lng: 3.3603, state: 'Lagos' },
  { id: 'lag-6', name: 'University of Lagos', category: 'university', lat: 6.5158, lng: 3.3898, state: 'Lagos' },
  { id: 'lag-7', name: 'Ikeja City Mall', category: 'mall', lat: 6.6018, lng: 3.3515, state: 'Lagos' },
  { id: 'lag-8', name: 'Computer Village Ikeja', category: 'market', lat: 6.6055, lng: 3.3486, state: 'Lagos' },
  { id: 'lag-9', name: 'Balogun Market', category: 'market', lat: 6.4558, lng: 3.3941, state: 'Lagos' },
  { id: 'lag-10', name: 'Lagos Island General Hospital', category: 'hospital', lat: 6.4531, lng: 3.4089, state: 'Lagos' },
  { id: 'lag-11', name: 'Tafawa Balewa Square', category: 'monument', lat: 6.4505, lng: 3.3969, state: 'Lagos' },
  { id: 'lag-12', name: 'National Theatre', category: 'monument', lat: 6.4897, lng: 3.3778, state: 'Lagos' },
  { id: 'lag-13', name: 'Lekki Conservation Centre', category: 'park', lat: 6.4424, lng: 3.5368, state: 'Lagos' },
  { id: 'lag-14', name: 'Palms Shopping Mall', category: 'mall', lat: 6.4340, lng: 3.4523, state: 'Lagos' },
  { id: 'lag-15', name: 'Oshodi Transport Interchange', category: 'transport', lat: 6.5556, lng: 3.3421, state: 'Lagos' },

  // FCT (ABUJA)
  { id: 'fct-1', name: 'Nnamdi Azikiwe Airport', category: 'airport', lat: 9.0068, lng: 7.2632, state: 'FCT' },
  { id: 'fct-2', name: 'National Mosque', category: 'religious', lat: 9.0580, lng: 7.4891, state: 'FCT' },
  { id: 'fct-3', name: 'National Church', category: 'religious', lat: 9.0525, lng: 7.4957, state: 'FCT' },
  { id: 'fct-4', name: 'Aso Rock', category: 'government', lat: 9.0833, lng: 7.5333, state: 'FCT' },
  { id: 'fct-5', name: 'National Stadium Abuja', category: 'stadium', lat: 9.0134, lng: 7.4250, state: 'FCT' },
  { id: 'fct-6', name: 'Jabi Lake Mall', category: 'mall', lat: 9.0672, lng: 7.4147, state: 'FCT' },
  { id: 'fct-7', name: 'Wuse Market', category: 'market', lat: 9.0764, lng: 7.4762, state: 'FCT' },
  { id: 'fct-8', name: 'University of Abuja', category: 'university', lat: 8.9833, lng: 7.1833, state: 'FCT' },
  { id: 'fct-9', name: 'National Hospital Abuja', category: 'hospital', lat: 9.0456, lng: 7.4892, state: 'FCT' },
  { id: 'fct-10', name: 'Millennium Park', category: 'park', lat: 9.0678, lng: 7.4698, state: 'FCT' },
  { id: 'fct-11', name: 'Zuma Rock', category: 'monument', lat: 9.1136, lng: 7.2378, state: 'FCT' },
  { id: 'fct-12', name: 'City Gate', category: 'monument', lat: 9.0272, lng: 7.4756, state: 'FCT' },

  // RIVERS
  { id: 'riv-1', name: 'Port Harcourt Airport', category: 'airport', lat: 5.0155, lng: 6.9496, state: 'Rivers' },
  { id: 'riv-2', name: 'University of Port Harcourt', category: 'university', lat: 4.8985, lng: 6.9231, state: 'Rivers' },
  { id: 'riv-3', name: 'Port Harcourt Pleasure Park', category: 'park', lat: 4.7743, lng: 7.0134, state: 'Rivers' },
  { id: 'riv-4', name: 'Rivers State University', category: 'university', lat: 4.8016, lng: 7.0025, state: 'Rivers' },
  { id: 'riv-5', name: 'Mile One Market', category: 'market', lat: 4.7856, lng: 7.0201, state: 'Rivers' },
  { id: 'riv-6', name: 'Genesis Deluxe Cinemas', category: 'mall', lat: 4.8542, lng: 7.0012, state: 'Rivers' },
  { id: 'riv-7', name: 'Liberation Stadium', category: 'stadium', lat: 4.7858, lng: 7.0167, state: 'Rivers' },
  { id: 'riv-8', name: 'UPTH Teaching Hospital', category: 'hospital', lat: 4.8901, lng: 6.9234, state: 'Rivers' },

  // KANO
  { id: 'kan-1', name: 'Mallam Aminu Kano Airport', category: 'airport', lat: 12.0476, lng: 8.5246, state: 'Kano' },
  { id: 'kan-2', name: 'Kano City Wall', category: 'monument', lat: 12.0022, lng: 8.5167, state: 'Kano' },
  { id: 'kan-3', name: 'Kurmi Market', category: 'market', lat: 11.9967, lng: 8.5167, state: 'Kano' },
  { id: 'kan-4', name: 'Bayero University', category: 'university', lat: 12.0133, lng: 8.5167, state: 'Kano' },
  { id: 'kan-5', name: 'Sani Abacha Stadium', category: 'stadium', lat: 12.0056, lng: 8.5333, state: 'Kano' },
  { id: 'kan-6', name: 'Aminu Kano Teaching Hospital', category: 'hospital', lat: 12.0167, lng: 8.5000, state: 'Kano' },
  { id: 'kan-7', name: 'Emir Palace', category: 'government', lat: 11.9956, lng: 8.5167, state: 'Kano' },
  { id: 'kan-8', name: 'Ado Bayero Mall', category: 'mall', lat: 12.0225, lng: 8.5412, state: 'Kano' },

  // OYO
  { id: 'oyo-1', name: 'Ibadan Airport', category: 'airport', lat: 7.3583, lng: 3.9783, state: 'Oyo' },
  { id: 'oyo-2', name: 'University of Ibadan', category: 'university', lat: 7.4441, lng: 3.8985, state: 'Oyo' },
  { id: 'oyo-3', name: 'Cocoa House', category: 'monument', lat: 7.3878, lng: 3.8963, state: 'Oyo' },
  { id: 'oyo-4', name: 'UCH Teaching Hospital', category: 'hospital', lat: 7.4017, lng: 3.9050, state: 'Oyo' },
  { id: 'oyo-5', name: 'Adamasingba Stadium', category: 'stadium', lat: 7.3833, lng: 3.8833, state: 'Oyo' },
  { id: 'oyo-6', name: 'Dugbe Market', category: 'market', lat: 7.3892, lng: 3.8878, state: 'Oyo' },
  { id: 'oyo-7', name: 'Palms Mall Ibadan', category: 'mall', lat: 7.4123, lng: 3.9012, state: 'Oyo' },
  { id: 'oyo-8', name: 'Ventura Mall', category: 'mall', lat: 7.4156, lng: 3.9234, state: 'Oyo' },

  // KADUNA
  { id: 'kad-1', name: 'Kaduna Airport', category: 'airport', lat: 10.6031, lng: 7.3201, state: 'Kaduna' },
  { id: 'kad-2', name: 'Ahmadu Bello University', category: 'university', lat: 11.1500, lng: 7.6500, state: 'Kaduna' },
  { id: 'kad-3', name: 'Kaduna Refinery', category: 'monument', lat: 10.5167, lng: 7.4333, state: 'Kaduna' },
  { id: 'kad-4', name: 'Ahmadu Bello Stadium', category: 'stadium', lat: 10.5167, lng: 7.4333, state: 'Kaduna' },
  { id: 'kad-5', name: 'Central Market Kaduna', category: 'market', lat: 10.5167, lng: 7.4333, state: 'Kaduna' },
  { id: 'kad-6', name: 'Kaduna State University', category: 'university', lat: 10.4667, lng: 7.4333, state: 'Kaduna' },
  { id: 'kad-7', name: 'Barau Dikko Hospital', category: 'hospital', lat: 10.5234, lng: 7.4412, state: 'Kaduna' },

  // ENUGU
  { id: 'enu-1', name: 'Akanu Ibiam Airport', category: 'airport', lat: 6.4741, lng: 7.5620, state: 'Enugu' },
  { id: 'enu-2', name: 'University of Nigeria Enugu', category: 'university', lat: 6.4259, lng: 7.5049, state: 'Enugu' },
  { id: 'enu-3', name: 'Polo Park Mall', category: 'mall', lat: 6.4447, lng: 7.4951, state: 'Enugu' },
  { id: 'enu-4', name: 'Nnamdi Azikiwe Stadium', category: 'stadium', lat: 6.4500, lng: 7.5000, state: 'Enugu' },
  { id: 'enu-5', name: 'Ogbete Main Market', category: 'market', lat: 6.4417, lng: 7.4917, state: 'Enugu' },
  { id: 'enu-6', name: 'UNTH Teaching Hospital', category: 'hospital', lat: 6.4333, lng: 7.4833, state: 'Enugu' },
  { id: 'enu-7', name: 'Coal City Garden', category: 'park', lat: 6.4512, lng: 7.5123, state: 'Enugu' },
  { id: 'enu-8', name: 'Michael Okpara Square', category: 'monument', lat: 6.4456, lng: 7.5034, state: 'Enugu' },

  // AKWA IBOM
  { id: 'akw-1', name: 'Victor Attah Airport', category: 'airport', lat: 4.8753, lng: 8.0930, state: 'Akwa Ibom' },
  { id: 'akw-2', name: 'University of Uyo', category: 'university', lat: 5.0500, lng: 7.9333, state: 'Akwa Ibom' },
  { id: 'akw-3', name: 'Ibom Plaza', category: 'mall', lat: 5.0308, lng: 7.9256, state: 'Akwa Ibom' },
  { id: 'akw-4', name: 'Godswill Akpabio Stadium', category: 'stadium', lat: 5.0167, lng: 7.9167, state: 'Akwa Ibom' },
  { id: 'akw-5', name: 'Ibom Specialist Hospital', category: 'hospital', lat: 5.0289, lng: 7.9312, state: 'Akwa Ibom' },
  { id: 'akw-6', name: 'Itam Market', category: 'market', lat: 5.0456, lng: 7.9123, state: 'Akwa Ibom' },

  // ABIA
  { id: 'abi-1', name: 'Sam Mbakwe Airport', category: 'airport', lat: 5.4271, lng: 7.2062, state: 'Abia' },
  { id: 'abi-2', name: 'Abia State University', category: 'university', lat: 5.1167, lng: 7.3667, state: 'Abia' },
  { id: 'abi-3', name: 'Ariaria Market', category: 'market', lat: 5.1167, lng: 7.3667, state: 'Abia' },
  { id: 'abi-4', name: 'Enyimba Stadium', category: 'stadium', lat: 5.1167, lng: 7.3667, state: 'Abia' },
  { id: 'abi-5', name: 'FMC Umuahia', category: 'hospital', lat: 5.5333, lng: 7.4833, state: 'Abia' },

  // ADAMAWA
  { id: 'ada-1', name: 'Yola Airport', category: 'airport', lat: 9.2575, lng: 12.4303, state: 'Adamawa' },
  { id: 'ada-2', name: 'Modibbo Adama University', category: 'university', lat: 9.2167, lng: 12.4833, state: 'Adamawa' },
  { id: 'ada-3', name: 'Lamido Palace', category: 'government', lat: 9.2333, lng: 12.4667, state: 'Adamawa' },
  { id: 'ada-4', name: 'Jimeta Main Market', category: 'market', lat: 9.2833, lng: 12.4667, state: 'Adamawa' },
  { id: 'ada-5', name: 'Adamawa Stadium', category: 'stadium', lat: 9.2456, lng: 12.4523, state: 'Adamawa' },

  // ANAMBRA
  { id: 'ana-1', name: 'Asaba Airport', category: 'airport', lat: 6.2044, lng: 6.6652, state: 'Anambra' },
  { id: 'ana-2', name: 'Nnamdi Azikiwe University', category: 'university', lat: 6.2500, lng: 7.1167, state: 'Anambra' },
  { id: 'ana-3', name: 'Onitsha Main Market', category: 'market', lat: 6.1500, lng: 6.7833, state: 'Anambra' },
  { id: 'ana-4', name: 'Nnamdi Azikiwe Mausoleum', category: 'monument', lat: 6.1667, lng: 6.7500, state: 'Anambra' },
  { id: 'ana-5', name: 'NAUTH Teaching Hospital', category: 'hospital', lat: 6.1456, lng: 7.0678, state: 'Anambra' },

  // BAUCHI
  { id: 'bau-1', name: 'Bauchi Airport', category: 'airport', lat: 10.4828, lng: 9.7940, state: 'Bauchi' },
  { id: 'bau-2', name: 'ATBU University', category: 'university', lat: 10.2833, lng: 9.8333, state: 'Bauchi' },
  { id: 'bau-3', name: 'Yankari Game Reserve', category: 'park', lat: 9.7500, lng: 10.5000, state: 'Bauchi' },
  { id: 'bau-4', name: 'Emir Palace Bauchi', category: 'government', lat: 10.3167, lng: 9.8333, state: 'Bauchi' },
  { id: 'bau-5', name: 'Wunti Market', category: 'market', lat: 10.3123, lng: 9.8456, state: 'Bauchi' },

  // BAYELSA
  { id: 'bay-1', name: 'Bayelsa Airport', category: 'airport', lat: 4.9364, lng: 6.2189, state: 'Bayelsa' },
  { id: 'bay-2', name: 'Niger Delta University', category: 'university', lat: 4.9333, lng: 6.1167, state: 'Bayelsa' },
  { id: 'bay-3', name: 'Isaac Boro Park', category: 'park', lat: 4.9256, lng: 6.2678, state: 'Bayelsa' },
  { id: 'bay-4', name: 'Samson Siasia Stadium', category: 'stadium', lat: 4.9234, lng: 6.2712, state: 'Bayelsa' },
  { id: 'bay-5', name: 'Swali Market', category: 'market', lat: 4.9312, lng: 6.2623, state: 'Bayelsa' },

  // BENUE
  { id: 'ben-1', name: 'Makurdi Airport', category: 'airport', lat: 7.7031, lng: 8.6139, state: 'Benue' },
  { id: 'ben-2', name: 'Benue State University', category: 'university', lat: 7.7333, lng: 8.5333, state: 'Benue' },
  { id: 'ben-3', name: 'Aper Aku Stadium', category: 'stadium', lat: 7.7312, lng: 8.5367, state: 'Benue' },
  { id: 'ben-4', name: 'Wurukum Market', category: 'market', lat: 7.7289, lng: 8.5423, state: 'Benue' },
  { id: 'ben-5', name: 'BSUTH Hospital', category: 'hospital', lat: 7.7345, lng: 8.5289, state: 'Benue' },

  // BORNO
  { id: 'bor-1', name: 'Maiduguri Airport', category: 'airport', lat: 11.8553, lng: 13.0809, state: 'Borno' },
  { id: 'bor-2', name: 'University of Maiduguri', category: 'university', lat: 11.8333, lng: 13.1500, state: 'Borno' },
  { id: 'bor-3', name: 'Shehu of Borno Palace', category: 'government', lat: 11.8456, lng: 13.1567, state: 'Borno' },
  { id: 'bor-4', name: 'Monday Market', category: 'market', lat: 11.8389, lng: 13.1623, state: 'Borno' },
  { id: 'bor-5', name: 'El-Kanemi Stadium', category: 'stadium', lat: 11.8512, lng: 13.1534, state: 'Borno' },

  // CROSS RIVER
  { id: 'cro-1', name: 'Margaret Ekpo Airport', category: 'airport', lat: 4.9760, lng: 8.3472, state: 'Cross River' },
  { id: 'cro-2', name: 'University of Calabar', category: 'university', lat: 4.9500, lng: 8.3500, state: 'Cross River' },
  { id: 'cro-3', name: 'Obudu Mountain Resort', category: 'park', lat: 6.3833, lng: 9.3667, state: 'Cross River' },
  { id: 'cro-4', name: 'Tinapa Resort', category: 'mall', lat: 4.9667, lng: 8.3167, state: 'Cross River' },
  { id: 'cro-5', name: 'U.J. Esuene Stadium', category: 'stadium', lat: 4.9578, lng: 8.3245, state: 'Cross River' },
  { id: 'cro-6', name: 'Watt Market', category: 'market', lat: 4.9534, lng: 8.3312, state: 'Cross River' },

  // DELTA
  { id: 'del-1', name: 'Asaba Airport', category: 'airport', lat: 6.2044, lng: 6.6652, state: 'Delta' },
  { id: 'del-2', name: 'Delta State University', category: 'university', lat: 5.5167, lng: 5.7500, state: 'Delta' },
  { id: 'del-3', name: 'Warri City Stadium', category: 'stadium', lat: 5.5167, lng: 5.7500, state: 'Delta' },
  { id: 'del-4', name: 'Ogbe-Ijoh Market', category: 'market', lat: 5.5234, lng: 5.7456, state: 'Delta' },
  { id: 'del-5', name: 'Stephen Keshi Stadium', category: 'stadium', lat: 6.2089, lng: 6.7312, state: 'Delta' },

  // EBONYI
  { id: 'ebo-1', name: 'Ebonyi State University', category: 'university', lat: 6.2667, lng: 8.0167, state: 'Ebonyi' },
  { id: 'ebo-2', name: 'Abakaliki Rice Mill', category: 'market', lat: 6.3167, lng: 8.1167, state: 'Ebonyi' },
  { id: 'ebo-3', name: 'Pa Ngele Oruta Stadium', category: 'stadium', lat: 6.3234, lng: 8.1089, state: 'Ebonyi' },
  { id: 'ebo-4', name: 'FETHA Hospital', category: 'hospital', lat: 6.3145, lng: 8.1234, state: 'Ebonyi' },

  // EDO
  { id: 'edo-1', name: 'Benin Airport', category: 'airport', lat: 6.3179, lng: 5.5994, state: 'Edo' },
  { id: 'edo-2', name: 'University of Benin', category: 'university', lat: 6.3986, lng: 5.6122, state: 'Edo' },
  { id: 'edo-3', name: 'Oba Palace', category: 'government', lat: 6.3333, lng: 5.6333, state: 'Edo' },
  { id: 'edo-4', name: 'Ring Road', category: 'monument', lat: 6.3389, lng: 5.6245, state: 'Edo' },
  { id: 'edo-5', name: 'New Benin Market', category: 'market', lat: 6.3456, lng: 5.6178, state: 'Edo' },
  { id: 'edo-6', name: 'Samuel Ogbemudia Stadium', category: 'stadium', lat: 6.3512, lng: 5.6289, state: 'Edo' },

  // EKITI
  { id: 'eki-1', name: 'Ekiti State University', category: 'university', lat: 7.6333, lng: 5.2167, state: 'Ekiti' },
  { id: 'eki-2', name: 'Fajuyi Park', category: 'park', lat: 7.6178, lng: 5.2234, state: 'Ekiti' },
  { id: 'eki-3', name: 'Ado-Ekiti Stadium', category: 'stadium', lat: 7.6245, lng: 5.2189, state: 'Ekiti' },
  { id: 'eki-4', name: 'Oja Oba Market', category: 'market', lat: 7.6312, lng: 5.2145, state: 'Ekiti' },
  { id: 'eki-5', name: 'EKSUTH Hospital', category: 'hospital', lat: 7.6189, lng: 5.2278, state: 'Ekiti' },

  // GOMBE
  { id: 'gom-1', name: 'Gombe Airport', category: 'airport', lat: 10.3008, lng: 10.8969, state: 'Gombe' },
  { id: 'gom-2', name: 'Gombe State University', category: 'university', lat: 10.2833, lng: 11.1667, state: 'Gombe' },
  { id: 'gom-3', name: 'Emir Palace Gombe', category: 'government', lat: 10.2889, lng: 11.1623, state: 'Gombe' },
  { id: 'gom-4', name: 'Pantami Stadium', category: 'stadium', lat: 10.2934, lng: 11.1678, state: 'Gombe' },
  { id: 'gom-5', name: 'Gombe Main Market', category: 'market', lat: 10.2856, lng: 11.1712, state: 'Gombe' },

  // IMO
  { id: 'imo-1', name: 'Sam Mbakwe Airport', category: 'airport', lat: 5.4271, lng: 7.2062, state: 'Imo' },
  { id: 'imo-2', name: 'Imo State University', category: 'university', lat: 5.4833, lng: 7.0333, state: 'Imo' },
  { id: 'imo-3', name: 'Federal University of Tech', category: 'university', lat: 5.4667, lng: 7.0333, state: 'Imo' },
  { id: 'imo-4', name: 'Mbari Cultural Centre', category: 'monument', lat: 5.4845, lng: 7.0267, state: 'Imo' },
  { id: 'imo-5', name: 'Ekeukwu Market', category: 'market', lat: 5.4789, lng: 7.0312, state: 'Imo' },
  { id: 'imo-6', name: 'Dan Anyiam Stadium', category: 'stadium', lat: 5.4823, lng: 7.0289, state: 'Imo' },

  // JIGAWA
  { id: 'jig-1', name: 'Dutse Airport', category: 'airport', lat: 11.7830, lng: 9.3380, state: 'Jigawa' },
  { id: 'jig-2', name: 'Federal University Dutse', category: 'university', lat: 11.7667, lng: 9.3333, state: 'Jigawa' },
  { id: 'jig-3', name: 'Emir Palace Dutse', category: 'government', lat: 11.7712, lng: 9.3378, state: 'Jigawa' },
  { id: 'jig-4', name: 'Dutse Stadium', category: 'stadium', lat: 11.7689, lng: 9.3412, state: 'Jigawa' },

  // KATSINA
  { id: 'kat-1', name: 'Katsina Airport', category: 'airport', lat: 13.0078, lng: 7.6644, state: 'Katsina' },
  { id: 'kat-2', name: 'Umaru Musa Yaradua University', category: 'university', lat: 12.9833, lng: 7.6000, state: 'Katsina' },
  { id: 'kat-3', name: 'Gobarau Minaret', category: 'monument', lat: 12.9912, lng: 7.6023, state: 'Katsina' },
  { id: 'kat-4', name: 'Emir Palace Katsina', category: 'government', lat: 12.9878, lng: 7.6067, state: 'Katsina' },
  { id: 'kat-5', name: 'Central Market Katsina', category: 'market', lat: 12.9934, lng: 7.6089, state: 'Katsina' },

  // KEBBI
  { id: 'keb-1', name: 'Kebbi Airport', category: 'airport', lat: 12.4615, lng: 4.2325, state: 'Kebbi' },
  { id: 'keb-2', name: 'Kebbi State University', category: 'university', lat: 12.4500, lng: 4.1833, state: 'Kebbi' },
  { id: 'keb-3', name: 'Argungu Fishing Festival Site', category: 'park', lat: 12.7500, lng: 4.5167, state: 'Kebbi' },
  { id: 'keb-4', name: 'Emir Palace Birnin Kebbi', category: 'government', lat: 12.4556, lng: 4.1978, state: 'Kebbi' },

  // KOGI
  { id: 'kog-1', name: 'Lokoja Airport', category: 'airport', lat: 7.7963, lng: 6.7178, state: 'Kogi' },
  { id: 'kog-2', name: 'Federal University Lokoja', category: 'university', lat: 7.8167, lng: 6.7333, state: 'Kogi' },
  { id: 'kog-3', name: 'Confluence Point', category: 'monument', lat: 7.7972, lng: 6.7389, state: 'Kogi' },
  { id: 'kog-4', name: 'Mount Patti', category: 'park', lat: 7.8234, lng: 6.7456, state: 'Kogi' },
  { id: 'kog-5', name: 'Lokoja Main Market', category: 'market', lat: 7.8012, lng: 6.7312, state: 'Kogi' },

  // KWARA
  { id: 'kwa-1', name: 'Ilorin Airport', category: 'airport', lat: 8.4401, lng: 4.4940, state: 'Kwara' },
  { id: 'kwa-2', name: 'University of Ilorin', category: 'university', lat: 8.4667, lng: 4.5667, state: 'Kwara' },
  { id: 'kwa-3', name: 'Kwara State Stadium', category: 'stadium', lat: 8.4756, lng: 4.5512, state: 'Kwara' },
  { id: 'kwa-4', name: 'Emir Palace Ilorin', category: 'government', lat: 8.5012, lng: 4.5467, state: 'Kwara' },
  { id: 'kwa-5', name: 'Oja Oba Market', category: 'market', lat: 8.4934, lng: 4.5523, state: 'Kwara' },

  // NASARAWA
  { id: 'nas-1', name: 'Nasarawa State University', category: 'university', lat: 8.5167, lng: 7.7167, state: 'Nasarawa' },
  { id: 'nas-2', name: 'Farin Ruwa Waterfall', category: 'park', lat: 8.6500, lng: 8.4333, state: 'Nasarawa' },
  { id: 'nas-3', name: 'Lafia City Stadium', category: 'stadium', lat: 8.4923, lng: 8.5134, state: 'Nasarawa' },
  { id: 'nas-4', name: 'Lafia Main Market', category: 'market', lat: 8.4978, lng: 8.5078, state: 'Nasarawa' },

  // NIGER
  { id: 'nig-1', name: 'Minna Airport', category: 'airport', lat: 9.6522, lng: 6.4623, state: 'Niger' },
  { id: 'nig-2', name: 'Federal University of Tech Minna', category: 'university', lat: 9.5500, lng: 6.4500, state: 'Niger' },
  { id: 'nig-3', name: 'Kainji Dam', category: 'monument', lat: 9.8667, lng: 4.6000, state: 'Niger' },
  { id: 'nig-4', name: 'Gurara Falls', category: 'park', lat: 9.3333, lng: 7.0000, state: 'Niger' },
  { id: 'nig-5', name: 'Minna Central Market', category: 'market', lat: 9.6145, lng: 6.5567, state: 'Niger' },

  // OGUN
  { id: 'ogu-1', name: 'Federal University of Agric', category: 'university', lat: 7.2333, lng: 3.4500, state: 'Ogun' },
  { id: 'ogu-2', name: 'Olumo Rock', category: 'monument', lat: 7.1000, lng: 3.3500, state: 'Ogun' },
  { id: 'ogu-3', name: 'Redemption Camp', category: 'religious', lat: 6.8167, lng: 3.4667, state: 'Ogun' },
  { id: 'ogu-4', name: 'MKO Abiola Stadium', category: 'stadium', lat: 7.1534, lng: 3.3678, state: 'Ogun' },
  { id: 'ogu-5', name: 'Kuto Market', category: 'market', lat: 7.1623, lng: 3.3512, state: 'Ogun' },

  // ONDO
  { id: 'ond-1', name: 'Akure Airport', category: 'airport', lat: 7.2467, lng: 5.3010, state: 'Ondo' },
  { id: 'ond-2', name: 'Federal University of Tech Akure', category: 'university', lat: 7.2833, lng: 5.1333, state: 'Ondo' },
  { id: 'ond-3', name: 'Idanre Hills', category: 'park', lat: 7.1167, lng: 5.1167, state: 'Ondo' },
  { id: 'ond-4', name: 'Ondo State University', category: 'university', lat: 7.2534, lng: 5.1967, state: 'Ondo' },
  { id: 'ond-5', name: 'Oba Market Akure', category: 'market', lat: 7.2623, lng: 5.2045, state: 'Ondo' },

  // OSUN
  { id: 'osu-1', name: 'Obafemi Awolowo University', category: 'university', lat: 7.5167, lng: 4.5167, state: 'Osun' },
  { id: 'osu-2', name: 'Osun-Osogbo Sacred Grove', category: 'park', lat: 7.7500, lng: 4.5500, state: 'Osun' },
  { id: 'osu-3', name: 'Osun State Stadium', category: 'stadium', lat: 7.7689, lng: 4.5234, state: 'Osun' },
  { id: 'osu-4', name: 'Oja Oba Market Osogbo', category: 'market', lat: 7.7756, lng: 4.5189, state: 'Osun' },
  { id: 'osu-5', name: 'OAUTH Hospital', category: 'hospital', lat: 7.5234, lng: 4.5123, state: 'Osun' },

  // PLATEAU
  { id: 'pla-1', name: 'Yakubu Gowon Airport', category: 'airport', lat: 9.6397, lng: 8.8700, state: 'Plateau' },
  { id: 'pla-2', name: 'University of Jos', category: 'university', lat: 9.9167, lng: 8.8833, state: 'Plateau' },
  { id: 'pla-3', name: 'Jos Wildlife Park', category: 'park', lat: 9.8833, lng: 8.9000, state: 'Plateau' },
  { id: 'pla-4', name: 'Shere Hills', category: 'park', lat: 9.8667, lng: 8.9333, state: 'Plateau' },
  { id: 'pla-5', name: 'Jos Main Market', category: 'market', lat: 9.9234, lng: 8.8967, state: 'Plateau' },
  { id: 'pla-6', name: 'JUTH Hospital', category: 'hospital', lat: 9.9012, lng: 8.8789, state: 'Plateau' },

  // SOKOTO
  { id: 'sok-1', name: 'Sokoto Airport', category: 'airport', lat: 13.0048, lng: 5.2072, state: 'Sokoto' },
  { id: 'sok-2', name: 'Usmanu Danfodiyo University', category: 'university', lat: 13.1333, lng: 5.2000, state: 'Sokoto' },
  { id: 'sok-3', name: 'Sultan Palace', category: 'government', lat: 13.0589, lng: 5.2312, state: 'Sokoto' },
  { id: 'sok-4', name: 'Hubbare Mosque', category: 'religious', lat: 13.0623, lng: 5.2267, state: 'Sokoto' },
  { id: 'sok-5', name: 'Sokoto Central Market', category: 'market', lat: 13.0567, lng: 5.2389, state: 'Sokoto' },

  // TARABA
  { id: 'tar-1', name: 'Jalingo Airport', category: 'airport', lat: 8.9000, lng: 11.2711, state: 'Taraba' },
  { id: 'tar-2', name: 'Taraba State University', category: 'university', lat: 8.8833, lng: 11.3667, state: 'Taraba' },
  { id: 'tar-3', name: 'Gashaka-Gumti National Park', category: 'park', lat: 7.3500, lng: 11.5500, state: 'Taraba' },
  { id: 'tar-4', name: 'Mambilla Plateau', category: 'park', lat: 6.8333, lng: 11.1667, state: 'Taraba' },
  { id: 'tar-5', name: 'Jalingo Main Market', category: 'market', lat: 8.8912, lng: 11.3589, state: 'Taraba' },

  // YOBE
  { id: 'yob-1', name: 'Damaturu Airport', category: 'airport', lat: 11.7444, lng: 11.9644, state: 'Yobe' },
  { id: 'yob-2', name: 'Yobe State University', category: 'university', lat: 11.7500, lng: 11.9667, state: 'Yobe' },
  { id: 'yob-3', name: 'Emir Palace Damaturu', category: 'government', lat: 11.7534, lng: 11.9712, state: 'Yobe' },
  { id: 'yob-4', name: 'Damaturu Main Market', category: 'market', lat: 11.7489, lng: 11.9678, state: 'Yobe' },

  // ZAMFARA
  { id: 'zam-1', name: 'Gusau Airport', category: 'airport', lat: 12.1722, lng: 6.6964, state: 'Zamfara' },
  { id: 'zam-2', name: 'Federal University Gusau', category: 'university', lat: 12.1500, lng: 6.6667, state: 'Zamfara' },
  { id: 'zam-3', name: 'Emir Palace Gusau', category: 'government', lat: 12.1623, lng: 6.6612, state: 'Zamfara' },
  { id: 'zam-4', name: 'Gusau Main Market', category: 'market', lat: 12.1578, lng: 6.6689, state: 'Zamfara' },
];

export function getLandmarksByState(state: NigerianState): Landmark[] {
  return LANDMARKS.filter(landmark => landmark.state === state);
}

export function getLandmarkIcon(category: LandmarkCategory): string {
  return LANDMARK_ICONS[category] || '📍';
}
