import React, { useState, useRef, useCallback, useEffect } from 'react';
import ReactCrop, { Crop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { XIcon, CheckIcon, RotateCcwIcon } from 'lucide-react';

interface ImageCropperProps {
  imageSrc: string;
  onComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
}

const ImageCropper: React.FC<ImageCropperProps> = ({ 
  imageSrc, 
  onComplete, 
  onCancel,
  aspectRatio = 4 / 3 
}) => {
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 60,
    x: 10,
    y: 20,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    if (imgRef.current) {
      const img = imgRef.current;
      const aspect = img.naturalWidth / img.naturalHeight;
      const newCrop = makeAspectCrop(
        {
          unit: '%',
          width: Math.min(90, aspect > aspectRatio ? 90 : (90 * aspectRatio) / aspect),
          height: Math.min(90, aspect < aspectRatio ? 90 : (90 * aspect) / aspectRatio),
          x: 5,
          y: 5,
        },
        aspectRatio,
        img.naturalWidth,
        img.naturalHeight
      );
      setCrop(newCrop);
    }
  }, [imageSrc, aspectRatio]);

  const getCroppedImg = useCallback(
    (image: HTMLImageElement, pixelCrop: PixelCrop) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('No 2d context');
      }

      const scaleX = image.naturalWidth / image.width;
      const scaleY = image.naturalHeight / image.height;

      canvas.width = pixelCrop.width * scaleX;
      canvas.height = pixelCrop.height * scaleY;

      ctx.drawImage(
        image,
        pixelCrop.x * scaleX,
        pixelCrop.y * scaleY,
        pixelCrop.width * scaleX,
        pixelCrop.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height
      );

      return canvas.toDataURL('image/jpeg', 0.9);
    },
    []
  );

  const handleCropComplete = (c: PixelCrop) => {
    setCompletedCrop(c);
  };

  const handleConfirm = () => {
    if (completedCrop && imgRef.current) {
      const croppedImage = getCroppedImg(imgRef.current, completedCrop);
      onComplete(croppedImage);
    }
  };

  const handleReset = () => {
    setCrop({
      unit: '%',
      width: 80,
      height: 60,
      x: 10,
      y: 20,
    });
    setCompletedCrop(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-2xl mx-4 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ background: '#fdf6f0' }}>
          <h3 className="text-lg font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#2c1810' }}>
            裁剪图片
          </h3>
          <button
            onClick={onCancel}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="relative">
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={handleCropComplete}
            aspect={aspectRatio}
            style={{ background: '#1a1a1a' }}
          >
            <img
              ref={imgRef}
              src={imageSrc}
              alt="裁剪预览"
              className="max-h-[60vh] w-full object-contain"
            />
          </ReactCrop>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t" style={{ background: '#fdf6f0' }}>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
            style={{ color: '#8b7355' }}
          >
            <RotateCcwIcon className="w-4 h-4" />
            重置
          </button>
          <div className="flex gap-2">
            <button
              onClick={onCancel}
              className="px-4 py-2 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: '#8b7355' }}
            >
              取消
            </button>
            <button
              onClick={handleConfirm}
              disabled={!completedCrop}
              className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: '#c4788a', color: 'white' }}
            >
              <CheckIcon className="w-4 h-4" />
              确认裁剪
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
