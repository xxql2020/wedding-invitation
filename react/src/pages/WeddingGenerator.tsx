import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Heart, Calendar, MapPin, Phone, Download, Sparkles, Clock, User, Upload, X, Share2, Link, Image, Check, Copy, Save, QrCode, RefreshCw, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Type, Layout, AudioLines } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import ImageCropper from '../components/ImageCropper';
import { AnimatedSticker, getStickerFrameSize, StickerVisualStyles, type StickerVisualType } from '../components/AnimatedSticker';
import { QRCodeCanvas } from 'qrcode.react';
import { createInvitationInCloud, isSupabaseConfigured, uploadAudioDataUrlToCloud, uploadAudioFileToCloud, uploadImageDataUrlToCloud } from '../lib/weddingCloud';

export interface PageModule {
  id: string;
  type: 'cover' | 'gallery' | 'story' | 'quote' | 'photo';
  title: string;
  content?: string;
  image?: string;
  images?: string[];
  font?: string;
  backgroundColor?: string;
  aspectRatio?: string;
  galleryMode?: 'carousel' | 'grid';
}

export interface WeddingInfo {
  groomName: string;
  brideName: string;
  weddingDate: string;
  weddingTime: string;
  ceremonyVenue: string;
  banquetVenue: string;
  ceremonyLat: number;
  ceremonyLng: number;
  banquetLat: number;
  banquetLng: number;
  message: string;
  coverImage: string;
  galleryImages: string[];
  pages: PageModule[];
  defaultFont: string;
  bgMusic: string;
  bgMusicName: string;
  petalsEnabled: boolean;
  customColor: string;
  stickers: StickerItem[];
}

type StickerType = StickerVisualType;

interface StickerItem {
  id: string;
  type: StickerType;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

interface SharePayload {
  info: WeddingInfo;
  template: string;
  createdAt: number;
}

interface AmapPoi {
  name?: string;
  formatted_address?: string;
  address?: string;
  location?: string;
}

interface AmapSearchResponse {
  pois?: AmapPoi[];
}

const DEFAULT_TEMPLATE = 'romantic';
const LOCAL_SHARE_PREFIX = 'wedding_short_';

const DEFAULT_WEDDING_INFO: WeddingInfo = {
  groomName: '',
  brideName: '',
  weddingDate: '',
  weddingTime: '',
  ceremonyVenue: '',
  banquetVenue: '',
  ceremonyLat: 0,
  ceremonyLng: 0,
  banquetLat: 0,
  banquetLng: 0,
  message: '',
  coverImage: '',
  galleryImages: [],
  pages: [],
  defaultFont: 'cormorant',
  bgMusic: '',
  bgMusicName: '',
  petalsEnabled: true,
  customColor: '',
  stickers: []
};

const cloneDefaultWeddingInfo = (): WeddingInfo => ({
  ...DEFAULT_WEDDING_INFO,
  galleryImages: [],
  pages: [],
  stickers: []
});

const hasStoredDraft = (): boolean => {
  if (typeof window === 'undefined') return false;
  return Boolean(window.localStorage.getItem('wedding_draft'));
};

const loadDraftFromStorage = (): WeddingInfo => {
  if (typeof window === 'undefined') {
    return cloneDefaultWeddingInfo();
  }

  const draft = window.localStorage.getItem('wedding_draft');
  if (!draft) {
    return cloneDefaultWeddingInfo();
  }

  try {
    const savedInfo = JSON.parse(draft) as Partial<WeddingInfo>;
    return {
      ...cloneDefaultWeddingInfo(),
      ...savedInfo,
      galleryImages: Array.isArray(savedInfo.galleryImages) ? savedInfo.galleryImages : [],
      pages: Array.isArray(savedInfo.pages) ? savedInfo.pages : [],
      stickers: Array.isArray(savedInfo.stickers) ? savedInfo.stickers : []
    };
  } catch (error) {
    console.error('Failed to load draft:', error);
    return cloneDefaultWeddingInfo();
  }
};

const loadTemplateFromStorage = (): string => {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATE;
  return window.localStorage.getItem('wedding_template') || DEFAULT_TEMPLATE;
};

const buildSharePayload = (info: WeddingInfo, template: string): SharePayload => ({
  info,
  template,
  createdAt: Date.now()
});

const createShortCode = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 10);
  }

  return `local${Date.now().toString(36)}`;
};

const buildShortShareUrl = (payload: SharePayload): string => {
  const shortCode = createShortCode();
  window.localStorage.setItem(`${LOCAL_SHARE_PREFIX}${shortCode}`, JSON.stringify(payload));
  return `${window.location.origin}/#/preview?short=${shortCode}`;
};

const getFileFromInputEvent = (event: Event): File | null => {
  const target = event.target;
  if (!(target instanceof HTMLInputElement)) return null;
  return target.files?.[0] ?? null;
};

const readFileAsDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as string);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
};

const isDataUrl = (value: string): boolean => /^data:/i.test(value);

const getDataUrlExtension = (dataUrl: string, fallback: string): string => {
  const mimeType = dataUrl.match(/^data:([^;,]+)[;,]/i)?.[1]?.toLowerCase();

  switch (mimeType) {
    case 'image/jpeg':
      return 'jpg';
    case 'image/png':
      return 'png';
    case 'image/webp':
      return 'webp';
    case 'image/gif':
      return 'gif';
    case 'audio/mpeg':
    case 'audio/mp3':
      return 'mp3';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'audio/ogg':
      return 'ogg';
    default:
      return fallback;
  }
};

const getUploadErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error || '');

  if (/row-level security|violates row-level security/i.test(message)) {
    return 'Supabase Storage 还没有开放上传权限，请重新执行 schema.sql 里的 storage 策略。';
  }

  if (/bucket.*not found|not found/i.test(message)) {
    return 'Supabase bucket 不存在，请检查是否已创建 wedding-images 和 wedding-audio。';
  }

  if (/mime type|content type/i.test(message)) {
    return '文件类型不受支持，请更换图片后重试。';
  }

  return message || '上传失败，请重试。';
};

const getShareErrorMessage = (error: unknown): string => {
  const message = error instanceof Error ? error.message : String(error || '');

  if (/row-level security|violates row-level security/i.test(message)) {
    return 'Supabase 数据表或 Storage 权限未开放，请重新执行 schema.sql。';
  }

  if (/relation .* does not exist|table .* does not exist/i.test(message)) {
    return 'Supabase invitations 表不存在，请重新执行 schema.sql。';
  }

  if (/bucket.*not found|not found/i.test(message)) {
    return 'Supabase bucket 不存在，请检查是否已创建 wedding-images 和 wedding-audio。';
  }

  return message || '云端短链接生成失败，请检查 Supabase 配置。';
};

const fonts = [
  { id: 'cormorant', name: '优雅衬线', family: "'Cormorant Garamond', serif" },
  { id: 'dancing', name: '花体手写', family: "'Dancing Script', cursive" },
  { id: 'playfair', name: '古典衬线', family: "'Playfair Display', serif" },
  { id: 'noto', name: '思源宋体', family: "'Noto Serif SC', serif" },
  { id: 'sans', name: '现代无衬线', family: "'Noto Sans SC', sans-serif" },
];

const aspectRatioOptions = [
  { value: '1 / 1', label: '正方形 1:1' },
  { value: '4 / 3', label: '横版 4:3' },
  { value: '3 / 4', label: '竖版 3:4' },
  { value: '16 / 9', label: '宽屏 16:9' },
  { value: '9 / 16', label: '长屏 9:16' }
];

const parseAspectRatio = (value?: string | number): number | undefined => {
  if (typeof value === 'number') return value;
  if (!value) return undefined;

  const parts = value.split('/').map((item) => Number(item.trim()));
  if (parts.length !== 2 || !parts[0] || !parts[1]) return undefined;
  return parts[0] / parts[1];
};

const stickerOptions: Array<{ id: StickerType; label: string; emoji: string }> = [
  { id: 'rose', label: '玫瑰花', emoji: '🌹' },
  { id: 'heart', label: '爱心', emoji: '💖' },
  { id: 'bell', label: '铃铛', emoji: '🔔' },
  { id: 'fireworks', label: '烟花', emoji: '🎆' }
];

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const invitationMotionStyles = `
  @keyframes invitationPageFlip {
    0% {
      opacity: 0;
      transform: perspective(1200px) rotateX(-12deg) translateY(28px) scale(0.98);
    }
    100% {
      opacity: 1;
      transform: perspective(1200px) rotateX(0deg) translateY(0) scale(1);
    }
  }

  @keyframes invitationImageZoom {
    0% {
      transform: scale(1);
    }
    100% {
      transform: scale(1.08);
    }
  }

  @keyframes invitationCarouselSlide {
    0% {
      opacity: 0;
      transform: translateX(22px) scale(0.98);
    }
    100% {
      opacity: 1;
      transform: translateX(0) scale(1);
    }
  }
`;

const InvitationMotionStyles = () => <style>{invitationMotionStyles}</style>;

const PhotoBackdrop = ({
  src,
  alt,
  opacity = 0.14,
  blur = 0,
}: {
  src: string;
  alt: string;
  opacity?: number;
  blur?: number;
}) => (
  <div className="absolute inset-0 overflow-hidden">
    <img
      src={src}
      alt={alt}
      className="w-full h-full object-cover scale-105"
      style={{ opacity: Math.min(opacity + 0.08, 0.3), filter: `blur(${Math.max(blur, 12)}px)` }}
    />
    <div className="absolute inset-0" style={{ background: 'rgba(255,255,255,0.1)' }} />
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-contain"
      style={{ opacity, filter: blur ? `blur(${blur}px)` : 'none', animation: 'invitationImageZoom 12s ease-in-out infinite alternate' }}
    />
  </div>
);

const PhotoFrame = ({
  src,
  alt,
  aspectRatio = '1 / 1',
  roundedClassName = 'rounded-lg',
  borderStyle,
  imagePadding = 0,
  animationDelay = '0ms'
}: {
  src: string;
  alt: string;
  aspectRatio?: string;
  roundedClassName?: string;
  borderStyle?: React.CSSProperties;
  imagePadding?: number;
  animationDelay?: string;
}) => (
  <div
    className={`relative overflow-hidden ${roundedClassName}`}
    style={{
      aspectRatio,
      background: 'transparent',
      boxShadow: '0 12px 26px rgba(60, 38, 24, 0.08)',
      ...borderStyle
    }}
  >
    {!src ? (
      <div className="absolute inset-0 flex items-center justify-center text-xs tracking-[0.2em] uppercase" style={{ color: '#b8a898' }}>
        Wedding Photo
      </div>
    ) : (
      <>
    <img
      src={src}
      alt={alt}
      className="absolute inset-0 w-full h-full object-cover scale-110"
      style={{ filter: 'blur(18px)', opacity: 0.22 }}
    />
    <div className="absolute inset-0 flex items-center justify-center" style={{ padding: `${imagePadding}px` }}>
      <img
        src={src}
        alt={alt}
            className="w-full h-full object-contain"
            style={{ animation: `invitationImageZoom 10s ease-in-out ${animationDelay} infinite alternate`, transformOrigin: 'center center' }}
      />
    </div>
      </>
    )}
  </div>
);

