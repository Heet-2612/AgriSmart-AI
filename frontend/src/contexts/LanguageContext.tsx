import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Language = 'en' | 'hi' | 'gu';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Translations
const translations = {
  en: {
    // Navigation
    'home': 'Home',
    'weather': 'Weather',
    'crops': 'Crops',
    'disease': 'Disease',
    'market': 'Market',
    'schemes': 'Schemes',
    'chat': 'Chat',
    'language': 'Language',
    // Home Screen
    'welcome': 'Welcome',
    'appTitle': 'Your Farming Assistant',
    'appSubtitle': 'All information for smart farming',
    'location': 'Gujarat, India',
    'todaysWeather': "Today's Weather",
    'viewDetails': 'View Details',
    'quickServices': 'Quick Services',
    'cropAdvice': 'Crop Advice',
    'cropAdviceDesc': 'Get the best crops based on soil and weather',
    'diseaseDetection': 'Disease Detection',
    'diseaseDetectionDesc': 'Check for diseases by taking a photo of leaves',
    'marketPrices': 'Market Prices',
    'marketPricesDesc': 'Check today\'s fresh market prices',
    'govtSchemes': 'Government Schemes',
    'govtSchemesDesc': 'Information about government schemes for farmers',
    'pmKisanTitle': 'PM KISAN',
    'pmKisanDesc': 'Income support of ₹6,000 per year to all farmer families across the country in three equal installments of ₹2,000 every four months.',
    'pmFasalBimaTitle': 'PM Fasal Bima Yojana',
    'pmFasalBimaDesc': 'Crop insurance scheme providing comprehensive insurance coverage against crop failure, helping farmers cope with agricultural risks.',
    'kisanCreditCardTitle': 'Kisan Credit Card',
    'kisanCreditCardDesc': 'Provides farmers with timely access to credit for their agricultural needs at a reduced interest rate.',
    'soilHealthCardTitle': 'Soil Health Card',
    'soilHealthCardDesc': 'Provides information to farmers on nutrient status of their soil along with recommendations on appropriate dosage of nutrients.',
    'neemCoatedUreaTitle': 'Neem Coated Urea',
    'neemCoatedUreaDesc': 'Promotes use of neem coated urea to reduce the cost of fertilizers and increase crop yield.',
    'eNamTitle': 'e-NAM',
    'eNamDesc': 'National Agriculture Market (e-NAM) is a pan-India electronic trading portal which networks the existing APMC mandis to create a unified national market for agricultural commodities.',
    'howToApply': 'How to Apply',
    'applyInstructions': 'Click on any scheme above to visit the official website and apply online. For assistance, visit your nearest Common Service Center (CSC) or Krishi Vigyan Kendra (KVK).',
    'exploreMoreSchemes': 'Explore more schemes on India.gov.in',
    'comingSoon': 'Coming Soon',
    'chatAssistant': 'Chat Assistant',
    'offlineMode': 'Offline Mode',
    'startChat': 'Start Chat',
    'dailyTip': "Today's Tip",
    'dailyTipContent': 'The weather is clear, a good time to water the fields. Check soil moisture levels.',
    'yourArea': 'Your Area',
    'weatherForecast': 'Weather Forecast',
    'ahmedabadGujarat': 'Ahmedabad, Gujarat',
    'today': 'Today',
    'tomorrow': 'Tomorrow',
    'dayAfterTomorrow': 'Day after',
    'friday': 'Fri',
    'saturday': 'Sat',
    'sunday': 'Sun',
    'monday': 'Mon',
    'sunny': 'Sunny',
    'cloudy': 'Cloudy',
    'rainy': 'Rainy',
    'feelsLike': 'Feels like {temp}',
    'confidence': 'Confidence',
    'maxTemp': 'Max',
    'minTemp': 'Min',
    'detailedInfo': 'Detailed Information',
    'humidity': 'Humidity',
    'wind': 'Wind',
    'visibility': 'Visibility',
    'pressure': 'Pressure',
    'weeklyForecast': '7-Day Forecast',
    'rain': 'Rain: {rain}',
    'farmingAdvice': 'Farming Advice',
    'weatherFarmingAdvice': 'The weather is clear and the temperature is good. This is a good time for irrigation. There is a chance of rain in the next two days, so it is a good time to apply fertilizer.',
    // Error Pages
    'pageNotFound': 'Oops! Page not found',
    'returnToHome': 'Return to Home',
    // Units
    'celsius': 'C',
    'fahrenheit': 'F',
    'percentage': '%',
    'kilometer': 'km',
    'kilometerPerHour': 'km/h',
    'millibar': 'mb',
  },
  hi: {
    // Navigation
    'home': 'होम',
    'weather': 'मौसम',
    'crops': 'फसलें',
    'disease': 'रोग',
    'market': 'बाजार',
    'schemes': 'योजनाएं',
    'chat': 'चैट',
    'language': 'भाषा',
    // Home Screen
    'welcome': 'आपका स्वागत है',
    'appTitle': 'आपका खेती सहायक',
    'appSubtitle': 'स्मार्ट खेती के लिए सभी जानकारी',
    'location': 'गुजरात, भारत',
    'todaysWeather': 'आज का मौसम',
    'viewDetails': 'विस्तार देखें',
    'quickServices': 'तुरंत सेवा',
    'cropAdvice': 'फसल सलाह',
    'cropAdviceDesc': 'मिट्टी और मौसम के आधार पर सबसे अच्छी फसल जानें',
    'diseaseDetection': 'रोग पहचान',
    'diseaseDetectionDesc': 'पत्ती की तस्वीर लेकर रोग की जांच करें',
    'marketPrices': 'मंडी भाव',
    'marketPricesDesc': 'आज के ताजा मंडी भाव देखें',
    'govtSchemes': 'सरकारी योजना',
    'govtSchemesDesc': 'किसानों के लिए सरकारी योजनाओं की जानकारी',
    'pmKisanTitle': 'पीएम किसान',
    'pmKisanDesc': 'देश भर के सभी किसान परिवारों को प्रति वर्ष 6,000 रुपये की आय सहायता, जो हर चार महीने में 2,000 रुपये की तीन समान किस्तों में दी जाती है।',
    'pmFasalBimaTitle': 'पीएम फसल बीमा योजना',
    'pmFasalBimaDesc': 'फसल विफलता के खिलाफ व्यापक बीमा कवरेज प्रदान करने वाली फसल बीमा योजना, जो किसानों को कृषि जोखिमों से निपटने में मदद करती है।',
    'kisanCreditCardTitle': 'किसान क्रेडिट कार्ड',
    'kisanCreditCardDesc': 'किसानों को कम ब्याज दर पर उनकी कृषि आवश्यकताओं के लिए समय पर ऋण तक पहुंच प्रदान करता है।',
    'soilHealthCardTitle': 'मृदा स्वास्थ्य कार्ड',
    'soilHealthCardDesc': 'किसानों को उनकी मिट्टी की पोषक स्थिति के बारे में जानकारी प्रदान करता है साथ ही पोषक तत्वों की उचित मात्रा की सिफारिशें भी करता है।',
    'neemCoatedUreaTitle': 'नीम कोटेड यूरिया',
    'neemCoatedUreaDesc': 'उर्वरकों की लागत कम करने और फसल उत्पादन बढ़ाने के लिए नीम कोटेड यूरिया के उपयोग को बढ़ावा देना।',
    'eNamTitle': 'ई-नाम',
    'eNamDesc': 'राष्ट्रीय कृषि बाजार (ई-नाम) एक पैन-इंडिया इलेक्ट्रॉनिक ट्रेडिंग पोर्टल है जो कृषि उत्पादों के लिए एकीकृत राष्ट्रीय बाजार बनाने के लिए मौजूदा एपीएमसी मंडियों को जोड़ता है।',
    'howToApply': 'आवेदन कैसे करें',
    'applyInstructions': 'ऑनलाइन आवेदन करने के लिए किसी भी योजना पर क्लिक करें। सहायता के लिए, अपने नजदीकी कॉमन सर्विस सेंटर (सीएससी) या कृषि विज्ञान केंद्र (केवीके) पर जाएं।',
    'exploreMoreSchemes': 'भारत सरकार की और योजनाएं देखें',
    'comingSoon': 'जल्द आ रहा है',
    'chatAssistant': 'चैट सहायक',
    'offlineMode': 'ऑफलाइन मोड',
    'startChat': 'चैट शुरू करें',
    'dailyTip': 'आज की सलाह',
    'dailyTipContent': 'मौसम साफ है, खेत में पानी देने का अच्छा समय है। मिट्टी की नमी जांचें।',
    'yourArea': 'आपका क्षेत्र',
    'weatherForecast': 'मौसम पूर्वानुमान',
    'ahmedabadGujarat': 'अहमदाबाद, गुजरात',
    'today': 'आज',
    'tomorrow': 'कल',
    'dayAfterTomorrow': 'परसों',
    'friday': 'शुक्र',
    'saturday': 'शनि',
    'sunday': 'रवि',
    'monday': 'सोम',
    'sunny': 'धूप',
    'cloudy': 'बादल',
    'rainy': 'बारिश',
    'feelsLike': 'महसूस हो रहा है {temp} जैसे',
    'confidence': 'भरोसा',
    'maxTemp': 'अधिकतम',
    'minTemp': 'न्यूनतम',
    'detailedInfo': 'विस्तृत जानकारी',
    'humidity': 'नमी',
    'wind': 'हवा',
    'visibility': 'दृश्यता',
    'pressure': 'दबाव',
    'weeklyForecast': '7 दिन का पूर्वानुमान',
    'rain': 'बारिश: {rain}',
    'farmingAdvice': 'खेती की सलाह',
    'weatherFarmingAdvice': 'मौसम साफ है और तापमान अच्छा है। यह समय सिंचाई के लिए उपयुक्त है। अगले दो दिन में बारिश की संभावना है, इसलिए खाद डालने का अच्छा समय है।',
    // Error Pages
    'pageNotFound': 'उफ़! पेज नहीं मिला',
    'returnToHome': 'होम पर वापस जाएं',
    // Units
    'celsius': '°से',
    'fahrenheit': '°फे',
    'percentage': '%',
    'kilometer': 'किमी',
    'kilometerPerHour': 'किमी/घंटा',
    'millibar': 'एमबी',
  },
  gu: {
    // Navigation
    'home': 'હોમ',
    'weather': 'હવામાન',
    'crops': 'પાક',
    'disease': 'રોગ',
    'market': 'બજાર',
    'schemes': 'યોજનાઓ',
    'chat': 'ચેટ',
    'language': 'ભાષા',
    // Home Screen
    'welcome': 'સ્વાગત છે',
    'appTitle': 'તમારો ખેતી સહાયક',
    'appSubtitle': 'સ્માર્ટ ખેતી માટેની બધી માહિતી',
    'location': 'ગુજરાત, ભારત',
    'todaysWeather': 'આજનું હવામાન',
    'viewDetails': 'વિગતો જુઓ',
    'quickServices': 'ઝડપી સેવાઓ',
    'cropAdvice': 'પાક સલાહ',
    'cropAdviceDesc': 'માટી અને હવામાનના આધારે શ્રેષ્ઠ પાક મેળવો',
    'diseaseDetection': 'રોગ શોધ',
    'diseaseDetectionDesc': 'પાંદડાની ફોટો લઈને રોગ તપાસો',
    'marketPrices': 'બજાર ભાવ',
    'marketPricesDesc': 'આજના તાજા બજાર ભાવ તપાસો',
    'govtSchemes': 'સરકારી યોજનાઓ',
    'govtSchemesDesc': 'ખેડૂતો માટે સરકારી યોજનાઓની માહિતી',
    'pmKisanTitle': 'પીએમ કિસાન',
    'pmKisanDesc': 'દેશભરના તમામ ખેડૂત પરિવારોને વાર્ષિક 6,000 રૂપિયાની આવક આધાર, જે દર ચાર મહિને 2,000 રૂપિયાની ત્રણ સમાન કિસ્સતોમાં આપવામાં આવે છે.',
    'pmFasalBimaTitle': 'પીએમ ફસલ બીમા યોજના',
    'pmFasalBimaDesc': 'ફસલ નિષ્ફળતા સામે સંપૂર્ણ વીમા કવરેજ પ્રદાન કરતી ફસલ બીમા યોજના, જે ખેતીના જોખમોનો સામનો કરવામાં ખેડૂતોને મદદ કરે છે.',
    'kisanCreditCardTitle': 'કિસાન ક્રેડિટ કાર્ડ',
    'kisanCreditCardDesc': 'ખેડૂતોને ઓછા વ્યાજ દરે તેમની ખેતીની જરૂરિયાતો માટે સમયસર લોન મળે છે.',
    'soilHealthCardTitle': 'માટી સ્વાસ્થ્ય કાર્ડ',
    'soilHealthCardDesc': 'ખેડૂતોને તેમની માટીની પોષક તત્વોની સ્થિતિ અને યોગ્ય માત્રામાં ખાતર વિશેની માહિતી આપે છે.',
    'neemCoatedUreaTitle': 'નીમ લેપિત યુરિયા',
    'neemCoatedUreaDesc': 'ખાતરોની કિંમત ઘટાડવા અને ફસળના ઉત્પાદનમાં વધારો કરવા માટે નીમ લેપિત યુરિયાના ઉપયોગને પ્રોત્સાહન આપવું.',
    'eNamTitle': 'ઈ-નામ',
    'eNamDesc': 'રાષ્ટ્રીય કૃષિ બજાર (ઈ-નામ) એક પેન-ઇન્ડિયા ઇલેક્ટ્રોનિક ટ્રેડિંગ પોર્ટલ છે જે કૃષિ ઉત્પાદનો માટે એકીકૃત રાષ્ટ્રીય બજાર બનાવવા માટે હાલની એપીએમસી મંડીઓને જોડે છે.',
    'howToApply': 'અરજી કેવી રીતે કરવી',
    'applyInstructions': 'ઓનલાઈન અરજી કરવા માટે ઉપરની કોઈપણ યોજના પર ક્લિક કરો. સહાય માટે, તમારા નજીકના કોમન સર્વિસ સેન્ટર (સીએસસી) અથવા કૃષિ વિજ્ઞાન કેન્દ્ર (કેવીકે) મુલાકાત લો.',
    'exploreMoreSchemes': 'ભારત સરકારની વધુ યોજનાઓ જાણો',
    'comingSoon': 'જલ્દી આવી રહ્યું છે',
    'chatAssistant': 'ચેટ સહાયક',
    'offlineMode': 'ઑફલાઇન મોડ',
    'startChat': 'ચેટ શરૂ કરો',
    'dailyTip': 'આજની ટિપ્પણી',
    'dailyTipContent': 'હવામાન સ્વચ્છ છે, ખેતરમાં પાણી આપવા માટે સારો સમય છે. માટીની ભેજ તપાસો.',
    'yourArea': 'તમારું વિસ્તાર',
    'weatherForecast': 'હવામાન અંદાજ',
    'ahmedabadGujarat': 'અમદાવાદ, ગુજરાત',
    'today': 'આજે',
    'tomorrow': 'કાલે',
    'dayAfterTomorrow': 'પરમ દિવસે',
    'friday': 'શુક્ર',
    'saturday': 'શનિ',
    'sunday': 'રવિ',
    'monday': 'સોમ',
    'sunny': 'સૂર્ય',
    'cloudy': 'વાદળછાયું',
    'rainy': 'વરસાદ',
    'feelsLike': 'અનુભવ {temp} જેવું લાગે છે',
    'confidence': 'વિશ્વાસ',
    'maxTemp': 'મહત્તમ',
    'minTemp': 'ન્યૂનતમ',
    'detailedInfo': 'વિસ્તૃત માહિતી',
    'humidity': 'ભેજ',
    'wind': 'પવન',
    'visibility': 'દૃષ્ટિ',
    'pressure': 'દબાણ',
    'weeklyForecast': '7 દિવસનો અંદાજ',
    'rain': 'વરસાદ: {rain}',
    'farmingAdvice': 'ખેતી સલાહ',
    'weatherFarmingAdvice': 'હવામાન સ્વચ્છ છે અને તાપમાન સારું છે. આ સિંચાઈ માટે યોગ્ય સમય છે. આગામી બે દિવસમાં વરસાદની સંભાવના છે, તેથી ખાતર નાખવા માટે સારો સમય છે.',
    // Error Pages
    'pageNotFound': 'ઓહ! પેજ મળ્યું નથી',
    'returnToHome': 'હોમ પર પાછા જાઓ',
    // Units
    'celsius': '°સે',
    'fahrenheit': '°ફે',
    'percentage': '%',
    'kilometer': 'કિ.મી.',
    'kilometerPerHour': 'કિ.મી./કલાક',
    'millibar': 'એમબાર',
  }
} as const;

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>('hi'); // Default to Hindi

  // Load saved language preference from localStorage on initial render
  useEffect(() => {
    const savedLanguage = localStorage.getItem('language') as Language | null;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'hi' || savedLanguage === 'gu')) {
      setLanguageState(savedLanguage);
    }
  }, []);

  // Save language preference to localStorage whenever it changes
  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('language', lang);
  };

  // Translation function
  const t = (key: string, params?: Record<string, string | number>): string => {
    let translation = translations[language][key as keyof typeof translations[Language]] || key;

    // Replace placeholders with provided parameters
    if (params) {
      Object.entries(params).forEach(([param, value]) => {
        translation = translation.replace(`{${param}}`, String(value));
      });
    }

    return translation;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

// Available languages with their display names
export const availableLanguages = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
];
