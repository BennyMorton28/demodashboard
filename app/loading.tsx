export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-200 border-t-blue-600"></div>
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Loading BMSD Case Study
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we prepare your experience
          </p>
        </div>
      </div>
    </div>
  );
} 