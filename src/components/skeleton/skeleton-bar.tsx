const SkeletonBar = ({ className }: { className?: string }): JSX.Element => {
  return (
    <div
      className={`before:animate-shimmer relative overflow-hidden rounded-full bg-neutral-200 before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent before:bg-[length:200%_100%] ${className} `}
    />
  );
};

export default SkeletonBar;
