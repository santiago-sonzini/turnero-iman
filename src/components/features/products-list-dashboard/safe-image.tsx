"use client";

import Image from "next/image";
import { useState } from "react";
import { Package } from "lucide-react";

interface SafeImageProps {
  src: string | undefined;
  alt: string;
  className?: string;
  fill?: boolean;
  quality?: number;
}


export const SafeImage = ({ src, alt, className, fill, quality }: SafeImageProps) => {
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`flex items-center justify-center bg-white ${className}`}>
        <Package className="w-10 h-10 text-muted-foreground" />
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      unoptimized
      quality={quality ?? 30}
      height={200}
      width={200}
      style={{ objectFit: "contain", maxHeight: "100%", maxWidth: "100%", height: "auto", width: "auto" }}
    />
  );
};