const PhotoCarousel = ({
  images,
  aspectRatio = '4 / 3',
  themeColor,
  roundedClassName = 'rounded-xl'
}: {
  images: string[];
  aspectRatio?: string;
  themeColor: string;
  roundedClassName?: string;
}) => {
  const safeImages = images.filter(Boolean);
  const [currentIndex, setCurrentIndex] = useState(0);
  const activeIndex = safeImages.length === 0 ? 0 : currentIndex % safeImages.length;

  useEffect(() => {
    if (safeImages.length <= 1) return;

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % safeImages.length);
    }, 3200);

    return () => window.clearInterval(timer);
  }, [safeImages.length]);

  if (safeImages.length === 0) {
    return <PhotoFrame src="" alt="相册" aspectRatio={aspectRatio} roundedClassName={roundedClassName} />;
  }

  return (
    <div className="space-y-3">
      <div key={`${safeImages[activeIndex]}-${activeIndex}`} style={{ animation: 'invitationCarouselSlide 520ms ease both' }}>
        <PhotoFrame
          src={safeImages[activeIndex]}
          alt={`相册 ${activeIndex + 1}`}
          aspectRatio={aspectRatio}
          roundedClassName={roundedClassName}
          imagePadding={4}
        />
      </div>
      {safeImages.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {safeImages.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setCurrentIndex(index)}
              className="h-2.5 rounded-full transition-all"
              style={{
                width: activeIndex === index ? '22px' : '8px',
                background: activeIndex === index ? themeColor : `${themeColor}33`
              }}
              aria-label={`切换到第 ${index + 1} 张`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const pageTypes = [
  { id: 'gallery', name: '相册集', icon: '📷', description: '展示多张照片' },
  { id: 'story', name: '爱情故事', icon: '📖', description: '讲述你们的故事' },
  { id: 'quote', name: '语录卡片', icon: '💌', description: '温馨语录展示' },
  { id: 'photo', name: '单图展示', icon: '🖼️', description: '单张照片特写' },
];

const weddingMessages = [
  { id: '1', text: '愿与你共赴这一场温柔的仪式，见证我们最美好的时刻' },
  { id: '2', text: '感谢您的到来，与我们一同分享这份喜悦与幸福' },
  { id: '3', text: '在这特别的日子里，期待与您相聚，共证良缘' },
  { id: '4', text: '感谢一路有您相伴，愿这份幸福能与您共同分享' },
  { id: '5', text: '承蒙厚爱，不胜感激，期待与您共度美好时光' },
  { id: '6', text: '愿我们的爱情如星辰般璀璨，感谢您的见证' },
  { id: '7', text: '感谢您的祝福，让我们的婚礼更加圆满美好' },
  { id: '8', text: '携手并进，共赴未来，感谢您的支持与陪伴' },
  { id: '9', text: '在这值得纪念的日子，感谢您的到来与祝福' },
  { id: '10', text: '愿这份喜悦传递给每一位亲爱的家人朋友' },
];

const quoteList = [
  { id: '1', text: '爱是恒久忍耐，又有恩慈' },
  { id: '2', text: '愿得一人心，白首不相离' },
  { id: '3', text: '执子之手，与子偕老' },
  { id: '4', text: '一生一世一双人，半醉半醒半浮生' },
  { id: '5', text: '遇见你，是我生命中最美的意外' },
  { id: '6', text: '爱你，是我做过最正确的决定' },
  { id: '7', text: '你是我生命中的阳光，照亮我前行的路' },
  { id: '8', text: '岁月静好，与君语；细水流年，与君同' },
  { id: '9', text: '愿我们的爱情，如初见般美好' },
  { id: '10', text: '你若不离不弃，我必生死相依' },
  { id: '11', text: '在天愿作比翼鸟，在地愿为连理枝' },
  { id: '12', text: '两情若是久长时，又岂在朝朝暮暮' },
  { id: '13', text: '死生契阔，与子成说。执子之手，与子偕老' },
  { id: '14', text: '身无彩凤双飞翼，心有灵犀一点通' },
  { id: '15', text: '衣带渐宽终不悔，为伊消得人憔悴' },
];

const generateMapLink = (address: string): string => {
  const encodedAddress = encodeURIComponent(address);
  const gaodeLink = `amapuri://route?sourceApplication=婚礼请帖&daddr=${encodedAddress}&dev=0`;
  const baiduLink = `baidumap://map/geocoder?src=婚礼请帖&address=${encodedAddress}`;
  const iosLink = `maps://maps.apple.com/?q=${encodedAddress}`;
  const androidLink = `geo:0,0?q=${encodedAddress}`;
  const gaodeWebLink = `https://uri.amap.com/marker?position=&name=${encodedAddress}&callnative=0`;
  const baiduWebLink = `https://map.baidu.com/search/${encodedAddress}`;
  
  return `javascript:(function(){
    var addr = '${encodedAddress}';
    var ua = navigator.userAgent;
    if(ua.match(/MicroMessenger/i)){
      window.location.href = '${baiduWebLink}';
    } else if(ua.match(/(iPad|iPhone|iPod)/)){
      window.location.href = '${gaodeLink}';
      setTimeout(function(){
        if(document.readyState === 'complete'){
          window.location.href = '${iosLink}';
        }
      }, 500);
    } else if(ua.match(/Android/)){
      window.location.href = '${gaodeLink}';
      setTimeout(function(){
        if(document.readyState === 'complete'){
          window.location.href = '${androidLink}';
        }
      }, 500);
    } else {
      window.location.href = '${gaodeWebLink}';
    }
  })()`;
};

const ImageUploader = ({ label, value, onChange, aspectRatio = 4 / 3, placeholder = '点击上传图片', showCrop = true, uploadHandler }) => {
  const inputRef = useRef(null);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imgSrc = event.target?.result as string;
        if (showCrop) {
          setTempImage(imgSrc);
          setShowCropper(true);
        } else {
          onChange(imgSrc);
          toast.success('图片上传成功');
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCropComplete = async (croppedImage) => {
    try {
      const nextValue = uploadHandler ? await uploadHandler(croppedImage) : croppedImage;
      onChange(nextValue);
      setShowCropper(false);
      setTempImage('');
      toast.success('图片裁剪并上传成功');
    } catch (error) {
      console.error('图片上传失败:', error);
      toast.error(getUploadErrorMessage(error));
    }
  };

  const handleRemove = () => {
    onChange('');
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase" style={{ color: '#8b7355' }}>
            <span style={{ color: '#c9a84c' }}>{label}</span>
          </label>
          {value && (
            <button onClick={handleRemove} className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors" style={{ color: '#c4788a', background: 'rgba(196,120,138,0.1)' }}>
              <X className="w-3 h-3" />
              移除
            </button>
          )}
        </div>
        
        {value ? (
          <div className="relative rounded-lg overflow-hidden" style={{ aspectRatio }}>
            <img src={value} alt="预览" className="w-full h-full object-contain" style={{ background: '#fff8f4' }} />
          </div>
        ) : (
          <div onClick={() => inputRef.current?.click()} className="relative rounded-lg overflow-hidden cursor-pointer transition-all hover:opacity-80" style={{ aspectRatio, background: 'linear-gradient(135deg, #fdf6f0 0%, #f8f0e8 100%)', border: '2px dashed #e8d5c4' }}>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Upload className="w-8 h-8 mb-2" style={{ color: '#c9a84c' }} />
              <p className="text-xs" style={{ color: '#8b7355' }}>{placeholder}</p>
            </div>
          </div>
        )}
        
        <input ref={inputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
      </div>

      {showCropper && (
        <ImageCropper imageSrc={tempImage} onComplete={handleCropComplete} onCancel={() => { setShowCropper(false); setTempImage(''); }} aspectRatio={aspectRatio} />
      )}
    </>
  );
};

const ShareModal = ({ isOpen, onClose, shareUrl, shareHint, onDownloadImage }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr'>('link');

  const legacyCopyText = (text: string): boolean => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.fontSize = '16px';
      textarea.style.position = 'fixed';
      textarea.style.top = '0';
      textarea.style.left = '-9999px';
      textarea.style.opacity = '1';
      textarea.style.pointerEvents = 'none';
      document.body.appendChild(textarea);

      const isIOS = /ipad|iphone|ipod/i.test(window.navigator.userAgent);
      if (isIOS) {
        const range = document.createRange();
        range.selectNodeContents(textarea);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        textarea.setSelectionRange(0, textarea.value.length);
      } else {
        textarea.focus();
        textarea.select();
        textarea.setSelectionRange(0, textarea.value.length);
      }

      const copied = document.execCommand('copy');
      const selection = window.getSelection();
      selection?.removeAllRanges();
      document.body.removeChild(textarea);
      return copied;
    } catch {
      return false;
    }
  };

  const copyText = async (text: string): Promise<boolean> => {
    const shouldPreferLegacyCopy = /android|iphone|ipad|ipod|mobile|micromessenger/i.test(window.navigator.userAgent);

    if (shouldPreferLegacyCopy && legacyCopyText(text)) {
      return true;
    }

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fall through to the legacy copy path for mobile browsers.
    }

    return legacyCopyText(text);
  };

  const handleCopy = async (url) => {
    try {
      const copied = await copyText(url);
      if (!copied) throw new Error('copy failed');
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请长按下方链接手动复制');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-gray-100">
          <X className="w-5 h-5 text-gray-500" />
        </button>
        
        <h3 className="text-xl font-bold mb-1" style={{ fontFamily: 'Playfair Display, serif', color: '#2c1810' }}>分享请帖</h3>
        <p className="text-xs mb-4" style={{ color: '#8b7355' }}>选择以下方式分享您的婚礼请帖</p>

        <div className="flex gap-2 mb-4 p-1 rounded-lg" style={{ background: '#fdf6f0' }}>
          <button onClick={() => setActiveTab('link')} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'link' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} style={{ color: activeTab === 'link' ? '#2c1810' : undefined }}>
            <Link className="w-4 h-4 inline mr-1" />
            分享链接
          </button>
          <button onClick={() => setActiveTab('qr')} className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${activeTab === 'qr' ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`} style={{ color: activeTab === 'qr' ? '#2c1810' : undefined }}>
            <QrCode className="w-4 h-4 inline mr-1" />
            二维码
          </button>
        </div>

        {activeTab === 'link' ? (
          <div className="space-y-3">
            {shareHint && (
              <div className="rounded-xl px-4 py-3 text-xs leading-relaxed" style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412' }}>
                {shareHint}
              </div>
            )}
            <button onClick={() => handleCopy(shareUrl)} className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:bg-gray-50" style={{ background: '#fdf6f0', border: '1px solid #f0d8c8' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#c9a84c' }}>
                {copied ? <Check className="w-5 h-5 text-white" /> : <Link className="w-5 h-5 text-white" />}
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm" style={{ color: '#2c1810' }}>{copied ? '已复制!' : '复制链接'}</p>
                <p className="text-xs" style={{ color: '#8b7355' }}>{copied ? '链接已复制到剪贴板' : '分享您的婚礼请帖链接'}</p>
              </div>
            </button>
            
            {shareUrl && (
              <div className="p-3 rounded-lg" style={{ background: '#f8f5f0' }}>
                <p className="text-xs mb-1" style={{ color: '#8b7355' }}>完整链接</p>
                <textarea
                  readOnly
                  value={shareUrl}
                  onFocus={(event) => event.currentTarget.select()}
                  className="w-full min-h-[96px] resize-y rounded-lg px-3 py-2 text-xs font-mono outline-none"
                  style={{ color: '#2c1810', background: '#fff', border: '1px solid #e8d5c4' }}
                />
              </div>
            )}
            
            <button onClick={onDownloadImage} className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:bg-gray-50" style={{ background: '#fdf6f0', border: '1px solid #f0d8c8' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#c4788a' }}>
                <Image className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm" style={{ color: '#2c1810' }}>下载图片</p>
                <p className="text-xs" style={{ color: '#8b7355' }}>将请帖导出为图片格式</p>
              </div>
            </button>
            
            <button onClick={() => {
              if (navigator.share) {
                navigator.share({ title: '婚礼请帖', text: '诚挚邀请您参加我们的婚礼', url: shareUrl });
              } else {
                handleCopy(shareUrl);
              }
            }} className="w-full flex items-center gap-3 p-4 rounded-xl transition-all hover:bg-gray-50" style={{ background: '#fdf6f0', border: '1px solid #f0d8c8' }}>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#8aab8a' }}>
                <Share2 className="w-5 h-5 text-white" />
              </div>
              <div className="text-left flex-1">
                <p className="font-semibold text-sm" style={{ color: '#2c1810' }}>分享到...</p>
                <p className="text-xs" style={{ color: '#8b7355' }}>使用设备原生分享功能</p>
              </div>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="p-4 rounded-xl" style={{ background: '#fff' }}>
              <QRCodeCanvas value={shareUrl} size={180} level="M" />
            </div>
            <p className="text-sm mt-4 text-center" style={{ color: '#2c1810' }}>扫码查看请帖</p>
            <p className="text-xs mt-1 text-center" style={{ color: '#8b7355' }}>使用微信或手机相机扫描二维码</p>
            <button onClick={() => handleCopy(shareUrl)} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg" style={{ background: '#c4788a', color: 'white' }}>
              <Copy className="w-4 h-4" />
              复制链接
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const PageModuleRenderer = ({ page, defaultFont, themeColor }) => {
  const font = fonts.find(f => f.id === (page.font || defaultFont)) || fonts[0];
  const pageAspectRatio = page.aspectRatio || (page.type === 'gallery' ? '4 / 3' : '4 / 3');
  const galleryMode = page.galleryMode || 'carousel';
  
  const renderContent = () => {
    switch (page.type) {
      case 'gallery':
        return (
          <div className="py-6 px-8">
            <p className="text-xs tracking-[0.3em] uppercase mb-4 text-center" style={{ color: themeColor, fontFamily: font.family }}>{page.title}</p>
            {galleryMode === 'carousel' ? (
              <PhotoCarousel images={(page.images || []).slice(0, 6)} aspectRatio={pageAspectRatio} themeColor={themeColor} />
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {(page.images || []).slice(0, 6).map((img, i) => (
                  <PhotoFrame key={i} src={img} alt={`相册 ${i + 1}`} aspectRatio={pageAspectRatio} animationDelay={`${i * 150}ms`} />
                ))}
              </div>
            )}
          </div>
        );
        
      case 'story':
        return (
          <div className="py-8 px-8 text-center">
            <p className="text-xs tracking-[0.3em] uppercase mb-3" style={{ color: themeColor, fontFamily: font.family }}>{page.title}</p>
            <p className="text-sm leading-loose" style={{ color: '#2c1810', fontFamily: font.family, lineHeight: 1.8 }}>{page.content || '在这里写下你们的爱情故事...'}</p>
          </div>
        );
        
      case 'quote':
        return (
          <div className="py-10 px-8 text-center">
            <p className="text-sm italic leading-relaxed" style={{ color: '#5a4020', fontFamily: font.family, fontSize: '1.1rem' }}>"{page.content || '爱是恒久忍耐，又有恩慈'}"</p>
            {page.title && (
              <p className="text-xs mt-3 tracking-widest uppercase" style={{ color: themeColor }}>{page.title}</p>
            )}
          </div>
        );
        
      case 'photo':
        return (
          <div className="py-4">
            <PhotoFrame src={page.image || ''} alt={page.title} aspectRatio={pageAspectRatio} roundedClassName="rounded-none" imagePadding={0} />
            {page.title && (
              <p className="text-xs tracking-[0.2em] uppercase mt-3 text-center px-6" style={{ color: themeColor, fontFamily: font.family }}>{page.title}</p>
            )}
            {page.content && (
              <p className="text-xs text-center mt-1 px-6" style={{ color: '#6b4c3b', fontFamily: font.family }}>{page.content}</p>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="w-full self-stretch" style={{ animation: 'invitationPageFlip 720ms cubic-bezier(0.22, 1, 0.36, 1) both' }}>
      {renderContent()}
    </div>
  );
};

const StickerLayer = ({
  stickers,
  editable = false,
  selectedStickerId,
  containerRef,
  onSelectSticker,
  onMoveSticker
}: {
  stickers: StickerItem[];
  editable?: boolean;
  selectedStickerId?: string | null;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onSelectSticker?: (stickerId: string) => void;
  onMoveSticker?: (stickerId: string, x: number, y: number) => void;
}) => {
  const handlePointerDown = (event: React.PointerEvent<HTMLButtonElement>, stickerId: string) => {
    if (!editable || !containerRef?.current || !onMoveSticker) return;

    event.preventDefault();
    event.stopPropagation();
    onSelectSticker?.(stickerId);

    const updatePosition = (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const nextX = clamp(((clientX - rect.left) / rect.width) * 100, 5, 95);
      const nextY = clamp(((clientY - rect.top) / rect.height) * 100, 5, 95);
      onMoveSticker(stickerId, nextX, nextY);
    };

    updatePosition(event.clientX, event.clientY);

    const handleMove = (moveEvent: PointerEvent) => {
      updatePosition(moveEvent.clientX, moveEvent.clientY);
    };

    const handleUp = () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
    };

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {stickers.map((sticker) => {
        const frameSize = getStickerFrameSize(sticker.size);
        const isSelected = editable && selectedStickerId === sticker.id;

        return (
          <button
            key={sticker.id}
            type="button"
            onClick={(event) => {
              if (!editable) return;
              event.stopPropagation();
              onSelectSticker?.(sticker.id);
            }}
            onPointerDown={(event) => handlePointerDown(event, sticker.id)}
            className={`absolute flex items-center justify-center rounded-full border-0 p-0 transition-all ${editable ? 'pointer-events-auto cursor-move' : 'pointer-events-none'}`}
            style={{
              left: `${sticker.x}%`,
              top: `${sticker.y}%`,
              width: `${frameSize}px`,
              height: `${frameSize}px`,
              transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
              background: isSelected ? 'rgba(255,255,255,0.72)' : 'transparent',
              boxShadow: isSelected ? '0 0 0 2px rgba(196,120,138,0.35)' : 'none',
              touchAction: 'none',
              zIndex: 20
            }}
            aria-label={`贴纸-${sticker.type}`}
          >
            <AnimatedSticker type={sticker.type} selected={isSelected} />
          </button>
        );
      })}
    </div>
  );
};

const TemplateRomantic = ({ info }) => {
  const displayGroom = info.groomName || '新郎姓名';
  const displayBride = info.brideName || '新娘姓名';
  const displayDate = info.weddingDate ? new Date(info.weddingDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '2025年6月15日';
  const displayTime = info.weddingTime || '11:00';
  const displayCeremony = info.ceremonyVenue || '婚礼仪式地点';
  const displayBanquet = info.banquetVenue || '喜宴地点';
  const displayMsg = info.message || '愿与你共赴这一场温柔的仪式，见证我们最美好的时刻';
  const defaultFont = fonts.find(f => f.id === info.defaultFont) || fonts[0];
  const themeColor = info.customColor || '#c4788a';
  const accentColor = '#c9a84c';

  return (
    <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #fdf0f0 0%, #fff8f4 40%, #fdf0e8 100%)', minHeight: '700px', fontFamily: defaultFont.family }}>
      {info.coverImage && <PhotoBackdrop src={info.coverImage} alt="封面" opacity={0.14} />}
      
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${themeColor}, ${accentColor}, ${themeColor}, transparent)` }} />
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: `linear-gradient(90deg, transparent, ${themeColor}, ${accentColor}, ${themeColor}, transparent)` }} />

      <div className="relative flex flex-col items-center px-10 py-8 text-center">
        <p className="text-xs tracking-[0.4em] uppercase mb-2" style={{ color: themeColor, fontFamily: 'Playfair Display, serif' }}>Wedding Invitation</p>
        <p className="text-sm tracking-[0.2em] mb-4" style={{ color: '#8b7355' }}>诚挚邀请您出席</p>

        <div className="flex items-center gap-4 mb-2">
          <div className="text-center">
            <p className="text-4xl font-bold" style={{ fontFamily: 'Dancing Script, cursive', color: '#7d2e45' }}>{displayGroom}</p>
            <p className="text-xs tracking-widest mt-1" style={{ color: '#8b7355' }}>GROOM</p>
          </div>
          <div className="flex flex-col items-center mx-2">
            <Heart className="w-7 h-7 mb-1" style={{ color: themeColor }} />
            <p className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: accentColor }}>&</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold" style={{ fontFamily: 'Dancing Script, cursive', color: '#7d2e45' }}>{displayBride}</p>
            <p className="text-xs tracking-widest mt-1" style={{ color: '#8b7355' }}>BRIDE</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-5 max-w-xs italic" style={{ color: '#6b4c3b' }}>"{displayMsg}"</p>

        <div className="w-full max-w-sm space-y-3">
          <div className="rounded-lg p-3" style={{ background: `${themeColor}11`, border: `1px solid ${themeColor}33` }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: themeColor }}>婚礼日期</p>
            <p className="text-base font-semibold" style={{ color: '#2c1810', fontFamily: 'Playfair Display, serif' }}>{displayDate} · {displayTime}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: `${accentColor}11`, border: `1px solid ${accentColor}33` }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: accentColor }}>婚礼仪式</p>
            <a href={generateMapLink(displayCeremony)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: themeColor }}>{displayCeremony}</a>
          </div>
          <div className="rounded-lg p-3" style={{ background: `${accentColor}11`, border: `1px solid ${accentColor}33` }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: accentColor }}>喜宴地点</p>
            <a href={generateMapLink(displayBanquet)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: themeColor }}>{displayBanquet}</a>
          </div>
        </div>

        {info.galleryImages?.length > 0 && (
          <div className="w-full max-w-sm mt-4">
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: themeColor }}>甜蜜瞬间</p>
            <div className="grid grid-cols-3 gap-2">
              {info.galleryImages.slice(0, 3).map((img, i) => (
                <PhotoFrame key={i} src={img} alt={`相册 ${i + 1}`} aspectRatio="1 / 1" animationDelay={`${i * 180}ms`} />
              ))}
            </div>
          </div>
        )}

        {info.pages?.map(page => (
          <PageModuleRenderer key={page.id} page={page} defaultFont={info.defaultFont} themeColor={themeColor} />
        ))}

        <p className="mt-5 text-xs tracking-widest" style={{ color: '#b8a898' }}>We look forward to sharing our joy with you ♥</p>
      </div>
    </div>
  );
};

