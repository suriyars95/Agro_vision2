import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, X, Download, Wifi, Radio, Zap } from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

type StreamSource = "camera" | "rtsp" | "drone";

interface Box {
  class: string;
  conf: number;
  x: number;
  y: number;
  w: number;
  h: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

interface Detection {
  disease: string;
  confidence: number;
  timestamp: number;
  boxes: Box[];
}

interface StreamStats {
  fps: number;
  totalFrames: number;
  detectedFrames: number;
  detectionRate: number;
  avgLatency: number;
}

const COLOR_MAPPING: Record<string, string> = {
  'Aphid': '#FF4444',
  'Black Rust': '#8B008B',
  'Blast': '#FF6347',
  'Brown Spot': '#8B4513',
  'Downy Mildew': '#4169E1',
  'Gall Midge': '#FF8C00',
  'Hispa': '#DC143C',
  'Leaf Blotch': '#556B2F',
  'Leaf Scald': '#FF1493',
  'Normal': '#00AA00',
  'Powdery Mildew': '#F0E68C',
  'Sheath Blight': '#006400',
  'Sheath Rot': '#8B4513',
  'Stem Borer': '#696969',
  'Tungro': '#CD5C5C',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

const LiveStreamDetector = () => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderLoopRef = useRef<number | null>(null);
  const detectionLoopRef = useRef<NodeJS.Timeout | null>(null);
  
  // State - Stream Selection
  const [streamSource, setStreamSource] = useState<StreamSource>("camera");
  const [rtspUrl, setRtspUrl] = useState("");
  const [droneUrl, setDroneUrl] = useState("");
  
  // State - Stream Control
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sourceError, setSourceError] = useState("");
  
  // State - Detection Data
  const [detections, setDetections] = useState<Detection[]>([]);
  const [currentFrameDetections, setCurrentFrameDetections] = useState<Box[]>([]);
  const [stats, setStats] = useState<StreamStats>({
    fps: 0,
    totalFrames: 0,
    detectedFrames: 0,
    detectionRate: 0,
    avgLatency: 0,
  });
  
  // Internal refs for performance tracking
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const streamStartTimeRef = useRef<number>(0);
  const isStreamingRef = useRef(false);
  const latenciesRef = useRef<number[]>([]);

  // ============================================================================
  // CAMERA START
  // ============================================================================

  const startCamera = async () => {
    try {
      setSourceError("");
      console.log("🎬 Requesting camera access...");

      const constraints = {
        video: {
          facingMode: isMobile ? { ideal: "environment" } : "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Camera metadata timeout"));
          }, 5000);

          if (!videoRef.current) {
            clearTimeout(timeout);
            reject(new Error("Video ref is null"));
            return;
          }

          const onLoadedMetadata = () => {
            clearTimeout(timeout);
            videoRef.current?.removeEventListener("loadedmetadata", onLoadedMetadata);
            videoRef.current?.play().catch(reject);
            resolve();
          };

