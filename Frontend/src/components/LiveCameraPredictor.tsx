import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, X, Download } from "lucide-react";
import { toast } from "sonner";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface Box {
  class: string;
  conf: number;
  x: number;
  y: number;
  w: number;
  h: number;
  percent?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

interface Detection {
  disease: string;
  confidence: number;
  percent?: number;
  timestamp: number;
  boxes: Box[];
}

interface DiseaseReport {
  totalDetections: number;
  uniqueDiseases: string[];
  diseaseFrequency: Record<string, number>;
  averageConfidence: Record<string, number>;
  detectionTimeline: Detection[];
  duration: number;
  topDiseases: Array<{ disease: string; count: number; avgConfidence: number }>;
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

const LiveCameraPredictor = ({ onReportGenerated }: { onReportGenerated?: (report: DiseaseReport) => void }) => {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement>(null);
  const renderLoopRef = useRef<number | null>(null);
  const detectionLoopRef = useRef<NodeJS.Timeout | null>(null);
  
  // State
  const [isStreaming, setIsStreaming] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [detections, setDetections] = useState<Detection[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentFrameDetections, setCurrentFrameDetections] = useState<Box[]>([]);
  const [stats, setStats] = useState({
    fps: 0,
    totalFrames: 0,
    detectedFrames: 0,
  });
  
  // Internal refs for performance tracking
  const frameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(Date.now());
  const streamStartTimeRef = useRef<number>(0);
  const isStreamingRef = useRef(false);
  const lastDetectionTimeRef = useRef<number>(0);

  // ============================================================================
  // CAMERA INITIALIZATION
  // ============================================================================

  const startCamera = async () => {
    try {
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
        
        // Wait for video metadata
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

        // Set canvas dimensions to match video
        const width = videoRef.current.videoWidth;
        const height = videoRef.current.videoHeight;
        
        if (captureCanvasRef.current) {
          captureCanvasRef.current.width = width;
          captureCanvasRef.current.height = height;
        }
        
        if (displayCanvasRef.current) {
          displayCanvasRef.current.width = width;
          displayCanvasRef.current.height = height;
        }

        setIsStreaming(true);
        isStreamingRef.current = true;
        streamStartTimeRef.current = Date.now();
        frameCountRef.current = 0;

        // Start render loop (60 FPS canvas drawing)
        startRenderLoop();
        
        // Start detection loop (1 FPS YOLO inference)
        startDetectionLoop();

        console.log(`✅ Camera started (${width}x${height})`);
        toast.success(`🎥 Camera active (${width}x${height})`);
      }
    } catch (error) {
      console.error("❌ Camera error:", error);
      toast.error(`Camera error: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  // ============================================================================
  // RENDER LOOP (60 FPS - Canvas Drawing Only)
  // ============================================================================

  const startRenderLoop = () => {
    const renderFrame = () => {
      if (!isStreamingRef.current || !videoRef.current || !displayCanvasRef.current) {
        return;
      }

      const ctx = displayCanvasRef.current.getContext("2d");
      if (!ctx) return;

      const canvas = displayCanvasRef.current;
      const width = canvas.width;
      const height = canvas.height;

      // Clear and draw video
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(videoRef.current, 0, 0, width, height);

      // Draw detections on canvas
      drawDetectionsOnCanvas(ctx, width, height);

      // Update FPS counter
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
  // DETECTION LOOP (1 FPS - YOLO Inference)
  // ============================================================================

  const startDetectionLoop = () => {
    const detectionInterval = setInterval(async () => {
      if (!isStreamingRef.current || !videoRef.current || !captureCanvasRef.current) {
        return;
      }

      try {
        setIsProcessing(true);

        // Capture current video frame
        const ctx = captureCanvasRef.current.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(videoRef.current, 0, 0, captureCanvasRef.current.width, captureCanvasRef.current.height);
        const frameBase64 = captureCanvasRef.current.toDataURL("image/jpeg", 0.8).split(",")[1];

        // Send to backend for YOLO detection
        const response = await fetch("http://localhost:5000/stream/detect", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ frame: frameBase64 }),
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.success && data.detections && data.detections.length > 0) {
          console.log(`🎯 Detections: ${data.count}`, data.detections);
          
          const boxes: Box[] = data.detections.map((det: any) => {
            // API returns normalized coordinates (0-1) or pixel coordinates
            let x1 = parseFloat(det.x1) || parseFloat(det.x) || 0;
            let y1 = parseFloat(det.y1) || parseFloat(det.y) || 0;
            let x2 = parseFloat(det.x2) || (x1 + parseFloat(det.w)) || 0;
            let y2 = parseFloat(det.y2) || (y1 + parseFloat(det.h)) || 0;
            
            // Ensure coordinates are normalized (0-1)
            if (x1 > 1 || y1 > 1 || x2 > 1 || y2 > 1) {
              // Pixel coordinates - this shouldn't happen with new backend
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
              percent: (width * height) * 100,
            };
          });

          // Update current frame detections
          setCurrentFrameDetections(boxes);

          // Add to detection timeline
          if (boxes.length > 0) {
            const detection: Detection = {
              disease: boxes[0].class,
              confidence: boxes[0].conf,
              percent: boxes[0].percent,
              timestamp: Date.now(),
              boxes,
            };

            setDetections((prev) => [...prev.slice(-99), detection]); // Keep last 100
            setStats((prev) => ({
              ...prev,
              detectedFrames: prev.detectedFrames + 1,
              totalFrames: prev.totalFrames + 1,
            }));
          } else {
            setStats((prev) => ({
              ...prev,
              totalFrames: prev.totalFrames + 1,
            }));
          }
        } else {
          setStats((prev) => ({
            ...prev,
            totalFrames: prev.totalFrames + 1,
          }));
          setCurrentFrameDetections([]); // Clear if no detections
        }

        lastDetectionTimeRef.current = Date.now();
        setIsProcessing(false);
      } catch (error) {
        console.error("❌ Detection error:", error);
        setIsProcessing(false);
      }
    }, 1000); // 1 FPS detection for efficiency

    detectionLoopRef.current = detectionInterval;
  };

  // ============================================================================
  // CANVAS DRAWING
  // ============================================================================

  const drawDetectionsOnCanvas = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
    if (!currentFrameDetections || currentFrameDetections.length === 0) {
      return;
    }

    // Count diseases
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

        // Skip invalid boxes
        if (boxWidth <= 0 || boxHeight <= 0 || x < 0 || y < 0) {
          console.warn("Invalid box dimensions:", box);
          return;
        }

        // Determine color based on class and confidence
        let color = COLOR_MAPPING[box.class] || "#FF0000";
        
        // Adjust brightness based on confidence
        if (box.conf < 40) {
          color = "#FFFF00"; // Yellow for low confidence
        } else if (box.conf < 60) {
          color = "#FF8800"; // Orange for medium confidence
        } else if (box.conf > 85) {
          color = "#FF0000"; // Bright red for high confidence
        }

        // ===== DRAW BOUNDING BOX =====
        ctx.strokeStyle = color;
        ctx.lineWidth = 3;
        ctx.shadowColor = "rgba(0,0,0,0.8)";
        ctx.shadowBlur = 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.strokeRect(x, y, boxWidth, boxHeight);
        ctx.shadowColor = "transparent";

        // ===== DRAW DETECTION NUMBER =====
        ctx.fillStyle = color;
        ctx.font = "bold 16px Arial";
        ctx.fillText(`${index + 1}`, x + 8, y + 25);

        // ===== DRAW LABEL BACKGROUND =====
        const label = `${box.class} ${box.conf.toFixed(0)}%`;
        ctx.font = "bold 14px Arial";
        const textMetrics = ctx.measureText(label);
        const textWidth = textMetrics.width + 12;
        const textHeight = 24;

        // Background box for label
        ctx.fillStyle = "rgba(0, 0, 0, 0.85)";
        ctx.fillRect(x - 2, y - textHeight - 6, textWidth, textHeight);

        // Border around label
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.strokeRect(x - 2, y - textHeight - 6, textWidth, textHeight);

        // ===== DRAW LABEL TEXT =====
        ctx.fillStyle = color;
        ctx.font = "bold 13px Arial";
        ctx.textBaseline = "top";
        ctx.fillText(label, x + 5, y - textHeight + 1);

        // ===== DRAW CORNER MARKERS =====
        ctx.fillStyle = color;
        const cornerSize = 6;
        // Top-left
        ctx.fillRect(x, y, cornerSize, cornerSize);
        // Top-right
        ctx.fillRect(x + boxWidth - cornerSize, y, cornerSize, cornerSize);
        // Bottom-left
        ctx.fillRect(x, y + boxHeight - cornerSize, cornerSize, cornerSize);
        // Bottom-right
        ctx.fillRect(x + boxWidth - cornerSize, y + boxHeight - cornerSize, cornerSize, cornerSize);
      } catch (err) {
        console.error("Error drawing box:", err);
      }
    });

    // ===== DRAW DISEASE COUNT SUMMARY AT TOP =====
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

      // Draw FPS and frame info
      ctx.font = "bold 12px monospace";
      ctx.fillStyle = "rgba(0, 255, 0, 0.9)";
      ctx.fillText(`FPS: ${stats.fps} | Frames: ${stats.detectedFrames}/${stats.totalFrames}`, 12, height - 12);
    } catch (err) {
      console.error("Error drawing stats:", err);
    }
  };

  // ============================================================================
  // REPORTING
  // ============================================================================

  const generateReport = (): DiseaseReport => {
    const diseaseFreq: Record<string, number> = {};
    const diseaseConfidence: Record<string, number[]> = {};

    detections.forEach((det) => {
      const disease = det.disease;
      diseaseFreq[disease] = (diseaseFreq[disease] || 0) + 1;
      if (!diseaseConfidence[disease]) {
        diseaseConfidence[disease] = [];
      }
      diseaseConfidence[disease].push(det.confidence);
    });

    const averageConfidence: Record<string, number> = {};
    Object.keys(diseaseConfidence).forEach((disease) => {
      const confidences = diseaseConfidence[disease];
      averageConfidence[disease] =
        Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 10) / 10;
    });

    const topDiseases = Object.entries(diseaseFreq)
      .map(([disease, count]) => ({
        disease,
        count,
        avgConfidence: averageConfidence[disease],
      }))
      .sort((a, b) => b.count - a.count);

    return {
      totalDetections: detections.length,
      uniqueDiseases: Object.keys(diseaseFreq),
      diseaseFrequency: diseaseFreq,
      averageConfidence,
      detectionTimeline: detections,
      duration: (Date.now() - streamStartTimeRef.current) / 1000,
      topDiseases,
    };
  };

  const downloadReport = () => {
    const report = generateReport();
    const reportText = `
🌾 CROP DISEASE DETECTION REPORT
=====================================
Generated: ${new Date().toLocaleString()}
Duration: ${report.duration.toFixed(1)}s
Total Detections: ${report.totalDetections}
Unique Diseases: ${report.uniqueDiseases.join(", ")}

DISEASE SUMMARY:
${report.topDiseases
  .map(
    (d) =>
      `  • ${d.disease}: ${d.count} detections (avg confidence: ${d.avgConfidence.toFixed(1)}%)`
  )
  .join("\n")}

CONFIDENCE RANGES:
${Object.entries(report.averageConfidence)
  .map(([disease, conf]) => `  • ${disease}: ${conf}%`)
  .join("\n")}

RECOMMENDATIONS:
${
  report.topDiseases.length > 0
    ? `  • Primary threat: ${report.topDiseases[0].disease}\n  • Apply targeted fungicide/pesticide\n  • Monitor crop regularly`
    : "  • No diseases detected"
}
`;

    const blob = new Blob([reportText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `crop-disease-report-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const stopCamera = async () => {
    isStreamingRef.current = false;
    setIsStreaming(false);

    // Cancel animation frames
    if (renderLoopRef.current) {
      cancelAnimationFrame(renderLoopRef.current);
    }
    if (detectionLoopRef.current) {
      clearInterval(detectionLoopRef.current);
    }

    // Stop video stream
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    toast.success("Camera stopped");
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================

  useEffect(() => {
    // Check if mobile
    const checkMobile = () => {
      setIsMobile(/iPhone|iPad|iPod|Android/i.test(navigator.userAgent));
    };
    checkMobile();

    return () => {
      if (isStreamingRef.current) {
        stopCamera();
      }
    };
  }, []);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="w-full max-w-4xl mx-auto p-4">
      <Card className="bg-gradient-to-br from-green-50 to-blue-50 border-2 border-green-200">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl flex items-center gap-2">
                🎥 Live Crop Disease Detection
              </CardTitle>
              <CardDescription>Real-time YOLO detection with 60 FPS rendering</CardDescription>
            </div>
            {isStreaming && (
              <div className="flex items-center gap-2 px-3 py-1 bg-red-100 border border-red-300 rounded-full">
                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-red-700">LIVE</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Video Canvas */}
          <div className="relative bg-black rounded-lg overflow-hidden border-2 border-gray-300">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full hidden"
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas
              ref={displayCanvasRef}
              className="w-full rounded-lg"
              style={{ transform: "scaleX(-1)" }}
            />
            <canvas ref={captureCanvasRef} className="hidden" />
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-sm font-mono bg-gray-100 p-3 rounded">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.fps}</div>
              <div className="text-xs text-gray-600">FPS</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.detectedFrames}</div>
              <div className="text-xs text-gray-600">Detected Frames</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{detections.length}</div>
              <div className="text-xs text-gray-600">Total Detections</div>
            </div>
          </div>

          {/* Current Detections */}
          {currentFrameDetections.length > 0 && (
            <div className="bg-red-50 border-2 border-red-300 p-4 rounded space-y-2">
              <div className="font-bold text-red-900 text-lg">
                🚨 Current Detections: {currentFrameDetections.length}
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                    <div className="text-xs text-gray-600">
                      Area: {(box.percent || 0).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
              <div className="text-sm text-red-700 font-semibold">
                {(() => {
                  const diseaseCounts: Record<string, number> = {};
                  currentFrameDetections.forEach((box) => {
                    diseaseCounts[box.class] = (diseaseCounts[box.class] || 0) + 1;
                  });
                  return (
                    <div>
                      {Object.entries(diseaseCounts).map(([disease, count]) => (
                        <div key={disease}>
                          • {disease}: {count} detected
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* Buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={isStreaming ? stopCamera : startCamera}
              disabled={isProcessing}
              className={`flex-1 ${isStreaming ? "bg-red-600 hover:bg-red-700" : "bg-green-600 hover:bg-green-700"}`}
            >
              {isStreaming ? "🛑 Stop Camera" : "🎬 Start Camera"}
            </Button>

            <Button
              onClick={() => {
                const report = generateReport();
                onReportGenerated?.(report);
                downloadReport();
              }}
              disabled={!isStreaming || detections.length === 0}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </div>

          {/* Report Preview */}
          {detections.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded space-y-2">
              <div className="font-semibold text-blue-900">📊 Detection Summary:</div>
              <div className="text-sm text-blue-800">
                {(() => {
                  const report = generateReport();
                  return (
                    <>
                      <div>Duration: {report.duration.toFixed(1)}s</div>
                      <div>Total: {report.totalDetections} detections</div>
                      {report.topDiseases.map((d, i) => (
                        <div key={i}>
                          {d.disease}: {d.count}× ({d.avgConfidence.toFixed(1)}% avg)
                        </div>
                      ))}
                    </>
                  );
                })()}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default LiveCameraPredictor;
