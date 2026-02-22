import { useRef, useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Camera, StopCircle, Play, Video, ChevronDown, Download, Settings, Activity, Cpu, Scan, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface LiveCameraPredictorProps {
  onReportGenerated?: (report: any) => void;
}

const LiveCameraPredictor = ({ onReportGenerated }: LiveCameraPredictorProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  // Overlay State
  const [showOverlay, setShowOverlay] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  const confirmStopStream = () => {
    stopStream();
    setShowCancelDialog(false);
    toast.info("Stream cancelled. No report generated.");
  };

  // Mock Stats for Overlay
  const [stats, setStats] = useState({
    fps: 0,
    confidence: 0,
    disease: "Scanning...",
    status: "Standby"
  });

  useEffect(() => {
    // Enumerate devices on mount
    const getDevices = async () => {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
        setDevices(videoDevices);
        if (videoDevices.length > 0) {
          const envCamera = videoDevices.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
          setSelectedDeviceId(envCamera ? envCamera.deviceId : videoDevices[0].deviceId);
        }
      } catch (err) {
        console.error("Error enumerating devices:", err);
      }
    };
    getDevices();
  }, []);

  // Real Detection Loop - Optimized for Max FPS
  useEffect(() => {
    let isActive = true;
    let isProcessingFrame = false;

    const processLoop = async () => {
      if (!isActive) return;
      if (!isStreaming) return;

      // Keep the loop alive at 60fps heartbeat
      if (isActive) requestAnimationFrame(processLoop);

      if (!isProcessingFrame && videoRef.current && canvasRef.current) {
        isProcessingFrame = true;
        try {
          // 1. Capture Frame (Offscreen)
          const video = videoRef.current;
          if (video.videoWidth === 0 || video.videoHeight === 0) return; // Wait for video to load

          const offscreenCanvas = document.createElement('canvas');
          offscreenCanvas.width = video.videoWidth;
          // Resize for speed if needed, e.g., 640 width
          if (offscreenCanvas.width > 640) {
            const scale = 640 / offscreenCanvas.width;
            offscreenCanvas.width = 640;
            offscreenCanvas.height = video.videoHeight * scale;
          } else {
            offscreenCanvas.height = video.videoHeight;
          }

          const ctx = offscreenCanvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
            const frameBase64 = offscreenCanvas.toDataURL('image/jpeg', 0.7).split(',')[1]; // Lower quality slightly for speed

            const startTime = Date.now();
            const response = await fetch('http://localhost:5000/stream/detect', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ frame: frameBase64 })
            });

            if (response.ok) {
              const data = await response.json();
              if (data.success && data.detections) {
                const duration = Date.now() - startTime;
                const realFps = Math.round(1000 / duration);

                if (data.detections.length > 0) {
                  const topOne = data.detections[0];
                  setStats({
                    fps: realFps,
                    confidence: Math.round(topOne.conf),
                    disease: topOne.class,
                    status: "Detected"
                  });
                  detectionsRef.current.push({ timestamp: Date.now(), detections: data.detections });
                } else {
                  setStats(s => ({ ...s, fps: realFps, status: "Scanning", disease: "Healthy" }));
                  // Optional: Push empty detection for timeline continuity (shows as 0 confidence)
                  // detectionsRef.current.push({ timestamp: Date.now(), detections: [] });
                }
              }
            }
          }
        } catch (e) {
          console.error("Frame error", e);
        } finally {
          isProcessingFrame = false;
        }
      }

      // Loop logic moved to top
    };

    if (isStreaming) {
      processLoop();
    }

    return () => {
      isActive = false;
    };
  }, [isStreaming]);

  const lastFrameTime = useRef(Date.now());
  const detectionsRef = useRef<{ timestamp: number; detections: any[] }[]>([]);

  const startStream = async () => {
    setIsStreaming(true);
    setSessionStartTime(new Date());
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: selectedDeviceId ? { exact: selectedDeviceId } : undefined,
            width: { ideal: 1920 },
            height: { ideal: 1080 }
          }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
        toast.error("Could not access camera");
        setIsStreaming(false);
      }
    }
  };

  const stopStream = () => {
    setIsStreaming(false);
    setSessionStartTime(null);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const handleGenerateReport = () => {
    stopStream();

    // Process accumulated real detections
    const history = detectionsRef.current;

    // 1. Generate Timeline Data (Group by second)
    const timelineMap = new Map<string, Record<string, number>>();

    history.forEach(item => {
      const date = new Date(item.timestamp);
      const timeStr = date.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }); // e.g., 04:24:30 PM

      if (!timelineMap.has(timeStr)) {
        timelineMap.set(timeStr, { time: timeStr } as any);
      }
      const bucket = timelineMap.get(timeStr)!;

      item.detections.forEach((d: any) => {
        const name = d.class || "Unknown";
        const conf = Math.round(d.conf);
        // Keep the MAX confidence encountered in this second for this disease
        if (!bucket[name] || conf > bucket[name]) {
          bucket[name] = conf;
        }
      });
    });

    const timelineData = Array.from(timelineMap.values());

    // 2. Generate Disease Stats
    // Calculate simple duration from session start
    let durationStr = "00m 00s";
    if (sessionStartTime) {
      const diff = Math.floor((new Date().getTime() - sessionStartTime.getTime()) / 1000);
      const mins = Math.floor(diff / 60);
      const secs = diff % 60;
      durationStr = `${mins.toString().padStart(2, '0')}m ${secs.toString().padStart(2, '0')}s`;
    }

    const diseaseCounts: any = {};
    const diseaseConfs: any = {};

    // Flatten for counts
    history.forEach(h => {
      h.detections.forEach((d: any) => {
        const name = d.class || "Unknown";
        diseaseCounts[name] = (diseaseCounts[name] || 0) + 1;
        if (!diseaseConfs[name]) diseaseConfs[name] = [];
        diseaseConfs[name].push(d.conf);
      });
    });

    const diseases = Object.keys(diseaseCounts).map(name => ({
      name: name,
      severity: "Moderate", // Metric could be refined
      affectedArea: "N/A",  // Hard to estimate from single frames without depth
      description: `Detected in ${diseaseCounts[name]} frames during session.`,
      avgConfidence: Math.round(diseaseConfs[name].reduce((a: number, b: number) => a + b, 0) / diseaseConfs[name].length)
    }));

    if (onReportGenerated) {
      onReportGenerated({
        id: "CAM-" + Math.floor(Math.random() * 10000),
        source: "Live Camera Feed",
        duration: durationStr,
        totalDiseases: Object.keys(diseaseCounts).length,
        timelineData: timelineData,
        diseases: diseases.length > 0 ? diseases : [{
          name: "Healthy", severity: "None", affectedArea: "0%", description: "No diseases detected", avgConfidence: 100
        }]
      });
    }
    // Clear for next time
    detectionsRef.current = [];
  };

  return (
    <div className="w-full h-full flex flex-col gap-3">
      {/* Controls */}
      <div className="flex items-center gap-2 justify-between shrink-0">
        <div className="flex items-center gap-2 flex-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-[200px] justify-between text-xs" disabled={isStreaming}>
                <span className="truncate">
                  {devices.find(d => d.deviceId === selectedDeviceId)?.label || "Select Camera"}
                </span>
                <ChevronDown className="h-3 w-3 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[200px]">
              {devices.map(device => (
                <DropdownMenuItem key={device.deviceId} onClick={() => setSelectedDeviceId(device.deviceId)}>
                  {device.label || `Camera ${device.deviceId.slice(0, 5)}...`}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {!isStreaming ? (
            <Button size="sm" onClick={startStream} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
              <Play className="h-3.5 w-3.5" /> Start Monitoring
            </Button>
          ) : (
            <Button size="sm" variant="destructive" onClick={() => setShowCancelDialog(true)} className="gap-2">
              <StopCircle className="h-3.5 w-3.5" /> Cancel Stream
            </Button>
          )}
        </div>

        {isStreaming && (
          <div className="flex items-center gap-2 animate-in fade-in">
            <span className="flex items-center gap-1.5 px-2 py-1 bg-red-500/10 text-red-500 rounded text-[10px] font-bold uppercase tracking-wider border border-red-500/20">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" /> REC
            </span>
            <span className="text-xs font-mono text-muted-foreground">00:00:12</span>
          </div>
        )}
      </div>

      {/* Video Area */}
      <div className="relative flex-1 bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 group min-h-[400px]">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          autoPlay
          playsInline
          muted
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {/* Standby State */}
        {!isStreaming && (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/80 backdrop-blur-sm z-10">
            <div className="text-center space-y-3">
              <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto border border-white/10">
                <Camera className="h-8 w-8 text-zinc-500" />
              </div>
              <div>
                <h3 className="text-zinc-300 font-medium">Camera Offline</h3>
                <p className="text-zinc-500 text-xs">Start stream to begin analysis</p>
              </div>
            </div>
          </div>
        )}

        {/* Cancel Confirmation Overlay */}
        {showCancelDialog && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-zinc-900 border border-white/10 p-6 rounded-xl max-w-sm w-full shadow-2xl space-y-4">
              <div className="flex items-center gap-3 text-amber-500">
                <Activity className="h-6 w-6" />
                <h3 className="text-lg font-bold text-white">End Session?</h3>
              </div>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Stopping the stream now will <strong>discard all analysis data</strong>. No report will be generated.
              </p>
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                <p className="text-xs text-emerald-400 flex gap-2">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Tip: Use "End Stream and See Reports" to save your data.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" className="flex-1 border-white/10 bg-white/5 hover:bg-white/10 text-white" onClick={() => setShowCancelDialog(false)}>
                  Resume Session
                </Button>
                <Button variant="destructive" className="flex-1" onClick={confirmStopStream}>
                  Discard & End
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Video Overlay - Configurable */}
        {isStreaming && showOverlay && !showCancelDialog && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-72 z-20 space-y-2 animate-in slide-in-from-left-4 duration-500 pointer-events-none">
            {/* Main Detection Box */}
            <div className="glass-panel bg-white/90 dark:bg-black/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-xl p-4 shadow-2xl pointer-events-auto ring-1 ring-black/5 dark:ring-white/5 transition-all">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                    <Scan className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">Live Analysis</span>
                </div>
                <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-white/10 text-zinc-600 dark:text-emerald-400 border border-zinc-200 dark:border-white/5">{stats.fps} FPS</span>
              </div>

              <div className="space-y-4">

                {/* Session Info */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Activity className="h-3 w-3 text-zinc-400 dark:text-zinc-500" />
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-bold uppercase tracking-wide">Session ID</span>
                  </div>
                  <div className="text-xs font-mono text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-white/5 p-1.5 rounded border border-zinc-100 dark:border-white/5">
                    <span className="select-all">CAM-{Math.floor(Date.now() / 1000).toString().slice(-4)}</span>
                    <span className="block text-[10px] text-zinc-400 mt-0.5 opacity-70">{new Date().toLocaleTimeString()}</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase font-bold block mb-1">Detected Class</span>
                  <div className="flex items-center justify-between bg-zinc-50 dark:bg-white/5 p-2 rounded-lg border border-zinc-100 dark:border-white/5">
                    <span className="text-lg font-bold text-zinc-900 dark:text-white leading-none">{stats.disease}</span>
                    {stats.disease === 'Healthy'
                      ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                      : <Activity className="h-6 w-6 text-red-500 animate-bounce" />
                    }
                  </div>
                </div>

                {showDetails && (
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <div className="bg-zinc-50 dark:bg-white/5 p-2 rounded-lg border border-zinc-100 dark:border-white/5">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase block font-bold">Confidence</span>
                      <span className="text-xl font-bold text-zinc-800 dark:text-white">{stats.confidence}<span className="text-sm text-zinc-400">%</span></span>
                    </div>
                    <div className="bg-zinc-50 dark:bg-white/5 p-2 rounded-lg border border-zinc-100 dark:border-white/5">
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400 uppercase block font-bold">Severity</span>
                      <span className={`text-xl font-bold ${stats.disease === 'Healthy' ? 'text-emerald-500 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}>
                        {stats.disease === 'Healthy' ? 'None' : 'High'}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Bottom Right Settings & Actions */}
        <div className="absolute bottom-4 right-4 z-30 flex items-center gap-2">
          {isStreaming && (
            <Button
              size="sm"
              onClick={handleGenerateReport}
              className="h-9 gap-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg border-none transition-all hover:scale-105"
            >
              <CheckCircle2 className="h-4 w-4" /> End Stream & See Reports
            </Button>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="h-9 w-9 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white shadow-lg transition-all"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-zinc-900/95 border-white/10 text-white backdrop-blur-xl">
              <DropdownMenuLabel>Overlay Settings</DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuCheckboxItem
                checked={showOverlay}
                onCheckedChange={setShowOverlay}
                className="focus:bg-white/10 focus:text-white"
              >
                Show Analysis Overlay
              </DropdownMenuCheckboxItem>
              <DropdownMenuCheckboxItem
                checked={showDetails}
                onCheckedChange={setShowDetails}
                disabled={!showOverlay}
                className="focus:bg-white/10 focus:text-white"
              >
                Show Granular Details
              </DropdownMenuCheckboxItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Scanning Overlay Effect */}
        {isStreaming && (
          <div className="absolute inset-0 pointer-events-none z-0 opacity-20">
            <div className="w-full h-1 bg-emerald-500/50 absolute top-0 animate-scan-line shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
            <div className="absolute top-4 right-4 flex flex-col gap-1 items-end opacity-50">
              <span className="text-[10px] font-mono text-emerald-500">SYS.OP.NORMAL</span>
              <span className="text-[10px] font-mono text-emerald-500">AI.VISION.V2.1</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LiveCameraPredictor;