const TemplateClassic = ({ info }) => {
  const displayGroom = info.groomName || '新郎姓名';
  const displayBride = info.brideName || '新娘姓名';
  const displayDate = info.weddingDate ? new Date(info.weddingDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '2025年6月15日';
  const displayTime = info.weddingTime || '11:00';
  const displayCeremony = info.ceremonyVenue || '婚礼仪式地点';
  const displayBanquet = info.banquetVenue || '喜宴地点';
  const displayMsg = info.message || '愿与你共赴这一场温柔的仪式，见证我们最美好的时刻';
  const defaultFont = fonts.find(f => f.id === info.defaultFont) || fonts[0];
  const themeColor = info.customColor || '#c9a84c';
  const lightColor = '#f0d080';

  return (
    <div className="relative w-full overflow-hidden" style={{ background: '#1a0a00', minHeight: '700px', fontFamily: defaultFont.family }}>
      {info.coverImage && <PhotoBackdrop src={info.coverImage} alt="封面" opacity={0.18} />}
      
      <div className="absolute inset-3" style={{ border: `1px solid ${themeColor}80` }} />
      <div className="absolute inset-5" style={{ border: `1px solid ${themeColor}40` }} />

      <div className="relative flex flex-col items-center px-12 py-8 text-center">
        <p className="text-xs tracking-[0.5em] uppercase mb-4" style={{ color: themeColor, fontFamily: 'Playfair Display, serif' }}>— Wedding Invitation —</p>
        <p className="text-2xl mb-2 tracking-[0.3em]" style={{ color: lightColor, fontFamily: 'serif' }}>婚 礼 请 帖</p>

        <div className="w-24 my-3" style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)` }} />

        <div className="my-3">
          <div className="flex items-baseline justify-center gap-3">
            <p className="text-5xl" style={{ fontFamily: 'Dancing Script, cursive', color: lightColor }}>{displayGroom}</p>
            <p className="text-2xl" style={{ color: themeColor }}>&</p>
            <p className="text-5xl" style={{ fontFamily: 'Dancing Script, cursive', color: lightColor }}>{displayBride}</p>
          </div>
          <p className="text-xs tracking-widest mt-2" style={{ color: '#8b6c3a' }}>THE WEDDING OF</p>
        </div>

        <div className="my-3 px-6 py-3 rounded" style={{ border: `1px solid ${themeColor}60`, background: `${themeColor}14` }}>
          <p className="text-xl font-bold tracking-wider" style={{ color: lightColor, fontFamily: 'Playfair Display, serif' }}>{displayDate}</p>
          <p className="text-sm mt-1" style={{ color: themeColor }}>{displayTime}</p>
        </div>

        <p className="text-sm leading-relaxed my-3 max-w-xs italic" style={{ color: '#c4a882' }}>"{displayMsg}"</p>

        <div className="w-full max-w-xs space-y-2 mt-2">
          {[{ label: '仪式地点', value: displayCeremony, isAddress: true }, { label: '喜宴地点', value: displayBanquet, isAddress: true }].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-left py-2" style={{ borderBottom: `1px solid ${themeColor}25` }}>
              <p className="text-xs tracking-wider whitespace-nowrap mt-0.5" style={{ color: themeColor, minWidth: '56px' }}>{item.label}</p>
              <a href={generateMapLink(item.value)} className="text-xs leading-relaxed underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: lightColor }}>{item.value}</a>
            </div>
          ))}
        </div>

        {info.galleryImages?.length > 0 && (
          <div className="w-full max-w-xs mt-4 grid grid-cols-3 gap-2">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <PhotoFrame key={i} src={img} alt={`相册 ${i + 1}`} aspectRatio="1 / 1" animationDelay={`${i * 180}ms`} />
            ))}
          </div>
        )}

        {info.pages?.map(page => (
          <PageModuleRenderer key={page.id} page={page} defaultFont={info.defaultFont} themeColor={themeColor} />
        ))}

        <p className="mt-5 text-xs tracking-widest" style={{ color: '#5a4020' }}>♦ We are honored to have you ♦</p>
      </div>
    </div>
  );
};

const TemplateModern = ({ info }) => {
  const displayGroom = info.groomName || '新郎姓名';
  const displayBride = info.brideName || '新娘姓名';
  const displayDate = info.weddingDate ? new Date(info.weddingDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '2025年6月15日';
  const displayTime = info.weddingTime || '11:00';
  const displayCeremony = info.ceremonyVenue || '婚礼仪式地点';
  const displayBanquet = info.banquetVenue || '喜宴地点';
  const displayMsg = info.message || '愿与你共赴这一场温柔的仪式，见证我们最美好的时刻';
  const defaultFont = fonts.find(f => f.id === info.defaultFont) || fonts[0];
  const themeColor = info.customColor || '#8aab8a';
  const accentColor = info.customColor || '#c4788a';

  return (
    <div className="relative w-full overflow-hidden" style={{ background: '#f8f5f0', minHeight: '700px', fontFamily: defaultFont.family }}>
      {info.coverImage && <PhotoBackdrop src={info.coverImage} alt="封面" opacity={0.1} />}
      
      <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: `linear-gradient(180deg, ${themeColor}, ${accentColor}, #c9a84c)` }} />

      <div className="relative flex flex-col pl-12 pr-8 py-10">
        <p className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color: themeColor, fontFamily: 'Playfair Display, serif' }}>Wedding Invitation</p>

        <div className="mb-4">
          <p className="text-6xl leading-tight" style={{ fontFamily: 'Dancing Script, cursive', color: '#2c1810' }}>{displayGroom}</p>
          <p className="text-2xl my-1 tracking-widest" style={{ color: accentColor }}>& — & —</p>
          <p className="text-6xl leading-tight" style={{ fontFamily: 'Dancing Script, cursive', color: '#2c1810' }}>{displayBride}</p>
        </div>

        <div className="w-full my-4" style={{ height: '1px', background: `linear-gradient(90deg, ${accentColor}, transparent)` }} />

        <p className="text-sm leading-relaxed italic mb-5" style={{ color: '#6b4c3b', maxWidth: '280px' }}>"{displayMsg}"</p>

        <div className="space-y-3">
          {[{ icon: '📅', label: '日期与时间', value: `${displayDate} ${displayTime}`, isAddress: false }, { icon: '💒', label: '婚礼仪式', value: displayCeremony, isAddress: true }, { icon: '🍽', label: '喜宴地点', value: displayBanquet, isAddress: true }].map((item, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: `${accentColor}10` }}>{item.icon}</div>
              <div>
                <p className="text-xs tracking-wider uppercase" style={{ color: accentColor, marginBottom: '1px' }}>{item.label}</p>
                {item.isAddress ? (
                  <a href={generateMapLink(item.value)} className="text-xs underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: accentColor, lineHeight: 1.5 }}>{item.value}</a>
                ) : (
                  <p className="text-xs" style={{ color: '#2c1810', lineHeight: 1.5 }}>{item.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {info.galleryImages?.length > 0 && (
          <div className="flex gap-2 mt-4">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <div key={i} className="w-16">
                <PhotoFrame src={img} alt={`相册 ${i + 1}`} aspectRatio="1 / 1" animationDelay={`${i * 180}ms`} />
              </div>
            ))}
          </div>
        )}

        {info.pages?.map(page => (
          <PageModuleRenderer key={page.id} page={page} defaultFont={info.defaultFont} themeColor={themeColor} />
        ))}

        <div className="mt-6 inline-flex items-center gap-2">
          <Heart className="w-4 h-4" style={{ color: accentColor }} />
          <p className="text-xs tracking-widest" style={{ color: '#b8a898' }}>Forever begins today</p>
        </div>
      </div>
    </div>
  );
};

