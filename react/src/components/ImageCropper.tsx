import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, makeAspectCrop, PixelCrop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { XIcon, CheckIcon, RotateCcwIcon } from 'lucide-react';

interface CropRatioOption {
  label: string;
  value?: number;
}

interface ImageCropperProps {
  imageSrc: string;
  onComplete: (croppedImage: string) => void;
  onCancel: () => void;
  aspectRatio?: number;
  ratioOptions?: CropRatioOption[];
}

const DEFAULT_RATIO_OPTIONS: CropRatioOption[] = [
  { label: '自由', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '3:4', value: 3 / 4 },
  { label: '16:9', value: 16 / 9 },
  { label: '9:16', value: 9 / 16 },
];

const ImageCropper: React.FC<ImageCropperProps> = ({ 
  imageSrc, 
  onComplete, 
  onCancel,
  aspectRatio = 4 / 3,
  ratioOptions = DEFAULT_RATIO_OPTIONS,
}) => {
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<number | undefined>(aspectRatio);
  const [crop, setCrop] = useState<Crop>({
    unit: '%',
    width: 80,
    height: 60,
    x: 10,
    y: 20,
  });
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const createCrop = useCallback((ratio?: number) => {
    const img = imgRef.current;
    if (!img) return;

    if (!ratio) {
      setCrop({
        unit: '%',
        width: 90,
        height: 90,
        x: 5,
        y: 5,
      });
      setCompletedCrop(null);
      return;
    }

    const aspect = img.naturalWidth / img.naturalHeight;
    const newCrop = makeAspectCrop(
      {
        unit: '%',
        width: Math.min(90, aspect > ratio ? 90 : (90 * ratio) / aspect),
        height: Math.min(90, aspect < ratio ? 90 : (90 * aspect) / ratio),
        x: 5,
        y: 5,
      },
      ratio,
      img.naturalWidth,
      img.naturalHeight
    );

    setCrop(newCrop);
    setCompletedCrop(null);
  }, []);

  const handleAspectRatioChange = (ratio?: number) => {
    setSelectedAspectRatio(ratio);
    createCrop(ratio);
  };

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
    setSelectedAspectRatio(aspectRatio);
    createCrop(aspectRatio);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 p-3 sm:p-4">
      <div className="flex min-h-full items-center justify-center">
        <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)]">
          <div className="flex items-center justify-between px-4 py-3 border-b sm:px-6 sm:py-4" style={{ background: '#fdf6f0' }}>
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

          <div className="relative flex-1 overflow-y-auto">
            <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b sm:px-6" style={{ background: '#fffaf6' }}>
              <span className="text-xs font-semibold tracking-wider uppercase" style={{ color: '#8b7355' }}>
                裁切比例
              </span>
              {ratioOptions.map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => handleAspectRatioChange(option.value)}
                  className="px-3 py-1.5 rounded-full text-xs transition-colors"
                  style={{
                    background: selectedAspectRatio === option.value ? '#c4788a' : '#f4e6da',
                    color: selectedAspectRatio === option.value ? '#fff' : '#8b7355'
                  }}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <div className="p-3 sm:p-4" style={{ background: '#1a1a1a' }}>
              <ReactCrop
                crop={crop}
                onChange={(c) => setCrop(c)}
                onComplete={handleCropComplete}
                aspect={selectedAspectRatio}
                style={{ background: '#1a1a1a' }}
              >
                <img
                  ref={imgRef}
                  src={imageSrc}
                  alt="裁剪预览"
                  className="max-h-[45vh] w-full object-contain sm:max-h-[50vh]"
                  onLoad={() => {
                    setSelectedAspectRatio(aspectRatio);
                    createCrop(aspectRatio);
                  }}
                />
              </ReactCrop>
            </div>
          </div>

          <div
            className="sticky bottom-0 z-10 mt-auto flex flex-col gap-3 border-t px-4 py-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4"
            style={{ background: 'rgba(253, 246, 240, 0.98)', backdropFilter: 'blur(6px)' }}
          >
            <button
              onClick={handleReset}
              className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 transition-colors hover:bg-gray-100 sm:justify-start"
              style={{ color: '#8b7355' }}
            >
              <RotateCcwIcon className="w-4 h-4" />
              重置
            </button>
            <div className="flex flex-col gap-2 sm:flex-row">
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
                className="flex items-center justify-center gap-2 rounded-lg px-4 py-2 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                style={{ background: '#c4788a', color: 'white' }}
              >
                <CheckIcon className="w-4 h-4" />
                确认裁剪
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageCropper;
