import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Heart, Calendar, MapPin, Phone, Download, Sparkles, Clock, User, Upload, X, Share2, Link, Image, Check, Copy, Save, QrCode, RefreshCw, Plus, Trash2, GripVertical, ChevronDown, ChevronUp, Type, Layout, AudioLines } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
import ImageCropper from '../components/ImageCropper';
import { QRCodeCanvas } from 'qrcode.react';

export interface PageModule {
  id: string;
  type: 'cover' | 'gallery' | 'story' | 'quote' | 'photo';
  title: string;
  content?: string;
  image?: string;
  images?: string[];
  font?: string;
  backgroundColor?: string;
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
}

const fonts = [
  { id: 'cormorant', name: '优雅衬线', family: "'Cormorant Garamond', serif" },
  { id: 'dancing', name: '花体手写', family: "'Dancing Script', cursive" },
  { id: 'playfair', name: '古典衬线', family: "'Playfair Display', serif" },
  { id: 'noto', name: '思源宋体', family: "'Noto Serif SC', serif" },
  { id: 'sans', name: '现代无衬线', family: "'Noto Sans SC', sans-serif" },
];

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

const ImageUploader = ({ label, value, onChange, aspectRatio = 4 / 3, placeholder = '点击上传图片', showCrop = true }) => {
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

  const handleCropComplete = (croppedImage) => {
    onChange(croppedImage);
    setShowCropper(false);
    setTempImage('');
    toast.success('图片裁剪并上传成功');
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
            <img src={value} alt="预览" className="w-full h-full object-cover" />
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

const GalleryUploader = ({ label, value, onChange, maxImages = 6 }) => {
  const inputRef = useRef(null);
  const [showCropper, setShowCropper] = useState(false);
  const [tempImage, setTempImage] = useState('');
  const [currentIndex, setCurrentIndex] = useState(-1);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length + value.length > maxImages) {
      toast.error(`最多只能上传 ${maxImages} 张图片`);
      return;
    }
    
    const processFile = (file, index) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (index === 0) {
          setTempImage(result);
          setCurrentIndex(value.length);
          setShowCropper(true);
        } else {
          onChange([...value, result]);
        }
      };
      reader.readAsDataURL(file);
    };

    files.forEach((file, index) => processFile(file, index));
  };

  const handleCropComplete = (croppedImage) => {
    const newImages = [...value];
    if (currentIndex >= 0 && currentIndex <= newImages.length) {
      newImages.splice(currentIndex, 0, croppedImage);
    }
    onChange(newImages);
    setShowCropper(false);
    setTempImage('');
    setCurrentIndex(-1);
    toast.success('图片上传成功');
  };

  const handleRemove = (index) => {
    const newImages = [...value];
    newImages.splice(index, 1);
    onChange(newImages);
  };

  return (
    <>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-semibold tracking-wider uppercase" style={{ color: '#8b7355' }}>
            <span style={{ color: '#c9a84c' }}>{label}</span>
            <span className="text-xs font-normal" style={{ color: '#b8a898' }}>({value.length}/{maxImages})</span>
          </label>
        </div>
        
        <div className="grid grid-cols-3 gap-2">
          {value.map((img, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden group">
              <img src={img} alt={`相册 ${index + 1}`} className="w-full h-full object-cover" />
              <button onClick={() => handleRemove(index)} className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" style={{ background: 'rgba(139,0,0,0.8)' }}>
                <X className="w-3 h-3 text-white" />
              </button>
            </div>
          ))}
          
          {value.length < maxImages && (
            <div onClick={() => inputRef.current?.click()} className="aspect-square rounded-lg cursor-pointer transition-all hover:opacity-80 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #fdf6f0 0%, #f8f0e8 100%)', border: '2px dashed #e8d5c4' }}>
              <Upload className="w-6 h-6" style={{ color: '#c9a84c' }} />
            </div>
          )}
        </div>
        
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={handleFileChange} className="hidden" />
      </div>

      {showCropper && (
        <ImageCropper imageSrc={tempImage} onComplete={handleCropComplete} onCancel={() => { setShowCropper(false); setTempImage(''); setCurrentIndex(-1); }} aspectRatio={1} />
      )}
    </>
  );
};

