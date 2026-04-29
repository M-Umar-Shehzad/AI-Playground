import React, { useState, useRef } from 'react';
import { SplitSquareHorizontal, UploadCloud, RefreshCw, Loader, AlertTriangle, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { nimChat } from './AnalysisReport';
import './ComparativeLens.css';

// Analyze each image separately, then compare text — avoids multi-image HTTP 400
async function analyzeImageDescription(imageData, label) {
    return await nimChat([
        {
            role: "user",
            content: [
                {
                    type: "text",
                    text: `Describe ${label} in detail. State: the scene type, overall brightness (0-100%), dominant colors, atmosphere/mood, and list all visible objects. Be precise and concise.`
                },
                { type: "image_url", image_url: { url: imageData } }
            ]
        }
    ], 512);
}

async function compareDescriptions(descA, descB) {
    const raw = await nimChat([
        {
            role: "user",
            content: `Compare these two image descriptions and return ONLY a JSON object with these fields:
{
  "brightness_delta": "e.g. Frame B is 20% brighter",
  "atmosphere_shift": "short description of mood/lighting shift",
  "object_delta": "describe what objects differ or are added/removed",
  "summary": "One clear sentence summarizing the key visual difference between the two images"
}

Frame A: ${descA}

Frame B: ${descB}

Return ONLY raw JSON. No markdown.`
        }
    ]);
    const match = raw.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No valid JSON in compare response");
}

function FrameUploader({ label, image, onImage }) {
    const inputRef = useRef(null);
    const handleFile = (file) => {
        if (!file || !file.type.startsWith('image/')) return;
        const reader = new FileReader();
        reader.onload = (e) => onImage(e.target.result);
        reader.readAsDataURL(file);
    };
    return (
        <div
            className="frame glass-panel"
            onClick={() => inputRef.current.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files[0]); }}
            style={{ cursor: 'pointer' }}
        >
            <input type="file" accept="image/*" ref={inputRef} style={{ display: 'none' }} onChange={(e) => handleFile(e.target.files[0])} />
            {image ? (
                <img src={image} alt={label} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }} />
            ) : (
                <div className="frame-placeholder">
                    <UploadCloud size={20} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <span>{label}</span>
                </div>
            )}
        </div>
    );
}

export default function ComparativeLens() {
    const [frameA, setFrameA] = useState(null);
    const [frameB, setFrameB] = useState(null);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadingStep, setLoadingStep] = useState('');
    const [error, setError] = useState(null);

    const handleCompare = async () => {
        if (!frameA || !frameB) return;
        // Demo mode only in local dev when no API key is configured.
        // In production the Netlify proxy always handles real API calls.
        const isDemoMode = import.meta.env.DEV && !import.meta.env.VITE_NIM_API_KEY;
        if (isDemoMode) {
            setResult({
                brightness_delta: "Frame B is +12% brighter",
                atmosphere_shift: "Cooler tone, higher contrast in Frame B",
                object_delta: "2 fewer objects visible in Frame B",
                summary: "Frame B appears more exposed and clinical compared to the warmer, busier Frame A."
            });
            return;
        }
        setLoading(true);
        setResult(null);
        setError(null);
        try {
            setLoadingStep('Analyzing Frame A...');
            const descA = await analyzeImageDescription(frameA, 'this image (Frame A / Baseline)');
            setLoadingStep('Analyzing Frame B...');
            const descB = await analyzeImageDescription(frameB, 'this image (Frame B / Variant)');
            setLoadingStep('Comparing deltas...');
            const delta = await compareDescriptions(descA, descB);
            setResult(delta);
        } catch (err) {
            // err.message is already a clean sentence from nimChat — no need to prefix
            setError(err.message || 'An unexpected error occurred. Please try again.');
        }
        setLoading(false);
        setLoadingStep('');
    };

    return (
        <motion.div className="comparative-lens glass-panel" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
            <header className="lens-header">
                <div>
                    <h3>Delta Detection Framework</h3>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '4px' }}>
                        Upload two images — the AI will analyze each, then compare brightness, atmosphere, and object differences.
                    </p>
                </div>
                <span className="tone-badge" style={{ background: 'rgba(56, 189, 248, 0.1)', color: '#38bdf8' }}>Comparative Analysis</span>
            </header>

            <div className="frames-container">
                <FrameUploader label="Frame A — Baseline" image={frameA} onImage={setFrameA} />
                <div className="diff-indicator">
                    <SplitSquareHorizontal size={24} color="var(--text-secondary)" />
                </div>
                <FrameUploader label="Frame B — Variant" image={frameB} onImage={setFrameB} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px', gap: '12px' }}>
                <button
                    className="premium"
                    onClick={handleCompare}
                    disabled={!frameA || !frameB || loading}
                    style={{ display: 'flex', alignItems: 'center', gap: '10px', opacity: (!frameA || !frameB) ? 0.4 : 1 }}
                >
                    {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <SplitSquareHorizontal size={16} />}
                    {loading ? loadingStep : 'Run Comparison'}
                </button>
                {(frameA || frameB) && !loading && (
                    <button className="action-btn-secondary" onClick={() => { setFrameA(null); setFrameB(null); setResult(null); setError(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 16px', borderRadius: '6px' }}>
                        <RefreshCw size={14} /> Reset
                    </button>
                )}
            </div>

            <AnimatePresence>
                {result && (
                    <motion.div className="delta-stats glass-panel" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                        <div className="stat-item">
                            <label>Brightness Delta</label>
                            <span style={{ color: '#4ade80' }}>{result.brightness_delta}</span>
                        </div>
                        <div className="stat-item">
                            <label>Atmosphere Shift</label>
                            <span style={{ color: '#38bdf8' }}>{result.atmosphere_shift}</span>
                        </div>
                        <div className="stat-item">
                            <label>Object Delta</label>
                            <span style={{ color: '#f87171' }}>{result.object_delta}</span>
                        </div>
                        {result.summary && (
                            <div className="stat-item" style={{ gridColumn: '1/-1', borderTop: '1px solid var(--border-color)', paddingTop: '12px', marginTop: '4px' }}>
                                <label>AI Summary</label>
                                <span style={{ color: 'var(--text-primary)', fontWeight: 400 }}>{result.summary}</span>
                            </div>
                        )}
                    </motion.div>
                )}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        style={{
                            marginTop: '16px',
                            padding: '16px 20px',
                            background: 'rgba(248, 113, 113, 0.08)',
                            border: '1px solid rgba(248, 113, 113, 0.25)',
                            borderRadius: '10px',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                        }}
                    >
                        {error.toLowerCase().includes('connect') || error.toLowerCase().includes('internet') || error.toLowerCase().includes('reach')
                            ? <WifiOff size={18} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />
                            : <AlertTriangle size={18} style={{ color: '#f87171', flexShrink: 0, marginTop: '2px' }} />
                        }
                        <div>
                            <p style={{ color: '#f87171', fontWeight: 500, marginBottom: '4px', fontSize: '0.9rem' }}>Analysis Failed</p>
                            <p style={{ color: 'rgba(248,113,113,0.8)', fontSize: '0.85rem', lineHeight: 1.5 }}>{error}</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}
