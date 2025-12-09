import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Play, Square, Download } from 'lucide-react';
import { Sonner } from '@/components/ui/sonner';
import { toast } from 'sonner';

export default function StreamDetector() {
  const [streamSource, setStreamSource] = useState('0');
  const [isProcessing, setIsProcessing] = useState(false);
  const [detections, setDetections] = useState<any[]>([]);
  const [stats, setStats] = useState({ totalFrames: 0, objectsDetected: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startStreamDetection = async () => {
    if (!streamSource) {
      toast.error('Please enter a stream source');
      return;
    }

    setIsProcessing(true);
    setDetections([]);
    setStats({ totalFrames: 0, objectsDetected: 0 });

    try {
      const response = await fetch('http://localhost:5000/stream/detect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: streamSource,
          max_frames: 30,
          conf_thresh: 0.25
        })
      });

      if (!response.ok) {
        throw new Error(`Stream error: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';

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
              if (result.detections) {
                setDetections(prev => [...prev, result]);
                setStats(prev => ({
                  totalFrames: prev.totalFrames + 1,
                  objectsDetected: prev.objectsDetected + (result.detections.detections_count || 0)
                }));
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          }
        }
      }

      toast.success('Stream processing complete');
    } catch (error: any) {
      console.error('Stream detection error:', error);
      toast.error(error.message || 'Stream processing failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const exportReport = () => {
    const report = {
      timestamp: new Date().toISOString(),
      source: streamSource,
      totalFrames: stats.totalFrames,
      totalDetections: stats.objectsDetected,
      detections: detections
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stream-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-4 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Video Stream Detection</CardTitle>
          <CardDescription>Process live camera, video files, or RTSP drone feeds</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Source Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Stream Source</label>
            <Input
              placeholder="0 (camera) | /path/to/video.mp4 | rtsp://example.com/stream"
              value={streamSource}
              onChange={(e) => setStreamSource(e.target.value)}
              disabled={isProcessing}
            />
            <p className="text-xs text-gray-500">
              Enter camera index (0), file path, or RTSP URL
            </p>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={startStreamDetection}
              disabled={isProcessing}
              className="flex-1"
              variant={isProcessing ? 'secondary' : 'default'}
            >
              {isProcessing ? (
                <>
                  <Square className="w-4 h-4 mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Start Detection
                </>
              )}
            </Button>
            <Button
              onClick={exportReport}
              disabled={detections.length === 0}
              variant="outline"
            >
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>

          {/* Stats */}
          {stats.totalFrames > 0 && (
            <div className="grid grid-cols-2 gap-2 p-2 bg-gray-50 rounded">
              <div className="text-sm">
                <span className="font-medium">Frames:</span> {stats.totalFrames}
              </div>
              <div className="text-sm">
                <span className="font-medium">Detections:</span> {stats.objectsDetected}
              </div>
            </div>
          )}

          {/* Recent Detections */}
          {detections.length > 0 && (
            <div className="space-y-2 max-h-64 overflow-y-auto border rounded p-2 bg-gray-50">
              <h4 className="font-medium text-sm">Recent Detections:</h4>
              {detections.slice(-10).reverse().map((det, idx) => (
                <div key={idx} className="text-xs border-l-2 border-blue-300 pl-2">
                  Frame {det.frame_num}: {det.detections.detections_count} objects
                  {det.detections.boxes?.slice(0, 2).map((box: any, i: number) => (
                    <div key={i} className="ml-2 text-gray-600">
                      • {box.class} ({(box.conf * 100).toFixed(1)}%)
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {isProcessing && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Processing stream... This may take a moment depending on stream length.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Canvas for debugging */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
