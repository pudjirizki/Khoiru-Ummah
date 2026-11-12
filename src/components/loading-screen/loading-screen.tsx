import React from 'react';
//
import './loading-screen.css';

// ----------------------------------------------------------------------

const LoadingScreen: React.FC = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <div className="w-[300px] md:w-[500px]">
        <span className="loader" />
      </div>
    </div>
  );
};

export default LoadingScreen;
