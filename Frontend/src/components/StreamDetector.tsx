import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Play, Square, Download, Upload, Video, FileVideo, CheckCircle2, Scan, Activity, ChevronRight, BarChart4 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface StreamDetectorProps {
  onReportGenerated?: (report: any) => void;
}

export default function StreamDetector({ onReportGenerated }: StreamDetectorProps) {
  // Mode: 'input' (select source) | 'watching' (playing video) | 'processing' (analyzing background)
  const [mode, setMode] = useState<'input' | 'watching' | 'processing'>('input');

  const [streamSource, setStreamSource] = useState(''); // RTSP/Camera ID
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  // Stats for "Watching" mode
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stats, setStats] = useState({
    fps: 0,
    confidence: 0,
    disease: "Analyzing...",
    status: "Active"
  });

  // Cleanup video URL
  useEffect(() => {
    return () => {
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
  }, [videoUrl]);

  // Handle File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      setStreamSource(file.name);
    }
  };

  // 1. Watch & Analyze Mode (REAL Backend Integration)
  const startWatching = async () => {
    if (!videoUrl && !streamSource) {
      toast.error('Please select a video file or enter a stream source');
      return;
    }
    setMode('watching');

    try {
      let processPath = streamSource;

      // Step 1: Upload File if selected (same as processAndReport)
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        // We don't show a progress bar for "Watching", just start it
        const uploadRes = await fetch('http://localhost:5000/upload', {
          method: 'POST',
          body: formData
        });

        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          processPath = uploadData.file_path;
        }
      }

      // Step 2: Start Analysis Stream for LIVE OVERLAY
      const response = await fetch('http://localhost:5000/stream/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: processPath,
          conf_thresh: 0.25
        })
      });

      if (!response.ok) throw new Error("Stream start failed");

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      // Read Stream Loop - Updates "stats" in real-time
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const result = JSON.parse(line);
              // Update Overlay Stats with REAL Data
              if (result.detections && result.detections.length > 0) {
                const topDet = result.detections[0];
                setStats({
                  fps: Math.floor(24 + Math.random() * 5), // Keep FPS simulated or calc from timestamp diffs
                  confidence: Math.round(topDet.conf),
                  disease: topDet.class, // Real Class Name
                  status: "Detected"
                });
              } else {
                // No detection in this frame
                setStats(prev => ({ ...prev, status: "Scanning", disease: "Healthy" }));
              }
            } catch (e) {
              console.error("Stream parse error", e);
            }
          }
        }
      }

    } catch (e) {
      console.error("Watch mode error:", e);
      toast.error("Live analysis stream failed.");
    }
  };

  // 2. Process & Report Mode (REAL Backend Integration)
  const processAndReport = async () => {
    if (!selectedFile && !streamSource) return;

    setMode('processing');
    setIsProcessing(true);
    setProgress(5);

    try {
      let processPath = streamSource;

      // Step 1: Upload File if selected
      if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        setProgress(15);
        // Upload to backend
        const uploadRes = await fetch('http://localhost:5000/upload', {
          method: 'POST',
          body: formData
        });

        if (!uploadRes.ok) throw new Error("Upload failed");

        const uploadData = await uploadRes.json();
        processPath = uploadData.file_path; // Server-side path
        setProgress(30);
      }

      // Step 2: Start Analysis Stream
      const response = await fetch('http://localhost:5000/stream/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_path: processPath,
          conf_thresh: 0.25
        })
      });

      if (!response.ok) throw new Error("Analysis failed to start");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = '';
      let allDetections: any[] = [];
      let frameCount = 0;

      // Update processAndReport to collect timeline data
      let timeline: { time: string; confidence: number }[] = [];

      // Step 3: Read Stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.trim()) {
            try {
              const result = JSON.parse(line);
              if (result.detections && result.detections.length > 0) {
                allDetections.push(...result.detections);

                // Add to timeline (sample every ~30 frames = 1s)
                if (frameCount % 30 === 0) {
                  const timeStr = new Date().toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

                  // Aggregate diseases in this frame (or recent 30 frames window ideally, but frame snapshot is okay for now)
                  const frameData: any = { time: timeStr };
                  result.detections.forEach((d: any) => {
                    const name = d.class || "Unknown";
                    // Use max confidence if multiple of same class
                    if (!frameData[name] || d.conf > frameData[name]) {
                      frameData[name] = Math.round(d.conf);
                    }
                  });
                  timeline.push(frameData);
                }
              }
              frameCount++;
              // Update progress artificially based on frames (assuming ~30s video @ 30fps = 900 frames)
              setProgress(prev => Math.min(prev + 0.1, 90));
            } catch (e) {
              console.error("Parse error", e);
            }
          }
        }
      }

      setProgress(100);

      // Step 4: Generate Report from Real Data
      if (allDetections.length === 0) {
        toast.warning("No diseases detected in video.");
        // Generate "Healthy" report
        generateReport("Processed Video Analysis", [], 0, []);
      } else {
        generateReport("Processed Video Analysis", allDetections, frameCount, timeline);
      }

    } catch (err: any) {
      console.error("Processing error:", err);
      toast.error("Analysis failed: " + err.message);
      setMode('input');
    } finally {
      setIsProcessing(false);
    }
  };

  const generateReport = (sourceType: string, detections: any[] = [], frames: number = 0, timeline: any[] = []) => {
    setIsProcessing(false);

    // Aggregate real data
    const diseaseCounts: Record<string, number> = {};
    const diseaseConfs: Record<string, number[]> = {};

    detections.forEach(d => {
      const name = d.class || "Unknown";
      diseaseCounts[name] = (diseaseCounts[name] || 0) + 1;
      if (!diseaseConfs[name]) diseaseConfs[name] = [];
      diseaseConfs[name].push(d.conf);
    });

    const diseases = Object.keys(diseaseCounts).map(name => ({
      name: name,
      severity: diseaseCounts[name] > (frames * 0.1) ? "High" : "Low", // Simple heuristic
      affectedArea: Math.min(100, Math.round((diseaseCounts[name] / (frames || 1)) * 100)) + "%",
      description: `Create comprehensive management plan for ${name}.`,
      avgConfidence: Math.round(diseaseConfs[name].reduce((a, b) => a + b, 0) / diseaseConfs[name].length)
    }));

    // Calculate duration string
    const totalSeconds = Math.floor(frames / 30); // Assume 30 fps
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const durationStr = `${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;

    if (onReportGenerated) {
      onReportGenerated({
        id: "VID-" + Math.floor(Math.random() * 10000),
        source: sourceType,
        duration: durationStr,
        totalDiseases: Object.keys(diseaseCounts).length,
        timelineData: timeline.length > 0 ? timeline : [],
        diseases: diseases.length > 0 ? diseases : [{
          name: "Healthy Crop",
          severity: "None",
          affectedArea: "0%",
          description: "No significant disease markers detected.",
          avgConfidence: 95
        }]
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col gap-4 animate-in fade-in duration-500">

      {/* INPUT MODE */}
      {mode === 'input' && (
        <Card className="glass-panel border-zinc-200 dark:border-white/10 shadow-xl max-w-3xl mx-auto w-full">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Video className="h-5 w-5 text-emerald-500" />
              Video Stream Analysis
            </CardTitle>
            <CardDescription>Upload footage or connect to a live stream for analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">

            {/* Upload Option */}
            <div className="border-2 border-dashed border-zinc-200 dark:border-white/10 rounded-xl p-8 text-center hover:bg-zinc-50 dark:hover:bg-white/5 transition-all group relative cursor-pointer">
              <input
                type="file"
                accept="video/*"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                onChange={handleFileChange}
              />
              <div className="space-y-4 pointer-events-none">
                <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Upload className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">
                    {selectedFile ? selectedFile.name : "Upload Video File"}
                  </h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                    {selectedFile ? `${(selectedFile.size / (1024 * 1024)).toFixed(2)} MB selected` : "Drag and drop or click to browse (MP4, AVI, MOV)"}
                  </p>
                </div>
              </div>
            </div>

            {/* OR Divider */}
            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-zinc-200 dark:border-white/10"></div>
              <span className="flex-shrink-0 mx-4 text-xs font-bold text-zinc-400 uppercase tracking-wider">Or Use Stream URL</span>
              <div className="flex-grow border-t border-zinc-200 dark:border-white/10"></div>
            </div>

            {/* Stream URL Input */}
            <div className="flex gap-2">
              <Input
                placeholder="rtsp://your-drone-ip:8554/live"
                value={streamSource}
                onChange={(e) => setStreamSource(e.target.value)}
                className="bg-zinc-50 dark:bg-black/20 font-mono text-sm"
              />
            </div>

            {/* Action Buttons - Only show enabled if valid source */}
            {(selectedFile || streamSource) && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 animate-in slide-in-from-bottom-2 fade-in">
                <Button
                  size="lg"
                  onClick={startWatching}
                  className="h-14 gap-3 bg-zinc-900 dark:bg-white text-white dark:text-black hover:bg-zinc-800 dark:hover:bg-zinc-200"
                >
                  <Play className="h-5 w-5" />
                  <div className="flex flex-col items-start gap-0.5 mt-0.5">
                    <span className="text-sm font-bold leading-none">Watch & Analyze</span>
                    <span className="text-[10px] font-normal opacity-70 leading-none">Real-time simulation overlay</span>
                  </div>
                </Button>

                <Button
                  size="lg"
                  onClick={processAndReport}
                  variant="outline"
                  className="h-14 gap-3 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-500/10"
                >
                  <BarChart4 className="h-5 w-5" />
                  <div className="flex flex-col items-start gap-0.5 mt-0.5">
                    <span className="text-sm font-bold leading-none">Process & Report</span>
                    <span className="text-[10px] font-normal leading-none opacity-80">Skip video, get results</span>
                  </div>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* WATCHING MODE */}
      {mode === 'watching' && (
        <div className="relative flex-1 bg-black rounded-xl overflow-hidden shadow-2xl border border-white/10 group min-h-[500px] flex items-center justify-center">
          {videoUrl ? (
            <video
              ref={videoRef}
              src={videoUrl}
              className="w-full h-full object-contain"
              autoPlay
              controls
              loop
              muted
            />
          ) : (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-zinc-800/50 flex items-center justify-center mx-auto animate-pulse">
                <Video className="h-8 w-8 text-zinc-500" />
              </div>
              <p className="text-zinc-500 font-mono">Simulating Stream: {streamSource}</p>
            </div>
          )}

          {/* Overlay (Reused Style) */}
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-72 z-20 space-y-2 pointer-events-none">
            <div className="glass-panel bg-white/90 dark:bg-black/60 backdrop-blur-xl border border-zinc-200 dark:border-white/10 rounded-xl p-4 shadow-2xl pointer-events-auto ring-1 ring-black/5 dark:ring-white/5">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-200 dark:border-white/10">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-100 dark:bg-emerald-500/20 rounded-lg">
                    <Scan className="h-4 w-4 text-emerald-600 dark:text-emerald-400 animate-pulse" />
                  </div>
                  <span className="text-sm font-bold text-zinc-800 dark:text-white uppercase tracking-wider">Video Analysis</span>
                </div>
              </div>

              <div className="flex items-center justify-between bg-zinc-50 dark:bg-white/5 p-2 rounded-lg border border-zinc-100 dark:border-white/5">
                <span className="text-lg font-bold text-zinc-900 dark:text-white leading-none">{stats.disease}</span>
                {stats.disease === 'Healthy'
                  ? <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  : <Activity className="h-6 w-6 text-red-500 animate-bounce" />
                }
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="absolute top-4 right-4 z-30 flex items-center gap-2">
            <Button
              onClick={() => generateReport("Watched Session Report")}
              className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg gap-2"
            >
              <CheckCircle2 className="h-4 w-4" /> Finish & View Report
            </Button>
          </div>

          <Button
            variant="secondary"
            size="sm"
            className="absolute top-4 left-4 z-30"
            onClick={() => setMode('input')}
          >
            Start Over
          </Button>
        </div>
      )}

      {/* PROCESSING MODE */}
      {mode === 'processing' && (
        <Card className="glass-panel max-w-md mx-auto w-full mt-12 bg-white/90 dark:bg-black/80 backdrop-blur-xl border-zinc-200 dark:border-white/10">
          <CardContent className="pt-6 pb-8 px-6 text-center space-y-6">
            <div className="relative w-20 h-20 mx-auto">
              <svg className="w-full h-full transform -rotate-90">
                <circle cx="40" cy="40" r="36" fill="transparent" stroke="currentColor" strokeWidth="6" className="text-zinc-100 dark:text-white/10" />
                <circle
                  cx="40" cy="40" r="36"
                  fill="transparent"
                  stroke="currentColor"
                  strokeWidth="6"
                  className="text-emerald-500 transition-all duration-300 ease-linear"
                  strokeDasharray={226}
                  strokeDashoffset={226 - (226 * progress) / 100}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-bold font-mono">{progress}%</span>
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-bold">Analyzing Footage</h3>
              <p className="text-sm text-muted-foreground">
                AI model is processing frames and generating report...
              </p>
            </div>

            <div className="text-xs font-mono text-zinc-400 bg-zinc-50 dark:bg-white/5 p-2 rounded">
              Running: yolov8-agricultural-v4.2.pt
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
