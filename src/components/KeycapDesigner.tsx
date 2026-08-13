import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export interface KeycapDesign {
  id: string;
  name: string;
  imageData: string;
  createdAt: number;
}

interface KeycapDesignerProps {
  designs: KeycapDesign[];
  activeDesignIds: (string | null)[];
  initialSlot: number;
  slotCount: number;
  onSaveDesign: (design: KeycapDesign) => void;
  onSelectDesign: (slotIndex: number, id: string | null) => void;
  onDeleteDesign: (id: string) => void;
  onClose: () => void;
  isFever: boolean;
}

function resizeImage(file: File, maxSize: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > height) {
          if (width > maxSize) { height = (height * maxSize) / width; width = maxSize; }
        } else {
          if (height > maxSize) { width = (width * maxSize) / height; height = maxSize; }
        }
        canvas.width = maxSize;
        canvas.height = maxSize;
        const ctx = canvas.getContext('2d')!;
        const offsetX = (maxSize - width) / 2;
        const offsetY = (maxSize - height) / 2;
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, maxSize, maxSize);
        ctx.drawImage(img, offsetX, offsetY, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getDesignImage(designs: KeycapDesign[], id: string | null): string | null {
  if (!id) return null;
  return designs.find((d) => d.id === id)?.imageData ?? null;
}

export function KeycapDesigner({
  designs,
  activeDesignIds,
  initialSlot,
  slotCount,
  onSaveDesign,
  onSelectDesign,
  onDeleteDesign,
  onClose,
  isFever,
}: KeycapDesignerProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [designName, setDesignName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(initialSlot);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    try {
      const dataUrl = await resizeImage(file, 256);
      setPreview(dataUrl);
      setDesignName('');
    } catch {
      // invalid image
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  }, [handleFile]);

  const handleSave = useCallback(() => {
    if (!preview) return;
    const design: KeycapDesign = {
      id: `kc_${Date.now()}`,
      name: designName || `키캡 ${designs.length + 1}`,
      imageData: preview,
      createdAt: Date.now(),
    };
    onSaveDesign(design);
    onSelectDesign(selectedSlot, design.id);
    setPreview(null);
    setDesignName('');
  }, [preview, designName, designs.length, onSaveDesign, onSelectDesign, selectedSlot]);

  const currentDesignId = activeDesignIds[selectedSlot] ?? null;

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex items-end justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <motion.div
        className={`relative w-full max-w-md max-h-[85vh] rounded-t-3xl overflow-y-auto ${
          isFever ? 'bg-indigo-950' : 'bg-white'
        }`}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <div className="flex justify-center pt-3 pb-2">
          <div className={`w-10 h-1 rounded-full ${isFever ? 'bg-white/20' : 'bg-gray-300'}`} />
        </div>

        <div className="px-5 pb-8">
          <h2 className={`text-lg font-black mb-4 ${isFever ? 'text-white' : 'text-gray-800'}`}>
            🎨 키캡 디자인
          </h2>

          {/* Slot selector */}
          <div className="mb-5">
            <p className={`text-xs mb-2 ${isFever ? 'text-indigo-300' : 'text-gray-500'}`}>
              꾸밀 키캡 선택
            </p>
            <div className="flex justify-center gap-4">
              {Array.from({length: slotCount}, (_, i) => i).map((slot) => {
                const img = getDesignImage(designs, activeDesignIds[slot] ?? null);
                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`relative flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${
                      selectedSlot === slot
                        ? (isFever ? 'bg-yellow-400/20 ring-2 ring-yellow-400 scale-105' : 'bg-blue-50 ring-2 ring-blue-500 scale-105')
                        : (isFever ? 'bg-white/5' : 'bg-gray-50')
                    }`}
                  >
                    <div className="keycap-slot-body">
                      <div
                        className="keycap-slot-top"
                        style={img ? { backgroundImage: `url(${img})` } : undefined}
                      >
                        {!img && <span className="text-lg">👊</span>}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold ${isFever ? 'text-white' : 'text-gray-600'}`}>
                      #{slot + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Upload section */}
          {!preview ? (
            <div className="space-y-3 mb-6">
              <p className={`text-xs ${isFever ? 'text-indigo-300' : 'text-gray-500'}`}>
                사진을 찍거나 갤러리에서 선택해서 나만의 키캡을 만드세요
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className={`flex-1 py-4 rounded-2xl font-bold text-sm flex flex-col items-center gap-1.5 transition-colors ${
                    isFever ? 'bg-white/10 text-white active:bg-white/15' : 'bg-blue-50 text-blue-600 active:bg-blue-100'
                  }`}
                >
                  <span className="text-2xl">📸</span>
                  사진 촬영
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className={`flex-1 py-4 rounded-2xl font-bold text-sm flex flex-col items-center gap-1.5 transition-colors ${
                    isFever ? 'bg-white/10 text-white active:bg-white/15' : 'bg-purple-50 text-purple-600 active:bg-purple-100'
                  }`}
                >
                  <span className="text-2xl">🖼️</span>
                  갤러리 선택
                </button>
              </div>
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="mb-6">
              <p className={`text-xs mb-3 ${isFever ? 'text-indigo-300' : 'text-gray-500'}`}>
                미리보기 (키캡 #{selectedSlot + 1}에 적용)
              </p>
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <div className="keycap-preview-body">
                    <div
                      className="keycap-preview-top"
                      style={{ backgroundImage: `url(${preview})` }}
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    type="text"
                    value={designName}
                    onChange={(e) => setDesignName(e.target.value)}
                    placeholder="키캡 이름 (선택)"
                    maxLength={20}
                    className={`w-full px-3 py-2 rounded-xl text-sm outline-none ${
                      isFever
                        ? 'bg-white/10 text-white placeholder:text-indigo-400'
                        : 'bg-gray-100 text-gray-800 placeholder:text-gray-400'
                    }`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleSave}
                      className="flex-1 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-bold active:scale-[0.97] transition-transform"
                    >
                      저장하기
                    </button>
                    <button
                      onClick={() => setPreview(null)}
                      className={`px-4 py-2 rounded-xl text-sm font-bold ${
                        isFever ? 'bg-white/10 text-white' : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      취소
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className={`text-center py-4 text-sm ${isFever ? 'text-indigo-300' : 'text-gray-400'}`}>
              이미지 처리 중...
            </div>
          )}

          {/* Saved designs */}
          <div>
            <h3 className={`text-sm font-bold mb-3 ${isFever ? 'text-indigo-200' : 'text-gray-500'}`}>
              내 키캡 컬렉션 ({designs.length})
            </h3>

            <div className="grid grid-cols-4 gap-3">
              <button
                onClick={() => onSelectDesign(selectedSlot, null)}
                className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                  currentDesignId === null
                    ? (isFever ? 'bg-yellow-400/20 ring-2 ring-yellow-400' : 'bg-blue-50 ring-2 ring-blue-500')
                    : (isFever ? 'bg-white/5' : 'bg-gray-50')
                }`}
              >
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl ${
                  isFever ? 'bg-white/10' : 'bg-gray-200'
                }`}>
                  👊
                </div>
                <span className={`text-[10px] font-bold ${isFever ? 'text-white' : 'text-gray-600'}`}>
                  기본
                </span>
              </button>

              {designs.map((d) => (
                <div key={d.id} className="relative">
                  <button
                    onClick={() => onSelectDesign(selectedSlot, d.id)}
                    className={`w-full flex flex-col items-center gap-1 p-2 rounded-xl transition-colors ${
                      currentDesignId === d.id
                        ? (isFever ? 'bg-yellow-400/20 ring-2 ring-yellow-400' : 'bg-blue-50 ring-2 ring-blue-500')
                        : (isFever ? 'bg-white/5' : 'bg-gray-50')
                    }`}
                  >
                    <div
                      className="w-14 h-14 rounded-xl bg-cover bg-center"
                      style={{ backgroundImage: `url(${d.imageData})` }}
                    />
                    <span className={`text-[10px] font-bold truncate max-w-full ${
                      isFever ? 'text-white' : 'text-gray-600'
                    }`}>
                      {d.name}
                    </span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteDesign(d.id); }}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center shadow-sm"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            {designs.length === 0 && (
              <p className={`text-center py-6 text-xs ${isFever ? 'text-indigo-400' : 'text-gray-300'}`}>
                아직 저장된 키캡이 없습니다
              </p>
            )}
          </div>
        </div>

        <style>{`
          .keycap-preview-body {
            width: 80px;
            height: 80px;
            border-radius: 14px;
            background: linear-gradient(to bottom, #c8ccd0, #9ea3a8);
            box-shadow:
              0 5px 0 0 #787d82,
              0 6px 0 0 #6b7075,
              0 8px 10px rgba(0,0,0,0.25);
            padding: 5px;
          }
          .keycap-preview-top {
            width: 100%;
            height: 100%;
            border-radius: 10px;
            background-size: cover;
            background-position: center;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.4),
              inset 0 -1px 1px rgba(0,0,0,0.05);
          }
          .keycap-slot-body {
            width: 54px;
            height: 54px;
            border-radius: 10px;
            background: linear-gradient(to bottom, #c8ccd0, #9ea3a8);
            box-shadow:
              0 3px 0 0 #787d82,
              0 4px 0 0 #6b7075,
              0 5px 8px rgba(0,0,0,0.2);
            padding: 4px;
          }
          .keycap-slot-top {
            width: 100%;
            height: 100%;
            border-radius: 7px;
            background-size: cover;
            background-position: center;
            background-color: #e8ecf0;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow:
              inset 0 1px 0 rgba(255,255,255,0.4),
              inset 0 -1px 1px rgba(0,0,0,0.05);
          }
        `}</style>
      </motion.div>
    </motion.div>
  );
}
