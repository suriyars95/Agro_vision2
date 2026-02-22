import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Share2, Activity, Clock, AlertTriangle, ShieldCheck, ArrowRight, X, Loader2, Sparkles, Target, FileText } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend } from "recharts";
import { toast } from "sonner";

interface DetailedReportViewProps {
    reportData: any;
    onClose?: () => void;
    onRestart?: () => void;
}

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        // Sort by confidence (value) descending
        const sortedPayload = [...payload].sort((a, b) => b.value - a.value).slice(0, 5);

        return (
            <div className="bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-white/10 p-3 rounded-xl shadow-xl backdrop-blur-md">
                <p className="text-zinc-500 dark:text-zinc-400 text-xs font-mono mb-2 border-b border-zinc-200 dark:border-white/10 pb-1 flex items-center gap-2">
                    <Clock className="h-3 w-3" /> {label}
                </p>
                <div className="space-y-1.5">
                    {sortedPayload.map((entry: any, index: number) => (
                        <div key={index} className="flex items-center justify-between gap-4 text-xs">
                            <div className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span className="text-zinc-700 dark:text-zinc-200 font-medium">{entry.name}</span>
                            </div>
                            <span className="font-bold text-zinc-900 dark:text-white mono">{entry.value}%</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }
    return null;
};

const DetailedReportView = ({ reportData, onClose, onRestart }: DetailedReportViewProps) => {

    const [llmReport, setLlmReport] = useState<any>(null);
    const [isGeneratingLLM, setIsGeneratingLLM] = useState(true);
    const [llmError, setLlmError] = useState<string | null>(null);

    const generateLLMReport = async () => {
        setIsGeneratingLLM(true);
        setLlmError(null);
        try {
            const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000';

            const response = await fetch(`${apiUrl}/llm/generate_report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ analysis_data: reportData })
            });

            if (!response.ok) throw new Error('Failed to fetch LLM report');

            const data = await response.json();
            if (data.success && data.report) {
                setLlmReport(data.report);
            } else {
                throw new Error(data.error || 'Failed to generate report');
            }
        } catch (err: any) {
            console.error("LLM Generation Error:", err);
            setLlmError(err.message || 'Error generating advanced report.');
        } finally {
            setIsGeneratingLLM(false);
        }
    };

    useEffect(() => {
        if (reportData) {
            generateLLMReport();
        }
    }, [reportData]);

    const chartData = reportData.timelineData || [];

    const diseaseDistribution = reportData.diseases ? reportData.diseases.map((d: any) => ({
        name: d.name,
        count: parseInt(d.affectedArea) || 0,
        fill: d.name === 'Healthy' || d.name === 'Healthy Crop' ? '#10b981' : '#ef4444'
    })) : [];

    // Extract Top Disease
    const topDisease = reportData.diseases && reportData.diseases.length > 0
        ? [...reportData.diseases].sort((a, b) => b.avgConfidence - a.avgConfidence)[0]
        : { name: "Analyzing...", avgConfidence: 0, severity: "Unknown" };

    const handleDownloadPDF = () => {
        toast.info("PDF Download feature is currently disabled.");
    };

    return (
        <div id="report-container" className="space-y-4 h-full flex flex-col pt-2 bg-background">

            {/* Report Header - Enhanced Visibility */}
            <div className="flex items-center justify-between bg-emerald-50 dark:bg-zinc-900 text-emerald-950 dark:text-white p-5 rounded-xl border border-emerald-100 dark:border-white/10 shadow-lg dark:shadow-2xl shrink-0 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-200/50 to-transparent dark:from-emerald-900/20 dark:to-transparent pointer-events-none"></div>
                <div className="relative z-10">
                    <h2 className="text-2xl font-bold flex items-center gap-3 tracking-tight">
                        <Activity className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                        Comprehensive Analysis Report
                    </h2>
                    <div className="flex items-center gap-4 mt-1 text-sm text-emerald-700/70 dark:text-zinc-400 font-mono">
                        <span>ID: {reportData.id || "ENG-2023-X92"}</span>
                        <span className="w-1 h-1 rounded-full bg-emerald-300 dark:bg-zinc-600"></span>
                        <span>{new Date().toLocaleString()}</span>
                    </div>
                </div>
                <div className="flex gap-3 relative z-10" data-html2canvas-ignore="true">
                    {onRestart && (
                        <Button onClick={onRestart} className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border-none shadow-md shadow-emerald-200 dark:shadow-emerald-900/20 hidden md:flex">
                            Start New Analysis <ArrowRight className="h-4 w-4" />
                        </Button>
                    )}
                    <Button variant="outline" size="sm" onClick={handleDownloadPDF} className="gap-2 border-emerald-200 dark:border-white/10 bg-white dark:bg-white/5 hover:bg-emerald-100 dark:hover:bg-white/10 text-emerald-800 dark:text-zinc-300">
                        <Download className="h-4 w-4" /> PDF
                    </Button>
                    {onClose && <Button variant="ghost" size="sm" onClick={onClose} className="text-emerald-600 dark:text-zinc-400 hover:text-emerald-900 dark:hover:text-white"><X className="h-5 w-5" /></Button>}
                </div>
            </div>

            {/* BIG HIGHLIGHT: Top Disease Block (More Compact & Professional) */}
            <div className={`px-5 py-4 rounded-xl border shadow-sm flex items-center justify-between transition-colors
                ${topDisease.name === 'Healthy Crop' || topDisease.name === 'Healthy'
                    ? 'bg-emerald-50/80 border-emerald-500/20 text-emerald-950 dark:bg-emerald-950/20 dark:text-emerald-100'
                    : 'bg-red-50/80 border-red-500/20 text-red-950 dark:bg-red-950/20 dark:text-red-100'}`}
            >
                <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl shadow-sm ${topDisease.name === 'Healthy Crop' || topDisease.name === 'Healthy' ? 'bg-emerald-100/50 dark:bg-emerald-500/20' : 'bg-red-100/50 dark:bg-red-500/20'}`}>
                        <Target className={`h-6 w-6 ${topDisease.name === 'Healthy Crop' || topDisease.name === 'Healthy' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`} />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-0.5">Primary Detection</p>
                        <h1 className="text-xl md:text-2xl font-black tracking-tight">{topDisease.name}</h1>
                    </div>
                </div>
                <div className="text-right flex flex-col items-end">
                    <p className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-0.5">Confidence Score</p>
                    <div className={`text-2xl md:text-3xl font-black font-mono tracking-tight 
                        ${topDisease.name === 'Healthy Crop' || topDisease.name === 'Healthy'
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : 'text-red-700 dark:text-red-400'}`}
                    >
                        {topDisease.avgConfidence}%
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Main Chart Area */}
                <Card className="lg:col-span-2 glass-card border-none shadow-md flex flex-col">
                    <CardHeader className="py-3 px-4 border-b border-border/50">
                        <CardTitle className="text-sm font-semibold">Disease Confidence Timeline</CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 h-[220px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" opacity={0.2} />
                                <XAxis dataKey="time" tick={{ fontSize: 10 }} stroke="#888" minTickGap={30} />
                                <YAxis tick={{ fontSize: 10 }} stroke="#888" unit="%" />
                                <Tooltip content={<CustomTooltip />} />
                                <Legend />

                                {/* Dynamically generate Areas for each disease found in data */}
                                {(() => {
                                    // Extract all unique headers (diseases) from data, excluding 'time'
                                    const allKeys = new Set<string>();
                                    chartData.forEach((item: any) => Object.keys(item).forEach(k => {
                                        if (k !== 'time' && typeof item[k] === 'number') allKeys.add(k);
                                    }));

                                    const colors = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#ec4899'];

                                    return Array.from(allKeys).map((key, index) => (
                                        <Area
                                            key={key}
                                            type="monotone"
                                            dataKey={key}
                                            stroke={colors[index % colors.length]}
                                            strokeWidth={2}
                                            fillOpacity={0.1}
                                            fill={colors[index % colors.length]}
                                            connectNulls
                                            stackId={undefined} // No stacking, overlay lines
                                        />
                                    ));
                                })()}
                            </AreaChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* Key Metrics Side */}
                <div className="space-y-4 flex flex-col">

                    {/* Summary Metrics */}
                    <Card className="glass-card border-none p-4 grid grid-cols-2 gap-3 shrink-0">
                        <div className="bg-primary/10 p-2 rounded-lg text-center border border-primary/20">
                            <span className="block text-xs text-muted-foreground uppercase">Avg Confidence</span>
                            <span className="text-2xl font-bold text-primary">
                                {reportData.diseases && reportData.diseases.length > 0
                                    ? Math.round(reportData.diseases.reduce((acc: number, curr: any) => acc + (curr.avgConfidence || 0), 0) / reportData.diseases.length)
                                    : 0}%
                            </span>
                        </div>
                        <div className="bg-red-500/10 p-2 rounded-lg text-center border border-red-500/20">
                            <span className="block text-xs text-muted-foreground uppercase">Diseases Detected</span>
                            <span className="text-2xl font-bold text-red-500">{reportData.totalDiseases || 0}</span>
                        </div>
                        <div className="bg-blue-500/10 p-2 rounded-lg text-center border border-blue-500/20 col-span-2 flex items-center justify-between px-4">
                            <span className="text-xs text-muted-foreground uppercase flex items-center gap-2"><Clock className="h-3 w-3" /> Duration</span>
                            <span className="text-xl font-bold text-blue-500">{reportData.duration || "00:00"}</span>
                        </div>
                    </Card>

                    {/* Distribution Chart */}
                    <Card className="glass-card border-none flex-1 flex flex-col">
                        <CardHeader className="py-2 px-4 border-b border-border/50">
                            <CardTitle className="text-xs font-semibold">Detection Distribution</CardTitle>
                        </CardHeader>
                        <CardContent className="p-2 h-[160px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={diseaseDistribution} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} stroke="#888" />
                                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '8px', fontSize: '10px' }} />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={20} />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </div>

                {/* Detailed Advisory Section */}
                <Card className="lg:col-span-3 glass-card border-border shadow-md overflow-hidden bg-background">
                    {!llmReport && isGeneratingLLM ? (
                        <div className="p-12 flex flex-col items-center justify-center space-y-4 bg-muted/20">
                            <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
                            <h3 className="text-base font-bold text-center">AI is compiling the Final Report...</h3>
                            <p className="text-xs text-muted-foreground max-w-sm text-center">Structuring treatment plans and risk assessment data.</p>
                        </div>
                    ) : llmError ? (
                        <div className="p-8 flex flex-col items-center justify-center text-red-500 bg-red-50/50 dark:bg-red-950/20 border-b border-red-100 dark:border-red-900/30">
                            <AlertTriangle className="h-8 w-8 mb-2" />
                            <p className="text-sm font-medium">{llmError}</p>
                            <Button variant="outline" size="sm" className="mt-4" onClick={() => generateLLMReport()}>Retry</Button>
                        </div>
                    ) : (
                        <div className="flex flex-col">

                            {/* 1. Full-Width Executive Summary */}
                            {llmReport?.report_overview && (
                                <div className="p-6 md:p-8 bg-zinc-50 dark:bg-zinc-900/50 border-b border-border/50">
                                    <h3 className="text-base font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-2 mb-3">
                                        <FileText className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Executive Overview
                                    </h3>
                                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed max-w-4xl">
                                        {llmReport.report_overview}
                                    </p>
                                </div>
                            )}

                            {/* 2. Balanced Split Grid for Details */}
                            <div className="grid grid-cols-1 lg:grid-cols-5 divide-y lg:divide-y-0 lg:divide-x divide-border/50">

                                {/* Treatments (Gets 60% of width because it's text heavy) */}
                                <div className="p-6 md:p-8 lg:col-span-3 bg-white dark:bg-zinc-950">
                                    <h3 className="text-base font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-2 mb-5">
                                        <ShieldCheck className="h-5 w-5" /> Recommended Treatment Protocol
                                    </h3>
                                    <div className="space-y-4">
                                        {llmReport?.treatments?.map((treatment: any, idx: number) => (
                                            <div key={idx} className="flex gap-3">
                                                <div className="h-6 w-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 flex flex-col items-center justify-center text-xs font-bold text-emerald-700 dark:text-emerald-400 shrink-0 mt-0.5">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h4 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">{treatment.title}</h4>
                                                    <p className="text-[13px] text-zinc-600 dark:text-zinc-400 mt-1 leading-relaxed">{treatment.description}</p>
                                                </div>
                                            </div>
                                        ))}
                                        {(!llmReport?.treatments || llmReport.treatments.length === 0) && (
                                            <p className="text-sm text-zinc-500 italic">No specific treatments recommended.</p>
                                        )}
                                    </div>
                                </div>

                                {/* Risk Analysis (Gets 40% of width because it's tabular/short) */}
                                <div className="p-6 md:p-8 lg:col-span-2 bg-zinc-50/50 dark:bg-zinc-900/20">
                                    <h3 className="text-base font-bold text-orange-600 dark:text-orange-400 flex items-center gap-2 mb-5">
                                        <AlertTriangle className="h-5 w-5" /> Risk Assessment
                                    </h3>
                                    <ul className="space-y-3">
                                        {llmReport?.risk_analysis?.map((risk: any, idx: number) => {
                                            const isHigh = risk.severity === 'high';
                                            const isMedium = risk.severity === 'medium';
                                            const isLow = risk.severity === 'low';

                                            return (
                                                <li key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-4 border-b border-border/40 pb-3 last:border-0 last:pb-0">
                                                    <span className="text-[13px] font-medium text-zinc-600 dark:text-zinc-400">
                                                        {risk.label}
                                                    </span>
                                                    <span className={`text-[13px] font-bold sm:text-right
                                                    ${isHigh ? 'text-red-600 dark:text-red-400' :
                                                            isMedium ? 'text-amber-600 dark:text-amber-400' :
                                                                isLow ? 'text-emerald-600 dark:text-emerald-400' :
                                                                    'text-zinc-700 dark:text-zinc-300'}`}
                                                    >
                                                        {risk.value}
                                                    </span>
                                                </li>
                                            );
                                        })}
                                        {(!llmReport?.risk_analysis || llmReport.risk_analysis.length === 0) && (
                                            <p className="text-sm text-zinc-500 italic">No risk parameters generated.</p>
                                        )}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>

            </div>
        </div>
    );
};

export default DetailedReportView;
