import React, { useEffect, useState, useRef } from 'react';
import { Heart } from 'lucide-react';
import html2canvas from 'html2canvas';
import { toast } from 'sonner';
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
  message: string;
  coverImage: string;
  galleryImages: string[];
  pages: PageModule[];
  defaultFont: string;
  template: string;
}

const fonts = [
  { id: 'cormorant', name: '优雅衬线', family: "'Cormorant Garamond', serif" },
  { id: 'dancing', name: '花体手写', family: "'Dancing Script', cursive" },
  { id: 'playfair', name: '古典衬线', family: "'Playfair Display, serif" },
  { id: 'noto', name: '思源宋体', family: "'Noto Serif SC', serif" },
  { id: 'sans', name: '现代无衬线', family: "'Noto Sans SC', sans-serif" },
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

        {info.galleryImages && info.galleryImages.length > 0 && (
          <div className="w-full max-w-sm mt-4">
            <p className="text-xs tracking-widest uppercase mb-2" style={{ color: '#c4788a' }}>甜蜜瞬间</p>
            <div className="grid grid-cols-3 gap-2">
              {info.galleryImages.slice(0, 3).map((img, i) => (
                <div key={i} className="aspect-square rounded-lg overflow-hidden"><img src={img} alt={`相册 ${i + 1}`} className="w-full h-full object-cover" /></div>
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

        {info.galleryImages && info.galleryImages.length > 0 && (
          <div className="w-full max-w-xs mt-4 grid grid-cols-3 gap-2">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden"><img src={img} alt={`相册 ${i + 1}`} className="w-full h-full object-cover" /></div>
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

        {info.galleryImages && info.galleryImages.length > 0 && (
          <div className="flex gap-2 mt-4">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden"><img src={img} alt={`相册 ${i + 1}`} className="w-full h-full object-cover" /></div>
            ))}
          </div>
        )}

        {info.pages && info.pages.map(page => (
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

        {info.galleryImages && info.galleryImages.length > 0 && (
          <div className="flex gap-2 mt-4 justify-center">
            {info.galleryImages.slice(0, 3).map((img, i) => (
              <div key={i} className="w-16 h-16 rounded-lg overflow-hidden border border-gold-400"><img src={img} alt={`相册 ${i + 1}`} className="w-full h-full object-cover" /></div>
            ))}
          </div>
        )}

        {info.pages && info.pages.map(page => (
          <PageModuleRenderer key={page.id} page={page} defaultFont={info.defaultFont} themeColor={themeColor} />
        ))}

        <p className="mt-6 text-xs tracking-widest" style={{ color: 'rgba(255,215,0,0.4)' }}>百年好合 · 永结同心</p>
      </div>
    </div>
  );
};

const WeddingPreview = () => {
  const [info, setInfo] = useState<WeddingInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const previewRef = useRef(null);

  useEffect(() => {
    const loadData = () => {
      const params = new URLSearchParams(window.location.search);
      const shortCode = params.get('short');
      const configParam = params.get('config');

      if (shortCode) {
        const stored = localStorage.getItem(`wedding_short_${shortCode}`);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            setInfo(parsed.info || parsed);
          } catch (e) {
            setError('无法加载请帖数据');
          }
        } else {
          setError('请帖不存在或已过期');
        }
      } else if (configParam) {
        try {
          const decoded = JSON.parse(decodeURIComponent(atob(configParam)));
          setInfo(decoded);
        } catch (e) {
          setError('无法解析请帖链接');
        }
      } else {
        setError('无效的请帖链接');
      }
      setLoading(false);
    };

    loadData();
  }, []);

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
      await navigator.clipboard.writeText(window.location.href);
      toast.success('链接已复制');
    } catch {
      toast.error('复制失败');
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
    const templateId = info.template || 'romantic';
    if (templateId === 'classic') return <TemplateClassic info={info} />;
    if (templateId === 'modern') return <TemplateModern info={info} />;
    if (templateId === 'chinese') return <TemplateChinese info={info} />;
    return <TemplateRomantic info={info} />;
  };

  return (
    <div className="min-h-screen" style={{ background: '#f5f5f5' }}>
      <div className="max-w-md mx-auto py-6 px-4">
        <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-4" style={{ maxWidth: '375px', margin: '0 auto' }}>
          <div ref={previewRef}>
            {renderTemplate()}
          </div>
        </div>

        <div className="flex justify-center gap-3" style={{ maxWidth: '375px', margin: '0 auto' }}>
          <button onClick={handleCopyLink} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all hover:opacity-90" style={{ background: 'white', color: '#2c1810', border: '1px solid #e8d5c4' }}>
            复制链接
          </button>
          <button onClick={handleDownloadImage} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium transition-all hover:opacity-90" style={{ background: 'linear-gradient(135deg, #c4788a, #c9a84c)', color: 'white' }}>
            下载图片
          </button>
          <button onClick={() => setShowQR(true)} className="w-12 h-12 flex items-center justify-center rounded-xl transition-all hover:opacity-90" style={{ background: 'white', border: '1px solid #e8d5c4' }}>
            <QRCodeCanvas value={window.location.href} size={24} level="M" />
          </button>
        </div>
      </div>

      {showQR && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowQR(false)}>
          <div className="bg-white rounded-2xl p-6 text-center" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-4" style={{ fontFamily: 'Playfair Display, serif', color: '#2c1810' }}>扫码查看请帖</h3>
            <div className="p-4 bg-white rounded-xl">
              <QRCodeCanvas value={window.location.href} size={200} level="M" />
            </div>
            <button onClick={() => setShowQR(false)} className="mt-4 px-6 py-2 rounded-lg" style={{ background: '#c4788a', color: 'white' }}>
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default WeddingPreview;