const TemplateChinese = ({ info }) => {
  const displayGroom = info.groomName || '新郎姓名';
  const displayBride = info.brideName || '新娘姓名';
  const displayDate = info.weddingDate ? new Date(info.weddingDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '2025年6月15日';
  const displayTime = info.weddingTime || '11:00';
  const displayCeremony = info.ceremonyVenue || '婚礼仪式地点';
  const displayBanquet = info.banquetVenue || '喜宴地点';
  const displayMsg = info.message || '愿与你共赴这一场温柔的仪式，见证我们最美好的时刻';
  const defaultFont = fonts.find(f => f.id === info.defaultFont) || fonts[0];
  const themeColor = info.customColor || '#ffd700';

  return (
    <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(160deg, #8b0000 0%, #6b0000 50%, #4a0000 100%)', minHeight: '700px', fontFamily: defaultFont.family }}>
      {info.coverImage && <PhotoBackdrop src={info.coverImage} alt="封面" opacity={0.14} />}
      
      <div className="absolute inset-4" style={{ border: `2px solid ${themeColor}66`, borderRadius: '4px' }} />
      <div className="absolute inset-6" style={{ border: `1px solid ${themeColor}33`, borderRadius: '2px' }} />

      <div className="absolute top-8 left-8 text-5xl opacity-20" style={{ color: themeColor }}>囍</div>
      <div className="absolute top-8 right-8 text-5xl opacity-20" style={{ color: themeColor }}>囍</div>

      <div className="relative flex flex-col items-center px-10 py-8 text-center">
        <div className="mb-2">
          <p className="text-3xl tracking-[0.5em] font-bold" style={{ color: themeColor, fontFamily: 'serif' }}>喜</p>
          <p className="text-xs tracking-[0.4em] mt-1" style={{ color: `${themeColor}aa` }}>— 婚 礼 请 帖 —</p>
        </div>

        <div className="w-40 my-3" style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)` }} />

        <div className="flex items-center justify-center gap-3 my-2">
          <div className="text-center">
            <p className="text-3xl font-bold tracking-widest" style={{ color: themeColor, fontFamily: 'serif' }}>{displayGroom}</p>
            <p className="text-xs mt-1" style={{ color: `${themeColor}99` }}>新 郎</p>
          </div>
          <div className="text-4xl mx-2 font-bold" style={{ color: themeColor }}>❤</div>
          <div className="text-center">
            <p className="text-3xl font-bold tracking-widest" style={{ color: themeColor, fontFamily: 'serif' }}>{displayBride}</p>
            <p className="text-xs mt-1" style={{ color: `${themeColor}99` }}>新 娘</p>
          </div>
        </div>

        <div className="w-40 my-3" style={{ height: '1px', background: `linear-gradient(90deg, transparent, ${themeColor}, transparent)` }} />

        <p className="text-sm leading-loose my-2 tracking-wider max-w-xs" style={{ color: `${themeColor}dd` }}>{displayMsg}</p>

        <p className="text-2xl my-2 tracking-widest opacity-60" style={{ color: themeColor }}>✿ ✿ ✿</p>

        <div className="w-full max-w-xs mt-2 space-y-2">
          {[{ label: '吉日', value: `${displayDate}  ${displayTime}`, isAddress: false }, { label: '仪式', value: displayCeremony, isAddress: true }, { label: '喜宴', value: displayBanquet, isAddress: true }].map((item, i) => (
            <div key={i} className="flex items-center gap-2" style={{ borderBottom: `1px solid ${themeColor}25`, paddingBottom: '6px' }}>
              <span className="text-sm font-bold tracking-widest" style={{ color: themeColor, minWidth: '28px' }}>{item.label}</span>
              {item.isAddress ? (
                <a href={generateMapLink(item.value)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: themeColor, lineHeight: 1.6 }}>{item.value}</a>
              ) : (
                <span className="text-sm" style={{ color: `${themeColor}cc`, lineHeight: 1.6 }}>{item.value}</span>
              )}
            </div>
          ))}
        </div>

        {info.galleryImages?.length > 0 && (
          <div className="flex gap-2 mt-4 justify-center">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <div key={i} className="w-16">
                <PhotoFrame src={img} alt={`相册 ${i + 1}`} aspectRatio="1 / 1" borderStyle={{ border: `2px solid ${themeColor}66` }} animationDelay={`${i * 180}ms`} />
              </div>
            ))}
          </div>
        )}

        {info.pages?.map(page => (
          <PageModuleRenderer key={page.id} page={page} defaultFont={info.defaultFont} themeColor={themeColor} />
        ))}

        <p className="mt-6 text-xs tracking-widest" style={{ color: `${themeColor}66` }}>百年好合 · 永结同心</p>
      </div>
    </div>
  );
};

const TemplateKorean = ({ info }) => {
  const displayGroom = info.groomName || '新郎姓名';
  const displayBride = info.brideName || '新娘姓名';
  const displayDate = info.weddingDate ? new Date(info.weddingDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '2025年6月15日';
  const displayTime = info.weddingTime || '11:00';
  const displayCeremony = info.ceremonyVenue || '婚礼仪式地点';
  const displayBanquet = info.banquetVenue || '喜宴地点';
  const displayMsg = info.message || '愿温柔的时光停留在这一天，诚挚邀请您见证我们的幸福。';
  const defaultFont = fonts.find(f => f.id === info.defaultFont) || fonts[0];
  const themeColor = info.customColor || '#b8a79a';
  const accentColor = '#e9ddd2';
  const textColor = '#5f534b';

  return (
    <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(180deg, #f7f2ed 0%, #fdfaf7 55%, #f4ede6 100%)', minHeight: '700px', fontFamily: defaultFont.family }}>
      {info.coverImage && <PhotoBackdrop src={info.coverImage} alt="封面" opacity={0.08} blur={2} />}

      <div className="absolute top-6 left-6 right-6 bottom-6 rounded-[32px]" style={{ border: `1px solid ${themeColor}40`, background: 'rgba(255,255,255,0.35)' }} />

      <div className="relative flex flex-col items-center px-10 py-10 text-center">
        <p className="text-[10px] tracking-[0.45em] uppercase" style={{ color: themeColor, fontFamily: 'Playfair Display, serif' }}>Wedding Day</p>
        <div className="w-12 h-12 rounded-full flex items-center justify-center mt-4 mb-5" style={{ background: `${accentColor}dd`, color: themeColor }}>
          <Heart className="w-5 h-5" />
        </div>

        <p className="text-5xl leading-none" style={{ color: textColor, fontFamily: 'Dancing Script, cursive' }}>{displayGroom}</p>
        <p className="text-sm my-2" style={{ color: '#cdb8aa' }}>&</p>
        <p className="text-5xl leading-none" style={{ color: textColor, fontFamily: 'Dancing Script, cursive' }}>{displayBride}</p>

        <div className="mt-6 mb-5 px-5 py-4 rounded-[24px] w-full max-w-sm" style={{ background: 'rgba(255,255,255,0.7)', border: `1px solid ${accentColor}` }}>
          <p className="text-xs tracking-[0.3em] uppercase mb-2" style={{ color: themeColor }}>Save The Date</p>
          <p className="text-lg" style={{ color: '#4d433d', fontFamily: 'Playfair Display, serif' }}>{displayDate}</p>
          <p className="text-sm mt-1" style={{ color: textColor }}>{displayTime}</p>
        </div>

        <p className="text-sm leading-7 max-w-xs mb-6" style={{ color: textColor }}>{displayMsg}</p>

        <div className="w-full max-w-sm space-y-3">
          <div className="rounded-[22px] px-5 py-4 text-left" style={{ background: 'rgba(255,255,255,0.72)', border: `1px solid ${accentColor}` }}>
            <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: themeColor }}>Ceremony</p>
            <a href={generateMapLink(displayCeremony)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: textColor }}>{displayCeremony}</a>
          </div>
          <div className="rounded-[22px] px-5 py-4 text-left" style={{ background: 'rgba(255,255,255,0.72)', border: `1px solid ${accentColor}` }}>
            <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: themeColor }}>Reception</p>
            <a href={generateMapLink(displayBanquet)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: textColor }}>{displayBanquet}</a>
          </div>
        </div>

        {info.galleryImages?.length > 0 && (
          <div className="w-full max-w-sm mt-5">
            <div className="grid grid-cols-3 gap-2">
              {info.galleryImages.slice(0, 3).map((img, i) => (
                <PhotoFrame key={i} src={img} alt={`相册 ${i + 1}`} aspectRatio="3 / 4" roundedClassName="rounded-[18px]" animationDelay={`${i * 180}ms`} />
              ))}
            </div>
          </div>
        )}

        {info.pages?.map(page => (
          <PageModuleRenderer key={page.id} page={page} defaultFont={info.defaultFont} themeColor={themeColor} />
        ))}

        <p className="mt-6 text-[11px] tracking-[0.25em] uppercase" style={{ color: '#c3b1a4' }}>With Love And Gratitude</p>
      </div>
    </div>
  );
};

const templates = [
  { id: 'romantic', name: '浪漫玫瑰', subtitle: 'Rose Romance', color: '#c4788a' },
  { id: 'classic', name: '经典烫金', subtitle: 'Classic Gold', color: '#c9a84c' },
  { id: 'modern', name: '现代简约', subtitle: 'Modern Minimal', color: '#8aab8a' },
  { id: 'chinese', name: '中式喜红', subtitle: 'Chinese Red', color: '#8b0000' },
  { id: 'korean', name: '韩式奶油', subtitle: 'Korean Mood', color: '#b8a79a' }
];

const FormField = ({ label, icon, children }) => (
  <div>
    <label className="flex items-center gap-1.5 text-xs font-semibold mb-1.5 tracking-wider uppercase" style={{ color: '#8b7355' }}>
      <span style={{ color: '#c9a84c' }}>{icon}</span>
      {label}
    </label>
    {children}
  </div>
);

const WeddingInvitationGenerator = () => {
  const [info, setInfo] = useState<WeddingInfo>(() => loadDraftFromStorage());
  const [activeTemplate, setActiveTemplate] = useState(() => loadTemplateFromStorage());
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareHint, setShareHint] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ basic: true, pages: false, appearance: true, stickers: true });
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [selectedStickerId, setSelectedStickerId] = useState<string | null>(null);
  const [pendingCropImage, setPendingCropImage] = useState<{
    imageSrc: string;
    aspectRatio?: number;
    onComplete: (croppedImage: string) => void | Promise<void>;
  } | null>(null);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [isMobile, setIsMobile] = useState(false);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const musicInputRef = useRef<HTMLInputElement | null>(null);
  const pageIdRef = useRef(info.pages.length);
  const stickerIdRef = useRef(info.stickers.length);
  const loadedDraftRef = useRef(hasStoredDraft());

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (loadedDraftRef.current) {
      toast.info('已加载上次保存的草稿');
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      localStorage.setItem('wedding_draft', JSON.stringify(info));
      localStorage.setItem('wedding_template', activeTemplate);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
    }, 500);
    return () => clearTimeout(timer);
  }, [info, activeTemplate]);

  const updateField = (field, value) => {
    setInfo(prev => ({ ...prev, [field]: value }));
  };

  const uploadImageToCloudIfEnabled = useCallback(async (folder: string, dataUrl: string, fileName: string) => {
    if (!isSupabaseConfigured) {
      return dataUrl;
    }

    return uploadImageDataUrlToCloud(folder, dataUrl, fileName);
  }, []);

  const openImageCropper = useCallback((file: File, onComplete: (croppedImage: string) => void, aspectRatio?: number) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setPendingCropImage({
        imageSrc: event.target?.result as string,
        aspectRatio,
        onComplete
      });
    };
    reader.onerror = () => toast.error('图片读取失败，请重试');
    reader.readAsDataURL(file);
  }, []);

  const handleCoverImageUpload = useCallback(async (dataUrl: string) => {
    return uploadImageToCloudIfEnabled('covers', dataUrl, 'cover.jpg');
  }, [uploadImageToCloudIfEnabled]);

  const ensureCloudImageUrl = useCallback(async (folder: string, value: string, fileNameBase: string) => {
    if (!value || !isDataUrl(value)) {
      return value;
    }

    const extension = getDataUrlExtension(value, 'jpg');
    return uploadImageDataUrlToCloud(folder, value, `${fileNameBase}.${extension}`);
  }, []);

  const ensureCloudAudioUrl = useCallback(async (value: string, fileNameBase: string) => {
    if (!value || !isDataUrl(value)) {
      return value;
    }

    const extension = getDataUrlExtension(value, 'mp3');
    return uploadAudioDataUrlToCloud(value, `${fileNameBase}.${extension}`);
  }, []);

  const prepareInfoForCloudShare = useCallback(async (currentInfo: WeddingInfo) => {
    let uploadedAssetCount = 0;

    const trackUploadedValue = (previousValue: string, nextValue: string) => {
      if (previousValue && previousValue !== nextValue) {
        uploadedAssetCount += 1;
      }
    };

    const coverImage = await ensureCloudImageUrl('covers', currentInfo.coverImage, 'cover-share');
    trackUploadedValue(currentInfo.coverImage, coverImage);

    const galleryImages = await Promise.all(
      currentInfo.galleryImages.map((image, index) =>
        ensureCloudImageUrl('gallery', image, `gallery-${index + 1}`)
      )
    );
    currentInfo.galleryImages.forEach((image, index) => trackUploadedValue(image, galleryImages[index]));

    const pages = await Promise.all(
      currentInfo.pages.map(async (page, pageIndex) => {
        const pageImage = await ensureCloudImageUrl('pages', page.image || '', `page-${pageIndex + 1}`);
        trackUploadedValue(page.image || '', pageImage);

        const pageImages = await Promise.all(
          (page.images || []).map((image, imageIndex) =>
            ensureCloudImageUrl('pages/gallery', image, `page-${pageIndex + 1}-gallery-${imageIndex + 1}`)
          )
        );
        (page.images || []).forEach((image, imageIndex) => trackUploadedValue(image, pageImages[imageIndex]));

        return {
          ...page,
          image: pageImage,
          images: pageImages
        };
      })
    );

    const bgMusic = await ensureCloudAudioUrl(currentInfo.bgMusic, 'wedding-music');
    trackUploadedValue(currentInfo.bgMusic, bgMusic);

    return {
      info: {
        ...currentInfo,
        coverImage,
        galleryImages,
        pages,
        bgMusic
      },
      uploadedAssetCount
    };
  }, [ensureCloudAudioUrl, ensureCloudImageUrl]);

  const addSticker = (type: StickerType) => {
    stickerIdRef.current += 1;
    const offset = info.stickers.length % 4;
    const newSticker: StickerItem = {
      id: `sticker_${stickerIdRef.current}`,
      type,
      x: 20 + offset * 18,
      y: 18 + offset * 12,
      size: 34,
      rotation: 0
    };
    setInfo(prev => ({ ...prev, stickers: [...prev.stickers, newSticker] }));
    setSelectedStickerId(newSticker.id);
    toast.success('已添加贴纸，可直接拖动调整位置');
  };

  const updateSticker = (stickerId: string, updates: Partial<StickerItem>) => {
    setInfo(prev => ({
      ...prev,
      stickers: prev.stickers.map(sticker =>
        sticker.id === stickerId ? { ...sticker, ...updates } : sticker
      )
    }));
  };

  const moveSticker = (stickerId: string, x: number, y: number) => {
    updateSticker(stickerId, { x, y });
  };

  const deleteSticker = (stickerId: string) => {
    setInfo(prev => ({
      ...prev,
      stickers: prev.stickers.filter(sticker => sticker.id !== stickerId)
    }));
    setSelectedStickerId(prev => (prev === stickerId ? null : prev));
  };

  const addPage = (type: string) => {
    pageIdRef.current += 1;
    const newPage: PageModule = {
      id: `page_${pageIdRef.current}`,
      type: type as PageModule['type'],
      title: pageTypes.find(t => t.id === type)?.name || '新页面',
      content: '',
      image: '',
      images: [],
      font: '',
      aspectRatio: type === 'gallery' ? '4 / 3' : '4 / 3',
      galleryMode: type === 'gallery' ? 'carousel' : undefined
    };
    setInfo(prev => ({ ...prev, pages: [...prev.pages, newPage] }));
    setEditingPage(newPage.id);
    toast.success('已添加新页面');
  };

  const updatePage = (pageId: string, updates: Partial<PageModule>) => {
    setInfo(prev => ({
      ...prev,
      pages: prev.pages.map(page => 
        page.id === pageId ? { ...page, ...updates } : page
      )
    }));
  };

  const deletePage = (pageId: string) => {
    if (confirm('确定要删除这个页面吗？')) {
      setInfo(prev => ({
        ...prev,
        pages: prev.pages.filter(page => page.id !== pageId)
      }));
      setEditingPage(null);
      toast.info('已删除页面');
    }
  };

  const reorderPages = (fromIndex: number, toIndex: number) => {
    const newPages = [...info.pages];
    const [removed] = newPages.splice(fromIndex, 1);
    newPages.splice(toIndex, 0, removed);
    setInfo(prev => ({ ...prev, pages: newPages }));
  };

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const generateShareUrl = useCallback(async () => {
    let shareInfo = info;
    let shareHintPrefix = '';

    if (isSupabaseConfigured) {
      try {
        const preparedInfo = await prepareInfoForCloudShare(info);
        shareInfo = preparedInfo.info;

        if (preparedInfo.uploadedAssetCount > 0) {
          setInfo(shareInfo);
          shareHintPrefix = `已自动上传 ${preparedInfo.uploadedAssetCount} 个本地素材到 Supabase，`;
        }

        const payload = buildSharePayload(shareInfo, activeTemplate);
        const invitationId = await createInvitationInCloud({
          template: activeTemplate,
          payload,
          coverImageUrl: shareInfo.coverImage || null,
          galleryImageUrls: shareInfo.galleryImages,
          bgMusicUrl: shareInfo.bgMusic || null,
        });

        return {
          url: `${window.location.origin}/#/preview?id=${invitationId}`,
          hint: `${shareHintPrefix}已生成 Supabase 云端分享链接，可跨设备访问。`
        };
      } catch (cloudError) {
        console.error('Failed to create Supabase share URL:', cloudError);
        toast.error(getShareErrorMessage(cloudError));
        return null;
      }
    }

    const payload = buildSharePayload(shareInfo, activeTemplate);

    try {
      const shortUrl = buildShortShareUrl(payload);
      return {
        url: shortUrl,
        hint: '当前环境未配置 Supabase，已生成本机短码链接。该链接仅在当前浏览器环境下可用。'
      };
    } catch (error) {
      console.error('Failed to generate local short share URL:', error);
      toast.error('生成短链接失败，请稍后重试');
      return null;
    }
  }, [info, activeTemplate]);

  const handleShare = async () => {
    const shareData = await generateShareUrl();
    if (!shareData) return;
    setShareUrl(shareData.url);
    setShareHint(shareData.hint);
    setShowShareModal(true);
  };

  const handleDownloadImage = async () => {
    if (!previewRef.current) {
      toast.error('预览区域不存在');
      return;
    }

    toast.loading('正在生成图片...');

    try {
      const canvas = await html2canvas(previewRef.current, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `婚礼请帖_${info.groomName || '新人'}_${info.brideName || ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('图片下载成功');
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('图片生成失败，请重试');
    } finally {
      toast.dismiss();
    }
  };

  const handleReset = () => {
    if (confirm('确定要重置所有内容吗？')) {
      setInfo(cloneDefaultWeddingInfo());
      localStorage.removeItem('wedding_draft');
      toast.info('已重置所有内容');
    }
  };

  const [showMapModal, setShowMapModal] = useState(false);
  const [mapSearchType, setMapSearchType] = useState<'ceremony' | 'banquet'>('ceremony');
  const [mapSearchResults, setMapSearchResults] = useState<AmapPoi[]>([]);
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const selectedSticker = info.stickers.find(sticker => sticker.id === selectedStickerId) || null;

  const handleMapSearch = (type: 'ceremony' | 'banquet') => {
    setMapSearchType(type);
    setMapSearchQuery(type === 'ceremony' ? info.ceremonyVenue : info.banquetVenue);
    setShowMapModal(true);
  };

  const searchAddress = async () => {
    if (!mapSearchQuery.trim()) return;
    
    try {
      const response = await fetch(`https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(mapSearchQuery)}&city=&output=json&key=cb6fb68b9184a02858f8059867959185`);
      const data = await response.json() as AmapSearchResponse;
      if (data.pois && data.pois.length > 0) {
        setMapSearchResults(data.pois);
      } else {
        setMapSearchResults([]);
        toast.info('未找到相关地点');
      }
    } catch (error) {
      console.error('地图搜索失败:', error);
      toast.error('地图搜索失败，请检查网络');
    }
  };

  const selectAddress = (address: AmapPoi) => {
    const name = address.name || address.formatted_address || address.address;
    const location = address.location || '';
    const [lng = 0, lat = 0] = location.split(',').map(Number);
    
    if (mapSearchType === 'ceremony') {
      updateField('ceremonyVenue', name);
      updateField('ceremonyLat', lat);
      updateField('ceremonyLng', lng);
    } else {
      updateField('banquetVenue', name);
      updateField('banquetLat', lat);
      updateField('banquetLng', lng);
    }
    
    setShowMapModal(false);
    toast.success('地点选择成功');
  };

  const renderTemplate = () => {
    const props = { info };
    let templateNode = <TemplateRomantic {...props} />;
    if (activeTemplate === 'classic') templateNode = <TemplateClassic {...props} />;
    if (activeTemplate === 'modern') templateNode = <TemplateModern {...props} />;
    if (activeTemplate === 'chinese') templateNode = <TemplateChinese {...props} />;
    if (activeTemplate === 'korean') templateNode = <TemplateKorean {...props} />;

    return (
      <>
        <div style={{ animation: 'invitationPageFlip 760ms cubic-bezier(0.22, 1, 0.36, 1) both', transformOrigin: 'top center' }}>
          {templateNode}
        </div>
        <StickerLayer
          stickers={info.stickers}
          editable
          selectedStickerId={selectedStickerId}
          containerRef={previewRef}
          onSelectSticker={setSelectedStickerId}
          onMoveSticker={moveSticker}
        />
      </>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: '#faf7f4' }}>
      <InvitationMotionStyles />
      <StickerVisualStyles />
      <header className="w-full" style={{ background: 'linear-gradient(135deg, #2c1810 0%, #4a1e28 100%)', borderBottom: '1px solid rgba(201,168,76,0.3)' }}>
        <div className="mx-auto flex items-center justify-between px-4 sm:px-8 py-3 sm:py-4" style={{ maxWidth: '1440px' }}>
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 sm:w-6 sm:h-6" style={{ color: '#c4788a' }} />
            <div>
              <h1 className="text-base sm:text-xl font-bold tracking-wider" style={{ fontFamily: 'Playfair Display, serif', color: '#f0d080' }}>婚礼请帖生成器</h1>
              <p className="hidden sm:block text-xs tracking-widest" style={{ color: 'rgba(201,168,76,0.6)' }}>Wedding Invitation Generator</p>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-4">
            <div className={`flex items-center gap-1 text-xs ${isSaved ? 'opacity-100' : 'opacity-50'}`} style={{ color: '#8aab8a' }}>
              <Save className="w-3 h-3 sm:w-4 sm:h-4" />
              {isSaved ? '已保存' : '保存中...'}
            </div>
            <button onClick={handleReset} className="flex items-center gap-1 px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs transition-colors hover:bg-white/10" style={{ color: 'rgba(201,168,76,0.8)' }}>
              <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">重置</span>
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex flex-col sm:flex-row gap-0" style={{ maxWidth: '1440px', minHeight: 'calc(100vh - 56px)' }}>
        <div className={`${isMobile ? (mobileView === 'edit' ? 'block' : 'hidden') : 'block'} flex flex-col`} style={{ width: isMobile ? '100%' : '440px', flexShrink: 0, background: '#fffdf9', borderRight: isMobile ? 'none' : '1px solid #e8d5c4' }}>
          <div className="px-4 sm:px-6 py-3 sm:py-4" style={{ borderBottom: '1px solid #e8d5c4', background: 'linear-gradient(135deg, #fdf0e8, #fffdf9)' }}>
            <h2 className="text-sm sm:text-base font-bold tracking-wider" style={{ fontFamily: 'Playfair Display, serif', color: '#2c1810' }}>填写婚礼信息</h2>
            <p className="text-xs mt-0.5" style={{ color: '#8b7355' }}>请填写以下信息，请帖将实时预览更新</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 sm:space-y-4">
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e8d5c4' }}>
              <button onClick={() => toggleSection('basic')} className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-[#fdf6f0] transition-colors" style={{ background: '#fff' }}>
                <span className="text-sm font-medium" style={{ color: '#2c1810' }}>基本信息</span>
                {expandedSections.basic ? <ChevronUp className="w-4 h-4" style={{ color: '#8b7355' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#8b7355' }} />}
              </button>
              {expandedSections.basic && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4">
                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <FormField label="新郎姓名" icon={<User className="w-3 h-3" />}>
                      <input type="text" value={info.groomName} onChange={(e) => updateField('groomName', e.target.value)} placeholder="请输入新郎姓名" className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2 ring-offset-1" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4', color: '#2c1810' }} />
                    </FormField>
                    <FormField label="新娘姓名" icon={<User className="w-3 h-3" />}>
                      <input type="text" value={info.brideName} onChange={(e) => updateField('brideName', e.target.value)} placeholder="请输入新娘姓名" className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2 ring-offset-1" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4', color: '#2c1810' }} />
                    </FormField>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:gap-4">
                    <FormField label="婚礼日期" icon={<Calendar className="w-3 h-3" />}>
                      <input type="date" value={info.weddingDate} onChange={(e) => updateField('weddingDate', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2 ring-offset-1" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4', color: '#2c1810' }} />
                    </FormField>
                    <FormField label="婚礼时间" icon={<Clock className="w-3 h-3" />}>
                      <input type="time" value={info.weddingTime} onChange={(e) => updateField('weddingTime', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2 ring-offset-1" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4', color: '#2c1810' }} />
                    </FormField>
                  </div>

                  <FormField label="仪式地点" icon={<MapPin className="w-3 h-3" />}>
                    <div className="relative">
                      <input type="text" value={info.ceremonyVenue} onChange={(e) => updateField('ceremonyVenue', e.target.value)} placeholder="请输入婚礼仪式地点" className="w-full px-3 py-2 pr-20 rounded-lg text-sm outline-none transition-all focus:ring-2 ring-offset-1" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4', color: '#2c1810' }} />
                      <button onClick={() => handleMapSearch('ceremony')} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors hover:bg-opacity-80" style={{ background: 'rgba(196, 120, 138, 0.1)', color: '#c4788a' }}>
                        <MapPin className="w-3 h-3" />
                        搜索
                      </button>
                    </div>
                  </FormField>

                  <FormField label="喜宴地点" icon={<MapPin className="w-3 h-3" />}>
                    <div className="relative">
                      <input type="text" value={info.banquetVenue} onChange={(e) => updateField('banquetVenue', e.target.value)} placeholder="请输入喜宴地点" className="w-full px-3 py-2 pr-20 rounded-lg text-sm outline-none transition-all focus:ring-2 ring-offset-1" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4', color: '#2c1810' }} />
                      <button onClick={() => handleMapSearch('banquet')} className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors hover:bg-opacity-80" style={{ background: 'rgba(196, 120, 138, 0.1)', color: '#c4788a' }}>
                        <MapPin className="w-3 h-3" />
                        搜索
                      </button>
                    </div>
                  </FormField>

                  <FormField label="新人寄语" icon={<Sparkles className="w-3 h-3" />}>
                    <div className="space-y-2">
                      <select value={weddingMessages.find(m => m.text === info.message)?.id || ''} onChange={(e) => {
                        const selectedMsg = weddingMessages.find(m => m.id === e.target.value);
                        if (selectedMsg) {
                          updateField('message', selectedMsg.text);
                        } else {
                          updateField('message', '');
                        }
                      }} className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2 ring-offset-1" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4', color: '#2c1810' }}>
                        <option value="">选择祝福语（可选）</option>
                        {weddingMessages.map(msg => (
                          <option key={msg.id} value={msg.id}>{msg.text}</option>
                        ))}
                      </select>
                      <textarea value={info.message} onChange={(e) => updateField('message', e.target.value)} placeholder="或在此输入自定义寄语" rows={2} className="w-full px-3 py-2 rounded-lg text-sm outline-none transition-all focus:ring-2 ring-offset-1 resize-none" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4', color: '#2c1810' }} />
                    </div>
                  </FormField>
                </div>
              )}
            </div>

            <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e8d5c4' }}>
              <button onClick={() => toggleSection('pages')} className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3" style={{ background: '#fff' }}>
                <div className="flex items-center gap-2">
                  <Layout className="w-4 h-4" style={{ color: '#c9a84c' }} />
                  <span className="text-sm font-medium" style={{ color: '#2c1810' }}>自定义页面</span>
                  {info.pages?.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#c4788a', color: 'white' }}>{info.pages?.length}</span>
                  )}
                </div>
                {expandedSections.pages ? <ChevronUp className="w-4 h-4" style={{ color: '#8b7355' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#8b7355' }} />}
              </button>
              {expandedSections.pages && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                  {info.pages?.length === 0 ? (
                    <div className="py-4 sm:py-6 text-center" style={{ background: '#fdf6f0', borderRadius: '8px' }}>
                      <Layout className="w-8 h-8 mx-auto mb-2" style={{ color: '#c9a84c' }} />
                      <p className="text-xs" style={{ color: '#8b7355' }}>暂无自定义页面</p>
                      <p className="text-xs mt-1" style={{ color: '#b8a898' }}>点击下方按钮添加页面</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {info.pages.map((page, index) => (
                        <div key={page.id} className={`rounded-lg border overflow-hidden transition-all ${editingPage === page.id ? 'ring-2 ring-offset-1 ring-[#c9a84c]' : ''}`} style={{ borderColor: '#e8d5c4' }}>
                          <div className="flex items-center gap-2 p-2.5 sm:p-3" style={{ background: '#fdf6f0' }}>
                            <GripVertical className="w-4 h-4 opacity-50" style={{ color: '#8b7355' }} />
                            <span className="text-sm font-medium flex-1" style={{ color: '#2c1810' }}>{page.title}</span>
                            <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: 'rgba(201,168,76,0.15)', color: '#c9a84c' }}>
                              {pageTypes.find(t => t.id === page.type)?.name || page.type}
                            </span>
                            <button onClick={() => deletePage(page.id)} className="p-1 rounded hover:bg-red-100 transition-colors">
                              <Trash2 className="w-4 h-4" style={{ color: '#c4788a' }} />
                            </button>
                          </div>
                          {editingPage === page.id && (
                            <div className="p-2.5 sm:p-3 space-y-2.5 sm:space-y-3">
                              <input type="text" value={page.title} onChange={(e) => updatePage(page.id, { title: e.target.value })} placeholder="页面标题" className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#fff', border: '1px solid #e8d5c4', color: '#2c1810' }} />
                              {(page.type === 'story' || page.type === 'quote') && (
                                <>
                                  {page.type === 'quote' && (
                                    <div>
                                      <p className="text-xs mb-2" style={{ color: '#8b7355' }}>选择语录</p>
                                      <select onChange={(e) => {
                                        if (e.target.value) {
                                          updatePage(page.id, { content: e.target.value });
                                        }
                                      }} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#fff', border: '1px solid #e8d5c4', color: '#2c1810' }}>
                                        <option value="">请选择语录...</option>
                                        {quoteList.map((quote) => (
                                          <option key={quote.id} value={quote.text}>{quote.text}</option>
                                        ))}
                                      </select>
                                    </div>
                                  )}
                                  <textarea value={page.content || ''} onChange={(e) => updatePage(page.id, { content: e.target.value })} placeholder="请输入内容..." rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: '#fff', border: '1px solid #e8d5c4', color: '#2c1810' }} />
                                </>
                              )}
                              {page.type === 'photo' && (
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs mb-2" style={{ color: '#8b7355' }}>照片展示比例</p>
                                    <select value={page.aspectRatio || '4 / 3'} onChange={(e) => updatePage(page.id, { aspectRatio: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#fff', border: '1px solid #e8d5c4', color: '#2c1810' }}>
                                      {aspectRatioOptions.map((option) => (
                                        <option key={option.value} value={option.value}>{option.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <p className="text-xs mb-2" style={{ color: '#8b7355' }}>上传图片</p>
                                    <div onClick={() => {
                                      const input = document.createElement('input');
                                      input.type = 'file';
                                      input.accept = 'image/*';
                                      input.onchange = (event: Event) => {
                                        const file = getFileFromInputEvent(event);
                                        if (file) {
                                          openImageCropper(
                                            file,
                                            async (croppedImage) => {
                                              const uploadedImage = await uploadImageToCloudIfEnabled('pages', croppedImage, 'page-photo.jpg');
                                              updatePage(page.id, { image: uploadedImage });
                                            },
                                            parseAspectRatio(page.aspectRatio) || 4 / 3
                                          );
                                        }
                                      };
                                      input.click();
                                    }} className="cursor-pointer">
                                      <PhotoFrame src={page.image || ''} alt="页面图片" aspectRatio={page.aspectRatio || '4 / 3'} roundedClassName="rounded-lg" imagePadding={2} />
                                      {!page.image && (
                                        <div className="mt-2 flex items-center justify-center gap-2 text-xs" style={{ color: '#8b7355' }}>
                                          <Upload className="w-4 h-4" style={{ color: '#c9a84c' }} />
                                          点击上传图片
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}
                              {page.type === 'gallery' && (
                                <div className="space-y-3">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <p className="text-xs mb-2" style={{ color: '#8b7355' }}>相册展示方式</p>
                                      <select value={page.galleryMode || 'carousel'} onChange={(e) => updatePage(page.id, { galleryMode: e.target.value as PageModule['galleryMode'] })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#fff', border: '1px solid #e8d5c4', color: '#2c1810' }}>
                                        <option value="carousel">轮播切换</option>
                                        <option value="grid">九宫格拼图</option>
                                      </select>
                                    </div>
                                    <div>
                                      <p className="text-xs mb-2" style={{ color: '#8b7355' }}>相框比例</p>
                                      <select value={page.aspectRatio || '4 / 3'} onChange={(e) => updatePage(page.id, { aspectRatio: e.target.value })} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#fff', border: '1px solid #e8d5c4', color: '#2c1810' }}>
                                        {aspectRatioOptions.map((option) => (
                                          <option key={option.value} value={option.value}>{option.label}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                  <p className="text-xs" style={{ color: '#8b7355' }}>上传相册图片</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {(page.images || []).map((img, i) => (
                                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                                        <img src={img} alt={`图片 ${i + 1}`} className="w-full h-full object-contain" style={{ background: '#fff8f4' }} />
                                        <button onClick={() => {
                                          const newImages = [...(page.images || [])];
                                          newImages.splice(i, 1);
                                          updatePage(page.id, { images: newImages });
                                        }} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(139,0,0,0.8)' }}>
                                          <X className="w-3 h-3 text-white" />
                                        </button>
                                      </div>
                                    ))}
                                    {(page.images || []).length < 6 && (
                                      <div onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.accept = 'image/*';
                                        input.onchange = (event: Event) => {
                                          const file = getFileFromInputEvent(event);
                                          if (file) {
                                            openImageCropper(
                                              file,
                                              async (croppedImage) => {
                                                const uploadedImage = await uploadImageToCloudIfEnabled('pages/gallery', croppedImage, 'page-gallery.jpg');
                                                updatePage(page.id, { images: [...(page.images || []), uploadedImage] });
                                              },
                                              parseAspectRatio(page.aspectRatio) || 4 / 3
                                            );
                                          }
                                        };
                                        input.click();
                                      }} className="aspect-square rounded-lg cursor-pointer flex items-center justify-center" style={{ background: '#fdf6f0', border: '2px dashed #e8d5c4' }}>
                                        <Plus className="w-5 h-5" style={{ color: '#c9a84c' }} />
                                      </div>
                                    )}
                                  </div>
                                  {!!(page.images || []).length && (
                                    <div className="rounded-xl p-2" style={{ background: '#fff', border: '1px solid #e8d5c4' }}>
                                      {page.galleryMode === 'carousel' ? (
                                        <PhotoCarousel images={(page.images || []).slice(0, 6)} aspectRatio={page.aspectRatio || '4 / 3'} themeColor="#c4788a" />
                                      ) : (
                                        <div className="grid grid-cols-3 gap-2">
                                          {(page.images || []).slice(0, 6).map((img, i) => (
                                            <PhotoFrame key={i} src={img} alt={`预览 ${i + 1}`} aspectRatio={page.aspectRatio || '4 / 3'} />
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              <div className="flex items-center gap-2">
                                <Type className="w-4 h-4" style={{ color: '#c9a84c' }} />
                                <select value={page.font || ''} onChange={(e) => updatePage(page.id, { font: e.target.value })} className="flex-1 px-3 py-1.5 rounded-lg text-xs outline-none" style={{ background: '#fff', border: '1px solid #e8d5c4', color: '#2c1810' }}>
                                  <option value="">使用默认字体</option>
                                  {fonts.map(font => (
                                    <option key={font.id} value={font.id} style={{ fontFamily: font.family }}>{font.name}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-2 sm:mt-3 flex flex-wrap gap-1.5 sm:gap-2">
                    {pageTypes.map(type => (
                      <button key={type.id} onClick={() => addPage(type.id)} className="flex items-center gap-1 px-2.5 py-1.25 sm:px-3 sm:py-1.5 rounded-lg text-xs font-medium transition-all hover:opacity-80" style={{ background: '#c9a84c', color: 'white' }}>
                        <span>{type.icon}</span>
                        {type.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e8d5c4' }}>
              <button onClick={() => toggleSection('appearance')} className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3" style={{ background: '#fff' }}>
                <div className="flex items-center gap-2">
                  <Type className="w-4 h-4" style={{ color: '#c9a84c' }} />
                  <span className="text-sm font-medium" style={{ color: '#2c1810' }}>外观设置</span>
                </div>
                {expandedSections.appearance ? <ChevronUp className="w-4 h-4" style={{ color: '#8b7355' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#8b7355' }} />}
              </button>
              {expandedSections.appearance && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3 sm:space-y-4">
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: '#8b7355' }}>默认字体</label>
                    <select value={info.defaultFont} onChange={(e) => updateField('defaultFont', e.target.value)} className="w-full px-3 py-2 rounded-lg text-sm outline-none" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4', color: '#2c1810' }}>
                      {fonts.map(font => (
                        <option key={font.id} value={font.id} style={{ fontFamily: font.family }}>{font.name}</option>
                      ))}
                    </select>
                  </div>

                  <ImageUploader label="封面图片" value={info.coverImage} onChange={(v) => updateField('coverImage', v)} aspectRatio={4/3} uploadHandler={handleCoverImageUpload} />

                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: '#8b7355' }}>主题风格</label>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {templates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => setActiveTemplate(template.id)}
                          className="p-2.5 sm:p-3 rounded-lg text-left transition-all"
                          style={{
                            background: activeTemplate === template.id ? '#fdf6f0' : '#fff',
                            boxShadow: activeTemplate === template.id ? `0 0 0 2px ${template.color}` : undefined
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <div className="w-3 h-3 rounded-full" style={{ background: template.color }} />
                            <span className="text-sm font-medium" style={{ color: '#2c1810' }}>{template.name}</span>
                          </div>
                          <span className="text-xs" style={{ color: '#8b7355' }}>{template.subtitle}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: '#8b7355' }}>自定义主题色</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={info.customColor || '#c4788a'}
                          onChange={(e) => updateField('customColor', e.target.value)}
                          className="w-10 h-10 rounded-lg cursor-pointer border-0 p-0"
                          style={{ background: 'transparent' }}
                        />
                        <div className="flex-1 flex items-center justify-between">
                          <span className="text-sm" style={{ color: '#2c1810' }}>
                            {info.customColor || '点击选择颜色'}
                          </span>
                          {info.customColor && (
                            <button onClick={() => updateField('customColor', '')} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                              清除
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {['#c4788a', '#c9a84c', '#8aab8a', '#8b0000', '#ff69b4', '#9370db', '#00ced1', '#ff7f50'].map((color) => (
                          <button
                            key={color}
                            onClick={() => updateField('customColor', color)}
                            className={`w-7 h-7 rounded-full transition-transform hover:scale-110 ${info.customColor === color ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                            style={{ background: color }}
                            title={color}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: '#8b7355' }}>背景音乐</label>
                    <div
                      onClick={() => musicInputRef.current?.click()}
                      className={`relative rounded-lg overflow-hidden cursor-pointer transition-all hover:opacity-80 ${info.bgMusic ? 'flex items-center justify-between' : 'flex items-center justify-center'}`}
                      style={{ background: info.bgMusic ? 'rgba(196, 120, 138, 0.07)' : 'linear-gradient(135deg, #fdf6f0 0%, #f8f0e8 100%)', border: info.bgMusic ? '1px solid rgba(196,120,138,0.3)' : '2px dashed #e8d5c4', padding: '12px 14px' }}
                    >
                      {info.bgMusic ? (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ background: '#c4788a' }}>
                              <AudioLines className="w-5 h-5 text-white" />
                            </div>
                            <div>
                              <p className="text-sm font-medium truncate max-w-[180px]" style={{ color: '#2c1810' }}>{info.bgMusicName || '背景音乐'}</p>
                              <p className="text-xs" style={{ color: '#8b7355' }}>支持 MP3 格式，建议小于 5MB</p>
                            </div>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); updateField('bgMusic', ''); updateField('bgMusicName', ''); }} className="flex items-center gap-1 text-xs px-2 py-1 rounded transition-colors" style={{ color: '#c4788a', background: 'rgba(196,120,138,0.1)' }}>
                            <X className="w-3 h-3" />
                            移除
                          </button>
                        </>
                      ) : (
                        <>
                          <AudioLines className="w-6 h-6 mr-2" style={{ color: '#c9a84c' }} />
                          <span className="text-xs" style={{ color: '#8b7355' }}>点击上传背景音乐 (MP3)</span>
                        </>
                      )}
                      <input ref={musicInputRef} type="file" accept="audio/mpeg,.mp3" onChange={async (e: React.ChangeEvent<HTMLInputElement>) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('文件大小不能超过 5MB');
                            e.target.value = '';
                            return;
                          }
                          try {
                            const musicUrl = isSupabaseConfigured
                              ? await uploadAudioFileToCloud(file)
                              : await readFileAsDataUrl(file);
                            updateField('bgMusic', musicUrl);
                            updateField('bgMusicName', file.name);
                            toast.success(isSupabaseConfigured ? '音乐已上传到 Supabase' : '音乐上传成功');
                          } catch (error) {
                            console.error('音乐上传失败:', error);
                            toast.error(getUploadErrorMessage(error));
                          }
                        }
                        e.target.value = '';
                      }} className="hidden" />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: '#8b7355' }}>花瓣飘落效果</label>
                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4' }}>
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4" style={{ color: '#c9a84c' }} />
                        <span className="text-sm" style={{ color: '#2c1810' }}>开启浪漫花瓣飘落动画</span>
                      </div>
                      <button onClick={() => updateField('petalsEnabled', !info.petalsEnabled)} className={`w-10 h-6 rounded-full transition-all relative ${info.petalsEnabled ? 'bg-[#c9a84c]' : 'bg-gray-300'}`}>
                        <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${info.petalsEnabled ? 'left-5' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-lg border overflow-hidden" style={{ borderColor: '#e8d5c4' }}>
              <button onClick={() => toggleSection('stickers')} className="w-full flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3" style={{ background: '#fff' }}>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4" style={{ color: '#c9a84c' }} />
                  <span className="text-sm font-medium" style={{ color: '#2c1810' }}>贴纸装饰</span>
                  {info.stickers.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#c4788a', color: 'white' }}>{info.stickers.length}</span>
                  )}
                </div>
                {expandedSections.stickers ? <ChevronUp className="w-4 h-4" style={{ color: '#8b7355' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#8b7355' }} />}
              </button>
              {expandedSections.stickers && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-3">
                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: '#8b7355' }}>添加贴纸</label>
                    <div className="grid grid-cols-2 gap-2">
                      {stickerOptions.map((sticker) => (
                        <button
                          key={sticker.id}
                          onClick={() => addSticker(sticker.id)}
                          className="flex items-center gap-2 rounded-xl px-3 py-2 text-left transition-all hover:opacity-85"
                          style={{ background: '#fdf6f0', border: '1px solid #e8d5c4' }}
                        >
                          <div className="w-11 h-11 shrink-0">
                            <AnimatedSticker type={sticker.id} />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#2c1810' }}>{sticker.label}</p>
                            <p className="text-xs" style={{ color: '#8b7355' }}>点击加入请帖</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>

                  {selectedSticker ? (
                    <div className="rounded-xl p-3 space-y-3" style={{ background: '#fdf6f0', border: '1px solid #e8d5c4' }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-12 h-12 shrink-0">
                            <AnimatedSticker type={selectedSticker.type} selected />
                          </div>
                          <div>
                            <p className="text-sm font-medium" style={{ color: '#2c1810' }}>当前贴纸</p>
                            <p className="text-xs" style={{ color: '#8b7355' }}>可在预览区直接拖动位置</p>
                          </div>
                        </div>
                        <button onClick={() => deleteSticker(selectedSticker.id)} className="px-2 py-1 rounded-lg text-xs transition-colors" style={{ color: '#c4788a', background: 'rgba(196,120,138,0.1)' }}>
                          删除
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs" style={{ color: '#8b7355' }}>大小</label>
                          <span className="text-xs" style={{ color: '#2c1810' }}>{selectedSticker.size}px</span>
                        </div>
                        <input type="range" min="24" max="72" value={selectedSticker.size} onChange={(e) => updateSticker(selectedSticker.id, { size: Number(e.target.value) })} className="w-full" />
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs" style={{ color: '#8b7355' }}>旋转</label>
                          <span className="text-xs" style={{ color: '#2c1810' }}>{selectedSticker.rotation}°</span>
                        </div>
                        <input type="range" min="-45" max="45" value={selectedSticker.rotation} onChange={(e) => updateSticker(selectedSticker.id, { rotation: Number(e.target.value) })} className="w-full" />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl p-3 text-xs" style={{ background: '#fdf6f0', border: '1px dashed #e8d5c4', color: '#8b7355' }}>
                      先添加一个贴纸，然后在右侧请帖预览中拖动到喜欢的位置。
                    </div>
                  )}

                  {info.stickers.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-xs font-semibold block" style={{ color: '#8b7355' }}>贴纸列表</label>
                      <div className="space-y-2">
                        {info.stickers.map((sticker, index) => (
                          <div
                            key={sticker.id}
                            className="w-full flex items-center justify-between rounded-xl px-3 py-2 transition-all"
                            style={{
                              background: selectedStickerId === sticker.id ? '#fdf0e8' : '#fff',
                              border: selectedStickerId === sticker.id ? '1px solid #c9a84c' : '1px solid #e8d5c4'
                            }}
                          >
                            <button type="button" onClick={() => setSelectedStickerId(sticker.id)} className="flex flex-1 items-center gap-2 text-left">
                              <div className="w-10 h-10 shrink-0">
                                <AnimatedSticker type={sticker.type} selected={selectedStickerId === sticker.id} />
                              </div>
                              <div>
                                <p className="text-sm" style={{ color: '#2c1810' }}>贴纸 {index + 1}</p>
                                <p className="text-xs" style={{ color: '#8b7355' }}>位置 {Math.round(sticker.x)}%, {Math.round(sticker.y)}%</p>
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteSticker(sticker.id);
                              }}
                              className="p-1 rounded transition-colors hover:bg-red-50"
                            >
                              <Trash2 className="w-4 h-4" style={{ color: '#c4788a' }} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #c4788a, #c9a84c)', color: 'white' }}>
              <Share2 className="w-5 h-5" />
              分享请帖
            </button>
          </div>
        </div>

        <div className={`${isMobile ? (mobileView === 'preview' ? 'block' : 'hidden') : 'block'} flex-1 bg-gray-50 p-4 sm:p-8 overflow-auto`}>
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div ref={previewRef} className="relative w-full" style={{ maxWidth: '375px', margin: '0 auto' }} onClick={() => setSelectedStickerId(null)}>
                {renderTemplate()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {isMobile && (
        <div className="fixed bottom-0 left-0 right-0 flex items-center justify-around py-2 px-4" style={{ background: '#fffdf9', borderTop: '1px solid #e8d5c4', boxShadow: '0 -2px 10px rgba(0,0,0,0.05)' }}>
          <button onClick={() => setMobileView('edit')} className={`flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-all ${mobileView === 'edit' ? 'bg-[#fdf0e8]' : ''}`}>
            <Layout className="w-5 h-5" style={{ color: mobileView === 'edit' ? '#c9a84c' : '#8b7355' }} />
            <span className="text-xs" style={{ color: mobileView === 'edit' ? '#c9a84c' : '#8b7355' }}>编辑</span>
          </button>
          <button onClick={() => setMobileView('preview')} className={`flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-all ${mobileView === 'preview' ? 'bg-[#fdf0e8]' : ''}`}>
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: mobileView === 'preview' ? '#c9a84c' : '#f0e8e0' }}>
              <Sparkles className="w-4 h-4" style={{ color: mobileView === 'preview' ? 'white' : '#8b7355' }} />
            </div>
            <span className="text-xs" style={{ color: mobileView === 'preview' ? '#c9a84c' : '#8b7355' }}>预览</span>
          </button>
          <button onClick={handleShare} className="flex flex-col items-center gap-1 px-6 py-2 rounded-lg transition-all">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#f0e8e0' }}>
              <Share2 className="w-4 h-4" style={{ color: '#8b7355' }} />
            </div>
            <span className="text-xs" style={{ color: '#8b7355' }}>分享</span>
          </button>
        </div>
      )}

      <ShareModal
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
        shareUrl={shareUrl}
        shareHint={shareHint}
        onDownloadImage={handleDownloadImage}
      />

      {pendingCropImage && (
        <ImageCropper
          imageSrc={pendingCropImage.imageSrc}
          aspectRatio={pendingCropImage.aspectRatio}
          onComplete={async (croppedImage) => {
            try {
              await pendingCropImage.onComplete(croppedImage);
              setPendingCropImage(null);
              toast.success('图片裁剪并上传成功');
            } catch (error) {
              console.error('裁剪图片上传失败:', error);
              toast.error(getUploadErrorMessage(error));
            }
          }}
          onCancel={() => setPendingCropImage(null)}
        />
      )}

      {showMapModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowMapModal(false)}>
          <div className="bg-white rounded-2xl p-4 w-full max-w-md mx-4 max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold" style={{ color: '#2c1810', fontFamily: 'Playfair Display, serif' }}>
                选择{mapSearchType === 'ceremony' ? '仪式' : '喜宴'}地点
              </h3>
              <button onClick={() => setShowMapModal(false)} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" style={{ color: '#8b7355' }} />
              </button>
            </div>
            
            <div className="relative mb-4">
              <input 
                type="text" 
                value={mapSearchQuery} 
                onChange={(e) => setMapSearchQuery(e.target.value)} 
                placeholder="输入地点名称搜索"
                className="w-full px-4 py-2 rounded-xl text-sm outline-none" 
                style={{ background: '#fdf6f0', border: '1px solid #e8d5c4', color: '#2c1810' }}
                onKeyPress={(e) => e.key === 'Enter' && searchAddress()}
              />
              <button onClick={searchAddress} className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 rounded-lg text-sm font-medium transition-colors hover:opacity-90" style={{ background: 'linear-gradient(135deg, #c4788a, #c9a84c)', color: 'white' }}>
                搜索
              </button>
            </div>
            
            <div className="flex-1 overflow-auto space-y-2">
              {mapSearchResults.length > 0 ? (
                mapSearchResults.map((item, index) => (
                  <button 
                    key={index} 
                    onClick={() => selectAddress(item)}
                    className="w-full p-3 text-left rounded-xl transition-colors hover:bg-[#fdf6f0]"
                    style={{ border: '1px solid #e8d5c4' }}
                  >
                    <p className="font-medium text-sm" style={{ color: '#2c1810' }}>{item.name}</p>
                    <p className="text-xs mt-1" style={{ color: '#8b7355' }}>
                      {item.formatted_address || item.address || '暂无详细地址'}
                    </p>
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <MapPin className="w-12 h-12 mx-auto mb-3 opacity-50" style={{ color: '#c9a84c' }} />
                  <p className="text-sm" style={{ color: '#8b7355' }}>输入地点名称进行搜索</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeddingInvitationGenerator;
