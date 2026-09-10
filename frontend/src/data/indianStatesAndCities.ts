export interface State {
  name: string;
  cities: string[];
}

export const indianStates: State[] = [
  {
    name: 'Andhra Pradesh',
    cities: ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool']
  },
  {
    name: 'Gujarat',
    cities: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Gandhinagar']
  },
  {
    name: 'Karnataka',
    cities: ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum']
  },
  {
    name: 'Maharashtra',
    cities: ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad']
  },
  {
    name: 'Punjab',
    cities: ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda']
  },
  {
    name: 'Rajasthan',
    cities: ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer']
  },
  {
    name: 'Tamil Nadu',
    cities: ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem']
  },
  {
    name: 'Uttar Pradesh',
    cities: ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Meerut']
  },
  {
    name: 'West Bengal',
    cities: ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri']
  }
];

// Helper function to get all cities from all states
export const getAllCities = (): string[] => {
  return indianStates.flatMap(state => state.cities);
};

// Helper function to get cities by state
export const getCitiesByState = (stateName: string): string[] => {
  const state = indianStates.find(s => s.name === stateName);
  return state ? state.cities : [];
};
