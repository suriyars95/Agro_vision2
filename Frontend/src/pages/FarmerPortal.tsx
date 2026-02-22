import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Camera, Wifi, Video, Leaf, Settings, LogOut, Sun, Moon, Menu, CheckCircle2, Activity, ScanLine, Download, X, ArrowRight } from "lucide-react";
import ImageUploadSection from "@/components/ImageUploadSection";
import LiveCameraPredictor from "@/components/LiveCameraPredictor";
import StreamDetector from "@/components/StreamDetector";
import WeatherSoilWidget from "@/components/WeatherSoilWidget";
import DroneTelemetryWidget from "@/components/DroneTelemetryWidget";
import SystemLogWidget from "@/components/SystemLogWidget";
import CropHealthWidget from "@/components/CropHealthWidget";
import DetailedReportView from "@/components/DetailedReportView";
import { toast } from "sonner";
import { predictDisease } from "@/services/api";
import { cn } from "@/lib/utils";
import ModelSelector from "@/components/ModelSelector";
import LLMSelector from "@/components/LLMSelector";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const FarmerPortal = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null); // For simple image prediction
  const [activeTab, setActiveTab] = useState<'upload' | 'drone' | 'camera' | 'rtsp'>('upload');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Advanced Reporting State
  const [detailedReport, setDetailedReport] = useState<any>(null); // For Stream/Drone reports

  // Drone State
  const [droneUrl, setDroneUrl] = useState("");
  const [isDroneConnected, setIsDroneConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [analyzingDrone, setAnalyzingDrone] = useState(false);
  const [showDroneOverlay, setShowDroneOverlay] = useState(true);
  const [showDroneDetails, setShowDroneDetails] = useState(true);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleTabChange = (tab: 'upload' | 'drone' | 'camera' | 'rtsp') => {
    setActiveTab(tab);
    setResult(null); // Clear simple result on tab switch used to confuse
    setDetailedReport(null);
  };

  const handleDroneConnect = () => {
    if (!droneUrl.trim()) {
      toast.error("Please enter a drone URL or IP address");
      return;
    }
    setIsConnecting(true);
    setTimeout(() => {
      setIsDroneConnected(true);
      setIsConnecting(false);
      toast.success("Drone connected successfully!");
    }, 2000);
  };

  const handleDroneDisconnect = () => {
    setIsDroneConnected(false);
    toast.info("Drone disconnected");
  };

  // Upgraded Drone Report Handler
  const handleEndLivestreamReport = () => {
    setAnalyzingDrone(true);
    setTimeout(() => {
      const mockReport = {
        id: "DRONE-LOG-" + Math.floor(Math.random() * 1000),
        source: "Drone Stream",
        duration: "12m 45s",
        totalDiseases: 3,
        timelineData: Array.from({ length: 20 }, (_, i) => ({
          time: `00:${i * 3}`,
          confidence: 60 + Math.random() * 35,
        })),
        diseases: [
          {
            name: "Wheat Leaf Rust",
            severity: "High",
            affectedArea: "35%",
            description: "Fungal infection causing orange-brown pustules on leaves.",
          }
        ]
      };
      setDetailedReport(mockReport);
      setAnalyzingDrone(false);
      setIsDroneConnected(false);
      toast.success("Detailed Engineering Report Generated!");
      // Scroll to results
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, 2000);
  };

  const handleImageSelect = (file: File, preview: string) => {
    setSelectedFile(file);
    setResult(null);
    setDetailedReport(null); // Clear complex report when doing simple upload
  };

  const handleAnalyze = async () => {
    if (!selectedFile) return;
    setAnalyzing(true);
    setDetailedReport(null);
    try {
      const predictionResult = await predictDisease(selectedFile);
      if (predictionResult.error) {
        toast.error(predictionResult.error);
        return;
      }

      // Aggregate multi-disease data from boxes
      const diseaseCounts: Record<string, number> = {};
      const diseaseConfs: Record<string, number[]> = {};

      if (predictionResult.boxes && predictionResult.boxes.length > 0) {
        predictionResult.boxes.forEach((box: any) => {
          const name = box.class || "Unknown";
          diseaseCounts[name] = (diseaseCounts[name] || 0) + 1;
          if (!diseaseConfs[name]) diseaseConfs[name] = [];
          diseaseConfs[name].push(box.conf);
        });
      } else {
        // Fallback for single classification or healthy if no boxes
        const name = predictionResult.disease || "Unknown";
        diseaseCounts[name] = 1;
        diseaseConfs[name] = [predictionResult.confidence || 0];
      }

      const diseases = Object.keys(diseaseCounts).map(name => {
        const avgConf = Math.round(diseaseConfs[name].reduce((a, b) => a + b, 0) / diseaseConfs[name].length);
        return {
          name: name,
          severity: avgConf > 80 ? "High" : avgConf > 50 ? "Medium" : "Low",
          affectedArea: Math.min(100, (diseaseCounts[name] * 15)) + "%", // Heuristic for static image
          description: name === predictionResult.disease ? predictionResult.description : `Detected instance of ${name}`,
          avgConfidence: avgConf
        };
      });

      // Create a dummy timeline for static image to make charts work
      const timeNow = new Date();
      const timeStartStr = new Date(timeNow.getTime() - 60000).toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const timeEndStr = timeNow.toLocaleTimeString([], { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' });

      const timelinePoint: any = { time: timeStartStr };
      const timelinePointEnd: any = { time: timeEndStr };

      diseases.forEach(d => {
        timelinePoint[d.name] = d.avgConfidence;
        timelinePointEnd[d.name] = d.avgConfidence;
      });

      const mockReport = {
        id: "IMG-LOG-" + Math.floor(Math.random() * 10000),
        source: "Image Upload",
        duration: "Static Scan",
        totalDiseases: diseases.length,
        timelineData: [timelinePoint, timelinePointEnd],
        diseases: diseases.length > 0 ? diseases : [{
          name: "Healthy Crop",
          severity: "None",
          affectedArea: "0%",
          description: "No significant disease markers detected.",
          avgConfidence: 95
        }]
      };

      setDetailedReport(mockReport);

      // Clear legacy simple result to ensure only DetailedReportView shows
      setResult(null);

      toast.success("Image Analysis Complete!");
      // Scroll to results
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExport = () => {
    toast.success("Exporting Engineering Report...");
  }

  return (
    <div className={`min-h-screen flex bg-background transition-colors duration-300 font-sans ${isDarkMode ? 'dark' : ''} overflow-x-hidden`}>

      {/* Sidebar - Ultra Compact */}
      <aside className={`fixed lg:static z-50 h-screen bg-card/80 backdrop-blur-xl border-r shadow-xl transition-all duration-300 ${isSidebarOpen ? 'w-16 lg:w-64' : 'w-0 lg:w-16'} hidden lg:flex flex-col`}>
        <div className="h-14 flex items-center justify-center border-b border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-primary to-emerald-600 rounded-lg flex items-center justify-center shadow-lg text-white shrink-0">
              <Leaf className="h-5 w-5" />
            </div>
            {isSidebarOpen && <span className="font-bold text-lg tracking-wide text-gradient lg:block hidden">AgroVision</span>}
          </div>
        </div>

        <nav className="flex-1 px-2 py-4 space-y-2">
          <Button variant="ghost" size="sm" className={`w-full gap-3 h-10 text-sm font-medium rounded-lg hover:bg-primary/10 hover:text-primary transition-all px-0 justify-center lg:justify-start lg:px-3 bg-primary/10 text-primary`}>
            <Activity className="h-4 w-4" />
            <span className="hidden lg:block">{isSidebarOpen && "Dashboard"}</span>
          </Button>
          <Button variant="ghost" size="sm" className={`w-full gap-3 h-10 text-sm font-medium rounded-lg hover:bg-muted transition-all px-0 justify-center lg:justify-start lg:px-3`}>
            <Settings className="h-4 w-4 text-muted-foreground" />
            <span className="hidden lg:block">{isSidebarOpen && "Settings"}</span>
          </Button>
        </nav>

        <div className="p-2 border-t border-border/50">
          <Button variant="ghost" size="sm" className={`w-full gap-3 text-destructive hover:bg-destructive/10 rounded-lg h-10 px-0 justify-center lg:justify-start lg:px-3`}>
            <LogOut className="h-4 w-4" />
            <span className="hidden lg:block">{isSidebarOpen && "Logout"}</span>
          </Button>
        </div>
      </aside>

      {/* Main Content - Bento Grid Engine */}
      <div className="flex-1 flex flex-col h-screen relative selection:bg-primary/20 bg-muted/10 overflow-hidden">

        {/* Engineering Header */}
        <header className="h-12 shrink-0 flex items-center justify-between px-4 lg:px-6 bg-background/80 backdrop-blur-md border-b sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden h-8 w-8" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-baseline gap-2">
              <h2 className="text-lg font-bold tracking-tight">Command Center</h2>
              <span className="text-xs text-muted-foreground font-mono">v2.1.0-ENG</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button size="sm" variant="outline" className="hidden md:flex h-7 text-xs gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10" onClick={handleExport}>
              <Download className="h-3.5 w-3.5" />
              Export Data
            </Button>
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-muted/50 dark:bg-white/10 rounded-full border border-border/50">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs uppercase font-bold tracking-wider text-muted-foreground dark:text-emerald-400">ONLINE</span>
            </div>
            <Button variant="outline" size="icon" onClick={toggleTheme} className="rounded-full shadow-sm w-7 h-7 border-border/50">
              {isDarkMode ? <Sun className="h-3.5 w-3.5 text-yellow-500" /> : <Moon className="h-3.5 w-3.5 text-slate-700" />}
            </Button>
          </div>
        </header>

        {/* Dashboard Grid - Refined Layout */}
        <main className="flex-1 p-3 overflow-hidden">

          {/* Main Grid: Diagnostics (Left) + Scrollable Sidebar (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 h-full">

            {/* Left: Diagnostic Engine (Full Height) */}
            <div className="lg:col-span-9 h-full flex flex-col overflow-hidden">
              <Card className="glass-card flex-1 border-none shadow-md rounded-xl overflow-hidden flex flex-col relative h-full">
                <CardHeader className="py-2 px-4 border-b bg-muted/20 flex flex-row items-center justify-between shrink-0 h-10">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Activity className="h-4 w-4 text-primary" />
                      <CardTitle className="text-sm font-bold uppercase tracking-wide">Diagnostic Engine</CardTitle>
                    </div>
                    {/* Model Switcher Dropdown */}
                    <div className="hidden md:flex items-center gap-2 border-l border-border/50 pl-4">
                      <ModelSelector />
                      <div className="w-px h-6 bg-border/50 mx-1"></div>
                      <LLMSelector />
                    </div>
                  </div>
                  <div className="flex bg-background/50 p-0.5 rounded-md border border-border/50">
                    {[
                      { id: 'upload', icon: Upload, label: 'Upload' },
                      { id: 'drone', icon: Wifi, label: 'Drone' },
                      { id: 'camera', icon: Camera, label: 'Cam' },
                      { id: 'rtsp', icon: Video, label: 'Stream' }
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id as any)}
                        className={cn(
                          "flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] uppercase font-bold tracking-wide transition-all duration-200",
                          activeTab === tab.id
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        )}
                      >
                        <tab.icon className="h-3 w-3" />
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </CardHeader>

                <CardContent className="p-0 flex-1 relative bg-black/5 dark:bg-black/20 flex flex-col overflow-hidden">
                  <div className="flex-1 p-2 flex flex-col relative overflow-y-auto custom-scrollbar space-y-4">

                    {/* INPUT AREA - Hidden when Report is Active for Focus Mode */}
                    {!detailedReport && (
                      <div className="w-full flex items-center justify-center p-2 min-h-[350px] animate-in fade-in duration-500">
                        {activeTab === 'upload' ? (
                          <div className="w-full max-w-2xl flex flex-col justify-center">
                            <ImageUploadSection onImageSelect={handleImageSelect} onAnalyze={handleAnalyze} analyzing={analyzing} />
                          </div>
                        ) : activeTab === 'drone' ? (
                          <div className="w-full flex flex-col gap-3 min-h-[300px]">
                            <div className="flex gap-2 shrink-0">
                              <div className="relative flex-1">
                                <Wifi className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input placeholder="Drone Stream URL" className="h-9 pl-9 text-xs font-mono" value={droneUrl} onChange={e => setDroneUrl(e.target.value)} />
                              </div>
                              <Button size="sm" className="h-9" onClick={isDroneConnected ? handleDroneDisconnect : handleDroneConnect}>{isDroneConnected ? "Disconnect" : "Connect"}</Button>
                            </div>
                            <div className="flex-1 bg-black rounded-lg relative overflow-hidden flex flex-col items-center justify-center border border-white/10 shadow-inner group min-h-[400px]">
                              <StreamDetector
                                onReportGenerated={(report) => {
                                  setDetailedReport(report);
                                  toast.success("Drone Mission Analysis Complete");
                                  setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                                }}
                              />
                            </div>
                          </div>
                        ) : activeTab === 'camera' ? (
                          <LiveCameraPredictor
                            onReportGenerated={(report) => {
                              setDetailedReport(report);
                              toast.success("Monitoring Session Complete");
                              setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                            }}
                          />
                        ) : (
                          <div className="w-full">
                            {/* RTSP / Stream Tab */}
                            <StreamDetector
                              onReportGenerated={(report) => {
                                setDetailedReport(report);
                                toast.success("Video Analysis Complete");
                                setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
                              }}
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* RESULTS AREA - Rendered Below Input */}
                    <div ref={resultsRef} className="scroll-mt-20">
                      {/* 1. View: Detailed Engineering Report (Full Width Block) */}
                      {detailedReport && (
                        <div className="z-20 bg-background/50 backdrop-blur-xl p-2 animate-in fade-in zoom-in-95 duration-500 rounded-xl border border-border/50 shadow-lg min-h-[600px]">
                          <div className="w-full h-full">
                            <DetailedReportView
                              reportData={detailedReport}
                              onClose={() => setDetailedReport(null)}
                              onRestart={() => setDetailedReport(null)}
                            />
                          </div>
                        </div>
                      )}

                      {/* Legacy Simple Result Block Removed */}
                    </div>

                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right: Telemetry Sidebar (Scrollable) */}
            <div className="lg:col-span-3 h-full overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto pr-1 space-y-3 custom-scrollbar pb-3">
                <div className="shrink-0 min-h-[180px]"><WeatherSoilWidget /></div>
                <div className="shrink-0 min-h-[180px]"><DroneTelemetryWidget /></div>
                <div className="shrink-0 min-h-[220px]"><SystemLogWidget /></div>
                <div className="shrink-0 min-h-[200px]"><CropHealthWidget /></div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
};

export default FarmerPortal;
