import React, { useState, useRef } from 'react';
import { RefreshCw, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import './AnalysisReport.css';

// Robust JSON extractor - handles markdown blocks, extra text, etc.
function extractJSON(str) {
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
        try {
            return JSON.parse(match[0]);
        } catch (e) {
            const cleaned = str.replace(/```(?:json)?/g, '').replace(/```/g, '').trim();
            return JSON.parse(cleaned);
        }
    }
    throw new Error("No valid JSON found in model response.");
}

export async function nimChat(messages, maxTokens = 1024) {
    const isDev = import.meta.env.DEV;

    if (isDev) {
        // Local dev: Vite proxies /nim-api → NVIDIA directly using .env.local key
        const response = await fetch("/nim-api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${import.meta.env.VITE_NIM_API_KEY}`
            },
            body: JSON.stringify({
                model: "meta/llama-3.2-90b-vision-instruct",
                messages,
                max_tokens: maxTokens,
                temperature: 0.4,
            })
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`HTTP ${response.status}: ${err}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    } else {
        // Production: API key lives only on the server (Netlify env var NIM_API_KEY)
        // Key is NEVER sent to or accessible by the browser
        const response = await fetch("/.netlify/functions/nim-proxy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages, max_tokens: maxTokens })
        });
        if (!response.ok) {
            const err = await response.text();
            throw new Error(`HTTP ${response.status}: ${err}`);
        }
        const data = await response.json();
        return data.choices[0].message.content;
    }
}


export async function runAnalysis(imageData) {
    const rawContent = await nimChat([
        {
            role: "user",
            content: [
                {
                    type: "text",
                    text: `You are a precise visual analyst. Carefully examine every detail of this image and respond ONLY with a valid JSON object. Do NOT hallucinate. Only describe what is literally present.

{
  "scene": "A short, precise 2-5 word label for the scene type (e.g. 'City Street at Night', 'Indoor Kitchen', 'Forest Trail')",
  "quality": "Lighting and quality assessment (e.g. 'Natural Daylight, Sharp', 'Low Light, Grainy', 'HDR, Vivid Colors')",
  "story": "Write a 3-4 sentence immersive short story inspired by exactly what you see. Be specific about the actual subjects, colors, and environment you observe. Make it vivid and cinematic.",
  "entities": ["List every visible object with a confidence score, e.g. 'Red Car [0.98]', 'Street Lamp [0.91]'. Include at least 4 items."]
}

Return raw JSON only. No markdown. No prefix text.`
                },
                { type: "image_url", image_url: { url: imageData } }
            ]
        }
    ]);

    const content = extractJSON(rawContent);
    return {
        scene: content.scene || "Unknown Scene",
        quality: content.quality || "Standard",
        story: content.story || content.narrative || "No story generated.",
        entities: Array.isArray(content.entities) ? content.entities : []
    };
}

export default function AnalysisReport({ imageData, results, loading, onReset }) {
    const [vqaQuestion, setVqaQuestion] = useState('');
    const [vqaAnswer, setVqaAnswer] = useState('');
    const [vqaLoading, setVqaLoading] = useState(false);
    const inputRef = useRef(null);

    const handleVQA = async () => {
        if (!vqaQuestion.trim() || !imageData) return;
        setVqaLoading(true);
        setVqaAnswer('');
        try {
            const answer = await nimChat([
                {
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: `Look at this image carefully and answer this question precisely and concisely: "${vqaQuestion}". Only describe what you can actually see.`
                        },
                        { type: "image_url", image_url: { url: imageData } }
                    ]
                }
            ]);
            setVqaAnswer(answer);
        } catch (err) {
            setVqaAnswer(`Error: ${err.message}`);
        }
        setVqaLoading(false);
    };

    if (loading || !results) {
        return (
            <motion.div className="analysis-loading glass-panel" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="loader-ring"></div>
                <h4 style={{ marginTop: '24px', fontWeight: 400, color: 'var(--text-secondary)' }}>Analyzing...</h4>
            </motion.div>
        );
    }

    const cagg = results.entities.length > 0
        ? (results.entities.reduce((sum, e) => {
            const m = e.match(/\[([\d.]+)\]/);
            return sum + (m ? parseFloat(m[1]) : 0.85);
        }, 0) / results.entities.length).toFixed(3)
        : '—';

    return (
        <motion.div
            className="analysis-report glass-panel"
            initial={{ opacity: 0, scale: 0.98, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
        >
            <header className="report-header">
                <div className="report-title">
                    <h3>Semantic Story Synthesis</h3>
                    <span className="tone-badge">Cinematic Mode</span>
                </div>
                <div className="report-actions">
                    <button className="action-btn-secondary" onClick={onReset}><RefreshCw size={16} /> New Analysis</button>
                </div>
            </header>

            {imageData && (
                <div style={{ marginBottom: '24px', borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border-color)', display: 'flex', justifyContent: 'center', background: '#000' }}>
                    <img src={imageData} alt="Analyzed" style={{ width: '100%', maxHeight: '360px', objectFit: 'contain' }} />
                </div>
            )}

            <div className="metadata-grid">
                <div className="metadata-item">
                    <label>Scene Classification</label>
                    <span className="metadata-value">{results.scene}</span>
                </div>
                <div className="metadata-item">
                    <label>Quality Assessment</label>
                    <span className="metadata-value">{results.quality}</span>
                </div>
                <div className="metadata-item">
                    <label>Confidence (C-agg)</label>
                    <span className="metadata-value" style={{ color: '#4ade80' }}>{cagg}</span>
                </div>
            </div>

            <div className="story-content">
                <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>Generated Story</label>
                <p>{results.story}</p>
            </div>

            <div className="detected-entities">
                <label>Detected Entities</label>
                <div className="tags">
                    {results.entities.map((e, idx) => (
                        <span key={idx} className="tag">{e}</span>
                    ))}
                </div>
            </div>

            {/* VQA Module */}
            <div className="vqa-module" style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '12px' }}>
                    Contextual Follow-up (VQA) — Ask anything about this image
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <input
                        ref={inputRef}
                        type="text"
                        value={vqaQuestion}
                        onChange={(e) => setVqaQuestion(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleVQA()}
                        placeholder="e.g. 'What color is the car?' or 'How many people are visible?'"
                        style={{
                            flex: 1, padding: '12px 16px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid var(--border-color)',
                            color: 'var(--text-primary)',
                            borderRadius: '8px', fontSize: '0.9rem',
                            outline: 'none', fontFamily: 'inherit'
                        }}
                    />
                    <button
                        className="premium"
                        onClick={handleVQA}
                        disabled={vqaLoading}
                        style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                        {vqaLoading
                            ? <div style={{ width: '16px', height: '16px', border: '2px solid #000', borderTop: '2px solid transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                            : <Send size={16} />}
                    </button>
                </div>
                <AnimatePresence>
                    {vqaAnswer && (
                        <motion.div
                            initial={{ opacity: 0, y: 6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            style={{
                                marginTop: '14px', padding: '14px 16px',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid var(--border-color)',
                                borderRadius: '8px', fontSize: '0.9rem',
                                color: 'var(--text-primary)', lineHeight: 1.6
                            }}
                        >
                            {vqaAnswer}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
