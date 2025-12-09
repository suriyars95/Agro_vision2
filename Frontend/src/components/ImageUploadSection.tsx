import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Check } from "lucide-react";
import { toast } from "sonner";

interface ImageUploadSectionProps {
  onImageSelect: (file: File, preview: string) => void;
  onAnalyze: (file: File) => void;
  analyzing?: boolean;
}

const ImageUploadSection = ({ onImageSelect, onAnalyze, analyzing = false }: ImageUploadSectionProps) => {
  const [uploadMode, setUploadMode] = useState<'capture' | 'upload' | null>('capture');
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);

  // Auto-start camera on mount
  useEffect(() => {
    const startCameraOnMount = async () => {
      try {
        const constraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setIsCameraActive(true);
        }
      } catch (error) {
        console.error("Camera access failed on mount:", error);
        setUploadMode(null);
      }
    };
    startCameraOnMount();
    const videoNode = videoRef.current;
    return () => {
      if (videoNode?.srcObject) {
        const tracks = (videoNode.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const handleCameraClick = async () => {
    setUploadMode('capture');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraActive(true);
      }
    } catch (error) {
      toast.error("Unable to access camera. Please check permissions.");
      setUploadMode(null);
    }
  };

  const handleTakePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        // Set canvas dimensions to match video
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        
        // Draw video frame to canvas
        context.drawImage(videoRef.current, 0, 0);
        
        // Get canvas as blob
        canvasRef.current.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            const previewUrl = canvasRef.current!.toDataURL('image/jpeg');
            
            setPreview(previewUrl);
            setSelectedFile(file);
            onImageSelect(file, previewUrl);
            
            // Stop camera
            stopCamera();
            toast.success("Photo captured successfully!");
          }
        }, 'image/jpeg', 0.9);
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setIsCameraActive(false);
  };

  const handleUploadClick = () => {
    setUploadMode('upload');
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File size must be less than 10MB");
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const previewUrl = e.target?.result as string;
        setPreview(previewUrl);
        setSelectedFile(file);
        onImageSelect(file, previewUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeClick = () => {
    if (!selectedFile) {
      toast.error("Please select or capture an image first");
      return;
    }
    onAnalyze(selectedFile);
  };

  const handleClear = () => {
    setPreview(null);
    setSelectedFile(null);
    setUploadMode(null);
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="border-primary/20 overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5 text-primary" />
          Image Upload
        </CardTitle>
        <p className="text-xs text-gray-500 mt-1">Upload photos from your field or capture using your device camera</p>
      </CardHeader>
      <CardContent className="pt-8">
        <div className="space-y-4">
          {/* Camera or Placeholder */}
          <div className="border-4 border-primary rounded-3xl overflow-hidden bg-black flex items-center justify-center aspect-square w-full max-w-xs mx-auto" style={{ minHeight: 260 }}>
            {isCameraActive ? (
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
            ) : preview ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-white text-center w-full">Camera</span>
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          {/* Buttons */}
          <div className="flex flex-col gap-2">
            <Button 
              onClick={isCameraActive ? handleTakePhoto : handleCameraClick}
              className="w-full bg-gradient-to-r from-yellow-400 to-green-400 hover:from-yellow-500 hover:to-green-500 text-gray-900 font-semibold text-base py-3 rounded-xl"
            >
              <Camera className="h-5 w-5 mr-2" />
              {isCameraActive ? 'Take photo' : 'Open camera'}
            </Button>
            <div className="text-center text-sm text-gray-500 py-1">or</div>
            <Button 
              onClick={handleUploadClick}
              variant="outline"
              className="w-full bg-gradient-to-r from-yellow-400 to-green-400 hover:from-yellow-500 hover:to-green-500 border-0 text-gray-900 font-semibold text-base py-3 rounded-xl"
            >
              <Upload className="h-5 w-5 mr-2" />
              Upload photo
            </Button>
          </div>

          {/* Analyze & Clear Buttons (only if preview) */}
          {preview && (
            <div className="flex gap-2 mt-2">
              <Button 
                onClick={handleAnalyzeClick}
                disabled={analyzing}
                className="flex-1 bg-gradient-to-r from-yellow-400 to-green-400 hover:from-yellow-500 hover:to-green-500 text-gray-900 font-semibold py-3 rounded-xl disabled:opacity-50"
              >
                {analyzing ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Analyze
                  </>
                )}
              </Button>
              <Button 
                onClick={handleClear}
                variant="outline"
                className="flex-1 py-3 rounded-xl"
              >
                <X className="h-5 w-5 mr-2" />
                Clear
              </Button>
            </div>
          )}

          {/* Hidden Inputs */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            title="Upload image file"
            onChange={handleFileSelect}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            title="Capture image from camera"
            onChange={handleFileSelect}
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default ImageUploadSection;
