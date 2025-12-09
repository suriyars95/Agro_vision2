import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, Satellite, TrendingUp, BarChart3, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import StatCard from "@/components/StatCard";
import FeatureCard from "@/components/FeatureCard";
import heroImage from "@/assets/hero-wheat-field.jpg";
import aiIcon from "@/assets/ai-detection-icon.jpg";
import ndviIcon from "@/assets/ndvi-tracking-icon.jpg";
import alertsIcon from "@/assets/predictive-alerts-icon.jpg";
import dashboardIcon from "@/assets/smart-dashboard-icon.jpg";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${heroImage})`,
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
        </div>
        
        <div className="relative z-10 container mx-auto px-4 text-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-fade-in-up">
            AI-Powered AgroVision for
            <br />
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Smart & Sustainable Farming
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto animate-fade-in-up" style={{ animationDelay: "0.2s" }}>
            Real-time wheat disease detection using drone, satellite, and field imagery powered by advanced AI technology
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up" style={{ animationDelay: "0.4s" }}>
            <Button size="lg" className="bg-gradient-to-r from-primary to-secondary hover:opacity-90 text-lg px-8 py-6" asChild>
              <Link to="/dashboard">
                Explore Dashboard <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20" asChild>
              <Link to="/">Farmer Portal</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <StatCard label="Fields Monitored" value={15240} suffix="+" delay={0} />
            <StatCard label="Farmers Reached" value={8500} suffix="+" delay={200} />
            <StatCard label="Diseases Detected" value={95} suffix="%" delay={400} />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Comprehensive <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Agri-Tech</span> Solutions
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Integrating cutting-edge AI with agricultural expertise for precision farming
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              title="AI Disease Detection"
              description="Advanced neural networks analyze crop imagery to detect diseases early with 95%+ accuracy"
              icon={Brain}
              image={aiIcon}
            />
            <FeatureCard
              title="NDVI/EVI Tracking"
              description="Satellite-based vegetation indices monitor crop health in real-time across vast farmlands"
              icon={Satellite}
              image={ndviIcon}
            />
            <FeatureCard
              title="Predictive Alerts"
              description="Machine learning forecasts disease outbreaks based on weather, soil, and historical data"
              icon={TrendingUp}
              image={alertsIcon}
            />
            <FeatureCard
              title="Smart Dashboard"
              description="Unified platform with geo-heatmaps, analytics, and actionable insights for farmers"
              icon={BarChart3}
              image={dashboardIcon}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary via-accent to-secondary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Transform Your Farming?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8 max-w-2xl mx-auto">
            Join thousands of farmers using AgroVision AI to protect crops and increase yields
          </p>
          <Button size="lg" variant="secondary" className="text-lg px-8 py-6" asChild>
            <Link to="/farmer-portal">
              Get Started Now <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
