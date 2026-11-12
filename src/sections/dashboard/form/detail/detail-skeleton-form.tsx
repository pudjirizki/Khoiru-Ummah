import React from 'react';

// ----------------------------------------------------------------------

const SkeletonBox = ({ className = '' }: { className?: string }) => {
  return <div className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
};

// ----------------------------------------------------------------------

const DetailSkeletonForm: React.FC = () => {
  return (
    <div className="mt-6 space-y-4 font-poppins">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6 lg:p-7">
        <div className="space-y-4">
          <SkeletonBox className="h-3 w-32" />

          <SkeletonBox className="h-8 w-3/4 sm:h-10" />

          <SkeletonBox className="h-4 w-full max-w-2xl" />

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <SkeletonBox className="h-3 w-20" />

                <SkeletonBox className="mt-3 h-7 w-12" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {Array.from({ length: 3 }).map((_, criteriaIndex) => (
        <div key={criteriaIndex} className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-3">
                <SkeletonBox className="h-3 w-24" />

                <SkeletonBox className="h-6 w-64" />
              </div>

              <SkeletonBox className="h-7 w-28 rounded-full" />
            </div>
          </div>

          <div className="space-y-4 p-4 sm:p-6">
            {Array.from({ length: 2 }).map((_, questionIndex) => (
              <div key={questionIndex} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:p-5">
                <SkeletonBox className="h-3 w-24" />

                <SkeletonBox className="mt-3 h-5 w-full" />
                <SkeletonBox className="mt-2 h-5 w-4/5" />

                <SkeletonBox className="mt-5 h-3 w-full rounded-full" />

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="flex justify-between">
                        <SkeletonBox className="h-6 w-12 rounded-full" />

                        <SkeletonBox className="h-5 w-8" />
                      </div>

                      <SkeletonBox className="mt-3 h-3 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default DetailSkeletonForm;
