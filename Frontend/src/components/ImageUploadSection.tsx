import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Check, ScanLine, Image as ImageIcon, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadSectionProps {
  onImageSelect: (file: File, preview: string) => void;
  onAnalyze: (file: File) => void;
  analyzing?: boolean;
}

const ImageUploadSection = ({ onImageSelect, onAnalyze, analyzing = false }: ImageUploadSectionProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Auto-start camera if camera mode is requested (logic moved to button click for better UX)

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast.error("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);

        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const previewUrl = canvasRef.current!.toDataURL('image/jpeg');
            processFile(file, previewUrl);
            stopCamera();
            toast.success("Photo captured!");
          }
        }, 'image/jpeg', 0.95);
      }
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleFile = (file: File) => {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => processFile(file, e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const processFile = (file: File, previewUrl: string) => {
    setPreview(previewUrl);
    setSelectedFile(file);
    onImageSelect(file, previewUrl);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) handleFile(file);
  };

  const handleClear = () => {
    setPreview(null);
    setSelectedFile(null);
    stopCamera();
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div
        className={cn(
          "relative group w-full h-56 md:h-64 rounded-xl border-2 border-dashed transition-all duration-300 overflow-hidden flex flex-col items-center justify-center bg-muted/30 dark:bg-white/5",
          isDragOver ? "border-primary bg-primary/5 scale-[1.01]" : "border-border hover:border-primary/50",
          (preview || isCameraActive) ? "border-transparent bg-black" : ""
        )}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {isCameraActive ? (
          <div className="relative w-full h-full">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />

            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 border-[40px] border-black/50 mask-image-center" />
              <div className="absolute inset-4 border-2 border-white/30 rounded-lg">
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                <ScanLine className="w-full h-0.5 text-primary/50 animate-scan" />
              </div>
            </div>

            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 pointer-events-auto">
              <Button size="icon" variant="destructive" className="rounded-full w-10 h-10 shadow-lg" onClick={stopCamera}>
                <X className="h-4 w-4" />
              </Button>
              <Button size="icon" className="rounded-full w-14 h-14 bg-white hover:bg-white/90 ring-4 ring-white/30 transition-all active:scale-90 shadow-lg" onClick={handleTakePhoto}>
                <div className="w-10 h-10 rounded-full border-4 border-primary" />
              </Button>
            </div>
          </div>
        ) : preview ? (
          <div className="relative w-full h-full group/preview">
            <img src={preview} alt="Preview" className="w-full h-full object-contain bg-black/80 backdrop-blur-xl" />
            <div className="absolute inset-0 bg-black/0 group-hover/preview:bg-black/40 transition-colors flex items-center justify-center gap-3 opacity-0 group-hover/preview:opacity-100 pointer-events-auto">
              <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="bg-white/10 border-white/20 text-white hover:bg-white/20">
                <RefreshCw className="h-3 w-3 mr-2" /> Change
              </Button>
              <Button onClick={handleClear} size="sm" variant="destructive">
                <X className="h-3 w-3 mr-2" /> Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-3 p-6 animate-fade-in-up">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform duration-500">
              {isDragOver ? <Upload className="h-6 w-6 text-primary animate-bounce" /> : <ImageIcon className="h-6 w-6 text-primary/60" />}
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold">Drop image here</h3>
              <p className="text-sm text-muted-foreground">JPEG, PNG up to 10MB</p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="h-9 px-4 border-primary/20 hover:border-primary/50 hover:bg-primary/5">
                <Upload className="h-3 w-3 mr-2" />
                Select
              </Button>
              <Button onClick={startCamera} size="sm" className="h-9 px-4">
                <Camera className="h-3 w-3 mr-2" />
                Camera
              </Button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />

      {/* Analyze Action - Compact */}
      {preview && (
        <div className="flex justify-center animate-fade-in-up">
          <Button
            onClick={() => onAnalyze(selectedFile!)}
            disabled={analyzing}
            className="w-full md:w-auto min-w-[160px] h-10 text-sm font-semibold shadow-lg shadow-primary/20"
          >
            {analyzing ? "Scanning..." : "Run Analysis"}
          </Button>
        </div>
      )}
    </div>
  );
};

export default ImageUploadSection;
