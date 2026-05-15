import React, { useEffect, useState, useRef } from 'react';
import { Heart, Play, Pause } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import { QRCodeCanvas } from 'qrcode.react';
import FallingPetals from '../components/FallingPetals';
import '../components/FallingPetals.css';
import { getInvitationFromCloud, isSupabaseConfigured } from '../lib/weddingCloud';

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
  template: string;
  bgMusic: string;
  bgMusicName: string;
  petalsEnabled: boolean;
  customColor: string;
  stickers: StickerItem[];
}

interface SharePayload {
  info?: WeddingInfo;
  template?: string;
  createdAt?: number;
}

type StickerType = 'rose' | 'heart' | 'bell' | 'fireworks';

interface StickerItem {
  id: string;
  type: StickerType;
  x: number;
  y: number;
  size: number;
  rotation: number;
}

const fonts = [
  { id: 'cormorant', name: '优雅衬线', family: "'Cormorant Garamond', serif" },
  { id: 'dancing', name: '花体手写', family: "'Dancing Script', cursive" },
  { id: 'playfair', name: '古典衬线', family: "'Playfair Display, serif" },
  { id: 'noto', name: '思源宋体', family: "'Noto Serif SC', serif" },
  { id: 'sans', name: '现代无衬线', family: "'Noto Sans SC', sans-serif" },
];

const normalizePages = (pages: PageModule[] | undefined): PageModule[] => {
  if (!Array.isArray(pages)) return [];

  return pages.map((page) => ({
    ...page,
    images: Array.isArray(page.images) ? page.images : [],
    aspectRatio: page.aspectRatio || '4 / 3',
    galleryMode: page.galleryMode || (page.type === 'gallery' ? 'carousel' : undefined)
  }));
};

const decodeBase64Url = (value: string): string => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return normalized + padding;
};

const copyText = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Fall through to the legacy copy path for mobile browsers.
  }

  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', 'true');
    textarea.style.position = 'fixed';
    textarea.style.top = '0';
    textarea.style.left = '0';
    textarea.style.opacity = '0';
    textarea.style.pointerEvents = 'none';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    textarea.setSelectionRange(0, textarea.value.length);
    const copied = document.execCommand('copy');
    document.body.removeChild(textarea);
    return copied;
  } catch {
    return false;
  }
};

const parseCompressedPayload = async (value: string): Promise<SharePayload | WeddingInfo> => {
  if (typeof window === 'undefined' || typeof window.DecompressionStream === 'undefined') {
    throw new Error('Compressed share links are not supported in this browser.');
  }

  const binary = atob(decodeBase64Url(value));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  const decompressedStream = new Blob([bytes]).stream().pipeThrough(new window.DecompressionStream('gzip'));
  const json = await new Response(decompressedStream).text();
  return JSON.parse(json) as SharePayload | WeddingInfo;
};

const stickerEmojiMap: Record<StickerType, string> = {
  rose: '🌹',
  heart: '💖',
  bell: '🔔',
  fireworks: '🎆'
};

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
  imagePadding = 4,
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
      background: 'linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(248,241,235,0.98) 100%)',
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
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0.35))' }} />
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

const normalizeWeddingInfo = (data: Partial<WeddingInfo>): WeddingInfo => ({
  groomName: data.groomName || '',
  brideName: data.brideName || '',
  weddingDate: data.weddingDate || '',
  weddingTime: data.weddingTime || '',
  ceremonyVenue: data.ceremonyVenue || '',
  banquetVenue: data.banquetVenue || '',
  ceremonyLat: data.ceremonyLat || 0,
  ceremonyLng: data.ceremonyLng || 0,
  banquetLat: data.banquetLat || 0,
  banquetLng: data.banquetLng || 0,
  message: data.message || '',
  coverImage: data.coverImage || '',
  galleryImages: Array.isArray(data.galleryImages) ? data.galleryImages : [],
  pages: normalizePages(data.pages),
  defaultFont: data.defaultFont || 'cormorant',
  template: data.template || 'romantic',
  bgMusic: data.bgMusic || '',
  bgMusicName: data.bgMusicName || '',
  petalsEnabled: data.petalsEnabled ?? true,
  customColor: data.customColor || '',
  stickers: Array.isArray(data.stickers) ? data.stickers : []
});

