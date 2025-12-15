import React, { useState, useEffect } from 'react';
import Header from './components/Layout/Header';
import Footer from './components/Layout/Footer';
import SubnetCalculator from './components/Calculator/SubnetCalculator';
import CidrCalculator from './components/Calculator/CidrCalculator';
import Ipv6Calculator from './components/Calculator/Ipv6Calculator';
import PlaceholderPage from './components/PlaceholderPage';

function App() {
    const [activePage, setActivePage] = useState('ipv4');
    const [theme, setTheme] = useState('dark');
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        // Initial theme setup
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => prev === 'dark' ? 'light' : 'dark');
    };

    const handleLogoClick = () => {
        setRefreshKey(prev => prev + 1);
    };

    const renderContent = () => {
        switch (activePage) {
            case 'ipv4':
                return <SubnetCalculator />;
            case 'cidr':
                return <CidrCalculator />;
            case 'ipv6':
                return <Ipv6Calculator />;
            case 'trace':
                return <PlaceholderPage title="IP 추적 (GeoLocation)" icon="🌍" />;
            case 'port':
                return <PlaceholderPage title="오픈 포트 스캐너" icon="🔌" />;
            default:
                return <SubnetCalculator />;
        }
    };

    return (
        <>
            <Header
                activePage={activePage}
                setActivePage={setActivePage}
                theme={theme}
                toggleTheme={toggleTheme}
                onLogoClick={handleLogoClick}
            />

            <main className="container mx-auto py-8 flex-grow">
                <div className="fade-in-enter" key={`${activePage}-${refreshKey}`}>
                    {renderContent()}
                </div>
            </main>

            <Footer />
        </>
    );
}

export default App;
