import { TrendingUp, Sprout, AlertCircle } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const CropHealthWidget = () => {
    return (
        <Card className="glass-panel border-zinc-200 dark:border-white/10 shadow-md h-full flex flex-col bg-white/60 dark:bg-black/40 backdrop-blur-md">
            <CardHeader className="py-2 px-4 border-b border-zinc-200 dark:border-white/10 flex flex-row items-center justify-between bg-zinc-50/50 dark:bg-white/5">
                <CardTitle className="text-xs font-mono font-semibold flex items-center gap-2 text-zinc-700 dark:text-white/90">
                    <Sprout className="h-3.5 w-3.5 text-emerald-600 dark:text-green-400" />
                    Field Health Index
                </CardTitle>
                <span className="text-xs font-bold text-emerald-700 dark:text-green-400 bg-emerald-100 dark:bg-green-400/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-green-400/20">98.2%</span>
            </CardHeader>
            <CardContent className="p-3 flex-1 flex flex-col justify-between">

                <div className="flex items-end justify-between gap-2 h-20 w-full px-2">
                    {[45, 60, 75, 50, 80, 95, 85, 90, 100, 92].map((h, i) => (
                        <div key={i} className="w-full bg-emerald-500/10 dark:bg-emerald-500/20 rounded-t-sm relative group">
                            <div style={{ height: `${h}%` }} className="absolute bottom-0 w-full bg-emerald-500 hover:bg-emerald-400 transition-all duration-300 rounded-t-sm"></div>
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="p-2 rounded bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                        <span className="text-[10px] text-zinc-500 dark:text-muted-foreground uppercase block mb-1">Growth Rate</span>
                        <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500 dark:text-emerald-400" />
                            <span className="text-sm font-mono font-bold text-zinc-800 dark:text-white">+2.4%</span>
                        </div>
                    </div>
                    <div className="p-2 rounded bg-zinc-50 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                        <span className="text-[10px] text-zinc-500 dark:text-muted-foreground uppercase block mb-1">Risk Factor</span>
                        <div className="flex items-center gap-1">
                            <AlertCircle className="h-3 w-3 text-amber-500 dark:text-yellow-500" />
                            <span className="text-sm font-mono font-bold text-zinc-800 dark:text-white">Low</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default CropHealthWidget;
