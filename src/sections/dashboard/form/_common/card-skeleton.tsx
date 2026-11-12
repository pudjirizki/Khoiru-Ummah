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
    <div
      className={twMerge(
        `relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-primary-1/5 p-6 shadow-[0_10px_30px_rgba(15,23,42,0.06)]`,
        className
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-1 via-green-400 to-emerald-500" />

      <div className="flex min-h-[250px] flex-col justify-between">
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-2xl bg-slate-200" />

          <div className="flex flex-1 flex-col gap-3">
            <SkeletonBar className="h-3 w-24 rounded-full" />

            <SkeletonBar className="h-6 w-3/4 rounded-lg" />

            <SkeletonBar className="h-4 w-full rounded-lg" />
            <SkeletonBar className="h-4 w-5/6 rounded-lg" />

            <div className="mt-1 flex gap-2">
              <SkeletonBar className="h-7 w-24 rounded-full" />
              <SkeletonBar className="h-7 w-20 rounded-full" />
            </div>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <div className="flex items-center justify-between">
            <SkeletonBar className="h-10 w-32 rounded-xl" />

            <div className="flex gap-2">
              <SkeletonBar className="h-10 w-10 rounded-xl" />
              <SkeletonBar className="h-10 w-10 rounded-xl" />
              <SkeletonBar className="h-10 w-10 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardSkeleton;
