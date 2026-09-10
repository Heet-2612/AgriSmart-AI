import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { MapPin, ChevronDown } from "lucide-react";

// Indian states and their major cities
const indianLocations = {
  'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Tirupati'],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Tawang', 'Pasighat', 'Namsai'],
  'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia'],
  'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Arrah'],
  'Chhattisgarh': ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Raigarh', 'Durg'],
  'Goa': ['Panaji', 'Vasco da Gama', 'Margao', 'Mapusa', 'Ponda'],
  'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Gandhinagar'],
  'Haryana': ['Faridabad', 'Gurgaon', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak'],
  'Himachal Pradesh': ['Shimla', 'Mandi', 'Solan', 'Dharamshala', 'Kullu', 'Manali'],
  'Jharkhand': ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro', 'Deoghar', 'Hazaribagh'],
  'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Mangalore', 'Belgaum', 'Gulbarga'],
  'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Alappuzha'],
  'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar'],
  'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur'],
  'Manipur': ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur', 'Ukhrul'],
  'Meghalaya': ['Shillong', 'Tura', 'Jowai', 'Nongstoin', 'Nongpoh'],
  'Mizoram': ['Aizawl', 'Lunglei', 'Saiha', 'Champhai', 'Kolasib'],
  'Nagaland': ['Kohima', 'Dimapur', 'Mokokchung', 'Tuensang', 'Wokha'],
  'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri'],
  'Punjab': ['Amritsar', 'Ludhiana', 'Jalandhar', 'Patiala', 'Bathinda', 'Pathankot'],
  'Rajasthan': ['Jaipur', 'Jodhpur', 'Kota', 'Bikaner', 'Ajmer', 'Udaipur'],
  'Sikkim': ['Gangtok', 'Namchi', 'Mangan', 'Geyzing', 'Rangpo'],
  'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli'],
  'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Ramagundam'],
  'Tripura': ['Agartala', 'Udaipur', 'Dharmanagar', 'Pratapgarh', 'Kailasahar'],
  'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Varanasi', 'Agra', 'Meerut', 'Prayagraj'],
  'Uttarakhand': ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rudrapur', 'Kashipur'],
  'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman']
};

interface LocationSelectorProps {
  onLocationSelect: (state: string, city: string) => void;
  currentLocation?: { state: string; city: string };
}

export const LocationSelector = ({ onLocationSelect, currentLocation, className = '' }: LocationSelectorProps) => {
  const { t } = useLanguage();
  const [selectedState, setSelectedState] = useState(currentLocation?.state || '');
  const [selectedCity, setSelectedCity] = useState(currentLocation?.city || '');
  const [isOpen, setIsOpen] = useState(false);

  const states = Object.keys(indianLocations).sort();
  const cities = selectedState ? (indianLocations[selectedState as keyof typeof indianLocations] || []) : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedState && selectedCity) {
      onLocationSelect(selectedState, selectedCity);
      setIsOpen(false);
    }
  };

  // Load saved location on mount
  useEffect(() => {
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      const { state, city } = JSON.parse(savedLocation);
      if (state && city) {
        setSelectedState(state);
        setSelectedCity(city);
      }
    }
  }, []);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 px-2 text-sm font-normal text-foreground/90 hover:bg-background/50 ${className}`}
        >
          <MapPin className="h-3.5 w-3.5 mr-1.5" />
          {currentLocation ? (
            <span className="truncate max-w-[120px]">{currentLocation.city}, {currentLocation.state}</span>
          ) : (
            <span>{t('selectLocation') || 'Select Location'}</span>
          )}
          <ChevronDown className="h-3.5 w-3.5 ml-1 opacity-70" />
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            {t('selectLocation') || 'Select Your Location'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('state') || 'State'}
            </label>
            <Select
              value={selectedState}
              onValueChange={(value) => {
                setSelectedState(value);
                setSelectedCity('');
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('selectState') || 'Select State'} />
              </SelectTrigger>
              <SelectContent>
                {states.map((state) => (
                  <SelectItem key={state} value={state}>
                    {state}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t('city') || 'City'}
            </label>
            <Select
              value={selectedCity}
              onValueChange={setSelectedCity}
              disabled={!selectedState}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !selectedState
                      ? (t('selectStateFirst') || 'Select state first')
                      : (t('selectCity') || 'Select City')
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {cities.map((city) => (
                  <SelectItem key={city} value={city}>
                    {city}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              size="sm"
            >
              {t('cancel') || 'Cancel'}
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={!selectedState || !selectedCity}
            >
              {t('apply') || 'Apply'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