          videoRef.current.addEventListener("loadedmetadata", onLoadedMetadata);
        });

        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;

        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }

        if (captureCanvasRef.current) {
          captureCanvasRef.current.width = width;
          captureCanvasRef.current.height = height;
        }

        initializeStreaming();
        console.log(`✅ Camera started (${width}x${height})`);
        toast.success(`🎥 Camera active (${width}x${height})`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setSourceError(errorMsg);
      console.error("❌ Camera error:", error);
      toast.error(`Camera error: ${errorMsg}`);
    }
  };

  // ============================================================================
  // RTSP STREAM START
  // ============================================================================

  const startRtspStream = async () => {
    if (!rtspUrl.trim()) {
      setSourceError("Please enter an RTSP URL");
      toast.error("RTSP URL is required");
      return;
    }

    try {
      setSourceError("");
      console.log("📡 Starting RTSP stream...");

      if (videoRef.current) {
        // For HLS/DASH streaming support
        if (rtspUrl.includes(".m3u8") || rtspUrl.includes(".mpd")) {
          videoRef.current.src = rtspUrl;
        } else if (rtspUrl.startsWith("rtsp://")) {
          // RTSP needs server-side proxy or player support
          // For now, show that the stream would be proxied
          console.log("📡 RTSP stream URL registered:", rtspUrl);
          videoRef.current.src = `/api/rtsp-proxy?url=${encodeURIComponent(rtspUrl)}`;
        } else {
          videoRef.current.src = rtspUrl;
        }

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("RTSP stream connection timeout"));
          }, 10000);

          if (!videoRef.current) {
            clearTimeout(timeout);
            reject(new Error("Video ref is null"));
            return;
          }

          const onLoadedMetadata = () => {
            clearTimeout(timeout);
            videoRef.current?.removeEventListener("loadedmetadata", onLoadedMetadata);
            videoRef.current?.play().catch(reject);
            resolve();
          };

          const onError = () => {
            clearTimeout(timeout);
            videoRef.current?.removeEventListener("error", onError);
            reject(new Error("Failed to load RTSP stream"));
          };

          videoRef.current.addEventListener("loadedmetadata", onLoadedMetadata);
          videoRef.current.addEventListener("error", onError);
        });

        const width = videoRef.current.videoWidth || 1280;
        const height = videoRef.current.videoHeight || 720;

        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }

        if (captureCanvasRef.current) {
          captureCanvasRef.current.width = width;
          captureCanvasRef.current.height = height;
        }

        initializeStreaming();
        console.log(`✅ RTSP stream connected (${width}x${height})`);
        toast.success(`📡 RTSP stream connected (${width}x${height})`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setSourceError(errorMsg);
      console.error("❌ RTSP error:", error);
      toast.error(`RTSP error: ${errorMsg}`);
    }
  };

  // ============================================================================
  // DRONE VIDEO START
  // ============================================================================

  const startDroneStream = async () => {
    if (!droneUrl.trim()) {
      setSourceError("Please enter a drone video URL");
      toast.error("Drone video URL is required");
      return;
    }

    try {
      setSourceError("");
      console.log("🚁 Starting drone stream...");

      if (videoRef.current) {
        // Support HLS, DASH, or direct video URLs
        videoRef.current.src = droneUrl;
        videoRef.current.crossOrigin = "anonymous";

        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error("Drone stream connection timeout"));
          }, 10000);

          if (!videoRef.current) {
            clearTimeout(timeout);
            reject(new Error("Video ref is null"));
            return;
          }

          const onLoadedMetadata = () => {
            clearTimeout(timeout);
            videoRef.current?.removeEventListener("loadedmetadata", onLoadedMetadata);
            videoRef.current?.play().catch(reject);
            resolve();
          };

          const onError = () => {
            clearTimeout(timeout);
            videoRef.current?.removeEventListener("error", onError);
            reject(new Error("Failed to load drone stream"));
          };

          videoRef.current.addEventListener("loadedmetadata", onLoadedMetadata);
          videoRef.current.addEventListener("error", onError);
        });

        const width = videoRef.current.videoWidth || 1280;
        const height = videoRef.current.videoHeight || 720;

        if (canvasRef.current) {
          canvasRef.current.width = width;
          canvasRef.current.height = height;
        }

        if (captureCanvasRef.current) {
          captureCanvasRef.current.width = width;
          captureCanvasRef.current.height = height;
        }

        initializeStreaming();
        console.log(`✅ Drone stream connected (${width}x${height})`);
        toast.success(`🚁 Drone stream connected (${width}x${height})`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      setSourceError(errorMsg);
      console.error("❌ Drone stream error:", error);
      toast.error(`Drone stream error: ${errorMsg}`);
    }
  };

  // ============================================================================
  // UNIFIED STREAM INITIALIZATION
  // ============================================================================

  const initializeStreaming = () => {
    setIsStreaming(true);
    isStreamingRef.current = true;
    streamStartTimeRef.current = Date.now();
    frameCountRef.current = 0;
    latenciesRef.current = [];
    setDetections([]);
    setCurrentFrameDetections([]);

    startRenderLoop();
    startDetectionLoop();
  };

  // ============================================================================
  // RENDER LOOP (60 FPS)
  // ============================================================================

  const startRenderLoop = () => {
    const renderFrame = () => {
      if (!isStreamingRef.current || !videoRef.current || !canvasRef.current) {
        return;
      }

      const ctx = canvasRef.current.getContext("2d");
      if (!ctx) return;

      const canvas = canvasRef.current;
      const width = canvas.width;
      const height = canvas.height;

      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(videoRef.current, 0, 0, width, height);

      drawDetectionsOnCanvas(ctx, width, height);

      frameCountRef.current++;
      const now = Date.now();
      if (now - lastFpsUpdateRef.current >= 1000) {
        setStats((prev) => ({
          ...prev,
          fps: frameCountRef.current,
        }));
        frameCountRef.current = 0;
        lastFpsUpdateRef.current = now;
      }

      renderLoopRef.current = requestAnimationFrame(renderFrame);
    };

    renderLoopRef.current = requestAnimationFrame(renderFrame);
  };

  // ============================================================================
  // DETECTION LOOP (1 FPS)
  // ============================================================================

  const startDetectionLoop = () => {
    const detectionInterval = setInterval(async () => {
      if (!isStreamingRef.current || !videoRef.current || !captureCanvasRef.current) {
        return;
      }

      try {
        setIsProcessing(true);
        const detectionStartTime = Date.now();

        const ctx = captureCanvasRef.current.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(videoRef.current, 0, 0, captureCanvasRef.current.width, captureCanvasRef.current.height);
        const frameBase64 = captureCanvasRef.current.toDataURL("image/jpeg", 0.8).split(",")[1];

        const response = await fetch("http://localhost:5000/stream/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frame: frameBase64 }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const detectionLatency = Date.now() - detectionStartTime;
        latenciesRef.current.push(detectionLatency);
        if (latenciesRef.current.length > 30) {
          latenciesRef.current.shift();
        }

        const avgLatency = latenciesRef.current.reduce((a, b) => a + b, 0) / latenciesRef.current.length;
        setStats((prev) => ({
          ...prev,
          avgLatency: Math.round(avgLatency),
        }));

        if (data.success && data.detections && data.detections.length > 0) {
          const boxes: Box[] = data.detections.map((det: any) => {
            let x1 = parseFloat(det.x1) || parseFloat(det.x) || 0;
            let y1 = parseFloat(det.y1) || parseFloat(det.y) || 0;
            let x2 = parseFloat(det.x2) || (x1 + parseFloat(det.w)) || 0;
            let y2 = parseFloat(det.y2) || (y1 + parseFloat(det.h)) || 0;

            if (x1 > 1 || y1 > 1 || x2 > 1 || y2 > 1) {
              const frameWidth = captureCanvasRef.current?.width || 640;
              const frameHeight = captureCanvasRef.current?.height || 480;
              x1 = x1 / frameWidth;
              y1 = y1 / frameHeight;
              x2 = x2 / frameWidth;
              y2 = y2 / frameHeight;
            }

            const width = x2 - x1;
            const height = y2 - y1;

            return {
              class: det.class || "Unknown",
              conf: parseFloat(det.conf) || 0,
              x: x1,
              y: y1,
              w: width,
              h: height,
              x1: x1,
              y1: y1,
              x2: x2,
              y2: y2,
            };
          });

          setCurrentFrameDetections(boxes);

          if (boxes.length > 0) {
            const detection: Detection = {
              disease: boxes[0].class,
              confidence: boxes[0].conf,
              timestamp: Date.now(),
              boxes,
            };

            setDetections((prev) => [...prev.slice(-99), detection]);
            setStats((prev) => ({
              ...prev,
              detectedFrames: prev.detectedFrames + 1,
              totalFrames: prev.totalFrames + 1,
              detectionRate: ((prev.detectedFrames + 1) / (prev.totalFrames + 1)) * 100,
            }));
          } else {
            setStats((prev) => ({
              ...prev,
              totalFrames: prev.totalFrames + 1,
              detectionRate: (prev.detectedFrames / (prev.totalFrames + 1)) * 100,
            }));
            setCurrentFrameDetections([]);
          }
        } else {
          setStats((prev) => ({
            ...prev,
            totalFrames: prev.totalFrames + 1,
            detectionRate: (prev.detectedFrames / (prev.totalFrames + 1)) * 100,
          }));
          setCurrentFrameDetections([]);
        }

        setIsProcessing(false);
      } catch (error) {
        console.error("❌ Detection error:", error);
        setIsProcessing(false);
      }
    }, 1000);

    detectionLoopRef.current = detectionInterval;
  };

  // ============================================================================
  // CANVAS DRAWING
  // ============================================================================

  const drawDetectionsOnCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!currentFrameDetections || currentFrameDetections.length === 0) {
      return;
    }

    const diseaseCounts: Record<string, number> = {};
    currentFrameDetections.forEach((box) => {
      diseaseCounts[box.class] = (diseaseCounts[box.class] || 0) + 1;
    });

    currentFrameDetections.forEach((box, index) => {
      try {
        const x = box.x * width;
        const y = box.y * height;
        const boxWidth = box.w * width;
        const boxHeight = box.h * height;

        if (boxWidth <= 0 || boxHeight <= 0 || x < 0 || y < 0) {
          return;
        }

        let color = COLOR_MAPPING[box.class] || "#FF0000";

        if (box.conf < 40) {
          color = "#FFFF00";
        } else if (box.conf < 60) {
          color = "#FF8800";
        } else if (box.conf > 85) {
          color = "#FF0000";
        }

        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.strokeRect(x, y, boxWidth, boxHeight);
        ctx.shadowColor = "transparent";

        const label = `${box.class} ${box.conf.toFixed(0)}%`;
        ctx.font = "bold 14px Arial";
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width + 12;
        const textHeight = 24;

        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(x - 2, y - textHeight - 6, textWidth, textHeight);

        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - textHeight - 6, textWidth, textHeight);

        ctx.fillStyle = color;
        ctx.font = "bold 13px Arial";
        ctx.textBaseline = "top";
        ctx.fillText(label, x + 5, y - textHeight + 1);

        ctx.fillStyle = color;
        const cornerSize = 6;
        ctx.fillRect(x, y, cornerSize, cornerSize);
        ctx.fillRect(x + boxWidth - cornerSize, y, cornerSize, cornerSize);
        ctx.fillRect(x, y + boxHeight - cornerSize, cornerSize, cornerSize);
        ctx.fillRect(x + boxWidth - cornerSize, y + boxHeight - cornerSize, cornerSize, cornerSize);
      } catch (err) {
        console.error("Error drawing box:", err);
      }
    });

    try {
      let summaryY = 12;
      ctx.font = "bold 16px Arial";
      ctx.fillStyle = "rgba(0, 255, 0, 0.95)";
      ctx.fillText(`🎬 LIVE - Detections: ${currentFrameDetections.length}`, 12, summaryY);

      summaryY += 24;
      ctx.font = "bold 13px Arial";
      Object.entries(diseaseCounts).forEach(([disease, count]) => {
        const color = COLOR_MAPPING[disease] || "#FFFFFF";
        ctx.fillStyle = color;
        ctx.fillText(`${disease}: ${count}`, 12, summaryY);
        summaryY += 18;
      });

      ctx.font = "bold 12px monospace";
      ctx.fillStyle = "rgba(0, 255, 0, 0.9)";
      ctx.fillText(
        `FPS: ${stats.fps} | Latency: ${stats.avgLatency}ms | Rate: ${stats.detectionRate.toFixed(1)}%`,
        12,
        height - 12
      );
    } catch (err) {
      console.error("Error drawing stats:", err);
    }
  };

  // ============================================================================
  // STREAM CONTROL
  // ============================================================================

  const stopStream = async () => {
    isStreamingRef.current = false;
    setIsStreaming(false);

    if (renderLoopRef.current) {
      cancelAnimationFrame(renderLoopRef.current);
    }
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
    }

    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    if (videoRef.current) {
      videoRef.current.src = "";
    }

    toast.success("Stream stopped");
  };

  const startStream = () => {
    if (streamSource === "camera") {
      startCamera();
    } else if (streamSource === "rtsp") {
      startRtspStream();
    } else if (streamSource === "drone") {
      startDroneStream();
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();

    return () => {
      if (isStreamingRef.current) {
        stopStream();
      }
    };
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="w-full max-w-5xl mx-auto p-4 space-y-4">
      {/* Stream Source Selection */}
      <Card className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📡 Stream Source Selection
          </CardTitle>
          <CardDescription>Choose your detection stream source</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Source Selection Tabs */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => setStreamSource("camera")}
              className={`p-3 rounded-lg border-2 transition ${
                streamSource === "camera"
                  ? "bg-blue-200 border-blue-500 text-blue-900"
                  : "bg-white border-gray-300 hover:border-blue-300"
              }`}
            >
              <Wifi className="w-5 h-5 mx-auto mb-2" />
              <div className="font-bold">📷 Camera</div>
              <div className="text-xs">USB/Built-in camera</div>
            </button>

            <button
              onClick={() => setStreamSource("rtsp")}
              className={`p-3 rounded-lg border-2 transition ${
                streamSource === "rtsp"
                  ? "bg-green-200 border-green-500 text-green-900"
                  : "bg-white border-gray-300 hover:border-green-300"
              }`}
            >
              <Radio className="w-5 h-5 mx-auto mb-2" />
              <div className="font-bold">📡 RTSP</div>
              <div className="text-xs">Network stream</div>
            </button>

            <button
              onClick={() => setStreamSource("drone")}
              className={`p-3 rounded-lg border-2 transition ${
                streamSource === "drone"
                  ? "bg-purple-200 border-purple-500 text-purple-900"
                  : "bg-white border-gray-300 hover:border-purple-300"
              }`}
            >
              <Zap className="w-5 h-5 mx-auto mb-2" />
              <div className="font-bold">🚁 Drone</div>
              <div className="text-xs">Aerial video feed</div>
            </button>
          </div>

          {/* Source-Specific Input */}
          {streamSource === "rtsp" && (
            <div className="space-y-2">
              <label className="block text-sm font-bold">RTSP URL</label>
              <input
                type="text"
                value={rtspUrl}
                onChange={(e) => setRtspUrl(e.target.value)}
                placeholder="rtsp://192.168.1.100:554/stream or HLS URL"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              <div className="text-xs text-gray-600">
                Examples: rtsp://ip:554/stream, http://ip:port/stream.m3u8
              </div>
            </div>
          )}

          {streamSource === "drone" && (
            <div className="space-y-2">
              <label className="block text-sm font-bold">Drone Video URL</label>
              <input
                type="text"
                value={droneUrl}
                onChange={(e) => setDroneUrl(e.target.value)}
                placeholder="http://drone-ip:port/stream or HLS/DASH URL"
                className="w-full px-3 py-2 border border-gray-300 rounded"
              />
              <div className="text-xs text-gray-600">
                Examples: HLS (*.m3u8), DASH (*.mpd), MP4 stream URLs
              </div>
            </div>
          )}

          {/* Error Display */}
          {sourceError && (
            <div className="flex items-center gap-2 p-3 bg-red-100 border border-red-300 rounded text-red-800">
              <AlertCircle className="w-5 h-5" />
              <span>{sourceError}</span>
            </div>
          )}

          {/* Start Button */}
          <Button
            onClick={startStream}
            disabled={
              isStreaming ||
              (streamSource === "rtsp" && !rtspUrl.trim()) ||
              (streamSource === "drone" && !droneUrl.trim())
            }
            className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold py-3"
          >
            {isStreaming ? "⏸️ Stream Active" : "▶️ Start Stream"}
          </Button>
        </CardContent>
      </Card>

      {/* Video Display & Detection */}
      {isStreaming && (
        <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl flex items-center gap-2">
                  🎥 Live Detection Stream
                </CardTitle>
                <CardDescription>
                  {streamSource === "camera" && "📷 USB/Built-in Camera"}
                  {streamSource === "rtsp" && "📡 RTSP Network Stream"}
                  {streamSource === "drone" && "🚁 Drone Video Feed"}
                </CardDescription>
              </div>
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 border border-red-300 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-700">LIVE</span>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Canvas Display */}
            <div className="relative bg-black rounded-lg overflow-hidden border-2 border-gray-300 aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full hidden"
              />
              <canvas
                ref={canvasRef}
                className="w-full h-full"
              />
              <canvas ref={captureCanvasRef} className="hidden" />
            </div>

            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm font-mono bg-gray-900 text-white p-3 rounded">
              <div className="text-center">
                <div className="text-xl font-bold text-blue-400">{stats.fps}</div>
                <div className="text-xs text-gray-400">FPS</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-400">{stats.detectedFrames}</div>
                <div className="text-xs text-gray-400">Detected</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-yellow-400">{stats.totalFrames}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-purple-400">{stats.detectionRate.toFixed(1)}%</div>
                <div className="text-xs text-gray-400">Rate</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-red-400">{stats.avgLatency}ms</div>
                <div className="text-xs text-gray-400">Latency</div>
              </div>
            </div>

            {/* Current Detections */}
            {currentFrameDetections.length > 0 && (
              <div className="bg-red-50 border-2 border-red-300 p-4 rounded space-y-2">
                <div className="font-bold text-red-900 text-lg">
                  🚨 Current Detections: {currentFrameDetections.length}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {currentFrameDetections.map((box, i) => (
                    <div
                      key={i}
                      className="text-sm p-2 bg-white border rounded"
                      style={{
                        borderLeftWidth: "4px",
                        borderLeftColor: COLOR_MAPPING[box.class] || "#FF0000",
                      }}
                    >
                      <div className="font-bold">{i + 1}. {box.class}</div>
                      <div className="text-xs text-gray-600">
                        Confidence: {box.conf.toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Stop Button */}
            <Button
              onClick={stopStream}
              className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3"
            >
              🛑 Stop Stream
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveStreamDetector;
