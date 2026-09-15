import { createContext, useContext, useState, ReactNode } from 'react';
import { PredictionResponse } from '../types';

interface DiagnosisContextType {
  activeDiagnosis: PredictionResponse | null;
  setActiveDiagnosis: (diagnosis: PredictionResponse | null) => void;
  isAgronomistOpen: boolean;
  openAgronomist: () => void;
  closeAgronomist: () => void;
  isMissingDiagnosisOpen: boolean;
  openMissingDiagnosis: () => void;
  closeMissingDiagnosis: () => void;
}

const DiagnosisContext = createContext<DiagnosisContextType | undefined>(undefined);

export function DiagnosisProvider({ children }: { children: ReactNode }) {
  const [activeDiagnosis, setActiveDiagnosis] = useState<PredictionResponse | null>(null);
  const [isAgronomistOpen, setIsAgronomistOpen] = useState(false);
  const [isMissingDiagnosisOpen, setIsMissingDiagnosisOpen] = useState(false);

  const openAgronomist = () => setIsAgronomistOpen(true);
  const closeAgronomist = () => setIsAgronomistOpen(false);
  
  const openMissingDiagnosis = () => setIsMissingDiagnosisOpen(true);
  const closeMissingDiagnosis = () => setIsMissingDiagnosisOpen(false);

  return (
    <DiagnosisContext.Provider value={{ 
      activeDiagnosis, setActiveDiagnosis, 
      isAgronomistOpen, openAgronomist, closeAgronomist,
      isMissingDiagnosisOpen, openMissingDiagnosis, closeMissingDiagnosis
    }}>
      {children}
    </DiagnosisContext.Provider>
  );
}

export function useDiagnosis() {
  const context = useContext(DiagnosisContext);
  if (context === undefined) {
    throw new Error('useDiagnosis must be used within a DiagnosisProvider');
  }
  return context;
}

