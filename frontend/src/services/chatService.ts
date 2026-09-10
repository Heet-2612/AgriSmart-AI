// Base URL for API requests - the proxy will forward these to the backend
const API_BASE_URL = '/api';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const sendChatMessage = async (message: string): Promise<string> => {
  try {
    const response = await fetch(`${API_BASE_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: message }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to send message');
    }
    
    const data = await response.json();
    return data.response || "I'm sorry, I couldn't process your request.";
  } catch (error) {
    console.error('Error sending chat message:', error);
    return "I'm having trouble connecting to the server. Please try again later.";
  }
};

export const checkBackendHealth = async (): Promise<{ status: 'ok' | 'error'; message: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      return { status: 'ok', message: 'Backend is running and healthy' };
    }
    return {
      status: 'error',
      message: `Backend returned status ${response.status}: ${await response.text()}`
    };
  } catch (error) {
    return {
      status: 'error',
      message: `Failed to connect to backend at ${API_BASE_URL}: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

export const getCropRecommendation = async (city: string, soilType: string) => {
  try {
    // First check backend health
    const health = await checkBackendHealth();
    if (health.status === 'error') {
      return {
        error: 'Backend service is unavailable',
        details: health.message,
        status: 'backend_error'
      };
    }

    const params = new URLSearchParams({
      city: city,
      soil: soilType
    });
    const apiUrl = `${API_BASE_URL}/recommend?${params}`;

    console.log('Making request to:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      credentials: 'include' // Important for CORS with credentials
    });

    const responseText = await response.text();
    console.log('Response status:', response.status);
    
    let responseData;
    try {
      responseData = JSON.parse(responseText);
      console.log('Parsed response data:', responseData);
    } catch (e) {
      console.error('Failed to parse response as JSON:', responseText);
      return {
        error: 'Invalid response format from server',
        details: responseText,
        status: 'parse_error'
      };
    }

    if (!response.ok) {
      const errorMessage = responseData?.error || responseData?.message || 
                         `Request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    // Handle different response formats
    if (Array.isArray(responseData)) {
      // If response is directly an array of recommendations
      return responseData;
    } else if (responseData.recommendations) {
      // If response has a recommendations array
      return responseData.recommendations;
    } else if (responseData.crop) {
      // If it's a single recommendation object
      return [responseData];
    }
    
    // If we can't determine the format, return as is and let the component handle it
    return responseData;
  } catch (error) {
    console.error('Error in getCropRecommendation:', error);
    return {
      error: error instanceof Error ? error.message : 'Failed to get crop recommendation',
      details: error instanceof Error ? error.stack : String(error),
      status: 'request_error'
    };
  }
};
