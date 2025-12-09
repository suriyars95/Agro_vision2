// API Service for communicating with the backend
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface PredictionResult {
  fileReceived: boolean;
  disease: string;
  confidence: number;
  description: string;
  treatment: string;
  severity_status: string;
  medicines?: string[];
  error?: string;
  details?: string;
}

/**
 * Upload an image to the backend for disease prediction
 * @param file - The image file to analyze
 * @returns Promise with prediction results
 */
export async function predictDisease(file: File): Promise<PredictionResult> {
  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP Error: ${response.status}`);
    }

    const data: PredictionResult = await response.json();
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

/**
 * Check if the backend is available
 * @returns Promise that resolves if backend is available
 */
export async function checkBackendHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/`, {
      method: 'GET',
    });
    return response.ok;
  } catch (error) {
    console.error('Backend health check failed:', error);
    return false;
  }
}
