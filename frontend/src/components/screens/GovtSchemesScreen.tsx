import { useLanguage } from "@/contexts/LanguageContext";

interface SchemeCardProps {
  title: string;
  description: string;
  link: string;
}

const SchemeCard = ({ title, description, link }: SchemeCardProps) => (
  <div className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">
    <h3 className="text-lg font-semibold text-green-700 mb-2">{title}</h3>
    <p className="text-gray-600 mb-3">{description}</p>
    <a 
      href={link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-green-600 hover:text-green-800 font-medium text-sm flex items-center"
    >
      Learn more →
    </a>
  </div>
);

export const GovtSchemesScreen = () => {
  const { t } = useLanguage();
  
  const schemes = [
    {
      title: t('pmKisanTitle', 'PM KISAN'),
      description: t('pmKisanDesc', 'Income support of ₹6,000 per year to all farmer families across the country in three equal installments of ₹2,000 every four months.'),
      link: 'https://pmkisan.gov.in/'
    },
    {
      title: t('pmFasalBimaTitle', 'PM Fasal Bima Yojana'),
      description: t('pmFasalBimaDesc', 'Crop insurance scheme providing comprehensive insurance coverage against crop failure, helping farmers cope with agricultural risks.'),
      link: 'https://pmfby.gov.in/'
    },
    {
      title: t('kisanCreditCardTitle', 'Kisan Credit Card'),
      description: t('kisanCreditCardDesc', 'Provides farmers with timely access to credit for their agricultural needs at a reduced interest rate.'),
      link: 'https://pmkmy.gov.in/scheme/kcc/'
    },
    {
      title: t('soilHealthCardTitle', 'Soil Health Card'),
      description: t('soilHealthCardDesc', 'Provides information to farmers on nutrient status of their soil along with recommendations on appropriate dosage of nutrients.'),
      link: 'https://soilhealth.dac.gov.in/'
    },
    {
      title: t('neemCoatedUreaTitle', 'Neem Coated Urea'),
      description: t('neemCoatedUreaDesc', 'Promotes use of neem coated urea to reduce the cost of fertilizers and increase crop yield.'),
      link: 'https://www.fert.nic.in/neem-coated-urea-policy'
    },
    {
      title: t('eNamTitle', 'e-NAM'),
      description: t('eNamDesc', 'National Agriculture Market (eNAM) is a pan-India electronic trading portal which networks the existing APMC mandis to create a unified national market for agricultural commodities.'),
      link: 'https://www.enam.gov.in/web/'
    }
  ];

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('govtSchemes', 'Government Schemes')}</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {schemes.map((scheme, index) => (
          <SchemeCard 
            key={index}
            title={scheme.title}
            description={scheme.description}
            link={scheme.link}
          />
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">{t('howToApply', 'How to Apply')}</h3>
        <p className="text-blue-700 mb-4">
          {t('applyInstructions', 'Click on any scheme above to visit the official website and apply online. For assistance, visit your nearest Common Service Center (CSC) or Krishi Vigyan Kendra (KVK).')}
        </p>
        <a 
          href="https://www.india.gov.in/" 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 font-medium"
        >
          {t('exploreMoreSchemes', 'Explore more schemes on India.gov.in')} →
        </a>
      </div>
    </div>
  );
};

export default GovtSchemesScreen;
