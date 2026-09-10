import { useState } from "react";
import { Navigation } from "@/components/Navigation";
import { HomeScreen } from "@/components/screens/HomeScreen";
import { WeatherScreen } from "@/components/screens/WeatherScreen";
import { CropAdviceScreen } from "@/components/screens/CropAdviceScreen";
import { GovtSchemesScreen } from "@/components/screens/GovtSchemesScreen";
import { useLanguage } from "@/contexts/LanguageContext";
import { useOutletContext } from "react-router-dom";
import { cn } from "@/lib/utils";

const Index = () => {
  const [activeTab, setActiveTab] = useState("home");
  const { t } = useLanguage();
  const { showChat, setShowChat } = useOutletContext<{
    showChat: boolean;
    setShowChat: (show: boolean) => void
  }>();

  const renderScreen = () => {
    switch (activeTab) {
      case "home":
        return <HomeScreen onNavigate={setActiveTab} />;
      case "weather":
        return <WeatherScreen />;
      case "crop-advice":
        return <CropAdviceScreen />;
      case "disease":
        return <ComingSoonScreen title={t('diseaseDetection')} />;
      case "market":
        return <ComingSoonScreen title={t('marketPrices')} />;
      case "schemes":
        return <GovtSchemesScreen />;
      case "offline":
        return <ComingSoonScreen title={t('offlineMode')} />;
      default:
        return <HomeScreen onNavigate={setActiveTab} />;
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navigation */}
      <div className="sticky top-0 z-20">
        <Navigation
          activeTab={activeTab}
          onTabChange={setActiveTab}
          onChatClick={() => setShowChat(true)}
        />
      </div>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto">
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 md:p-6 border border-white/10 shadow-lg">
          {renderScreen()}
        </div>
      </main>
    </div>
  );
};

// Reusable Coming Soon Component
const ComingSoonScreen = ({ title }: { title: string }) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="bg-primary/10 p-6 rounded-full mb-6">
        <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
          <span className="text-2xl">🚀</span>
        </div>
      </div>
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-muted-foreground max-w-md">
        {t('comingSoon')} - {t('thisFeatureIsUnderDevelopment')}
      </p>
    </div>
  );
};

export default Index;