const generateMapLink = (address: string, lat: number = 0, lng: number = 0): string => {
  const encodedAddress = encodeURIComponent(address);
  const locationParam = lat && lng ? `&location=${lat},${lng}` : '';
  
  const baiduAppLink = lat && lng 
    ? `baidumap://map/direction?destination=name:${encodedAddress}|latlng:${lat},${lng}&mode=driving&src=婚礼请帖`
    : `baidumap://map/geocoder?src=婚礼请帖&address=${encodedAddress}`;
  
  const baiduWebLink = lat && lng 
    ? `https://map.baidu.com/search/${encodedAddress}/@${lng},${lat},18z`
    : `https://map.baidu.com/search/${encodedAddress}`;
  
  const iosLink = `maps://maps.apple.com/?q=${encodedAddress}${lat && lng ? `&ll=${lat},${lng}` : ''}`;
  const androidLink = `geo:${lat || 0},${lng || 0}?q=${encodedAddress}`;
  
  return `javascript:(function(){
    var addr = '${encodedAddress}';
    var ua = navigator.userAgent;
    if(ua.match(/MicroMessenger/i)){
      window.location.href = '${baiduWebLink}';
    } else if(ua.match(/(iPad|iPhone|iPod)/)){
      window.location.href = '${baiduAppLink}';
      setTimeout(function(){
        if(document.readyState === 'complete'){
          window.location.href = '${iosLink}';
        }
      }, 500);
    } else if(ua.match(/Android/)){
      window.location.href = '${baiduAppLink}';
      setTimeout(function(){
        if(document.readyState === 'complete'){
          window.location.href = '${androidLink}';
        }
      }, 500);
    } else {
      window.location.href = '${baiduWebLink}';
    }
  })()`;
};

const handleMapClick = (address: string, lat: number = 0, lng: number = 0) => {
  const encodedAddress = encodeURIComponent(address);
  
  const gaodeAppLink = lat && lng
    ? `androidamap://navi?sourceApplication=婚礼请帖&lat=${lat}&lon=${lng}&dname=${encodedAddress}&dev=0&m=0`
    : `androidamap://search?keywords=${encodedAddress}&dev=0`;
  
  const gaodeIosLink = lat && lng
    ? `iosamap://navi?sourceApplication=婚礼请帖&lat=${lat}&lon=${lng}&dname=${encodedAddress}&dev=0&m=0`
    : `iosamap://search?keywords=${encodedAddress}`;
  
  const gaodeWebLink = lat && lng
    ? `https://uri.amap.com/navigation?to=${lng},${lat},${encodedAddress}&mode=car&callnative=0`
    : `https://surl.amap.com/search?query=${encodedAddress}`;
  
  const baiduAppLink = lat && lng
    ? `baidumap://map/direction?destination=name:${encodedAddress}|latlng:${lat},${lng}&mode=driving&src=婚礼请帖`
    : `baidumap://map/geocoder?src=婚礼请帖&address=${encodedAddress}`;
  
  const baiduWebLink = lat && lng
    ? `https://map.baidu.com/search/${encodedAddress}/@${lng},${lat},18z`
    : `https://map.baidu.com/search/${encodedAddress}`;
  
  const iosLink = `maps://maps.apple.com/?q=${encodedAddress}${lat && lng ? `&ll=${lat},${lng}` : ''}`;
  const androidLink = `geo:${lat || 0},${lng || 0}?q=${encodedAddress}`;
  
  const ua = navigator.userAgent;
  
  const isWechat = ua.match(/MicroMessenger/i);
  const isIOS = ua.match(/(iPad|iPhone|iPod)/);
  const isAndroid = ua.match(/Android/);
  
  if (isWechat) {
    window.location.href = gaodeWebLink;
    return;
  }
  
  if (isIOS) {
    window.location.href = gaodeIosLink;
    setTimeout(() => {
      window.location.href = baiduAppLink;
    }, 500);
    setTimeout(() => {
      window.location.href = iosLink;
    }, 1000);
    return;
  }
  
  if (isAndroid) {
    window.location.href = gaodeAppLink;
    setTimeout(() => {
      window.location.href = baiduAppLink;
    }, 500);
    setTimeout(() => {
      window.location.href = androidLink;
    }, 1000);
    return;
  }
  
  window.location.href = gaodeWebLink;
};

