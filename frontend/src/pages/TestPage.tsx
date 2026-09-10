import { WeatherTest } from "@/components/WeatherTest";

export default function TestPage() {
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Weather API Test Page</h1>
      <div className="max-w-lg mx-auto">
        <WeatherTest />
      </div>
    </div>
  );
}
