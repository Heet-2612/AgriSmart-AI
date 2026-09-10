import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

export const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);

  const toggleListening = () => {
    setIsListening(!isListening);
  };

  return (
    <Button
      onClick={toggleListening}
      className={cn(
        "fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-sunshine",
        "bg-gradient-sunshine hover:shadow-natural transition-all duration-300",
        "border-2 border-warning/20 hover:border-warning/40",
        isListening && "animate-pulse bg-gradient-farming"
      )}
      size="icon"
    >
      {isListening ? (
        <MicOff className="h-7 w-7 text-accent-foreground" />
      ) : (
        <Mic className="h-7 w-7 text-accent-foreground" />
      )}
      <span className="sr-only">
        {isListening ? "आवाज़ रिकॉर्डिंग बंद करें" : "आवाज़ सहायक शुरू करें"}
      </span>
    </Button>
  );
};