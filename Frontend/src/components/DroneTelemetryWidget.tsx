import { Battery, Signal, Zap, Navigation } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

const DroneTelemetryWidget = () => {
    return (
        <Card className="glass-panel border-none shadow-md h-full flex flex-col">
            <CardHeader className="py-2 px-4 border-b border-border/40">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Navigation className="h-4 w-4 text-sky-500" />
                    Drone Telemetry
                </CardTitle>
            </CardHeader>
            <CardContent className="p-3 flex-1 space-y-3">
                {/* Status */}
                <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Status</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20 uppercase">
                        Standby
                    </span>
                </div>

                {/* Battery */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><Battery className="h-3 w-3" /> Battery</span>
                        <span className="font-mono font-bold">84%</span>
                    </div>
                    <Progress value={84} className="h-1.5 bg-secondary" />
                </div>

                {/* Signal */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><Signal className="h-3 w-3" /> Signal Strength</span>
                        <span className="font-mono font-bold">92%</span>
                    </div>
                    <Progress value={92} className="h-1.5 bg-secondary" />
                </div>

                {/* Tank Level */}
                <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-1.5"><Zap className="h-3 w-3 text-yellow-500" /> Tank Level</span>
                        <span className="font-mono font-bold">45%</span>
                    </div>
                    <Progress value={45} className="h-1.5 bg-secondary" />
                </div>
            </CardContent>
        </Card>
    );
};

export default DroneTelemetryWidget;
