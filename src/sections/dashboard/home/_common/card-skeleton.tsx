import { twMerge } from 'tailwind-merge';
// components
import { SkeletonBar } from '/src/components/skeleton';

// ----------------------------------------------------------------------

interface CardSkeletonProps {
  className?: string;
}

// ----------------------------------------------------------------------

const CardSkeleton: React.FC<CardSkeletonProps> = ({ className }) => {
  return (
    <div className={twMerge('w-full overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50', className)}>
      {/* Header */}
      <div className="bg-gradient-to-r from-primary-1/10 via-white to-white px-4 py-5 sm:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="w-full max-w-3xl space-y-3">
            <SkeletonBar className="h-7 w-32 rounded-full" />

            <SkeletonBar className="h-7 w-1/2" />

            <SkeletonBar className="h-4 w-full max-w-2xl" />
            <SkeletonBar className="h-4 w-3/4" />
          </div>

          <div className="flex gap-3">
            <SkeletonBar className="h-10 w-28 rounded-xl" />
            <SkeletonBar className="h-10 w-24 rounded-full" />
          </div>
        </div>
      </div>

      <div className="space-y-6 p-4 sm:p-6">
        {/* Score Cards */}
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex min-h-[180px] flex-col justify-between rounded-2xl bg-slate-100 p-4">
              <div className="flex justify-between">
                <div className="space-y-2">
                  <SkeletonBar className="h-4 w-28" />
                  <SkeletonBar className="h-3 w-20" />
                </div>

                <SkeletonBar className="h-7 w-20 rounded-full" />
              </div>

              <div className="flex justify-center">
                <SkeletonBar className="h-16 w-32" />
              </div>

              <SkeletonBar className="h-4 w-32" />
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-5 space-y-2">
            <SkeletonBar className="h-6 w-48" />
            <SkeletonBar className="h-4 w-72" />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {[1, 2].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-4 flex justify-between">
                  <div className="space-y-2">
                    <SkeletonBar className="h-4 w-24" />
                    <SkeletonBar className="h-3 w-32" />
                  </div>

                  <SkeletonBar className="h-3 w-3 rounded-full" />
                </div>

                <div className="rounded-2xl bg-slate-50 p-4">
                  <SkeletonBar className="mb-3 h-3 w-20" />
                  <SkeletonBar className="h-4 w-full" />
                  <SkeletonBar className="mt-2 h-4 w-5/6" />
                  <SkeletonBar className="mt-2 h-4 w-4/6" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart */}
        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
          <div className="mb-5 flex items-center justify-between">
            <div className="space-y-2">
              <SkeletonBar className="h-6 w-44" />
              <SkeletonBar className="h-4 w-64" />
            </div>

            <SkeletonBar className="h-10 w-32 rounded-xl" />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <SkeletonBar className="h-[360px] w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardSkeleton;
