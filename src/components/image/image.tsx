import React from 'react';

// ----------------------------------------------------------------------

export interface ImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
}

// ----------------------------------------------------------------------

const Image: React.FC<ImageProps> = ({ src, alt, ...props }) => {
  return <img src={src} alt={alt} loading="lazy" {...props} />;
};

export default Image;
