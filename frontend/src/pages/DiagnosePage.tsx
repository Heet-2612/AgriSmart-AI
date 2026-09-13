import { useState, useRef, useEffect, ChangeEvent, DragEvent } from 'react';
import { Leaf, Upload, Trash2, RefreshCw, AlertCircle, Loader2, Sparkles, ArrowRight, FileText, ShieldCheck } from 'lucide-react';
import { Button } from '../components/Button';
import { DiagnosisResult } from '../components/diagnosis/DiagnosisResult';
import { ModelUnavailable } from '../components/diagnosis/ModelUnavailable';
import { BonusFeaturesSection } from '../components/crop/BonusFeaturesSection';
import { predictDisease, ApiError } from '../api/client';
import { PredictionResponse } from '../types';

/** Maximum allowed image upload size: 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Supported crop options */
const CROP_OPTIONS = [
  'Apple',
  'Bell Pepper',
  'Cherry',
  'Corn (Maize)',
  'Cotton',
  'Grape',
  'Peach',
  'Potato',
  'Rice',
  'Soybean',
  'Strawberry',
  'Tomato',
  'Wheat',
];

interface StepItem {
  number: number;
  label: string;
  description: string;
  icon: typeof Upload;
}

const HOW_IT_WORKS_STEPS: StepItem[] = [
  {
    number: 1,
    label: 'Upload Image',
    description: 'Choose or drag & drop your crop or leaf image.',
    icon: Upload,
  },
  {
    number: 2,
    label: 'AI Analysis',
    description: 'Our model examines the image for signs of disease.',
    icon: Sparkles,
  },
  {
    number: 3,
    label: 'Get Diagnosis',
    description: 'View the full analysis breakdown and crop details.',
    icon: FileText,
  },
  {
    number: 4,
    label: 'Take Action',
    description: 'Follow the guidance and keep your crops healthy.',
    icon: Leaf,
  },
];

interface SupportedCrop {
  name: string;
  image: string;
  description: string;
}

