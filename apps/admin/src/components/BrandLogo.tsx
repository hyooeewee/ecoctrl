import React from "react";
import logoUrl from "../assets/logo.png";

interface BrandLogoProps {
  className?: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ className, size = 24 }) => {
  return <img src={logoUrl} alt="EcoCtrl" width={size} height={size} className={className} />;
};
