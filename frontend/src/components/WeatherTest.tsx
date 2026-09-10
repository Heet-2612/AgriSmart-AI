import { useEffect, useState } from 'react';
import { testWeatherAPI } from '@/services/weatherService';

export const WeatherTest = () => {
  const [testResult, setTestResult] = useState<{
    loading: boolean;
    success?: boolean;
    message: string;
  }>({ loading: true, message: 'Testing weather API...' });

  useEffect(() => {
    const testAPI = async () => {
      try {
        const result = await testWeatherAPI();
        setTestResult({
          loading: false,
          success: result.success,
          message: result.message,
        });
      } catch (error) {
        setTestResult({
          loading: false,
          success: false,
          message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        });
      }
    };

    testAPI();
  }, []);

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Weather API Test</h2>

      {testResult.loading ? (
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500 mr-2"></div>
          <span>Testing API connection...</span>
        </div>
      ) : (
        <div className={`p-4 rounded-md ${testResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          <p className="font-medium">
            {testResult.success ? '✅ Success!' : '❌ Error'}
          </p>
          <p className="mt-2">{testResult.message}</p>

          {!testResult.success && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p className="font-medium mb-2">Troubleshooting steps:</p>
              <ol className="list-decimal pl-5 space-y-1 text-sm">
                <li>Check if your API key is set in the <code>.env</code> file as <code>VITE_OPENWEATHER_API_KEY</code></li>
                <li>Make sure you have an active internet connection</li>
                <li>Verify your OpenWeatherMap API key is valid and has access to the One Call API</li>
                <li>Check the browser's developer console (F12) for detailed error messages</li>
              </ol>
            </div>
          )}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-md">
        <p className="font-medium text-blue-800">Debug Information:</p>
        <pre className="mt-2 p-2 bg-white rounded text-xs overflow-auto">
          {JSON.stringify({
            env: {
              VITE_OPENWEATHER_API_KEY: import.meta.env.VITE_OPENWEATHER_API_KEY
                ? '***' + String(import.meta.env.VITE_OPENWEATHER_API_KEY).slice(-4)
                : 'Not found',
              NODE_ENV: import.meta.env.MODE,
            },
            timestamp: new Date().toISOString(),
          }, null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default WeatherTest;
