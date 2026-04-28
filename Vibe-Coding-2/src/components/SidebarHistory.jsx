import React from 'react';
import './SidebarHistory.css';

export default function SidebarHistory({ history }) {
    if (!history || history.length === 0) return null;

    const recent = history.slice(0, 4);

    return (
        <div className="sidebar-history-container">
            <h4 className="history-title">Recent Logs</h4>
            <div className="history-list">
                {recent.map((item) => (
                    <div key={item.id} className="history-item glass-panel">
                        <div className="history-details">
                            <span className="history-type">{item.scene}</span>
                            <span className="history-time">{item.time}</span>
                        </div>
                        <div className="history-score">
                            <span>{item.entities.length} entities</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
