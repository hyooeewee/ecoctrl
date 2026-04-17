import React from 'react';

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className, size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Isometric Cube Shape based on user image */}
      <path
        d="M50 5L90 25V75L50 95L10 75V25L50 5Z"
        fill="currentColor"
        fillOpacity="0.2"
      />
      <path
        d="M50 5L90 25L50 45L10 25L50 5Z"
        fill="currentColor"
      />
      <path
        d="M10 25L50 45V95L10 75V25Z"
        fill="currentColor"
        fillOpacity="0.8"
      />
      <path
        d="M90 25L50 45V95L90 75V25Z"
        fill="currentColor"
        fillOpacity="0.6"
      />
      {/* Inner detailing mimicking the "E" and "2" patterns or structure */}
      <path
        d="M25 40V75L45 85V50L25 40Z"
        fill="white"
        fillOpacity="0.4"
      />
      <path
        d="M75 40V75L55 85V50L75 40Z"
        fill="white"
        fillOpacity="0.2"
      />
    </svg>
  );
};
