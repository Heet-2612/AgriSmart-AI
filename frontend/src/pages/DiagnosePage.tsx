import { useState, useRef, ChangeEvent, DragEvent } from 'react';
import { Leaf, Upload, Trash2, RefreshCw, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { Button } from '../components/Button';

/** Maximum allowed image upload size: 10 MB */
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/** Data-driven crop list — extensible without inventing disease classes */
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

interface Step {
  label: string;
  description: string;
}

const HOW_IT_WORKS: Step[] = [
  { label: 'Upload', description: 'Take or select a clear photo of the affected crop leaf.' },
  { label: 'Diagnose', description: 'Our AI model analyses the image against known disease patterns.' },
  { label: 'Understand', description: 'Receive a plain-language explanation of the detected condition.' },
  { label: 'Act', description: 'Follow evidence-based guidance to protect your crop.' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DiagnosePage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [cropType, setCropType] = useState<string>('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isPredicting, setIsPredicting] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setIsPredicting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleChangeImageClick = () => {
    if (isPredicting) return;
    fileInputRef.current?.click();
  };

  const handlePredict = () => {
    if (!selectedFile || isPredicting) return;
    setValidationError(null);
    setIsPredicting(true);
    // ponytail: frontend state boundary for Task 3 API connection; no fake result generated
  };

  return (
    <main id="diagnose" aria-label="Plant disease diagnosis" className="flex-1">

      {/* ── Hero & Diagnosis Console ── */}
      <section
        className="border-b"
        style={{ borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' }}
      >
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16 text-center">

          {/* Badge */}
          <span
            className="mb-4 inline-flex items-center gap-1.5 rounded-full px-3.5 py-1 text-xs font-semibold uppercase tracking-wide"
            style={{ backgroundColor: '#D1FAE5', color: '#065F46' }}
          >
            <Leaf size={14} aria-hidden="true" />
            AI-Powered Crop Health
          </span>

          <h1
            className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl"
            style={{ color: '#0F172A' }}
          >
            Plant Disease Diagnosis
          </h1>

          <p
            className="mx-auto mb-8 max-w-xl text-base leading-relaxed sm:text-lg"
            style={{ color: '#475569' }}
          >
            Upload a crop or leaf image to identify possible plant health
            issues instantly — so you can take action before it spreads.
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
            className="mx-auto max-w-xl rounded-2xl border bg-white p-6 shadow-sm sm:p-8"
            style={{ borderColor: '#E2E8F0' }}
            role="region"
            aria-label="Diagnosis workbench"
          >
            {/* Validation Error Banner */}
            {validationError && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-6 flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-left text-sm text-amber-900"
              >
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
                <div>
                  <strong className="font-semibold text-amber-950">Image Validation Alert</strong>
                  <p className="mt-0.5 text-amber-800">{validationError}</p>
                </div>
              </div>
            )}

            {/* State 1: No file selected -> Upload Dropzone */}
            {!selectedFile && (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleChangeImageClick}
                className={`group cursor-pointer rounded-xl border-2 border-dashed p-8 transition-colors sm:p-10 ${
                  isDragging
                    ? 'border-[#10B981] bg-[#ECFDF5]'
                    : 'border-slate-300 bg-slate-50/50 hover:border-[#10B981] hover:bg-slate-50'
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
                <div
                  className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full transition-transform group-hover:scale-105"
                  style={{ backgroundColor: '#D1FAE5' }}
                  aria-hidden="true"
                >
                  <Upload size={28} style={{ color: '#10B981' }} strokeWidth={2} />
                </div>

                <p className="mb-1 text-base font-semibold" style={{ color: '#0F172A' }}>
                  Upload a crop or leaf image
                </p>
                <p className="mx-auto mb-5 max-w-sm text-sm" style={{ color: '#64748B' }}>
                  Use a clear photo of the affected leaf or crop for better diagnosis.
                </p>

                <Button
                  type="button"
                  variant="primary"
                  className="pointer-events-none w-full sm:w-auto"
                >
                  <Upload size={16} aria-hidden="true" />
                  Select Image
                </Button>

                <p className="mt-4 text-xs font-medium" style={{ color: '#94A3B8' }}>
                  Supported formats: JPG, PNG, WebP — max 10 MB
                </p>
              </div>
            )}

            {/* State 2: Image selected -> Preview & Controls */}
            {selectedFile && previewUrl && (
              <div className="space-y-6 text-left">

                {/* Preview Frame */}
                <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-900/5 p-2">
                  <img
                    src={previewUrl}
                    alt="Selected crop leaf preview"
                    className="max-h-72 w-full rounded-lg object-contain"
                  />
                </div>

                {/* File Details & Action Buttons */}
                <div className="flex flex-col gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800" title={selectedFile.name}>
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-slate-500">
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
                      className="px-3 py-2 text-xs"
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
                      className="px-3 py-2 text-xs"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                      Remove
                    </Button>
                  </div>
                </div>

                {/* Optional Crop Type Selector */}
                <div>
                  <label
                    htmlFor="crop-type-select"
                    className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-1.5"
                  >
                    Crop Type (Optional)
                  </label>
                  <select
                    id="crop-type-select"
                    value={cropType}
                    onChange={(e) => setCropType(e.target.value)}
                    disabled={isPredicting}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-800 transition-colors focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"
                  >
                    <option value="">Select crop (optional)</option>
                    {CROP_OPTIONS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-slate-500">
                    Providing crop context helps refine future diagnosis models.
                  </p>
                </div>

                {/* Predicting / Loading State Notice */}
                {isPredicting && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center"
                  >
                    <div className="flex items-center justify-center gap-2.5 text-emerald-800">
                      <Loader2 className="h-5 w-5 animate-spin text-[#10B981]" aria-hidden="true" />
                      <span className="font-semibold">Analyzing your crop image...</span>
                    </div>
                    <p className="mt-1 text-xs text-emerald-700">
                      Processing visual patterns. API integration will connect in the next phase.
                    </p>
                  </div>
                )}

                {/* Predict CTA Button */}
                {!isPredicting && (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={handlePredict}
                    disabled={!selectedFile || isPredicting}
                    className="w-full py-3.5 text-base shadow-sm"
                  >
                    <Sparkles size={18} aria-hidden="true" />
                    Predict Disease
                  </Button>
                )}

              </div>
            )}

          </div>

        </div>
      </section>

      {/* ── How it works ── */}
      <section
        className="border-b"
        style={{ borderColor: '#E2E8F0' }}
        aria-label="How it works"
      >
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2
            className="mb-8 text-center text-sm font-semibold uppercase tracking-widest"
            style={{ color: '#94A3B8' }}
          >
            How it works
          </h2>

          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4" role="list">
            {HOW_IT_WORKS.map((step, i) => (
              <li
                key={step.label}
                className="relative rounded-xl border p-5 transition-shadow hover:shadow-xs"
                style={{ borderColor: '#E2E8F0', backgroundColor: '#FFFFFF' }}
              >
                <span
                  className="mb-3 flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold text-white"
                  style={{ backgroundColor: '#10B981' }}
                  aria-hidden="true"
                >
                  {i + 1}
                </span>
                <h3 className="mb-1 text-sm font-semibold" style={{ color: '#0F172A' }}>
                  {step.label}
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748B' }}>
                  {step.description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

    </main>
  );
}