const openMapChooser = (address: string, lat: number = 0, lng: number = 0) => {
  const encodedAddress = encodeURIComponent(address);
  
  const gaodeAppLink = lat && lng
    ? `androidamap://navi?sourceApplication=婚礼请帖&lat=${lat}&lon=${lng}&dname=${encodedAddress}&dev=0&m=0`
    : `androidamap://search?keywords=${encodedAddress}&dev=0`;
  
  const gaodeIosLink = lat && lng
    ? `iosamap://navi?sourceApplication=婚礼请帖&lat=${lat}&lon=${lng}&dname=${encodedAddress}&dev=0&m=0`
    : `iosamap://search?keywords=${encodedAddress}`;
  
  const gaodeWebLink = lat && lng
    ? `https://uri.amap.com/navigation?to=${lng},${lat},${encodedAddress}&mode=car&callnative=0`
    : `https://surl.amap.com/search?query=${encodedAddress}`;
  
  const baiduAppLink = lat && lng
    ? `baidumap://map/direction?destination=name:${encodedAddress}|latlng:${lat},${lng}&mode=driving&src=婚礼请帖`
    : `baidumap://map/geocoder?src=婚礼请帖&address=${encodedAddress}`;
  
  const baiduWebLink = lat && lng
    ? `https://map.baidu.com/search/${encodedAddress}/@${lng},${lat},18z`
    : `https://map.baidu.com/search/${encodedAddress}`;
  
  const iosLink = `maps://maps.apple.com/?q=${encodedAddress}${lat && lng ? `&ll=${lat},${lng}` : ''}`;
  
  const ua = navigator.userAgent;
  const isIOS = ua.match(/(iPad|iPhone|iPod)/);
  
  const modal = document.createElement('div');
  modal.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
  modal.onclick = () => modal.remove();
  
  const content = document.createElement('div');
  content.style.cssText = 'background:white;border-radius:16px;padding:24px;width:280px;text-align:center;';
  content.onclick = (e) => e.stopPropagation();
  
  content.innerHTML = `
    <p style="font-size:16px;font-weight:bold;color:#2c1810;margin-bottom:16px;">选择地图导航</p>
    <p style="font-size:14px;color:#8b7355;margin-bottom:16px;word-break:break-all;">${address}</p>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <button id="mapGaode" style="padding:12px;border:none;border-radius:10px;background:#1aad19;color:white;font-size:14px;cursor:pointer;">高德地图</button>
      <button id="mapBaidu" style="padding:12px;border:none;border-radius:10px;background:#306dec;color:white;font-size:14px;cursor:pointer;">百度地图</button>
      <button id="mapApple" style="padding:12px;border:none;border-radius:10px;background:#333;color:white;font-size:14px;cursor:pointer;">苹果地图</button>
    </div>
    <button id="mapCancel" style="margin-top:12px;padding:8px;border:none;background:transparent;color:#8b7355;font-size:12px;cursor:pointer;">取消</button>
  `;
  
  modal.appendChild(content);
  document.body.appendChild(modal);
  
  document.getElementById('mapGaode').onclick = () => {
    modal.remove();
    if (isIOS) {
      window.location.href = gaodeIosLink;
    } else {
      window.location.href = gaodeAppLink;
    }
    setTimeout(() => {
      window.location.href = gaodeWebLink;
    }, 500);
  };
  
  document.getElementById('mapBaidu').onclick = () => {
    modal.remove();
    window.location.href = baiduAppLink;
    setTimeout(() => {
      window.location.href = baiduWebLink;
    }, 500);
  };
  
  document.getElementById('mapApple').onclick = () => {
    modal.remove();
    window.location.href = iosLink;
  };
  
  document.getElementById('mapCancel').onclick = () => {
    modal.remove();
  };
};