const SUPPORTED_CROPS: SupportedCrop[] = [
  {
    name: 'Tomato',
    image: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=600&q=80',
    description: 'Foliar blight, leaf spots & mold detection',
  },
  {
    name: 'Potato',
    image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=600&q=80',
    description: 'Early & late blight identification',
  },
  {
    name: 'Rice',
    image: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=600&q=80',
    description: 'Leaf blast & bacterial sheath blight',
  },
  {
    name: 'Wheat',
    image: 'https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&w=600&q=80',
    description: 'Rust, mildew & Septoria detection',
  },
  {
    name: 'Other Crops',
    image: 'https://images.unsplash.com/photo-1628699267150-c83134372958?auto=format&fit=crop&w=600&q=80',
    description: 'Apple, corn, grape, peach & more',
  },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface DiagnosePageProps {
  initialResult?: PredictionResponse | null;
  onOpenCropRecommendation?: (suggestedCrop?: string) => void;
}
function getRotationCropForDiagnosis(predictedClass?: string, userCrop?: string): string {
  if (userCrop && userCrop.trim()) {
    const c = userCrop.toLowerCase();
    if (c.includes('corn') || c.includes('maize')) return 'maize';
    if (c.includes('rice')) return 'rice';
    if (c.includes('wheat')) return 'wheat';
    if (c.includes('potato')) return 'wheat';
    if (c.includes('tomato')) return 'rice';
  }
  if (!predictedClass) return 'wheat';
  const lower = predictedClass.toLowerCase();
  if (lower.includes('potato')) return 'wheat';
  if (lower.includes('corn')) return 'maize';
  if (lower.includes('tomato')) return 'rice';
  return 'wheat';
}


export function DiagnosePage({ initialResult = null, onOpenCropRecommendation }: DiagnosePageProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropType, setCropType] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [isModelUnavailable, setIsModelUnavailable] = useState<boolean>(false);
  const [predictionResult, setPredictionResult] = useState<PredictionResponse | null>(initialResult);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const validateFile = (file: File): { isValid: boolean; error?: string } => {
    if (!file) {
      return { isValid: false, error: 'Please select an image file.' };
    }
    if (!file.type.startsWith('image/') || !ALLOWED_MIME_TYPES.includes(file.type)) {
      return {
        isValid: false,
        error: 'Please select a valid image file (JPG, PNG, or WebP).',
      };
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return {
        isValid: false,
        error: 'Image size exceeds the 10 MB limit. Please select a smaller photo.',
      };
    }
    return { isValid: true };
  };

  const processFile = (file: File) => {
    setValidationError(null);
    setApiError(null);
    const { isValid, error } = validateFile(file);

    if (!isValid) {
      setValidationError(error ?? 'Invalid file selected.');
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
      setSelectedFile(null);
      setPreviewUrl(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleFileInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isPredicting) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (isPredicting) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setSelectedFile(null);
    setPreviewUrl(null);
    setValidationError(null);
    setApiError(null);
    setIsPredicting(false);
    setIsModelUnavailable(false);
    setPredictionResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChangeImageClick = () => {
    if (isPredicting) return;
    fileInputRef.current?.click();
  };

  const handlePredict = async () => {
    if (!selectedFile || isPredicting) return;
    setValidationError(null);
    setApiError(null);
    setIsPredicting(true);

    try {
      const result = await predictDisease(selectedFile);
      setPredictionResult(result);
      setIsModelUnavailable(false);
      setApiError(null);
    } catch (err: unknown) {
      const status =
        err instanceof ApiError || (typeof err === 'object' && err !== null && 'status' in err)
          ? (err as { status: number }).status
          : 0;

      if (status === 503) {
        setIsModelUnavailable(true);
        setPredictionResult(null);
        setApiError(null);
      } else if (status === 400) {
        const message =
          err instanceof Error && err.message
            ? err.message
            : 'Invalid image file or parameters. Please try again with a valid crop photo.';
        setApiError(message);
        setIsModelUnavailable(false);
        setPredictionResult(null);
      } else {
        setApiError('Unable to process diagnosis due to a server error. Please try again in a few moments.');
        setIsModelUnavailable(false);
        setPredictionResult(null);
      }
    } finally {
      setIsPredicting(false);
    }
  };

  return (
    <main id="diagnose" aria-label="Plant disease diagnosis" className="flex-1 relative bg-mesh-agri overflow-hidden">

      {/* ── Hero & Diagnosis Console ── */}
      <section className="relative pt-12 pb-16 sm:pt-16 sm:pb-20">
        <div className="mx-auto w-full max-w-2xl px-4 sm:px-6 flex flex-col items-center text-center">

          {/* Main Hero Heading */}
          <h1
            aria-label="AgriSmart AI — Plant Disease Diagnosis"
            className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 mb-3 text-center leading-tight"
          >
            AgriSmart <span className="text-emerald-600">AI</span>
          </h1>

          {/* Subtitle / Description */}
          <p className="text-center text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-md sm:max-w-lg mb-8 sm:mb-10">
            Upload a crop or leaf image to detect disease and get AI-powered insights.
          </p>

          {/* Hidden File Input for Keyboard/Screen-reader accessibility */}
          <input
            ref={fileInputRef}
            id="leaf-image-upload"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            aria-label="Upload crop or leaf image"
            onChange={handleFileInputChange}
            disabled={isPredicting}
          />

          {/* ── Upload & Diagnosis Card ── */}
          <div
            className="w-full rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-[0_4px_25px_rgba(15,23,42,0.04)] transition-all text-left"
            role="region"
            aria-label="Diagnosis workbench"
          >
            {/* Validation Error Banner */}
            {validationError && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50/90 p-4 text-left text-sm text-amber-900 shadow-xs"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <div>
                  <strong className="font-semibold text-amber-950">Image Validation Alert</strong>
                  <p className="mt-0.5 text-amber-800">{validationError}</p>
                </div>
              </div>
            )}

            {/* API Error Banner */}
            {apiError && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-6 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50/90 p-4 text-left text-sm text-red-900 shadow-xs"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden="true" />
                <div className="flex-1">
                  <strong className="font-semibold text-red-950">Diagnosis Request Issue</strong>
                  <p className="mt-0.5 text-red-800">{apiError}</p>
                </div>
              </div>
            )}

            {/* State A: Diagnosis Result Display */}
            {predictionResult ? (
              <DiagnosisResult
                result={predictionResult}
                imagePreviewUrl={previewUrl}
                fileName={selectedFile?.name}
                cropType={cropType}
                onReset={handleRemove}
                onPlanRotation={() => {
                  const crop = getRotationCropForDiagnosis(predictionResult?.predicted_class, cropType);
                  onOpenCropRecommendation?.(crop);
                }}
              />
            ) : isModelUnavailable ? (
              /* State B: Model Unavailable Notice */
              <ModelUnavailable
                fileName={selectedFile?.name}
                imagePreviewUrl={previewUrl}
                onReset={handleRemove}
              />
            ) : !selectedFile ? (
              /* State C: No file selected -> Clean Mint Dashed Dropzone */
              <div className="space-y-6">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={handleChangeImageClick}
                  className={`group cursor-pointer rounded-2xl border-2 border-dashed p-8 transition-all duration-200 sm:p-10 ${
                    isDragging
                      ? 'border-[#10B981] bg-[#ECFDF5]'
                      : 'border-[#10B981]/60 bg-[#F0FDF4]/50 hover:border-[#10B981] hover:bg-[#ECFDF5]'
                  }`}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleChangeImageClick();
                    }
                  }}
                  aria-label="Click or drag and drop to select a crop leaf image"
                >
                  {/* Upload Icon */}
                  <div
                    className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl text-emerald-600 bg-emerald-100/80 transition-transform group-hover:scale-105"
                    aria-hidden="true"
                  >
                    <Upload size={28} strokeWidth={2.2} />
                  </div>

                  <h3 className="mb-1 text-lg font-bold text-slate-900">
                    Upload Leaf Image
                  </h3>
                  <p className="sr-only">Upload a crop or leaf image</p>
                  <p className="sr-only">Use a clear photo of the affected leaf or crop for better diagnosis.</p>
                  
                  <p className="mb-2 text-sm text-slate-500">
                    Drag & drop or <span className="font-semibold text-emerald-600 group-hover:underline">browse</span>
                  </p>

                  <p className="text-xs font-medium text-slate-400">
                    Supports JPG, JPEG, PNG, WebP (up to 10 MB)
                  </p>

                  {/* Accessible Select Image button */}
                  <Button
                    type="button"
                    variant="primary"
                    className="sr-only"
                    tabIndex={-1}
                  >
                    Select Image
                  </Button>
                </div>

                {/* Bottom Row: Crop Type Selector + Diagnose Button */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-2 text-left">
                  {/* Crop Type Selector */}
                  <div className="flex-1">
                    <label
                      htmlFor="crop-type-select-initial"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Crop Type <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-600">
                        <Leaf size={16} />
                      </div>
                      <select
                        id="crop-type-select-initial"
                        aria-label="Crop Type (Optional)"
                        value={cropType}
                        onChange={(e) => setCropType(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-800 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 hover:border-slate-300 cursor-pointer"
                      >
                        <option value="">Select crop type</option>
                        {CROP_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Diagnose Action Button */}
                  <div className="w-full sm:w-auto">
                    <Button
                      type="button"
                      variant="primary"
                      onClick={handleChangeImageClick}
                      className="w-full sm:w-auto py-2.5 px-6 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      aria-label="Diagnose crop"
                    >
                      <Sparkles size={16} aria-hidden="true" />
                      <span>Diagnose Crop</span>
                      <ArrowRight size={15} aria-hidden="true" />
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* State D: Image Selected -> Preview & Actions */
              <div className="space-y-6 text-left">

                {/* Preview Frame */}
                <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50/60 p-2 sm:p-3">
                  <img
                    src={previewUrl!}
                    alt="Selected crop leaf preview"
                    className="max-h-80 w-full rounded-xl object-contain bg-slate-900/5"
                  />
                </div>

                {/* File Details & Action Buttons */}
                <div className="flex flex-col gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500 font-medium">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleChangeImageClick}
                      disabled={isPredicting}
                      aria-label="Change selected image"
                      className="px-3.5 py-2 text-xs rounded-lg font-medium"
                    >
                      <RefreshCw size={14} aria-hidden="true" />
                      Change
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      onClick={handleRemove}
                      disabled={isPredicting}
                      aria-label="Remove selected image"
                      className="px-3.5 py-2 text-xs rounded-lg font-medium"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                </div>

                {/* Crop Type Selector & Diagnose Action */}
                <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pt-1">
                  <div className="flex-1">
                    <label
                      htmlFor="crop-type-select"
                      className="block text-xs font-semibold text-slate-700 mb-1.5"
                    >
                      Crop Type <span className="text-slate-400 font-normal">(Optional)</span>
                    </label>
                    <div className="relative">
                      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-600">
                        <Leaf size={16} />
                      </div>
                      <select
                        id="crop-type-select"
                        aria-label="Crop Type (Optional)"
                        value={cropType}
                        onChange={(e) => setCropType(e.target.value)}
                        disabled={isPredicting}
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-8 text-sm text-slate-800 transition-colors focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60 cursor-pointer"
                      >
                        <option value="">Select crop (optional)</option>
                        {CROP_OPTIONS.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {!isPredicting && (
                    <div className="w-full sm:w-auto">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={handlePredict}
                        disabled={!selectedFile || isPredicting}
                        aria-label="Predict disease"
                        className="w-full sm:w-auto py-2.5 px-6 text-sm font-semibold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                      >
                        <Sparkles size={16} aria-hidden="true" />
                        <span>Diagnose Crop</span>
                        <ArrowRight size={15} aria-hidden="true" />
                      </Button>
                    </div>
                  )}
                </div>

                {/* Predicting / Loading State Notice */}
                {isPredicting && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-5 text-center shadow-xs"
                  >
                    <div className="flex items-center justify-center gap-2.5 text-emerald-800">
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-600" aria-hidden="true" />
                      <span className="font-semibold text-sm">Analyzing your crop image...</span>
                    </div>
                    <p className="mt-1 text-xs text-emerald-700">
                      Processing visual foliage patterns and evaluating model availability.
                    </p>
                  </div>
                )}

              </div>
            )}

          </div>

        </div>
      </section>

      {/* ── How It Works (Matching Reference Design) ── */}
      <section
        id="how-it-works"
        className="py-8 sm:py-12"
        aria-label="How it works"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div
            className="rounded-3xl border border-emerald-100/90 bg-[#F0FDF4]/70 p-6 sm:p-8 md:p-10 shadow-xs"
          >
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4 relative">
              {HOW_IT_WORKS_STEPS.map((step, idx) => {
                const IconComponent = step.icon;
                return (
                  <div key={step.number} className="relative flex flex-col items-center text-center sm:items-start sm:text-left">
                    {/* Top Row with Number & Icon */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold text-emerald-800 bg-[#D1FAE5]"
                        aria-hidden="true"
                      >
                        {step.number}
                      </span>
                      <span
                        className="flex h-10 w-10 items-center justify-center rounded-full text-emerald-800 bg-[#D1FAE5]"
                        aria-hidden="true"
                      >
                        <IconComponent size={20} strokeWidth={2.2} />
                      </span>
                      
                      {/* Arrow divider for larger screens */}
                      {idx < HOW_IT_WORKS_STEPS.length - 1 && (
                        <ArrowRight
                          size={16}
                          className="hidden lg:block absolute -right-2 top-3.5 text-emerald-600/70"
                          aria-hidden="true"
                        />
                      )}
                    </div>

                    <h3 className="mb-1 text-base font-bold text-[#0F172A]">
                      {step.label}
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-xs">
                      {step.description}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bonus Features Section ── */}
      <BonusFeaturesSection onSelectCropRecommendation={onOpenCropRecommendation} />

      {/* ── Supported Crops Gallery (Matching Reference Design) ── */}
      <section
        id="supported-crops"
        className="py-12 sm:py-16"
        aria-label="Supported crops"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Supported Crops
            </h2>
            <a
              href="#diagnose"
              className="inline-flex items-center gap-1 text-sm font-semibold text-[#059669] hover:underline"
            >
              <span>View All Crops</span>
              <ArrowRight size={14} />
            </a>
          </div>

          {/* 5 Crop Cards Grid */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 sm:gap-4">
            {SUPPORTED_CROPS.map((crop) => (
              <div
                key={crop.name}
                className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                {/* Image Container */}
                <div className="relative h-32 w-full overflow-hidden bg-slate-100 sm:h-36">
                  <img
                    src={crop.image}
                    alt={crop.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                  {/* Subtle Gradient Overlay */}
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"
                    aria-hidden="true"
                  />
                  {/* Crop Label at Bottom Left */}
                  <div className="absolute bottom-2.5 left-2.5 text-left">
                    <span className="block text-sm font-bold text-white drop-shadow-xs">
                      {crop.name}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Model Info Section ── */}
      <section
        id="model-info"
        className="pb-16 sm:pb-20"
        aria-label="Model information"
      >
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{ backgroundColor: '#ECFDF5', color: '#059669' }}
                aria-hidden="true"
              >
                <ShieldCheck size={26} strokeWidth={2.2} />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Evidence-Based Crop Health Intelligence
                </h3>
                <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  AgriSmart AI processes leaf foliage imagery to detect plant pathology and assist farmers and agronomists with actionable guidance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}

