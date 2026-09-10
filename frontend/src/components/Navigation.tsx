import { Button } from "@/components/ui/button";
import { 
  Home, 
  Cloud, 
  Sprout, 
  Camera, 
  TrendingUp, 
  FileText, 
  MessageCircle,
  Wifi,
  Sparkles
} from "lucide-react";
import { LanguageSelector } from "./LanguageSelector";
import { useLanguage } from "@/contexts/LanguageContext";

interface NavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  onChatClick?: () => void;
}

export const Navigation = ({ activeTab, onTabChange, onChatClick }: NavigationProps) => {
  const { t } = useLanguage();

  const navItems = [
    { id: "home", icon: Home, label: t('home') },
    { id: "weather", icon: Cloud, label: t('weather') },
    { id: "crop-advice", icon: Sprout, label: t('cropAdvice') || 'Crop Advice' },
    { id: "disease", icon: Camera, label: t('diseaseDetection') },
    { id: "market", icon: TrendingUp, label: t('marketPrices') },
    { id: "schemes", icon: FileText, label: t('govtSchemes') },
    {
      id: "chat",
      icon: MessageCircle,
      label: t('chatAssistant'),
      onClick: () => window.open('https://n8n-lamm.onrender.com/webhook/9d63f026-b368-413b-827b-2a7048b26366/chat', '_blank'),
      isChat: true
    },
    { id: "offline", icon: Wifi, label: t('offlineMode') },
  ];

  // Get current time for greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('goodMorning') || 'Good Morning';
    if (hour < 18) return t('goodAfternoon') || 'Good Afternoon';
    return t('goodEvening') || 'Good Evening';
  };

  return (
    <div className="bg-gradient-to-r from-primary/90 to-primary/80 backdrop-blur-md shadow-lg">
      {/* Header */}
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-amber-100">
                {t('appTitle')}
              </h1>
              <p className="text-sm font-medium text-white/90 flex items-center">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-amber-300 mr-2 animate-pulse"></span>
                {getGreeting()}, {t('welcomeBack')}
              </p>
            </div>
          </div>
          <LanguageSelector />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="container mx-auto px-4 pb-1 overflow-x-auto">
        <div className="flex space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isChat = item.isChat;

            if (isChat) {
              return (
                <Button
                  key={item.id}
                  variant="ghost"
                  className="flex flex-col h-auto py-2 px-3 text-xs font-medium rounded-t-lg transition-all duration-200 text-white/90 hover:bg-white/10 hover:text-white"
                  onClick={(e) => {
                    e.preventDefault();
                    item.onClick?.();
                  }}
                >
                  <Icon className="h-4 w-4 mb-1 text-white/90" />
                  <span>{item.label}</span>
                </Button>
              );
            }

            return (
              <Button
                key={item.id}
                variant={isActive ? "secondary" : "ghost"}
                className={`flex flex-col h-auto py-2 px-3 text-xs font-medium rounded-t-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-white text-primary shadow-md'
                    : 'text-white/90 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => onTabChange(item.id)}
              >
                <Icon className={`h-4 w-4 mb-1 ${isActive ? 'text-primary' : 'text-white/90'}`} />
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full"></span>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
};