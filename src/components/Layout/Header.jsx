import React, { useState } from 'react';

const Header = ({ activePage, setActivePage, theme, toggleTheme, onLogoClick }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    const menuItems = [
        { id: 'ipv4', label: 'IPv4 서브넷' },
        { id: 'cidr', label: 'IPv4 CIDR' },
        { id: 'ipv6', label: 'IPv6 CIDR' },
        { id: 'trace', label: 'IP 추적' },
        { id: 'port', label: '네트워크 진단' },
        { id: 'contact', label: 'TalkTalk' },
    ];

    const handleLogoClick = () => {
        if (onLogoClick) {
            onLogoClick();
        } else {
            window.location.reload();
        }
    };

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const handleMenuClick = (id) => {
        setActivePage(id);
        setIsMenuOpen(false); // Close menu on click
    };

    return (
        <header>
            <div className="container">
                {/* Top Row: Logo, Theme, Hamburger */}
                <div className="header-top">
                    <div className="logo-section" onClick={handleLogoClick} title="developer June™">
                        <div className="text-container">
                            <span className="app-title" style={{ fontSize: '2.5rem' }}>
                                <span className="logo-initial">N</span>etBox
                            </span>
                            <span className="app-subtitle">네트워크 전문가를 위한 만능도구상자</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleTheme}
                            className="theme-toggle-btn"
                            title="테마 변경"
                        >
                            {theme === 'dark' ? '☀️' : '🌙'}
                        </button>

                        {/* Hamburger Button (Mobile Only) */}
                        <button
                            className="hamburger-btn"
                            onClick={toggleMenu}
                            aria-label="메뉴 열기"
                        >
                            <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
                            <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
                            <div className={`hamburger-line ${isMenuOpen ? 'open' : ''}`}></div>
                        </button>
                    </div>
                </div>

                {/* Navigation Tabs (Responsive) */}
                <nav className={`nav-tabs ${isMenuOpen ? 'show-mobile' : ''}`}>
                    {menuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => handleMenuClick(item.id)}
                            className={`tab-btn ${activePage === item.id ? 'active' : ''}`}
                        >
                            {item.label}
                        </button>
                    ))}
                </nav>
            </div>
        </header>
    );
};

export default Header;