const PageModuleRenderer = ({ page, defaultFont, themeColor }) => {
  const font = fonts.find(f => f.id === (page.font || defaultFont)) || fonts[0];
  const pageAspectRatio = page.aspectRatio || '4 / 3';
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
    <div style={{ animation: 'invitationPageFlip 720ms cubic-bezier(0.22, 1, 0.36, 1) both' }}>
      {renderContent()}
    </div>
  );
};

const StickerLayer = ({ stickers }: { stickers: StickerItem[] }) => {
  if (stickers.length === 0) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {stickers.map((sticker) => (
        <div
          key={sticker.id}
          className="absolute flex items-center justify-center"
          style={{
            left: `${sticker.x}%`,
            top: `${sticker.y}%`,
            width: `${sticker.size + 12}px`,
            height: `${sticker.size + 12}px`,
            fontSize: `${sticker.size}px`,
            lineHeight: 1,
            transform: `translate(-50%, -50%) rotate(${sticker.rotation}deg)`,
            zIndex: 20
          }}
        >
          <span>{stickerEmojiMap[sticker.type] || '✨'}</span>
        </div>
      ))}
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
            <button onClick={() => openMapChooser(displayCeremony, info.ceremonyLat, info.ceremonyLng)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity w-full text-left" style={{ color: themeColor, background: 'transparent', border: 'none', padding: 0 }}>{displayCeremony}</button>
          </div>
          <div className="rounded-lg p-3" style={{ background: `${accentColor}11`, border: `1px solid ${accentColor}33` }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: accentColor }}>喜宴地点</p>
            <button onClick={() => openMapChooser(displayBanquet, info.banquetLat, info.banquetLng)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity w-full text-left" style={{ color: themeColor, background: 'transparent', border: 'none', padding: 0 }}>{displayBanquet}</button>
          </div>
        </div>

        {info.galleryImages && info.galleryImages.length > 0 && (
          <div className="w-full max-w-sm mt-4">
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: themeColor }}>甜蜜瞬间</p>
            <div className="grid grid-cols-3 gap-2">
              {info.galleryImages.slice(0, 3).map((img, i) => (
                <PhotoFrame key={i} src={img} alt={`相册 ${i + 1}`} aspectRatio="1 / 1" animationDelay={`${i * 180}ms`} />
              ))}
            </div>
          </div>
        )}

        {info.pages && info.pages.map(page => (
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
          <div className="flex items-start gap-3 text-left py-2" style={{ borderBottom: `1px solid ${themeColor}25` }}>
            <p className="text-xs tracking-wider whitespace-nowrap mt-0.5" style={{ color: themeColor, minWidth: '56px' }}>仪式地点</p>
            <button onClick={() => openMapChooser(displayCeremony, info.ceremonyLat, info.ceremonyLng)} className="text-xs leading-relaxed underline underline-offset-2 hover:opacity-80 transition-opacity w-full text-left" style={{ color: lightColor, background: 'transparent', border: 'none', padding: 0 }}>{displayCeremony}</button>
          </div>
          <div className="flex items-start gap-3 text-left py-2" style={{ borderBottom: `1px solid ${themeColor}25` }}>
            <p className="text-xs tracking-wider whitespace-nowrap mt-0.5" style={{ color: themeColor, minWidth: '56px' }}>喜宴地点</p>
            <button onClick={() => openMapChooser(displayBanquet, info.banquetLat, info.banquetLng)} className="text-xs leading-relaxed underline underline-offset-2 hover:opacity-80 transition-opacity w-full text-left" style={{ color: lightColor, background: 'transparent', border: 'none', padding: 0 }}>{displayBanquet}</button>
          </div>
        </div>

        {info.galleryImages && info.galleryImages.length > 0 && (
          <div className="w-full max-w-xs mt-4 grid grid-cols-3 gap-2">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <PhotoFrame key={i} src={img} alt={`相册 ${i + 1}`} aspectRatio="1 / 1" animationDelay={`${i * 180}ms`} />
            ))}
          </div>
        )}

        {info.pages && info.pages.map(page => (
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
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: `${accentColor}10` }}>📅</div>
            <div>
              <p className="text-xs tracking-wider uppercase" style={{ color: accentColor, marginBottom: '1px' }}>日期与时间</p>
              <p className="text-xs" style={{ color: '#2c1810', lineHeight: 1.5 }}>{displayDate} {displayTime}</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: `${accentColor}10` }}>💒</div>
            <div>
              <p className="text-xs tracking-wider uppercase" style={{ color: accentColor, marginBottom: '1px' }}>婚礼仪式</p>
              <button onClick={() => openMapChooser(displayCeremony, info.ceremonyLat, info.ceremonyLng)} className="text-xs underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: accentColor, lineHeight: 1.5, background: 'transparent', border: 'none', padding: 0 }}>{displayCeremony}</button>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: `${accentColor}10` }}>🍽</div>
            <div>
              <p className="text-xs tracking-wider uppercase" style={{ color: accentColor, marginBottom: '1px' }}>喜宴地点</p>
              <button onClick={() => openMapChooser(displayBanquet, info.banquetLat, info.banquetLng)} className="text-xs underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: accentColor, lineHeight: 1.5, background: 'transparent', border: 'none', padding: 0 }}>{displayBanquet}</button>
            </div>
          </div>
        </div>

        {info.galleryImages && info.galleryImages.length > 0 && (
          <div className="flex gap-2 mt-4">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <div key={i} className="w-16">
                <PhotoFrame src={img} alt={`相册 ${i + 1}`} aspectRatio="1 / 1" animationDelay={`${i * 180}ms`} />
              </div>
            ))}
          </div>
        )}

        {info.pages && info.pages.map(page => (
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
          <div className="flex items-center gap-2" style={{ borderBottom: `1px solid ${themeColor}25`, paddingBottom: '6px' }}>
            <span className="text-sm font-bold tracking-widest" style={{ color: themeColor, minWidth: '28px' }}>吉日</span>
            <span className="text-sm" style={{ color: `${themeColor}cc`, lineHeight: 1.6 }}>{displayDate}  {displayTime}</span>
          </div>
          <div className="flex items-center gap-2" style={{ borderBottom: `1px solid ${themeColor}25`, paddingBottom: '6px' }}>
            <span className="text-sm font-bold tracking-widest" style={{ color: themeColor, minWidth: '28px' }}>仪式</span>
            <button onClick={() => openMapChooser(displayCeremony, info.ceremonyLat, info.ceremonyLng)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: themeColor, lineHeight: 1.6, background: 'transparent', border: 'none', padding: 0 }}>{displayCeremony}</button>
          </div>
          <div className="flex items-center gap-2" style={{ borderBottom: `1px solid ${themeColor}25`, paddingBottom: '6px' }}>
            <span className="text-sm font-bold tracking-widest" style={{ color: themeColor, minWidth: '28px' }}>喜宴</span>
            <button onClick={() => openMapChooser(displayBanquet, info.banquetLat, info.banquetLng)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: themeColor, lineHeight: 1.6, background: 'transparent', border: 'none', padding: 0 }}>{displayBanquet}</button>
          </div>
        </div>

        {info.galleryImages && info.galleryImages.length > 0 && (
          <div className="flex gap-2 mt-4 justify-center">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <div key={i} className="w-16">
                <PhotoFrame src={img} alt={`相册 ${i + 1}`} aspectRatio="1 / 1" borderStyle={{ border: `2px solid ${themeColor}66` }} animationDelay={`${i * 180}ms`} />
              </div>
            ))}
          </div>
        )}

        {info.pages && info.pages.map(page => (
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
            <button onClick={() => openMapChooser(displayCeremony, info.ceremonyLat, info.ceremonyLng)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity w-full text-left" style={{ color: textColor, background: 'transparent', border: 'none', padding: 0 }}>{displayCeremony}</button>
          </div>
          <div className="rounded-[22px] px-5 py-4 text-left" style={{ background: 'rgba(255,255,255,0.72)', border: `1px solid ${accentColor}` }}>
            <p className="text-[10px] tracking-[0.3em] uppercase mb-2" style={{ color: themeColor }}>Reception</p>
            <button onClick={() => openMapChooser(displayBanquet, info.banquetLat, info.banquetLng)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity w-full text-left" style={{ color: textColor, background: 'transparent', border: 'none', padding: 0 }}>{displayBanquet}</button>
          </div>
        </div>

        {info.galleryImages && info.galleryImages.length > 0 && (
          <div className="w-full max-w-sm mt-5">
            <div className="grid grid-cols-3 gap-2">
              {info.galleryImages.slice(0, 3).map((img, i) => (
                <PhotoFrame key={i} src={img} alt={`相册 ${i + 1}`} aspectRatio="3 / 4" roundedClassName="rounded-[18px]" animationDelay={`${i * 180}ms`} />
              ))}
            </div>
          </div>
        )}

        {info.pages && info.pages.map(page => (
          <PageModuleRenderer key={page.id} page={page} defaultFont={info.defaultFont} themeColor={themeColor} />
        ))}

        <p className="mt-6 text-[11px] tracking-[0.25em] uppercase" style={{ color: '#c3b1a4' }}>With Love And Gratitude</p>
      </div>
    </div>
  );
};

const WeddingPreview = () => {
  const [info, setInfo] = useState<WeddingInfo | null>(null);
  const [template, setTemplate] = useState<string>('romantic');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMusicPlaying, setIsMusicPlaying] = useState(false);
  const previewRef = useRef(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applyDecodedData = (decoded: SharePayload | WeddingInfo) => {
      if (cancelled) return;

      if ('info' in decoded && decoded.info) {
        setInfo(normalizeWeddingInfo(decoded.info));
        if (decoded.template) {
          setTemplate(decoded.template);
        }
      } else if ('template' in decoded && decoded.template) {
        setTemplate(decoded.template);
        const { template: _template, ...infoData } = decoded;
        setInfo(normalizeWeddingInfo(infoData as Partial<WeddingInfo>));
      } else {
        setInfo(normalizeWeddingInfo(decoded as Partial<WeddingInfo>));
      }
    };

    const loadData = async () => {
      // 从 hash 中提取参数，因为使用的是 HashRouter
      const hashParams = window.location.hash.slice(1).split('?');
      const params = new URLSearchParams(hashParams[1] || '');
      
      const shortCode = params.get('short');
      const invitationId = params.get('id');
      const compressedConfigParam = params.get('configz');
      const configParam = params.get('config');

      if (invitationId) {
        if (!isSupabaseConfigured) {
          setError('当前环境未配置 Supabase，无法读取云端请帖');
        } else {
          try {
            const invitation = await getInvitationFromCloud(invitationId);
            if (invitation.template) {
              setTemplate(invitation.template);
            }
            applyDecodedData(invitation.payload as SharePayload | WeddingInfo);
          } catch (e) {
            setError('无法加载云端请帖数据');
          }
        }
      } else if (shortCode) {
        const stored = localStorage.getItem(`wedding_short_${shortCode}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            applyDecodedData(parsed);
          } catch (e) {
            setError('无法加载请帖数据');
          }
        } else {
          setError('请帖不存在或已过期');
        }
      } else if (compressedConfigParam) {
        try {
          const decoded = await parseCompressedPayload(compressedConfigParam);
          applyDecodedData(decoded);
        } catch (e) {
          setError('无法解析压缩请帖链接');
        }
      } else if (configParam) {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(configParam))) as SharePayload | WeddingInfo;
          applyDecodedData(decoded);
        } catch (e) {
          setError('无法解析请帖链接');
        }
      } else {
        setError('无效的请帖链接');
      }
      if (!cancelled) {
        setLoading(false);
      }
    };

    loadData();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!info) return;

    const updateMetaTags = () => {
      const groom = info.groomName || '新郎';
      const bride = info.brideName || '新娘';
      const weddingDate = info.weddingDate ? new Date(info.weddingDate).toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' }) : '';
      
      // 动态更新页面标题
      document.title = `${groom} & ${bride} 的婚礼邀请函`;

      // 更新 Open Graph 标签
      const ogTags = {
        'og:title': `${groom} & ${bride} 的婚礼邀请函`,
        'og:description': weddingDate ? `${groom}与${bride}诚邀您出席${weddingDate}的婚礼` : `${groom}与${bride}诚邀您出席我们的婚礼`,
        'og:url': window.location.href
      };

      Object.entries(ogTags).forEach(([property, content]) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
          tag = document.createElement('meta');
          tag.setAttribute('property', property);
          document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
      });

      // 更新普通 meta 标签
      const metaTags = {
        'description': weddingDate ? `${groom}与${bride}诚邀您出席${weddingDate}的婚礼` : `${groom}与${bride}诚邀您出席我们的婚礼`
      };

      Object.entries(metaTags).forEach(([name, content]) => {
        const tag = document.querySelector(`meta[name="${name}"]`);
        if (tag) {
          tag.setAttribute('content', content);
        }
      });

      // 更新 Twitter 标签
      const twitterTags = {
        'twitter:title': `${groom} & ${bride} 的婚礼邀请函`,
        'twitter:description': weddingDate ? `${groom}与${bride}诚邀您出席${weddingDate}的婚礼` : `${groom}与${bride}诚邀您出席我们的婚礼`
      };

      Object.entries(twitterTags).forEach(([name, content]) => {
        const tag = document.querySelector(`meta[name="${name}"]`);
        if (tag) {
          tag.setAttribute('content', content);
        }
      });

      // 更新微信自定义标签
      const wxTags = {
        'wx:title': `${groom} & ${bride} 的婚礼邀请函`,
        'wx:description': weddingDate ? `${groom}与${bride}诚邀您出席${weddingDate}的婚礼` : `${groom}与${bride}诚邀您出席我们的婚礼`
      };

      Object.entries(wxTags).forEach(([name, content]) => {
        const tag = document.querySelector(`meta[name="${name}"]`);
        if (tag) {
          tag.setAttribute('content', content);
        }
      });
    };

    updateMetaTags();
  }, [info]);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    
    if (isMusicPlaying) {
      audioRef.current.pause();
      setIsMusicPlaying(false);
    } else {
      audioRef.current.play().catch(() => {
        toast.info('点击请帖区域后才能播放音乐');
      });
      setIsMusicPlaying(true);
    }
  };

  useEffect(() => {
    const handleClick = () => {
      if (info?.bgMusic && !isMusicPlaying && audioRef.current) {
        audioRef.current.play().catch(() => {});
        setIsMusicPlaying(true);
      }
    };

    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [info?.bgMusic, isMusicPlaying]);

  const handleDownloadImage = async () => {
    if (!previewRef.current) return;
    toast.loading('正在生成图片...');
    try {
      const canvas = await html2canvas(previewRef.current, { useCORS: true, allowTaint: true, scale: 2, backgroundColor: '#ffffff' });
      const link = document.createElement('a');
      link.download = `婚礼请帖_${info?.groomName || '新人'}_${info?.brideName || ''}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('图片下载成功');
    } catch (error) {
      toast.error('图片生成失败');
    } finally {
      toast.dismiss();
    }
  };

  const handleCopyLink = async () => {
    try {
      const copied = await copyText(window.location.href);
      if (!copied) throw new Error('copy failed');
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败，请长按地址栏手动复制');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#faf7f4' }}>
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-pink-300 border-t-pink-500 rounded-full animate-spin mx-auto mb-4" />
          <p style={{ color: '#8b7355' }}>加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#faf7f4' }}>
        <div className="text-center p-8 rounded-2xl" style={{ background: 'white', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
          <p className="text-xl mb-2" style={{ color: '#c4788a' }}>😅</p>
          <p className="text-lg font-semibold mb-2" style={{ color: '#2c1810' }}>{error}</p>
          <p className="text-sm" style={{ color: '#8b7355' }}>请检查链接是否正确，或联系新人获取新的邀请链接</p>
        </div>
      </div>
    );
  }

  if (!info) return null;

  const renderTemplate = () => {
    const templateId = template || info.template || 'romantic';
    let templateNode = <TemplateRomantic info={info} />;
    if (templateId === 'classic') templateNode = <TemplateClassic info={info} />;
    if (templateId === 'modern') templateNode = <TemplateModern info={info} />;
    if (templateId === 'chinese') templateNode = <TemplateChinese info={info} />;
    if (templateId === 'korean') templateNode = <TemplateKorean info={info} />;

    return (
      <>
        <div style={{ animation: 'invitationPageFlip 760ms cubic-bezier(0.22, 1, 0.36, 1) both', transformOrigin: 'top center' }}>
          {templateNode}
        </div>
        <StickerLayer stickers={info.stickers || []} />
      </>
    );
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f5' }}>
      <InvitationMotionStyles />
      <FallingPetals enabled={info?.petalsEnabled || false} />
      {info?.bgMusic && (
        <audio ref={audioRef} src={info.bgMusic} loop preload="auto" />
      )}
      <div className={`${isMobile ? 'py-0 px-0' : 'py-6 px-4'} max-w-md mx-auto`}>
        <div className={`${isMobile ? 'rounded-none shadow-none' : 'rounded-xl shadow-lg'} bg-white overflow-hidden`} style={{ maxWidth: '375px', margin: '0 auto' }}>
          <div ref={previewRef} className="relative">
            {renderTemplate()}
          </div>
          
          {info?.bgMusic && (
            <button onClick={toggleMusic} className="absolute top-3 right-3 w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10" style={{ background: isMusicPlaying ? 'rgba(196, 120, 138, 0.9)' : 'rgba(255, 255, 255, 0.85)', boxShadow: '0 2px 10px rgba(0,0,0,0.15)' }}>
              {isMusicPlaying ? (
                <Pause className="w-5 h-5 text-white" />
              ) : (
                <Play className="w-5 h-5" style={{ color: '#c4788a' }} />
              )}
            </button>
          )}
        </div>

        <div className={`${isMobile ? 'fixed bottom-0 left-0 right-0 bg-white border-t border-[#e8d5c4] px-4 py-3' : ''} flex justify-center gap-3`} style={{ maxWidth: '375px', margin: isMobile ? '0 auto' : '0 auto' }}>
          {info?.bgMusic && (
            <button onClick={toggleMusic} className={`flex flex-col items-center justify-center gap-0.5 w-12 h-12 sm:w-auto sm:h-auto sm:flex-row sm:gap-2 sm:px-3 sm:py-2.5 rounded-xl font-medium transition-all hover:opacity-90 text-xs sm:text-sm ${isMusicPlaying ? '' : ''}`} style={{ background: 'white', color: '#2c1810', border: '1px solid #e8d5c4' }}>
              {isMusicPlaying ? <Pause className="w-4 h-4 sm:w-5 sm:h-5" /> : <Play className="w-4 h-4 sm:w-5 sm:h-5" />}
              <span className="hidden sm:inline">{isMusicPlaying ? '暂停' : '播放'}</span>
            </button>
          )}
          <button onClick={handleCopyLink} className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition-all hover:opacity-90 text-sm sm:text-base`} style={{ background: 'white', color: '#2c1810', border: '1px solid #e8d5c4' }}>
            复制链接
          </button>
          <button onClick={handleDownloadImage} className={`flex-1 flex items-center justify-center gap-2 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl font-medium transition-all hover:opacity-90 text-sm sm:text-base`} style={{ background: 'linear-gradient(135deg, #c4788a, #c9a84c)', color: 'white' }}>
            下载图片
          </button>
          <button onClick={() => setShowQR(true)} className={`w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center rounded-xl transition-all hover:opacity-90`} style={{ background: 'white', border: '1px solid #e8d5c4' }}>
            <QRCodeCanvas value={window.location.href} size={isMobile ? 20 : 24} level="M" />
          </button>
        </div>

        {isMobile && (
          <div className="pb-20" />
        )}
      </div>

      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-4 sm:p-6 text-center mx-4 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-base sm:text-lg font-bold mb-3 sm:mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#2c1810' }}>扫码查看请帖</h3>
            <div className="p-3 sm:p-4 bg-white rounded-xl">
              <QRCodeCanvas value={window.location.href} size={isMobile ? 160 : 200} level="M" />
            </div>
            <p className="text-xs sm:text-sm mt-2" style={{ color: '#8b7355' }}>使用微信或手机相机扫描二维码</p>
            <button onClick={() => setShowQR(false)} className="mt-3 sm:mt-4 px-4 sm:px-6 py-2 rounded-lg text-sm" style={{ background: '#c4788a', color: 'white' }}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeddingPreview;
