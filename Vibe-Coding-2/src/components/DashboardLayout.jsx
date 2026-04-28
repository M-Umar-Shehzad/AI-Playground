import React, { useState } from 'react';
import { Camera, History, Activity, SlidersHorizontal } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import VisionUploader from './VisionUploader';
import SidebarHistory from './SidebarHistory';
import AnalysisReport, { runAnalysis } from './AnalysisReport';
import ComparativeLens from './ComparativeLens';
import './DashboardLayout.css';

export default function DashboardLayout() {
    const [activeTab, setActiveTab] = useState('live');
    const [stage, setStage] = useState('upload'); // 'upload' | 'loading' | 'report'
    const [capturedImage, setCapturedImage] = useState(null);
    const [analysisResults, setAnalysisResults] = useState(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [history, setHistory] = useState([]);

    const handleUpload = async (imageData) => {
        setCapturedImage(imageData);
        setAnalysisResults(null);
        setStage('report');
        setAnalysisLoading(true);

        if (!import.meta.env.VITE_NIM_API_KEY) {
            // Demo fallback
            await new Promise(r => setTimeout(r, 2100));
            const mock = {
                scene: "Urban Office", quality: "HDR, High Contrast",
                story: "The rain hammered relentlessly against the glass. Inside, a coffee cup sat cold and forgotten beside a glowing terminal. Someone left in a hurry and never came back.",
                entities: ["Coffee Cup [0.99]", "Monitor [0.98]", "Window Pane [0.92]"]
            };
            setAnalysisResults(mock);
            pushHistory(imageData, mock);
        } else {
            try {
                const result = await runAnalysis(imageData);
                setAnalysisResults(result);
                pushHistory(imageData, result);
            } catch (err) {
                setAnalysisResults({
                    scene: "Error", quality: "Error",
                    story: `Analysis failed: ${err.message}`,
                    entities: []
                });
            }
        }
        setAnalysisLoading(false);
    };

    const pushHistory = (img, result) => {
        setHistory(prev => [{
            id: Date.now(),
            image: img,
            scene: result.scene,
            quality: result.quality,
            entities: result.entities,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        }, ...prev].slice(0, 10));
    };

    const handleReset = () => {
        setStage('upload');
        setCapturedImage(null);
        setAnalysisResults(null);
    };

    return (
        <div className="dashboard-container">
            <nav className="sidebar">
                <div className="brand">
                    <div className="brand-dot"></div>
                    <span className="brand-text">TechMesh'26</span>
                </div>

                <div className="nav-items">
                    <button className={`nav-item ${activeTab === 'live' ? 'active' : ''}`} onClick={() => setActiveTab('live')}>
                        <Camera strokeWidth={1.5} size={20} />
                        <span>Vision Core</span>
                    </button>
                    <button className={`nav-item ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>
                        <History strokeWidth={1.5} size={20} />
                        <span>Archive Analytics</span>
                        {history.length > 0 && <span className="badge">{history.length}</span>}
                    </button>
                    <button className={`nav-item ${activeTab === 'analysis' ? 'active' : ''}`} onClick={() => setActiveTab('analysis')}>
                        <Activity strokeWidth={1.5} size={20} />
                        <span>Delta Comparison</span>
                    </button>
                </div>

                <SidebarHistory history={history} />

                <div className="sidebar-footer">
                    <div className="nav-item" style={{ cursor: 'default' }}>
                        <SlidersHorizontal strokeWidth={1.5} size={20} />
                        <span>{import.meta.env.VITE_NIM_API_KEY ? '⚡ Live Mode' : 'Demo Mode'}</span>
                    </div>
                </div>
            </nav>

            <main className="main-content">
                <header className="topbar">
                    <div className="topbar-left">
                        <h2>Neural Synthesis Engine</h2>
                        <span className="subtitle">Multimodal Image Storytelling</span>
                    </div>
                    <div className="status-indicator">
                        <div className="status-dot"></div>
                        {import.meta.env.VITE_NIM_API_KEY ? 'LIVE — NVIDIA NIM' : 'DEMO MODE'}
                    </div>
                </header>

                <div className="content-area">
                    <div className="main-stage">
                        {activeTab === 'analysis' ? (
                            <ComparativeLens />
                        ) : activeTab === 'history' ? (
                            <ArchiveView history={history} onSelect={(item) => {
                                setCapturedImage(item.image);
                                setAnalysisResults(null);
                                setActiveTab('live');
                                setStage('report');
                                setAnalysisLoading(true);
                                runAnalysis(item.image)
                                    .then(r => { setAnalysisResults(r); setAnalysisLoading(false); })
                                    .catch(err => { setAnalysisResults({ scene: 'Error', quality: 'Error', story: err.message, entities: [] }); setAnalysisLoading(false); });
                            }} />
                        ) : stage === 'upload' ? (
                            <VisionUploader onUpload={handleUpload} />
                        ) : (
                            /* Results ARE cached in parent - AnalysisReport just renders, no re-fetching */
                            <AnalysisReport
                                imageData={capturedImage}
                                results={analysisResults}
                                loading={analysisLoading}
                                onReset={handleReset}
                            />
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}

function ArchiveView({ history, onSelect }) {
    if (history.length === 0) {
        return (
            <motion.div className="glass-panel" style={{ padding: '3rem', textAlign: 'center', width: '100%' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <History size={40} strokeWidth={1} color="var(--text-secondary)" style={{ marginBottom: '16px' }} />
                <h3 style={{ marginBottom: '8px', fontWeight: 400 }}>No analyses yet</h3>
                <p style={{ color: 'var(--text-secondary)' }}>Upload your first image in Vision Core to build the archive.</p>
            </motion.div>
        );
    }

    return (
        <motion.div style={{ width: '100%' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <h3 style={{ fontWeight: 400, marginBottom: '20px', letterSpacing: '-0.02em' }}>Analysis Archive — {history.length} entries</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                {history.map(item => (
                    <div key={item.id} className="glass-panel" style={{ padding: '16px', cursor: 'pointer', transition: 'all 0.2s ease' }}
                        onClick={() => onSelect(item)}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                        {item.image && <img src={item.image} alt={item.scene} style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '6px', marginBottom: '12px' }} />}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <p style={{ fontWeight: 500 }}>{item.scene}</p>
                                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '2px' }}>{item.quality}</p>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.time}</span>
                        </div>
                        <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            {item.entities.slice(0, 3).map((e, i) => (
                                <span key={i} className="tag" style={{ fontSize: '0.75rem' }}>{e}</span>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </motion.div>
    );
}
