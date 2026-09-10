import { Button } from "@/components/ui/button";
import { Languages } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

export const LanguageToggle = () => {
  const { language, toggleLanguage } = useLanguage();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
      aria-label="Toggle language"
    >
      <Languages className="h-4 w-4" />
      <span className="font-medium">{language === 'en' ? 'English' : 'हिंदी'}</span>
    </Button>
  );
};