const ShareModal = ({ isOpen, onClose, shareUrl, onDownloadImage }) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'qr'>('link');

  const handleCopy = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('链接已复制到剪贴板');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败，请手动复制');
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
                <p className="text-xs mb-1" style={{ color: '#8b7355' }}>链接预览</p>
                <p className="text-xs break-all font-mono" style={{ color: '#2c1810' }}>{shareUrl.length > 80 ? shareUrl.substring(0, 80) + '...' : shareUrl}</p>
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
  
  const renderContent = () => {
    switch (page.type) {
      case 'gallery':
        return (
          <div className="py-6 px-8">
            <p className="text-xs tracking-[0.3em] uppercase mb-4 text-center" style={{ color: themeColor, fontFamily: font.family }}>{page.title}</p>
            <div className="grid grid-cols-3 gap-2">
              {(page.images || []).slice(0, 6).map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden">
                  <img src={img} alt={`相册 ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
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
          <div className="py-4 px-6">
            <div className="rounded-lg overflow-hidden" style={{ aspectRatio: 4/3 }}>
              <img src={page.image} alt={page.title} className="w-full h-full object-cover" />
            </div>
            {page.title && (
              <p className="text-xs tracking-[0.2em] uppercase mt-3 text-center" style={{ color: themeColor, fontFamily: font.family }}>{page.title}</p>
            )}
            {page.content && (
              <p className="text-xs text-center mt-1" style={{ color: '#6b4c3b', fontFamily: font.family }}>{page.content}</p>
            )}
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="">
      {renderContent()}
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
  const themeColor = '#c4788a';

  return (
    <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(135deg, #fdf0f0 0%, #fff8f4 40%, #fdf0e8 100%)', minHeight: '700px', fontFamily: defaultFont.family }}>
      {info.coverImage && <div className="absolute inset-0"><img src={info.coverImage} alt="封面" className="w-full h-full object-cover" style={{ opacity: 0.15 }} /></div>}
      
      <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, transparent, #c4788a, #c9a84c, #c4788a, transparent)' }} />
      <div className="absolute bottom-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, transparent, #c4788a, #c9a84c, #c4788a, transparent)' }} />

      <div className="relative flex flex-col items-center px-10 py-8 text-center">
        <p className="text-xs tracking-[0.4em] uppercase mb-2" style={{ color: '#c4788a', fontFamily: 'Playfair Display, serif' }}>Wedding Invitation</p>
        <p className="text-sm tracking-[0.2em] mb-4" style={{ color: '#8b7355' }}>诚挚邀请您出席</p>

        <div className="flex items-center gap-4 mb-2">
          <div className="text-center">
            <p className="text-4xl font-bold" style={{ fontFamily: 'Dancing Script, cursive', color: '#7d2e45' }}>{displayGroom}</p>
            <p className="text-xs tracking-widest mt-1" style={{ color: '#8b7355' }}>GROOM</p>
          </div>
          <div className="flex flex-col items-center mx-2">
            <Heart className="w-7 h-7 mb-1" style={{ color: '#c4788a' }} />
            <p className="text-xl font-bold" style={{ fontFamily: 'Playfair Display, serif', color: '#c9a84c' }}>&</p>
          </div>
          <div className="text-center">
            <p className="text-4xl font-bold" style={{ fontFamily: 'Dancing Script, cursive', color: '#7d2e45' }}>{displayBride}</p>
            <p className="text-xs tracking-widest mt-1" style={{ color: '#8b7355' }}>BRIDE</p>
          </div>
        </div>

        <p className="text-sm leading-relaxed mb-5 max-w-xs italic" style={{ color: '#6b4c3b' }}>"{displayMsg}"</p>

        <div className="w-full max-w-sm space-y-3">
          <div className="rounded-lg p-3" style={{ background: 'rgba(196, 120, 138, 0.07)', border: '1px solid rgba(196, 120, 138, 0.2)' }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#c4788a' }}>婚礼日期</p>
            <p className="text-base font-semibold" style={{ color: '#2c1810', fontFamily: 'Playfair Display, serif' }}>{displayDate} · {displayTime}</p>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'rgba(201, 168, 76, 0.07)', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#c9a84c' }}>婚礼仪式</p>
            <a href={generateMapLink(displayCeremony)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: '#c4788a' }}>{displayCeremony}</a>
          </div>
          <div className="rounded-lg p-3" style={{ background: 'rgba(201, 168, 76, 0.07)', border: '1px solid rgba(201, 168, 76, 0.2)' }}>
            <p className="text-xs tracking-widest uppercase mb-1" style={{ color: '#c9a84c' }}>喜宴地点</p>
            <a href={generateMapLink(displayBanquet)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: '#c4788a' }}>{displayBanquet}</a>
          </div>
        </div>

        {info.galleryImages?.length > 0 && (
          <div className="w-full max-w-sm mt-4">
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#c4788a' }}>甜蜜瞬间</p>
            <div className="grid grid-cols-3 gap-2">
              {info.galleryImages.slice(0, 3).map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden"><img src={img} alt={`相册 ${i + 1}`} className="w-full h-full object-cover" /></div>
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
  const themeColor = '#c9a84c';

  return (
    <div className="relative w-full overflow-hidden" style={{ background: '#1a0a00', minHeight: '700px', fontFamily: defaultFont.family }}>
      {info.coverImage && <div className="absolute inset-0"><img src={info.coverImage} alt="封面" className="w-full h-full object-cover" style={{ opacity: 0.2 }} /></div>}
      
      <div className="absolute inset-3" style={{ border: '1px solid rgba(201,168,76,0.5)' }} />
      <div className="absolute inset-5" style={{ border: '1px solid rgba(201,168,76,0.25)' }} />

      <div className="relative flex flex-col items-center px-12 py-8 text-center">
        <p className="text-xs tracking-[0.5em] uppercase mb-4" style={{ color: '#c9a84c', fontFamily: 'Playfair Display, serif' }}>— Wedding Invitation —</p>
        <p className="text-2xl mb-2 tracking-[0.3em]" style={{ color: '#f0d080', fontFamily: 'serif' }}>婚 礼 请 帖</p>

        <div className="w-24 my-3" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #c9a84c, transparent)' }} />

        <div className="my-3">
          <div className="flex items-baseline justify-center gap-3">
            <p className="text-5xl" style={{ fontFamily: 'Dancing Script, cursive', color: '#f0d080' }}>{displayGroom}</p>
            <p className="text-2xl" style={{ color: '#c9a84c' }}>&</p>
            <p className="text-5xl" style={{ fontFamily: 'Dancing Script, cursive', color: '#f0d080' }}>{displayBride}</p>
          </div>
          <p className="text-xs tracking-widest mt-2" style={{ color: '#8b6c3a' }}>THE WEDDING OF</p>
        </div>

        <div className="my-3 px-6 py-3 rounded" style={{ border: '1px solid rgba(201,168,76,0.4)', background: 'rgba(201,168,76,0.08)' }}>
          <p className="text-xl font-bold tracking-wider" style={{ color: '#f0d080', fontFamily: 'Playfair Display, serif' }}>{displayDate}</p>
          <p className="text-sm mt-1" style={{ color: '#c9a84c' }}>{displayTime}</p>
        </div>

        <p className="text-sm leading-relaxed my-3 max-w-xs italic" style={{ color: '#c4a882' }}>"{displayMsg}"</p>

        <div className="w-full max-w-xs space-y-2 mt-2">
          {[{ label: '仪式地点', value: displayCeremony, isAddress: true }, { label: '喜宴地点', value: displayBanquet, isAddress: true }].map((item, i) => (
            <div key={i} className="flex items-start gap-3 text-left py-2" style={{ borderBottom: '1px solid rgba(201,168,76,0.15)' }}>
              <p className="text-xs tracking-wider whitespace-nowrap mt-0.5" style={{ color: '#c9a84c', minWidth: '56px' }}>{item.label}</p>
              <a href={generateMapLink(item.value)} className="text-xs leading-relaxed underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: '#f0d080' }}>{item.value}</a>
            </div>
          ))}
        </div>

        {info.galleryImages?.length > 0 && (
          <div className="w-full max-w-xs mt-4 grid grid-cols-3 gap-2">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden"><img src={img} alt={`相册 ${i + 1}`} className="w-full h-full object-cover" /></div>
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
  const themeColor = '#8aab8a';

  return (
    <div className="relative w-full overflow-hidden" style={{ background: '#f8f5f0', minHeight: '700px', fontFamily: defaultFont.family }}>
      {info.coverImage && <div className="absolute inset-0"><img src={info.coverImage} alt="封面" className="w-full h-full object-cover" style={{ opacity: 0.1 }} /></div>}
      
      <div className="absolute left-0 top-0 bottom-0 w-2" style={{ background: 'linear-gradient(180deg, #8aab8a, #c4788a, #c9a84c)' }} />

      <div className="relative flex flex-col pl-12 pr-8 py-10">
        <p className="text-xs tracking-[0.4em] uppercase mb-6" style={{ color: '#8aab8a', fontFamily: 'Playfair Display, serif' }}>Wedding Invitation</p>

        <div className="mb-4">
          <p className="text-6xl leading-tight" style={{ fontFamily: 'Dancing Script, cursive', color: '#2c1810' }}>{displayGroom}</p>
          <p className="text-2xl my-1 tracking-widest" style={{ color: '#c4788a' }}>& — & —</p>
          <p className="text-6xl leading-tight" style={{ fontFamily: 'Dancing Script, cursive', color: '#2c1810' }}>{displayBride}</p>
        </div>

        <div className="w-full my-4" style={{ height: '1px', background: 'linear-gradient(90deg, #c4788a, transparent)' }} />

        <p className="text-sm leading-relaxed italic mb-5" style={{ color: '#6b4c3b', maxWidth: '280px' }}>"{displayMsg}"</p>

        <div className="space-y-3">
          {[{ icon: '📅', label: '日期与时间', value: `${displayDate} ${displayTime}`, isAddress: false }, { icon: '💒', label: '婚礼仪式', value: displayCeremony, isAddress: true }, { icon: '🍽', label: '喜宴地点', value: displayBanquet, isAddress: true }].map((item, i) => (
            <div key={i} className="flex gap-3 items-start">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm" style={{ background: 'rgba(196, 120, 138, 0.1)' }}>{item.icon}</div>
              <div>
                <p className="text-xs tracking-wider uppercase" style={{ color: '#c4788a', marginBottom: '1px' }}>{item.label}</p>
                {item.isAddress ? (
                  <a href={generateMapLink(item.value)} className="text-xs underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: '#c4788a', lineHeight: 1.5 }}>{item.value}</a>
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
              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden"><img src={img} alt={`相册 ${i + 1}`} className="w-full h-full object-cover" /></div>
            ))}
          </div>
        )}

        {info.pages?.map(page => (
          <PageModuleRenderer key={page.id} page={page} defaultFont={info.defaultFont} themeColor={themeColor} />
        ))}

        <div className="mt-6 inline-flex items-center gap-2">
          <Heart className="w-4 h-4" style={{ color: '#c4788a' }} />
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
  const themeColor = '#ffd700';

  return (
    <div className="relative w-full overflow-hidden" style={{ background: 'linear-gradient(160deg, #8b0000 0%, #6b0000 50%, #4a0000 100%)', minHeight: '700px', fontFamily: defaultFont.family }}>
      {info.coverImage && <div className="absolute inset-0"><img src={info.coverImage} alt="封面" className="w-full h-full object-cover" style={{ opacity: 0.15 }} /></div>}
      
      <div className="absolute inset-4" style={{ border: '2px solid rgba(255,215,0,0.4)', borderRadius: '4px' }} />
      <div className="absolute inset-6" style={{ border: '1px solid rgba(255,215,0,0.2)', borderRadius: '2px' }} />

      <div className="absolute top-8 left-8 text-5xl opacity-20" style={{ color: '#ffd700' }}>囍</div>
      <div className="absolute top-8 right-8 text-5xl opacity-20" style={{ color: '#ffd700' }}>囍</div>

      <div className="relative flex flex-col items-center px-10 py-8 text-center">
        <div className="mb-2">
          <p className="text-3xl tracking-[0.5em] font-bold" style={{ color: '#ffd700', fontFamily: 'serif' }}>喜</p>
          <p className="text-xs tracking-[0.4em] mt-1" style={{ color: 'rgba(255,215,0,0.7)' }}>— 婚 礼 请 帖 —</p>
        </div>

        <div className="w-40 my-3" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #ffd700, transparent)' }} />

        <div className="flex items-center justify-center gap-3 my-2">
          <div className="text-center">
            <p className="text-3xl font-bold tracking-widest" style={{ color: '#ffd700', fontFamily: 'serif' }}>{displayGroom}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,215,0,0.6)' }}>新 郎</p>
          </div>
          <div className="text-4xl mx-2 font-bold" style={{ color: '#ffd700' }}>❤</div>
          <div className="text-center">
            <p className="text-3xl font-bold tracking-widest" style={{ color: '#ffd700', fontFamily: 'serif' }}>{displayBride}</p>
            <p className="text-xs mt-1" style={{ color: 'rgba(255,215,0,0.6)' }}>新 娘</p>
          </div>
        </div>

        <div className="w-40 my-3" style={{ height: '1px', background: 'linear-gradient(90deg, transparent, #ffd700, transparent)' }} />

        <p className="text-sm leading-loose my-2 tracking-wider max-w-xs" style={{ color: 'rgba(255,215,0,0.85)' }}>{displayMsg}</p>

        <p className="text-2xl my-2 tracking-widest opacity-60" style={{ color: '#ffd700' }}>✿ ✿ ✿</p>

        <div className="w-full max-w-xs mt-2 space-y-2">
          {[{ label: '吉日', value: `${displayDate}  ${displayTime}`, isAddress: false }, { label: '仪式', value: displayCeremony, isAddress: true }, { label: '喜宴', value: displayBanquet, isAddress: true }].map((item, i) => (
            <div key={i} className="flex items-center gap-2" style={{ borderBottom: '1px solid rgba(255,215,0,0.15)', paddingBottom: '6px' }}>
              <span className="text-sm font-bold tracking-widest" style={{ color: '#ffd700', minWidth: '28px' }}>{item.label}</span>
              {item.isAddress ? (
                <a href={generateMapLink(item.value)} className="text-sm underline underline-offset-2 hover:opacity-80 transition-opacity" style={{ color: '#ffd700', lineHeight: 1.6 }}>{item.value}</a>
              ) : (
                <span className="text-sm" style={{ color: 'rgba(255,215,0,0.8)', lineHeight: 1.6 }}>{item.value}</span>
              )}
            </div>
          ))}
        </div>

        {info.galleryImages?.length > 0 && (
          <div className="flex gap-2 mt-4 justify-center">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-gold-400"><img src={img} alt={`相册 ${i + 1}`} className="w-full h-full object-cover" /></div>
            ))}
          </div>
        )}

        {info.pages?.map(page => (
          <PageModuleRenderer key={page.id} page={page} defaultFont={info.defaultFont} themeColor={themeColor} />
        ))}

        <p className="mt-6 text-xs tracking-widest" style={{ color: 'rgba(255,215,0,0.4)' }}>百年好合 · 永结同心</p>
      </div>
    </div>
  );
};

const templates = [
  { id: 'romantic', name: '浪漫玫瑰', subtitle: 'Rose Romance', color: '#c4788a' },
  { id: 'classic', name: '经典烫金', subtitle: 'Classic Gold', color: '#c9a84c' },
  { id: 'modern', name: '现代简约', subtitle: 'Modern Minimal', color: '#8aab8a' },
  { id: 'chinese', name: '中式喜红', subtitle: 'Chinese Red', color: '#8b0000' }
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
  const [info, setInfo] = useState<WeddingInfo>({
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
    petalsEnabled: true
  });
  const [activeTemplate, setActiveTemplate] = useState('romantic');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ basic: true, pages: false, appearance: true });
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'edit' | 'preview'>('edit');
  const [isMobile, setIsMobile] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const draft = localStorage.getItem('wedding_draft');
    if (draft) {
      try {
        const savedInfo = JSON.parse(draft);
        setInfo(savedInfo);
        toast.info('已加载上次保存的草稿');
      } catch (e) { console.error('Failed to load draft:', e); }
    }

    const savedTemplate = localStorage.getItem('wedding_template');
    if (savedTemplate) setActiveTemplate(savedTemplate);
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

  const addPage = (type: string) => {
    const newPage: PageModule = {
      id: `page_${Date.now()}`,
      type: type as PageModule['type'],
      title: pageTypes.find(t => t.id === type)?.name || '新页面',
      content: '',
      image: '',
      images: [],
      font: ''
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const generateShareUrl = useCallback(() => {
    try {
      const configData = { ...info, template: activeTemplate };
      const encoded = btoa(encodeURIComponent(JSON.stringify(configData)));
      return `${window.location.origin}/#/preview?config=${encoded}`;
    } catch (error) {
      console.error('Failed to generate share URL:', error);
      toast.error('生成分享链接失败');
      return '';
    }
  }, [info, activeTemplate]);

  const handleShare = () => {
    const fullUrl = generateShareUrl();
    setShareUrl(fullUrl);
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
      setInfo({ 
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
        petalsEnabled: true
      });
      localStorage.removeItem('wedding_draft');
      toast.info('已重置所有内容');
    }
  };

  const [showMapModal, setShowMapModal] = useState(false);
  const [mapSearchType, setMapSearchType] = useState<'ceremony' | 'banquet'>('ceremony');
  const [mapSearchResults, setMapSearchResults] = useState<any[]>([]);
  const [mapSearchQuery, setMapSearchQuery] = useState('');

  const handleMapSearch = (type: 'ceremony' | 'banquet') => {
    setMapSearchType(type);
    setMapSearchQuery(type === 'ceremony' ? info.ceremonyVenue : info.banquetVenue);
    setShowMapModal(true);
  };

  const searchAddress = async () => {
    if (!mapSearchQuery.trim()) return;
    
    try {
      const response = await fetch(`https://restapi.amap.com/v3/place/text?keywords=${encodeURIComponent(mapSearchQuery)}&city=&output=json&key=cb6fb68b9184a02858f8059867959185`);
      const data = await response.json();
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

  const selectAddress = (address: any) => {
    const name = address.name || address.formatted_address || address.address;
    const location = address.location || '';
    const [lng, lat] = location.split(',').map(Number) || [0, 0];
    
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
    if (activeTemplate === 'romantic') return <TemplateRomantic {...props} />;
    if (activeTemplate === 'classic') return <TemplateClassic {...props} />;
    if (activeTemplate === 'modern') return <TemplateModern {...props} />;
    if (activeTemplate === 'chinese') return <TemplateChinese {...props} />;
    return <TemplateRomantic {...props} />;
  };

  return (
    <div className="min-h-screen" style={{ background: '#faf7f4' }}>
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
                  {info.pages.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: '#c4788a', color: 'white' }}>{info.pages.length}</span>
                  )}
                </div>
                {expandedSections.pages ? <ChevronUp className="w-4 h-4" style={{ color: '#8b7355' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#8b7355' }} />}
              </button>
              {expandedSections.pages && (
                <div className="px-3 sm:px-4 pb-3 sm:pb-4">
                  {info.pages.length === 0 ? (
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
                                <textarea value={page.content || ''} onChange={(e) => updatePage(page.id, { content: e.target.value })} placeholder="请输入内容..." rows={3} className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none" style={{ background: '#fff', border: '1px solid #e8d5c4', color: '#2c1810' }} />
                              )}
                              {page.type === 'photo' && (
                                <div>
                                  <p className="text-xs mb-2" style={{ color: '#8b7355' }}>上传图片</p>
                                  <div onClick={() => {
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = 'image/*';
                                    input.onchange = (e: any) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        const reader = new FileReader();
                                        reader.onload = (event) => {
                                          updatePage(page.id, { image: event.target?.result as string });
                                        };
                                        reader.readAsDataURL(file);
                                      }
                                    };
                                    input.click();
                                  }} className={`relative rounded-lg overflow-hidden cursor-pointer ${page.image ? '' : 'flex items-center justify-center'}`} style={{ aspectRatio: 4/3, background: page.image ? 'transparent' : '#fdf6f0', border: '2px dashed #e8d5c4' }}>
                                    {page.image ? (
                                      <img src={page.image} alt="页面图片" className="w-full h-full object-cover" />
                                    ) : (
                                      <Upload className="w-6 h-6" style={{ color: '#c9a84c' }} />
                                    )}
                                  </div>
                                </div>
                              )}
                              {page.type === 'gallery' && (
                                <div>
                                  <p className="text-xs mb-2" style={{ color: '#8b7355' }}>上传相册图片</p>
                                  <div className="grid grid-cols-3 gap-2">
                                    {(page.images || []).map((img, i) => (
                                      <div key={i} className="relative aspect-square rounded-lg overflow-hidden">
                                        <img src={img} alt={`图片 ${i + 1}`} className="w-full h-full object-cover" />
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
                                        input.onchange = (e: any) => {
                                          const file = e.target.files?.[0];
                                          if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (event) => {
                                              updatePage(page.id, { images: [...(page.images || []), event.target?.result as string] });
                                            };
                                            reader.readAsDataURL(file);
                                          }
                                        };
                                        input.click();
                                      }} className="aspect-square rounded-lg cursor-pointer flex items-center justify-center" style={{ background: '#fdf6f0', border: '2px dashed #e8d5c4' }}>
                                        <Plus className="w-5 h-5" style={{ color: '#c9a84c' }} />
                                      </div>
                                    )}
                                  </div>
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

                  <ImageUploader label="封面图片" value={info.coverImage} onChange={(v) => updateField('coverImage', v)} aspectRatio={4/3} />

                  <GalleryUploader label="相册照片" value={info.galleryImages} onChange={(v) => updateField('galleryImages', v)} maxImages={6} />

                  <div>
                    <label className="text-xs font-semibold mb-2 block" style={{ color: '#8b7355' }}>主题风格</label>
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2">
                      {templates.map((template) => (
                        <button key={template.id} onClick={() => setActiveTemplate(template.id)} className={`p-2.5 sm:p-3 rounded-lg text-left transition-all ${activeTemplate === template.id ? `ring-2 ring-offset-1 ring-[${template.color}]` : ''}`} style={{ background: activeTemplate === template.id ? '#fdf6f0' : '#fff' }}>
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
                    <label className="text-xs font-semibold mb-2 block" style={{ color: '#8b7355' }}>背景音乐</label>
                    <div className={`relative rounded-lg overflow-hidden cursor-pointer transition-all hover:opacity-80 ${info.bgMusic ? 'flex items-center justify-between' : 'flex items-center justify-center'}`} style={{ background: info.bgMusic ? 'rgba(196, 120, 138, 0.07)' : 'linear-gradient(135deg, #fdf6f0 0%, #f8f0e8 100%)', border: info.bgMusic ? '1px solid rgba(196,120,138,0.3)' : '2px dashed #e8d5c4', padding: '12px 14px' }}>
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
                      <input ref={(el) => { (window as any).musicInput = el; }} type="file" accept="audio/mp3" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          if (file.size > 5 * 1024 * 1024) {
                            toast.error('文件大小不能超过 5MB');
                            return;
                          }
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            updateField('bgMusic', event.target?.result as string);
                            updateField('bgMusicName', file.name);
                            toast.success('音乐上传成功');
                          };
                          reader.readAsDataURL(file);
                        }
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

            <button onClick={handleShare} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #c4788a, #c9a84c)', color: 'white' }}>
              <Share2 className="w-5 h-5" />
              分享请帖
            </button>
          </div>
        </div>

        <div className={`${isMobile ? (mobileView === 'preview' ? 'block' : 'hidden') : 'block'} flex-1 bg-gray-50 p-4 sm:p-8 overflow-auto`}>
          <div className="max-w-md mx-auto">
            <div className="bg-white rounded-xl shadow-lg overflow-hidden">
              <div ref={previewRef} className="w-full" style={{ maxWidth: '375px', margin: '0 auto' }}>
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
        </div>
      )}

      <ShareModal isOpen={showShareModal} onClose={() => setShowShareModal(false)} shareUrl={shareUrl} onDownloadImage={handleDownloadImage} />

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