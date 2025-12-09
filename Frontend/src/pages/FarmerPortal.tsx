import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Upload, Camera, CheckCircle, AlertCircle, Radio, Wifi, Video } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ImageUploadSection from "@/components/ImageUploadSection";
import LiveCameraPredictor from "@/components/LiveCameraPredictor";
import StreamDetector from "@/components/StreamDetector";
import { toast } from "sonner";
import { predictDisease } from "@/services/api";

const FarmerPortal = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [droneUrl, setDroneUrl] = useState("");
  const [isDroneConnected, setIsDroneConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [analyzingDrone, setAnalyzingDrone] = useState(false);
  const [droneReport, setDroneReport] = useState<any>(null);
  const [showLiveCamera, setShowLiveCamera] = useState(false);
  const [cameraReport, setCameraReport] = useState<any>(null);

  const handleDroneConnect = () => {
    if (!droneUrl.trim()) {
      toast.error("Please enter a drone URL or IP address");
      return;
    }
    setIsConnecting(true);
    // Simulate connection
    setTimeout(() => {
      setIsDroneConnected(true);
      setIsConnecting(false);
      toast.success("Drone connected successfully!");
    }, 2000);
  };

  const handleDroneDisconnect = () => {
    setIsDroneConnected(false);
    setDroneReport(null);
    toast.info("Drone disconnected");
  };

  const handleEndLivestreamReport = () => {
    setAnalyzingDrone(true);
    
    // Simulate AI analysis of drone feed
    setTimeout(() => {
      setDroneReport({
        totalDiseases: 3,
        diseases: [
          {
            name: "Wheat Leaf Rust (Puccinia triticina)",
            severity: "High",
            affectedArea: "35%",
            description: "Fungal infection causing orange-brown pustules on leaves, reducing photosynthetic capacity and yield potential.",
            steps: [
              "Isolate affected areas immediately",
              "Remove and destroy heavily infected plants",
              "Apply recommended fungicide within 24 hours",
              "Monitor surrounding crops for 2 weeks"
            ],
            medicines: ["Propiconazole 25% EC", "Tebuconazole 250 EC", "Mancozeb 75% WP"]
          },
          {
            name: "Powdery Mildew (Blumeria graminis)",
            severity: "Medium",
            affectedArea: "20%",
            description: "White powdery fungal growth on leaf surfaces, stems, and heads affecting plant growth and grain quality.",
            steps: [
              "Improve air circulation in the field",
              "Apply sulfur-based fungicide",
              "Reduce nitrogen fertilization",
              "Schedule follow-up spray in 10-14 days"
            ],
            medicines: ["Sulfur 80% WDG", "Triadimefon 25% WP", "Carbendazim 50% WP"]
          },
          {
            name: "Septoria Leaf Blotch",
            severity: "Low",
            affectedArea: "8%",
            description: "Brown lesions with dark borders on lower leaves, gradually moving upward during wet conditions.",
            steps: [
              "Continue monitoring field conditions",
              "Apply preventive fungicide if rain persists",
              "Ensure proper crop rotation next season",
              "Use resistant varieties in future planting"
            ],
            medicines: ["Azoxystrobin 23% SC", "Chlorothalonil 75% WP", "Prochloraz 45% EC"]
          }
        ],
        scanDuration: "12 minutes",
        areaScanned: "5.2 hectares",
        timestamp: new Date().toLocaleString()
      });
      setAnalyzingDrone(false);
      setIsDroneConnected(false);
      toast.success("Livestream analysis complete!");
    }, 3000);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setResult(null);
    }
  };

  const handleImageSelect = (file: File, preview: string) => {
    setSelectedFile(file);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedFile) {
      toast.error("Please select an image first");
      return;
    }

    setAnalyzing(true);
    try {
      const predictionResult = await predictDisease(selectedFile);

      if (predictionResult.error) {
        toast.error(`Error: ${predictionResult.error}`);
        setAnalyzing(false);
        return;
      }

      // Determine severity based on confidence
      let severity = "Low";
      if (predictionResult.confidence > 80) {
        severity = "High";
      } else if (predictionResult.confidence > 60) {
        severity = "Medium";
      }

      setResult({
        disease: predictionResult.disease,
        confidence: predictionResult.confidence,
        severity: severity,
        description: predictionResult.description,
        treatment: predictionResult.treatment,
        severity_status: predictionResult.severity_status,
        medicines: predictionResult.medicines || [],
        recommendations: [
          predictionResult.treatment,
          "Monitor the affected area regularly",
          "Isolate affected plants if possible",
          "Consult with local agricultural experts for specific guidance"
        ]
      });
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Analysis failed:", error);
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Farmer Portal</h1>
          <p className="text-muted-foreground mb-8">Upload crop images for instant AI-powered disease analysis</p>

          {/* Two Column Layout - Image Upload Left, Live Stream Right */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Image Upload Card - Left - Using New Component */}
            <ImageUploadSection 
              onImageSelect={handleImageSelect}
              onAnalyze={handleAnalyze}
              analyzing={analyzing}
            />

            {/* Drone Connection / Live Camera Card - Right */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5 text-primary" />
                  Live Stream Disease Detection
                </CardTitle>
                <CardDescription>Real-time prediction from drone or your device camera</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Tabs for Drone vs Camera vs Stream */}
                <div className="flex gap-2 border-b overflow-x-auto">
                  <button
                    onClick={() => { setShowLiveCamera(false); setCameraReport(null); }}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      !showLiveCamera
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Wifi className="h-4 w-4 inline mr-2" />
                    Drone
                  </button>
                  <button
                    onClick={() => { setShowLiveCamera(true); setDroneReport(null); }}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      showLiveCamera
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Camera className="h-4 w-4 inline mr-2" />
                    Your Camera
                  </button>
                  <button
                    onClick={() => { setShowLiveCamera(null); setDroneReport(null); setCameraReport(null); }}
                    className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors whitespace-nowrap ${
                      showLiveCamera === null
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Video className="h-4 w-4 inline mr-2" />
                    RTSP/Video
                  </button>
                </div>

                {/* Drone Tab */}
                {!showLiveCamera && (
                  <div className="space-y-4">
                    {/* Connection Controls */}
                    <div className="flex flex-col sm:flex-row gap-4 items-end">
                      <div className="flex-1 space-y-2">
                        <Label htmlFor="drone-url">Drone URL or IP Address</Label>
                        <Input
                          id="drone-url"
                          placeholder="e.g., 192.168.1.100 or rtsp://..."
                          value={droneUrl}
                          onChange={(e) => setDroneUrl(e.target.value)}
                          disabled={isDroneConnected}
                        />
                      </div>
                      <div className="w-full sm:w-auto">
                        {!isDroneConnected ? (
                          <Button 
                            onClick={handleDroneConnect}
                            disabled={isConnecting}
                            className="w-full sm:w-auto"
                          >
                            <Wifi className="h-4 w-4 mr-2" />
                            {isConnecting ? "Connecting..." : "Pair Drone"}
                          </Button>
                        ) : (
                          <Button 
                            onClick={handleDroneDisconnect}
                            variant="destructive"
                            className="w-full sm:w-auto"
                          >
                            Disconnect
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    {isDroneConnected && (
                      <div className="flex items-center gap-2 text-sm text-secondary">
                        <CheckCircle className="h-4 w-4" />
                        Connected to {droneUrl}
                      </div>
                    )}

                    {/* Video Placeholder */}
                    <div className="aspect-[16/9] w-full min-h-[280px] bg-muted rounded-lg border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden">
                      {isDroneConnected ? (
                        <div className="w-full h-full bg-foreground/90 flex flex-col items-center justify-center text-background">
                          <Video className="h-16 w-16 mb-3 animate-pulse" />
                          <p className="text-lg font-medium">Live Feed: {droneUrl}</p>
                          <p className="text-sm opacity-70 mt-1">AI Detection Active</p>
                        </div>
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Video className="h-16 w-16 mx-auto mb-3 opacity-50" />
                          <p className="text-base">Video feed will appear here</p>
                          <p className="text-sm">Connect your drone to start</p>
                        </div>
                      )}
                    </div>

                    {/* End Livestream and Get Report Button */}
                    <Button 
                      className="w-full bg-gradient-to-r from-primary to-secondary hover:opacity-90"
                      size="lg"
                      onClick={handleEndLivestreamReport}
                      disabled={!isDroneConnected || analyzingDrone}
                    >
                      {analyzingDrone ? "Analyzing Feed..." : "End Livestream and Get Report"}
                    </Button>
                  </div>
                )}

                {/* Camera Tab */}
                {showLiveCamera && !cameraReport && (
                  <LiveCameraPredictor 
                    onReportGenerated={(report) => {
                      setCameraReport(report);
                      toast.success("Live stream report generated!");
                    }}
                  />
                )}

                {/* RTSP/Stream Tab */}
                {showLiveCamera === null && (
                  <StreamDetector />
                )}
              </CardContent>
            </Card>
          </div>

          {/* Image Analysis Results Section */}
          {result && (
            <Card className="border-primary/20 animate-fade-in mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.severity === "Low" ? (
                    <CheckCircle className="h-5 w-5 text-secondary" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  )}
                  Image Analysis Results
                </CardTitle>
                <CardDescription>AI-powered disease detection report</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Disease</div>
                    <div className="font-semibold text-sm">{result.disease}</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Confidence</div>
                    <div className="font-semibold text-primary">{result.confidence.toFixed(2)}%</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Severity</div>
                    <div className={`font-semibold ${
                      result.severity === "High" ? "text-destructive" :
                      result.severity === "Medium" ? "text-accent" :
                      "text-secondary"
                    }`}>
                      {result.severity}
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <h4 className="font-semibold mb-2">Description:</h4>
                  <p className="text-sm text-muted-foreground">{result.description}</p>
                </div>

                <div className="p-4 bg-muted/30 rounded-lg border border-border">
                  <h4 className="font-semibold mb-2">Status:</h4>
                  <p className="text-sm text-muted-foreground">{result.severity_status}</p>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Treatment & Recommendations:</h4>
                  <ul className="space-y-2">
                    {result.recommendations.map((rec: string, index: number) => (
                      <li key={index} className="flex items-start gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {result.treatment && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <h4 className="font-semibold mb-2">Treatment:</h4>
                    <p className="text-sm text-muted-foreground">{result.treatment}</p>
                  </div>
                )}

                {result.medicines && result.medicines.length > 0 && (
                  <div className="p-4 bg-muted/30 rounded-lg border border-border">
                    <h4 className="font-semibold mb-3">Recommended Medicines:</h4>
                    <ul className="space-y-2">
                      {result.medicines.map((medicine: string, index: number) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{medicine}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Drone Livestream Report Section */}
          {droneReport && (
            <Card className="border-primary/20 animate-fade-in mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Video className="h-5 w-5 text-primary" />
                  Drone Livestream Analysis Report
                </CardTitle>
                <CardDescription>
                  Scanned {droneReport.areaScanned} in {droneReport.scanDuration} • {droneReport.timestamp}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-destructive/10 rounded-lg border border-destructive/20">
                    <div className="text-sm text-muted-foreground mb-1">Total Diseases Found</div>
                    <div className="text-3xl font-bold text-destructive">{droneReport.totalDiseases}</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Area Scanned</div>
                    <div className="text-2xl font-semibold">{droneReport.areaScanned}</div>
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Scan Duration</div>
                    <div className="text-2xl font-semibold">{droneReport.scanDuration}</div>
                  </div>
                </div>

                {/* Disease Details */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-lg">Detected Diseases:</h4>
                  {droneReport.diseases.map((disease: any, index: number) => (
                    <div key={index} className="p-4 bg-muted/30 rounded-lg border border-border space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h5 className="font-semibold text-primary">{disease.name}</h5>
                        <div className="flex gap-2">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            disease.severity === "High" ? "bg-destructive/20 text-destructive" :
                            disease.severity === "Medium" ? "bg-accent/20 text-accent" :
                            "bg-secondary/20 text-secondary"
                          }`}>
                            {disease.severity} Severity
                          </span>
                          <span className="px-2 py-1 rounded text-xs font-medium bg-muted">
                            {disease.affectedArea} Affected
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground">{disease.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h6 className="font-medium text-sm mb-2">Treatment Steps:</h6>
                          <ul className="space-y-1">
                            {disease.steps.map((step: string, stepIndex: number) => (
                              <li key={stepIndex} className="flex items-start gap-2 text-sm">
                                <span className="text-primary font-medium">{stepIndex + 1}.</span>
                                <span>{step}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <h6 className="font-medium text-sm mb-2">Recommended Medicines:</h6>
                          <ul className="space-y-1">
                            {disease.medicines.map((medicine: string, medIndex: number) => (
                              <li key={medIndex} className="flex items-start gap-2 text-sm">
                                <CheckCircle className="h-4 w-4 text-secondary mt-0.5 flex-shrink-0" />
                                <span>{medicine}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Live Camera Analysis Report Section */}
          {cameraReport && (
            <Card className="border-primary/20 animate-fade-in mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5 text-primary" />
                  Live Camera Disease Detection Report
                </CardTitle>
                <CardDescription>
                  Duration: {cameraReport.duration}s • Detections: {cameraReport.totalDetections}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Summary Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <div className="text-sm text-muted-foreground mb-1">Total Detections</div>
                    <div className="text-3xl font-bold text-primary">{cameraReport.totalDetections}</div>
                  </div>
                  <div className="p-4 bg-secondary/10 rounded-lg border border-secondary/20">
                    <div className="text-sm text-muted-foreground mb-1">Unique Diseases Found</div>
                    <div className="text-3xl font-bold text-secondary">{cameraReport.uniqueDiseases.length}</div>
                  </div>
                  <div className="p-4 bg-accent/10 rounded-lg border border-accent/20">
                    <div className="text-sm text-muted-foreground mb-1">Stream Duration</div>
                    <div className="text-3xl font-bold text-accent">{cameraReport.duration}s</div>
                  </div>
                </div>

                {/* Disease Frequency & Confidence */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                    <h5 className="font-semibold">Disease Frequency</h5>
                    {Object.entries(cameraReport.diseaseFrequency).map(([disease, count]: [string, any]) => (
                      <div key={disease} className="flex justify-between items-center text-sm">
                        <span>{disease}</span>
                        <span className="font-semibold bg-primary/20 px-2 py-1 rounded">{count}x</span>
                      </div>
                    ))}
                  </div>
                  <div className="p-4 bg-muted/30 rounded-lg border border-border space-y-3">
                    <h5 className="font-semibold">Average Confidence</h5>
                    {Object.entries(cameraReport.averageConfidence).map(([disease, confidence]: [string, any]) => (
                      <div key={disease} className="flex justify-between items-center text-sm">
                        <span>{disease}</span>
                        <span className="font-semibold text-primary">{Number(confidence).toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Detection Timeline */}
                <div className="space-y-3">
                  <h5 className="font-semibold">Detection Timeline (Last 10 Detections)</h5>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cameraReport.detectionTimeline.slice(-10).reverse().map((detection: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded border border-border text-sm">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{detection.disease}</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            detection.confidence > 80 ? "bg-destructive/20 text-destructive" :
                            detection.confidence > 60 ? "bg-accent/20 text-accent" :
                            "bg-secondary/20 text-secondary"
                          }`}>
                            {detection.confidence.toFixed(1)}%
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(detection.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2">
                  <Button 
                    onClick={() => {
                      setShowLiveCamera(true);
                      setCameraReport(null);
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Camera className="h-4 w-4 mr-2" />
                    Start New Stream
                  </Button>
                  <Button 
                    onClick={() => {
                      // Generate CSV report
                      const csv = `Disease,Confidence,Time\n${cameraReport.detectionTimeline
                        .map((d: any) => `${d.disease},${d.confidence.toFixed(1)},${new Date(d.timestamp).toLocaleTimeString()}`)
                        .join("\n")}`;
                      const blob = new Blob([csv], { type: "text/csv" });
                      const url = window.URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `camera-report-${new Date().getTime()}.csv`;
                      a.click();
                    }}
                    className="flex-1 bg-gradient-to-r from-primary to-secondary"
                  >
                    Download Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default FarmerPortal;
