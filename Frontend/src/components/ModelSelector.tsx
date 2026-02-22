
import React, { useState, useEffect } from 'react';
import { Cpu, Check, ChevronDown, RefreshCw, AlertCircle } from 'lucide-react';

interface ModelInfo {
    id: string;
    name: string;
    version: string;
    type: string;
    description: string;
    active: boolean;
}

const ModelSelector: React.FC = () => {
    const [models, setModels] = useState<ModelInfo[]>([]);
    const [activeModel, setActiveModel] = useState<ModelInfo | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Fetch models on mount
    useEffect(() => {
        fetchModels();
    }, []);

    const fetchModels = async () => {
        try {
            const response = await fetch('http://localhost:5000/models');
            const data = await response.json();

            if (data.success) {
                setModels(data.models);
                const active = data.models.find((m: ModelInfo) => m.active);
                if (active) setActiveModel(active);
            }
        } catch (err) {
            console.error('Failed to fetch models:', err);
            // Use fallback data if backend is offline/unreachable during dev
            // setError('Failed to load models');
        }
    };

    const handleSwitchModel = async (modelId: string) => {
        if (activeModel?.id === modelId) return;

        setIsLoading(true);
        setIsOpen(false);
        setError(null);

        try {
            const response = await fetch('http://localhost:5000/models/switch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model_id: modelId }),
            });

            const data = await response.json();

            if (data.success) {
                // Refresh list to update active state
                await fetchModels();
            } else {
                setError(data.error || 'Failed to switch model');
            }
        } catch (err) {
            setError('Connection error');
        } finally {
            setIsLoading(false);
        }
    };

    if (!activeModel && models.length === 0) return null;

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`flex items-center gap-2 px-2 py-1 rounded-md border transition-all group ${isOpen
                    ? 'bg-primary/10 border-primary/50 text-primary'
                    : 'bg-transparent border-transparent hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                disabled={isLoading}
            >
                {isLoading ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                    <Cpu className={`w-3.5 h-3.5 ${isOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'}`} />
                )}

                <div className="flex flex-col items-start text-[10px] leading-tight group">
                    <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">AI Model</span>
                    <span className={`font-bold transition-colors ${isOpen ? 'text-primary' : 'text-foreground/90 group-hover:text-foreground'}`}>
                        {activeModel?.name || 'Loading...'}
                    </span>
                </div>

                <ChevronDown className={`w-3 h-3 transition-transform opacity-50 group-hover:opacity-100 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Error Toast */}
            {error && (
                <div className="absolute top-full mt-2 right-0 w-48 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-[10px] flex items-center gap-2">
                    <AlertCircle className="w-3 h-3" />
                    {error}
                </div>
            )}

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute top-full right-0 mt-2 w-72 glass-panel rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-200">
                    <div className="p-2 border-b border-border/50 bg-muted/30">
                        <h3 className="text-[10px] font-medium text-muted-foreground px-2 uppercase tracking-wider">Select Engine</h3>
                    </div>

                    <div className="p-1">
                        {models.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => handleSwitchModel(model.id)}
                                className={`w-full text-left p-2 rounded-lg transition-all flex items-start gap-3 relative group ${model.id === activeModel?.id
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                    }`}
                            >
                                <div className={`mt-1 w-1.5 h-1.5 rounded-full shadow-sm ${model.type === 'yolo' ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-xs text-foreground">{model.name}</span>
                                        {model.id === activeModel?.id && <Check className="w-3 h-3 text-primary" />}
                                    </div>
                                    <p className="text-[10px] text-muted-foreground/80 mt-0.5 line-clamp-2 leading-relaxed">{model.description}</p>
                                    <div className="mt-1.5 flex gap-2">
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-background border border-border uppercase tracking-wide">
                                            {model.version}
                                        </span>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-background border border-border uppercase tracking-wide">
                                            {model.type}
                                        </span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ModelSelector;
