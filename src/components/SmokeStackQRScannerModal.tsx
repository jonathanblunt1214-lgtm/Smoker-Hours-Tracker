import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { X, Camera, Upload, QrCode, AlertCircle, CheckCircle2, RefreshCw, Flame } from 'lucide-react';

interface SmokeStackQRScannerModalProps {
  onClose: () => void;
  onScanSuccess: (scannedData: {
    app?: string;
    type?: string;
    smokerType?: string;
    date?: string;
    pageNumber?: number;
    title?: string;
    proteinType?: string;
    rawText?: string;
  }) => void;
  showToast?: (msg: string) => void;
}

export const SmokeStackQRScannerModal: React.FC<SmokeStackQRScannerModalProps> = ({
  onClose,
  onScanSuccess,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'camera' | 'upload'>('camera');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState<boolean>(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState<boolean>(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Check camera availability
  const hasCameraSupport = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);

  useEffect(() => {
    if (activeTab === 'camera' && hasCameraSupport) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [activeTab]);

  const startCamera = async () => {
    setCameraError(null);
    setIsScanning(true);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true'); // Required for iOS Safari
        videoRef.current.play();
        requestAnimationFrame(tickScan);
      }
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      setCameraError('Camera access denied or unavailable. Please switch to file upload mode.');
      setIsScanning(false);
      setActiveTab('upload');
    }
  };

  const stopCamera = () => {
    setIsScanning(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  const tickScan = () => {
    if (!videoRef.current || videoRef.current.readyState !== videoRef.current.HAVE_ENOUGH_DATA) {
      animationFrameRef.current = requestAnimationFrame(tickScan);
      return;
    }

    const video = videoRef.current;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert',
      });

      if (code && code.data) {
        handleCodeDetected(code.data);
        return; // Stop scanning loop on success
      }
    }

    animationFrameRef.current = requestAnimationFrame(tickScan);
  };

  const handleCodeDetected = (rawText: string) => {
    stopCamera();
    try {
      let parsed: any = {};
      if (rawText.trim().startsWith('{')) {
        parsed = JSON.parse(rawText);
      } else {
        parsed = { rawText };
      }

      if (showToast) showToast('✅ SmokeStack QR Code Scanned!');
      onScanSuccess({
        app: parsed.app || 'SmokeStack',
        type: parsed.type || 'physical_smoker_log',
        smokerType: parsed.smokerType || 'Pellet Smoker',
        date: parsed.date || new Date().toISOString().split('T')[0],
        pageNumber: parsed.pageNumber || 48,
        title: parsed.title || '',
        proteinType: parsed.proteinType || 'Beef',
        rawText,
      });
      onClose();
    } catch (err) {
      console.error('Error parsing QR payload:', err);
      if (showToast) showToast('⚠️ QR Code detected!');
      onScanSuccess({ rawText });
      onClose();
    }
  };

  const handleFileUpload = (file: File) => {
    if (!file) return;
    setUploadedFileName(file.name);
    setIsProcessingUpload(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsProcessingUpload(false);
          return;
        }

        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        setIsProcessingUpload(false);

        if (code && code.data) {
          handleCodeDetected(code.data);
        } else {
          if (showToast) showToast('❌ No valid QR code detected in uploaded image. Try another clear image.');
        }
      };
    };
    reader.readAsDataURL(file);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-sm flex items-center justify-center p-4 cursor-pointer"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-[#1a1a1a] border border-[#2a2a2a] text-zinc-100 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative font-sans cursor-default space-y-5"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#2a2a2a] pb-4">
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-orange-500/10 border border-orange-500/20 rounded-xl text-orange-400">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Scan SmokeStack Log QR Code</h3>
              <p className="text-xs text-zinc-400">
                Scan physical log QR code with camera or upload image
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-[#2a2a2a] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection: Camera vs File Upload */}
        <div className="flex items-center p-1 bg-[#121212] border border-[#2a2a2a] rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab('camera')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-orange-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>Mobile Camera Scan</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'upload'
                ? 'bg-orange-500 text-zinc-950 shadow-md'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Upload className="w-4 h-4" />
            <span>Upload Image</span>
          </button>
        </div>

        {/* CAMERA MODE */}
        {activeTab === 'camera' && (
          <div className="space-y-4">
            {cameraError ? (
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-xs flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                <div>
                  <p className="font-bold">Camera Unavailable</p>
                  <p className="mt-1">{cameraError}</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('upload')}
                    className="mt-3 px-3 py-1.5 bg-red-500/20 border border-red-500/30 rounded-lg text-red-200 font-bold hover:bg-red-500/30 cursor-pointer"
                  >
                    Switch to File Upload
                  </button>
                </div>
              </div>
            ) : (
              <div className="relative rounded-2xl overflow-hidden bg-black border border-[#2a2a2a] aspect-square flex items-center justify-center">
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  muted
                />

                {/* Reticle Scanner Overlay */}
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-8">
                  <div className="w-56 h-56 border-2 border-orange-500 rounded-2xl relative shadow-[0_0_30px_rgba(249,115,22,0.3)] animate-pulse flex items-center justify-center">
                    <div className="w-12 h-12 bg-orange-500/10 border border-orange-500/40 rounded-full flex items-center justify-center text-orange-400">
                      <Flame className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-xs text-orange-300 font-bold mt-4 bg-black/70 px-3 py-1 rounded-full border border-orange-500/30 backdrop-blur-sm">
                    Center SmokeStack QR Code in Frame
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* UPLOAD MODE */}
        {activeTab === 'upload' && (
          <div className="space-y-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-[#3a3a3a] hover:border-orange-500/50 bg-[#121212] hover:bg-[#161616] rounded-2xl p-8 text-center cursor-pointer transition-all space-y-3"
            >
              <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 mx-auto flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-bold text-white">
                  {uploadedFileName ? `Selected: ${uploadedFileName}` : 'Drop or select Log Sheet image'}
                </p>
                <p className="text-xs text-zinc-400 mt-1">
                  Supports JPG, PNG, WEBP, or screenshot of printable Smoker Log
                </p>
              </div>

              {isProcessingUpload ? (
                <div className="inline-flex items-center space-x-2 text-xs font-bold text-orange-400">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Scanning image for SmokeStack QR Code...</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="px-4 py-2 bg-orange-500 text-zinc-950 font-bold text-xs rounded-xl shadow cursor-pointer"
                >
                  Select File
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileUpload(file);
              }}
            />
          </div>
        )}

        {/* Footer info */}
        <div className="pt-3 border-t border-[#2a2a2a] flex items-center justify-between text-xs text-zinc-400 font-mono">
          <span>SmokeStack Scanner Engine</span>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-white underline cursor-pointer"
          >
            Cancel
          </button>
        </div>

      </div>
    </div>
  );
};
