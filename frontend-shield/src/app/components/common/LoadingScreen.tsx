// src/components/common/LoadingScreen.tsx
export const LoadingScreen = () => {
    return (
      <div className="fixed inset-0 bg-white flex items-center justify-center">
        <div className="space-y-4 text-center">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }