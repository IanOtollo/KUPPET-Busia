"use client";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F6F3] text-[#101A24] flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-[480px] text-center">
          <h1 className="text-[28px] font-bold mb-4">Critical System Error</h1>
          <p className="text-[15px] text-[#66727F] mb-6">
            A critical application error prevented loading. Please try reloading the page.
          </p>
          <button
            onClick={() => reset()}
            className="px-5 py-2.5 bg-[#1F3D5C] text-white font-medium rounded-[6px] hover:bg-[#17304A] cursor-pointer"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}

