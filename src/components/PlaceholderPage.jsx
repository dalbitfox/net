import React from 'react';

const PlaceholderPage = ({ title, icon }) => {
    return (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
            <div className="text-6xl mb-4 opacity-50 glow-text">🚧</div>
            <h2 className="text-2xl font-bold mb-2">{title}</h2>
            <p className="text-[var(--text-secondary)] max-w-md mx-auto">
                공사중입니다.
            </p>
        </div>
    );
};

export default PlaceholderPage;
