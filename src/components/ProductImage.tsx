import React, { useEffect, useState } from 'react';
import { ProductArtwork } from './ProductArtwork.tsx';

interface ProductImageProps {
  name: string;
  category: string;
  skuCode?: string;
  imageUrl?: string;
  compact?: boolean;
  className?: string;
  imgClassName?: string;
}

export const ProductImage: React.FC<ProductImageProps> = ({
  name,
  category,
  skuCode,
  imageUrl,
  compact = false,
  className = 'h-10 w-10 rounded-lg',
  imgClassName = 'h-full w-full object-cover',
}) => {
  const customSrc = imageUrl && imageUrl.trim() ? imageUrl.trim() : null;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [customSrc]);

  return (
    <div className={`shrink-0 overflow-hidden bg-[#EEEAE0] ${className}`}>
      {customSrc && !failed ? (
        <img
          src={customSrc}
          alt={`${name} — ${category}`}
          referrerPolicy="no-referrer"
          loading="lazy"
          onError={() => setFailed(true)}
          className={imgClassName}
        />
      ) : (
        <ProductArtwork
          name={name}
          category={category}
          skuCode={skuCode}
          compact={compact}
          className={imgClassName}
        />
      )}
    </div>
  );
};
