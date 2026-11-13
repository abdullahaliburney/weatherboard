import type { City } from '../api/cities'

export const karachi: City = {
  id: '1174872',
  name: 'Karachi',
  country: 'Pakistan',
  countryCode: 'PK',
  region: 'Sindh',
  latitude: 24.8608,
  longitude: 67.0104,
  population: 11624219,
  timezone: 'Asia/Karachi',
  label: 'Karachi, Sindh, Pakistan',
}

export const lahore: City = {
  ...karachi,
  id: '1172451',
  name: 'Lahore',
  region: 'Punjab',
  latitude: 31.5204,
  longitude: 74.3587,
  label: 'Lahore, Punjab, Pakistan',
}

export const multan: City = { ...karachi, id: '1170076', name: 'Multan', latitude: 30.1968, longitude: 71.4697 }
export const islamabad: City = { ...karachi, id: '1176615', name: 'Islamabad', latitude: 33.6844, longitude: 73.0479 }
export const quetta: City = { ...karachi, id: '1167528', name: 'Quetta', latitude: 30.1798, longitude: 66.975 }
export const peshawar: City = { ...karachi, id: '1168197', name: 'Peshawar', latitude: 34.008, longitude: 71.5785 }
