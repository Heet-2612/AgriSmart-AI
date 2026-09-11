import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import App from '../App';

describe('AgriSmart AI — Task 2 Upload & Diagnose Workflow', () => {
  it('renders the application shell with branding, header, and footer', () => {
    render(<App />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByLabelText(/agrismart ai — home/i)).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: /plant disease diagnosis/i, level: 1 })
    ).toBeInTheDocument();
    const footer = screen.getByRole('contentinfo');
    expect(footer).toBeInTheDocument();
    expect(footer.textContent).toMatch(/agrismart ai/i);
  });

  it('renders empty initial upload state with clear farmer-friendly instructions', () => {
    render(<App />);
    expect(screen.getByText('Upload a crop or leaf image')).toBeInTheDocument();
    expect(
      screen.getByText(/use a clear photo of the affected leaf or crop for better diagnosis/i)
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText(/upload crop or leaf image/i)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /select image/i })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /predict disease/i })
    ).not.toBeInTheDocument();
  });

  it('accepts a valid image file and displays image preview, filename, and action controls', () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/upload crop or leaf image/i) as HTMLInputElement;

    const testFile = new File(['fake-image-bytes'], 'leaf_healthy.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    expect(screen.getByAltText(/selected crop leaf preview/i)).toBeInTheDocument();
    expect(screen.getByText('leaf_healthy.jpg')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /change selected image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /remove selected image/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /predict disease/i })).toBeEnabled();
  });

  it('rejects unsupported non-image file with a friendly validation error', () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/upload crop or leaf image/i) as HTMLInputElement;

    const invalidFile = new File(['document content'], 'notes.pdf', { type: 'application/pdf' });
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(
      screen.getByText(/please select a valid image file \(jpg, png, or webp\)/i)
    ).toBeInTheDocument();
    expect(screen.queryByAltText(/selected crop leaf preview/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /predict disease/i })).not.toBeInTheDocument();
  });

  it('rejects oversized files exceeding 10 MB with clear feedback', () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/upload crop or leaf image/i) as HTMLInputElement;

    const largeFile = new File(['x'.repeat(100)], 'huge_photo.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 11 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/image size exceeds the 10 mb limit/i)).toBeInTheDocument();
    expect(screen.queryByAltText(/selected crop leaf preview/i)).not.toBeInTheDocument();
  });

  it('resets form to initial empty state when Remove button is clicked', () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/upload crop or leaf image/i) as HTMLInputElement;

    const testFile = new File(['leaf-data'], 'tomato_leaf.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    expect(screen.getByText('tomato_leaf.png')).toBeInTheDocument();

    const removeBtn = screen.getByRole('button', { name: /remove selected image/i });
    fireEvent.click(removeBtn);

    expect(screen.queryByText('tomato_leaf.png')).not.toBeInTheDocument();
    expect(screen.queryByAltText(/selected crop leaf preview/i)).not.toBeInTheDocument();
    expect(screen.getByText('Upload a crop or leaf image')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /select image/i })).toBeInTheDocument();
  });

  it('supports selecting an optional crop type', () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/upload crop or leaf image/i) as HTMLInputElement;

    const testFile = new File(['leaf-data'], 'corn_leaf.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    const cropSelect = screen.getByLabelText(/crop type \(optional\)/i) as HTMLSelectElement;
    expect(cropSelect.value).toBe('');

    fireEvent.change(cropSelect, { target: { value: 'Corn (Maize)' } });
    expect(cropSelect.value).toBe('Corn (Maize)');
  });

  it('enters predicting/loading state on Predict click and prevents duplicate submissions without faking diagnosis', () => {
    render(<App />);
    const fileInput = screen.getByLabelText(/upload crop or leaf image/i) as HTMLInputElement;

    const testFile = new File(['leaf-data'], 'potato_blight.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    const predictBtn = screen.getByRole('button', { name: /predict disease/i });
    expect(predictBtn).toBeEnabled();

    fireEvent.click(predictBtn);

    // Predict status banner is shown
    expect(screen.getByRole('status')).toBeInTheDocument();
    expect(screen.getByText(/analyzing your crop image\.\.\./i)).toBeInTheDocument();

    // Predict button is removed/disabled while predicting
    expect(screen.queryByRole('button', { name: /predict disease/i })).not.toBeInTheDocument();

    // Inputs/controls are disabled
    expect(screen.getByRole('button', { name: /change selected image/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /remove selected image/i })).toBeDisabled();

    // Confirms NO fake diagnosis classes or results are rendered
    expect(screen.queryByText(/diagnostic result/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/confidence/i)).not.toBeInTheDocument();
  });

  it('supports drag-and-drop file upload', () => {
    render(<App />);
    const dropzone = screen.getByLabelText(/click or drag and drop to select a crop leaf image/i);

    // Drag over activates highlighted state
    fireEvent.dragOver(dropzone);
    expect(dropzone.className).toContain('border-[#10B981]');

    // Drop valid image
    const file = new File(['dropped-data'], 'dropped_leaf.webp', { type: 'image/webp' });
    fireEvent.drop(dropzone, {
      dataTransfer: {
        files: [file],
      },
    });

    expect(screen.getByText('dropped_leaf.webp')).toBeInTheDocument();
    expect(screen.getByAltText(/selected crop leaf preview/i)).toBeInTheDocument();
  });

  it('transitions to model unavailable notice and allows resetting back to upload', () => {
    vi.useFakeTimers();
    render(<App />);
    const fileInput = screen.getByLabelText(/upload crop or leaf image/i) as HTMLInputElement;

    const testFile = new File(['leaf-data'], 'rice_leaf.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [testFile] } });

    const predictBtn = screen.getByRole('button', { name: /predict disease/i });
    fireEvent.click(predictBtn);

    // Initial predicting state
    expect(screen.getByText(/analyzing your crop image\.\.\./i)).toBeInTheDocument();

    // Advance timer past boundary inside act
    act(() => {
      vi.advanceTimersByTime(500);
    });

    // Model unavailable notice rendered
    expect(screen.getByText(/prediction model unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/diagnostic service is currently offline/i)).toBeInTheDocument();

    // Resetting returns to empty upload dropzone
    const resetBtn = screen.getByRole('button', { name: /try another image/i });
    fireEvent.click(resetBtn);

    expect(screen.getByText('Upload a crop or leaf image')).toBeInTheDocument();
    vi.useRealTimers();
  });
});

