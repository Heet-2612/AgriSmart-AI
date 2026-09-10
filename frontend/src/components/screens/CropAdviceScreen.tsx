import { CropAdvice } from '../../components/CropAdvice';

export const CropAdviceScreen = () => {
  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="bg-white rounded-xl shadow-md p-6">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">Crop Recommendation</h1>
        <p className="text-center text-gray-600 mb-8">
          Get personalized crop recommendations based on your location and soil type.
          Our system analyzes current weather conditions to provide the best advice for your farming needs.
        </p>
        <CropAdvice />
      </div>
    </div>
  );
};
