import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const SystemLogWidget = () => {
    const logs = [
        { time: "09:41:03", level: "INFO", msg: "System initialization complete" },
        { time: "09:41:05", level: "INFO", msg: "Camera module connected" },
        { time: "09:42:12", level: "WARN", msg: "Drone GPV signal fluctuating" },
        { time: "09:45:00", level: "INFO", msg: "Soil sensor calibration OK" },
        { time: "09:50:22", level: "INFO", msg: "Weather data synchronization..." },
        { time: "09:50:24", level: "SUCCESS", msg: "Sync complete. Latency 45ms" },
    ];

    return (
        <Card className="glass-panel border-zinc-200 dark:border-white/10 shadow-md h-full flex flex-col bg-white/80 dark:bg-black/80 backdrop-blur-md">
            <CardHeader className="py-2 px-4 border-b border-zinc-200 dark:border-white/10 bg-zinc-50/50 dark:bg-white/5">
                <CardTitle className="text-xs font-mono font-semibold flex items-center gap-2 text-zinc-700 dark:text-white/90">
                    <Terminal className="h-3.5 w-3.5" />
                    System Logs
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 min-h-[100px]">
                <ScrollArea className="h-full max-h-[150px] w-full p-3">
                    <div className="space-y-1 font-mono text-[10px] leading-tight">
                        {logs.map((log, i) => (
                            <div key={i} className="flex gap-2 text-zinc-600 dark:text-white/70">
                                <span className="opacity-50 select-none">[{log.time}]</span>
                                <span className={`font-bold ${log.level === 'WARN' ? 'text-amber-500 dark:text-yellow-400' :
                                    log.level === 'SUCCESS' ? 'text-emerald-600 dark:text-emerald-400' : 'text-blue-600 dark:text-blue-400'
                                    }`}>{log.level}</span>
                                <span className="text-zinc-800 dark:text-zinc-300">{log.msg}</span>
                            </div>
                        ))}
                        <div className="h-2 w-2 bg-emerald-500/50 animate-pulse mt-1" />
                    </div>
                </ScrollArea>
            </CardContent>
        </Card>
    );
};

export default SystemLogWidget;
