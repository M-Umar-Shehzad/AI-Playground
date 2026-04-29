import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, Camera, Image as ImageIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import './VisionUploader.css';

export default function VisionUploader({ onUpload }) {
    const [dragActive, setDragActive] = useState(false);
    const [inputMode, setInputMode] = useState('file'); // 'file' or 'webcam'
    const videoRef = useRef(null);
    const fileInputRef = useRef(null);

    // Cleanup webcam on unmount
    useEffect(() => {
        return () => stopWebcam();
    }, []);

    const startWebcam = async () => {
        setInputMode('webcam');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera access denied", err);
            setInputMode('file');
        }
    };

    const stopWebcam = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach(track => track.stop());
        }
    };

    const handleCapture = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
        const dataUrl = canvas.toDataURL("image/jpeg");
        stopWebcam();
        onUpload(dataUrl);
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            processFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileUpload = (e) => {
        if (e.target.files && e.target.files[0]) {
            processFile(e.target.files[0]);
        }
    };

    const processFile = (file) => {
        // Ensure it's an image
        if (!file.type.startsWith('image/')) return;

        const reader = new FileReader();
        reader.onload = (ev) => {
            onUpload(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    return (
        <div className="uploader-wrapper">
            <div className="upload-options">
                <button
                    className={`option-btn ${inputMode === 'file' ? 'active' : ''}`}
                    onClick={() => { stopWebcam(); setInputMode('file'); fileInputRef.current && fileInputRef.current.click(); }}
                >
                    <UploadCloud size={18} />
                    File Upload
                </button>
                <button
                    className={`option-btn ${inputMode === 'webcam' ? 'active' : ''}`}
                    onClick={startWebcam}
                >
                    <Camera size={18} />
                    Live Webcam
                </button>
            </div>

            <motion.div
                className={`dropzone glass-panel ${dragActive ? "drag-active" : ""}`}
                onDragEnter={inputMode === 'file' ? handleDrag : undefined}
                onDragLeave={inputMode === 'file' ? handleDrag : undefined}
                onDragOver={inputMode === 'file' ? handleDrag : undefined}
                onDrop={inputMode === 'file' ? handleDrop : undefined}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                {inputMode === 'file' ? (
                    <div className="dropzone-content">
                        <div className="icon-circle">
                            <ImageIcon size={32} color="var(--text-primary)" />
                        </div>
                        <h4>Drag & Drop Neural Imagery</h4>
                        <p>Supports High-Res JPEG, PNG, WEBP</p>

                        <input
                            type="file"
                            accept="image/*"
                            ref={fileInputRef}
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                        <button className="premium upload-btn" onClick={() => fileInputRef.current.click()}>
                            Browse Files
                        </button>
                    </div>
                ) : (
                    <div className="webcam-container" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            style={{ width: '100%', maxHeight: '300px', borderRadius: '8px', objectFit: 'cover', background: '#000' }}
                        />
                        <button className="premium upload-btn" style={{ marginTop: '16px' }} onClick={handleCapture}>
                            <Camera size={18} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
                            Capture Frame
                        </button>
                    </div>
                )}
            </motion.div>
        </div>
    );
}
