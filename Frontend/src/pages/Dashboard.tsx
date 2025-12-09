import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, TrendingUp, Leaf, MapPin, Download } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import LiveStreamDetector from "@/components/LiveStreamDetector";
import { useState } from "react";

const Dashboard = () => {
  const [showLiveStream, setShowLiveStream] = useState(false);
  // Mock data for demonstration
  const recentDetections = [
    { disease: "Yellow Rust", severity: "High", location: "Field A-12", confidence: 94 },
    { disease: "Powdery Mildew", severity: "Medium", location: "Field B-08", confidence: 87 },
    { disease: "Leaf Blight", severity: "Low", location: "Field C-15", confidence: 92 },
  ];

  const ndviData = [
    { zone: "Zone 1", ndvi: 0.78, evi: 0.65, status: "Healthy" },
    { zone: "Zone 2", ndvi: 0.45, evi: 0.38, status: "Moderate" },
    { zone: "Zone 3", ndvi: 0.82, evi: 0.71, status: "Healthy" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1 container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-bold mb-2">Analytics Dashboard</h1>
            <p className="text-muted-foreground">Real-time monitoring and disease detection insights</p>
          </div>
          <div className="flex gap-3">
            <Button 
              onClick={() => setShowLiveStream(!showLiveStream)}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-bold"
            >
              {showLiveStream ? "📊 Hide" : "📡"} Live Stream
            </Button>
            <Select defaultValue="all">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Location" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Locations</SelectItem>
                <SelectItem value="field-a">Field A</SelectItem>
                <SelectItem value="field-b">Field B</SelectItem>
                <SelectItem value="field-c">Field C</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Live Stream Section */}
        {showLiveStream && (
          <div className="mb-8">
            <LiveStreamDetector />
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-destructive">12</div>
              <p className="text-xs text-muted-foreground mt-1">+3 from last week</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Avg. NDVI</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-secondary">0.74</div>
              <p className="text-xs text-muted-foreground mt-1">Healthy range</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Fields Scanned</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-primary">487</div>
              <p className="text-xs text-muted-foreground mt-1">This month</p>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Detection Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-accent">96%</div>
              <p className="text-xs text-muted-foreground mt-1">Accuracy</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Disease Detection Panel */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                Recent Disease Detections
              </CardTitle>
              <CardDescription>Latest AI-detected diseases across monitored fields</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDetections.map((detection, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex-1">
                      <div className="font-semibold">{detection.disease}</div>
                      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                        <MapPin className="h-3 w-3" />
                        {detection.location}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${
                        detection.severity === "High" ? "text-destructive" :
                        detection.severity === "Medium" ? "text-accent" :
                        "text-secondary"
                      }`}>
                        {detection.severity}
                      </div>
                      <div className="text-xs text-muted-foreground">{detection.confidence}% confidence</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* NDVI/EVI Panel */}
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-secondary" />
                Vegetation Health Indices
              </CardTitle>
              <CardDescription>NDVI and EVI tracking across field zones</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {ndviData.map((zone, index) => (
                  <div key={index} className="p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-semibold">{zone.zone}</div>
                      <div className={`text-sm font-medium px-2 py-1 rounded ${
                        zone.status === "Healthy" ? "bg-secondary/20 text-secondary" : "bg-accent/20 text-accent"
                      }`}>
                        {zone.status}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">NDVI</div>
                        <div className="font-semibold text-lg">{zone.ndvi}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">EVI</div>
                        <div className="font-semibold text-lg">{zone.evi}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Geo Heatmap Placeholder */}
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Geographic Disease Heatmap
            </CardTitle>
            <CardDescription>Disease distribution across monitored regions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted/30 rounded-lg h-96 flex items-center justify-center border-2 border-dashed border-border">
              <div className="text-center">
                <TrendingUp className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Interactive map visualization coming soon</p>
                <p className="text-sm text-muted-foreground mt-2">Integrate with Mapbox or Leaflet for live geo-heatmaps</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
};

export default Dashboard;
