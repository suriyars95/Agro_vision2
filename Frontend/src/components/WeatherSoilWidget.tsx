import { Thermometer, Droplets, Wind, Beaker } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const WeatherSoilWidget = () => {
    return (
        <Card className="glass-panel border-none shadow-md h-full flex flex-col">
            <CardHeader className="py-2 px-4 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Wind className="h-4 w-4 text-emerald-500" />
                    Env. Analysis
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex-1 grid grid-cols-2 gap-2 overflow-auto">
                {/* Weather */}
                <div className="space-y-2 col-span-2">
                    <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-2 rounded-md">
                        <div className="flex items-center gap-2">
                            <Thermometer className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-xs font-medium opacity-80">Temp</span>
                        </div>
                        <span className="text-sm font-bold font-mono">24.5°C</span>
                    </div>
                    <div className="flex items-center justify-between bg-black/5 dark:bg-white/5 p-2 rounded-md">
                        <div className="flex items-center gap-2">
                            <Droplets className="h-3.5 w-3.5 text-blue-500" />
                            <span className="text-xs font-medium opacity-80">Humidity</span>
                        </div>
                        <span className="text-sm font-bold font-mono">64%</span>
                    </div>
                </div>

                {/* Soil Metrics */}
                <div className="col-span-2 mt-1">
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Soil Composition</p>
                    <div className="grid grid-cols-3 gap-1.5">
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded text-center">
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">N</span>
                            <span className="block text-xs font-mono font-bold">45</span>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded text-center">
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">P</span>
                            <span className="block text-xs font-mono font-bold">12</span>
                        </div>
                        <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded text-center">
                            <span className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">K</span>
                            <span className="block text-xs font-mono font-bold">89</span>
                        </div>
                    </div>
                </div>

                <div className="col-span-2 flex items-center justify-between bg-black/5 dark:bg-white/5 p-2 rounded-md mt-1">
                    <div className="flex items-center gap-2">
                        <Beaker className="h-3.5 w-3.5 text-purple-500" />
                        <span className="text-xs font-medium opacity-80">Soil pH</span>
                    </div>
                    <span className="text-sm font-bold font-mono">6.8</span>
                </div>
            </CardContent>
        </Card>
    );
};

export default WeatherSoilWidget;
