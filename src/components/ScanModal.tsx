import React, { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';

interface ScanModalProps {
  onClose: () => void;
  onFound: (code: string) => void;
}

export default function ScanModal({ onClose, onFound }: ScanModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [streamActive, setStreamActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setStreamActive(true);
        tick();
      }
    } catch (err) {
      console.error('Camera access denied or unavailable', err);
      setStreamActive(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(t => t.stop());
      videoRef.current.srcObject = null;
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    setStreamActive(false);
  };

  const tick = () => {
    if (!videoRef.current || !canvasRef.current) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);
      if (code && code.data) {
        onFound(code.data);
        stopCamera();
      }
    } catch (e) {
      // ignore cross-origin or read errors
    }
    rafRef.current = requestAnimationFrame(tick);
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      onFound(manualCode.trim());
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-dark/80 backdrop-blur-md flex items-center justify-center p-6">
      <div className="bg-zinc-900 rounded-3xl p-6 w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-black">Scan QR</h3>
          <button onClick={() => { stopCamera(); onClose(); }} className="text-white/40">Close</button>
        </div>
        <div className="rounded-2xl overflow-hidden bg-black/60">
          <video ref={videoRef} className="w-full h-64 object-cover" playsInline />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        <form onSubmit={handleManualSubmit} className="mt-4">
          <label className="text-[10px] text-white/40 uppercase font-black tracking-widest">Or enter code manually</label>
          <div className="flex gap-2 mt-2">
            <input value={manualCode} onChange={(e) => setManualCode(e.target.value)} placeholder="Enter QR code or request id" className="flex-1 p-3 rounded-2xl bg-transparent border border-white/10 outline-none" />
            <button type="submit" className="bg-brand text-dark px-4 rounded-2xl font-black">Verify</button>
          </div>
        </form>
      </div>
    </div>
  );
}
