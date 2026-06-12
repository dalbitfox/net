import React, { useState, useEffect, useRef } from 'react';
import './IpScanner.css';

// SVG Icons defined locally for reliability and visual control
const ComputerIcon = ({ alive }) => (
  <svg className={`device-icon-svg ${alive ? 'alive' : 'dead'}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
    {alive && <circle cx="12" cy="10" r="1.5" fill="var(--accent)" />}
  </svg>
);

const ChevronIcon = ({ expanded }) => (
  <span className={`expand-trigger ${expanded ? 'expanded' : ''}`}>
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  </span>
);

const ServiceIcon = ({ type }) => {
  const props = { className: "service-icon-svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" };
  switch (type) {
    case 'HTTP':
    case 'HTTPS':
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      );
    case 'FTP':
      return (
        <svg {...props}>
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </svg>
      );
    case 'SMB (Shared Folders)':
      return (
        <svg {...props}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'RDP (Remote Desktop)':
    case 'Radmin':
      return (
        <svg {...props}>
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
          <path d="M6 21h12M12 17v4M7 8l3 3 7-7" />
        </svg>
      );
    case 'JetDirect (Printer)':
      return (
        <svg {...props}>
          <polyline points="6 9 6 2 18 2 18 9" />
          <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
          <rect x="6" y="14" width="12" height="8" />
        </svg>
      );
    case 'SSH':
    case 'Telnet':
      return (
        <svg {...props}>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
  }
};

const MOCK_DEVICES = [
  { ip: '192.168.0.1', mac: '00:0e:8f:12:34:56', hostname: 'iptime.router', manufacturer: 'EFM Networks (ipTIME)', status: 'alive', ports: [{ port: 80, service: 'HTTP' }, { port: 443, service: 'HTTPS' }, { port: 139, service: 'NetBIOS' }] },
  { ip: '192.168.0.5', mac: '00:11:22:98:76:54', hostname: 'iPad-Air', manufacturer: 'Apple, Inc.', status: 'alive', ports: [] },
  { ip: '192.168.0.22', mac: 'fc:db:b3:f1:e2:d3', hostname: 'Galaxy-S22', manufacturer: 'Samsung Electronics', status: 'alive', ports: [] },
  { ip: '192.168.0.96', mac: '48:0F:CF:C9:BC:77', hostname: 'NPIC9BC77', manufacturer: 'Hewlett Packard', status: 'alive', ports: [{ port: 9100, service: 'JetDirect (Printer)' }, { port: 80, service: 'HTTP' }] },
  { ip: '192.168.0.97', mac: '00:1B:78:1D:64:6F', hostname: 'NPI1D646F', manufacturer: 'Hewlett Packard', status: 'alive', ports: [{ port: 135, service: 'MS-RPC' }, { port: 445, service: 'SMB (Shared Folders)' }, { port: 3389, service: 'RDP (Remote Desktop)' }] },
  { ip: '192.168.0.102', mac: 'CC:3E:5F:5E:04:FC', hostname: 'HP V1910 Switch', manufacturer: 'Hewlett Packard', status: 'alive', ports: [{ port: 80, service: 'HTTP' }, { port: 22, service: 'SSH' }] },
  { ip: '192.168.0.104', mac: '00:50:FC:C6:03:2B', hostname: 'meeting', manufacturer: 'Edimax Technology Co., Ltd.', status: 'alive', ports: [{ port: 3389, service: 'RDP (Remote Desktop)' }, { port: 4899, service: 'Radmin' }] },
  { ip: '192.168.0.110', mac: '00:1F:D0:2E:3C:C9', hostname: 'PATRICK', manufacturer: 'GIGA-BYTE TECHNOLOGY CO., LTD.', status: 'alive', ports: [{ port: 80, service: 'HTTP' }, { port: 443, service: 'HTTPS' }, { port: 21, service: 'FTP' }, { port: 445, service: 'SMB (Shared Folders)' }, { port: 3389, service: 'RDP (Remote Desktop)' }, { port: 4899, service: 'Radmin' }] }
];

const isPrivateOrLocalIp = (hostname) => {
  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') return true;
  if (hostname.startsWith('192.168.')) return true;
  if (hostname.startsWith('10.')) return true;
  const match = hostname.match(/^172\.(\d+)\./);
  if (match) {
    const secondOctet = parseInt(match[1], 10);
    if (secondOctet >= 16 && secondOctet <= 31) return true;
  }
  return false;
};

const API_BASE = (isPrivateOrLocalIp(window.location.hostname) || window.location.port === '5000') ? '' : 'http://127.0.0.1:5000';

const IpScanner = () => {
  const [ipRange, setIpRange] = useState('192.168.0.1-254');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('results'); // 'results', 'active' or 'favorites'
  const [viewMode, setViewMode] = useState('gui'); // 'gui' (default) or 'detail'
  const [isSimulation, setIsSimulation] = useState(false);
  const [loopSimType, setLoopSimType] = useState('off'); // 'off', 'physical', 'terminal'
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Result lists
  const [devices, setDevices] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [expandedDevices, setExpandedDevices] = useState({});
  const [selectedIp, setSelectedIp] = useState(null);
  
  // Connection and auto-detect state
  const [localInfo, setLocalInfo] = useState(null);
  const [backendError, setBackendError] = useState(null);
  const [customAgentIp, setCustomAgentIp] = useState(() => localStorage.getItem('custom_agent_ip') || '');
  const [apiBase, setApiBase] = useState(() => {
    const saved = localStorage.getItem('custom_agent_ip');
    return saved ? `http://${saved}:5000` : API_BASE;
  });
  const [isBackendConnected, setIsBackendConnected] = useState(() => {
    return !!localStorage.getItem('custom_agent_ip');
  });
  const [showDemo, setShowDemo] = useState(false);
  const [ipInput, setIpInput] = useState(customAgentIp);

  const handleConnectAgent = (e) => {
    e.preventDefault();
    if (ipInput.trim()) {
      localStorage.setItem('custom_agent_ip', ipInput.trim());
      setCustomAgentIp(ipInput.trim());
      setApiBase(`http://${ipInput.trim()}:5000`);
      setIsBackendConnected(true);
      window.location.reload();
    } else {
      localStorage.removeItem('custom_agent_ip');
      setCustomAgentIp('');
      setApiBase(API_BASE);
      setIsBackendConnected(false);
      window.location.reload();
    }
  };

  // Monitor & Traffic Stats State
  const [monitorData, setMonitorData] = useState(null);
  const [trafficHistory, setTrafficHistory] = useState([]);

  const isScanningRef = useRef(false);
  const isPausedRef = useRef(false);

  useEffect(() => { isScanningRef.current = isScanning; }, [isScanning]);
  useEffect(() => { isPausedRef.current = isPaused; }, [isPaused]);

  // References for timers
  const scanIntervalRef = useRef(null);
  const fakeProgressTimerRef = useRef(null);
  const loopTimeoutRef = useRef(null);

  const formatSpeed = (kbps) => {
    if (kbps >= 1024) {
      return `${(kbps / 1024).toFixed(1)} MB/s`;
    }
    return `${kbps.toFixed(1)} KB/s`;
  };

  // WebRTC local IP auto-detect function
  const detectWebRtcIp = () => {
    return new Promise((resolve) => {
      try {
        const RTCPeerConnection = window.RTCPeerConnection || window.webkitRTCPeerConnection || window.mozRTCPeerConnection;
        if (!RTCPeerConnection) {
          resolve(null);
          return;
        }
        const pc = new RTCPeerConnection({ iceServers: [] });
        pc.createDataChannel('');
        pc.createOffer()
          .then(offer => pc.setLocalDescription(offer))
          .catch(() => resolve(null));
        
        const gatheredIps = [];
        let resolved = false;
        
        const finishGathering = () => {
          if (resolved) return;
          resolved = true;
          
          if (gatheredIps.length === 0) {
            resolve(null);
            return;
          }
          
          // Filter out APIPA (169.254.x.x)
          const nonApipa = gatheredIps.filter(ip => !ip.startsWith('169.254.'));
          if (nonApipa.length > 0) {
            // Prefer standard RFC 1918 private IPs
            const standardPrivate = nonApipa.filter(ip => {
              const parts = ip.split('.').map(Number);
              return (
                parts[0] === 10 ||
                (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
                (parts[0] === 192 && parts[1] === 168)
              );
            });
            if (standardPrivate.length > 0) {
              resolve(standardPrivate[0]);
            } else {
              resolve(nonApipa[0]); // e.g. 172.0.0.2
            }
          } else {
            resolve(gatheredIps[0]); // Fallback to APIPA if nothing else
          }
          try { pc.close(); } catch(_) {}
        };

        pc.onicecandidate = (ice) => {
          if (ice && ice.candidate && ice.candidate.candidate) {
            const candidate = ice.candidate.candidate;
            const ipRegex = /([0-9]{1,3}(\.[0-9]{1,3}){3})/;
            const match = ipRegex.exec(candidate);
            if (match) {
              const ip = match[1];
              if (ip !== '127.0.0.1' && !ip.startsWith('0.') && !gatheredIps.includes(ip)) {
                gatheredIps.push(ip);
              }
            }
          } else if (!ice || !ice.candidate) {
            finishGathering();
          }
        };
        
        // Timeout backup in case ICE gathering doesn't fire empty candidate
        setTimeout(() => {
          finishGathering();
        }, 1000);
      } catch (e) {
        resolve(null);
      }
    });
  };  const detectLocalRange = async () => {
    let connected = false;
    let detectedIp = null;
    let gatewayIp = null;
    let defaultRange = '192.168.0.1-254';

    // 1. Try local or custom configured backend first
    const activeApi = localStorage.getItem('custom_agent_ip') ? `http://${localStorage.getItem('custom_agent_ip')}:5000` : API_BASE;
    try {
      const response = await fetch(`${activeApi}/api/scan_lan/local`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setLocalInfo({
            ...data,
            isPlaceholder: false
          });
          setIpRange(data.default_range);
          setBackendError(null);
          setIsSimulation(false);
          setApiBase(activeApi);
          setIsBackendConnected(true);
          connected = true;
          return;
        }
      }
    } catch (err) {
      console.warn("Target backend scanning API not available, trying WebRTC fallback...", err);
    }

    // If local backend is not available, we are in "Landing Page Mode" unless user overrides with Demo
    const hasCustom = !!localStorage.getItem('custom_agent_ip');
    setIsBackendConnected(hasCustom); // Keep connection state true if we explicitly set it
    if (!hasCustom) {
      setApiBase('');
    }

    // 2. Still detect their local IP to show on the landing page for user awareness
    const webRtcIp = await detectWebRtcIp();
    if (webRtcIp) {
      detectedIp = webRtcIp;
      const parts = webRtcIp.split('.');
      gatewayIp = `${parts[0]}.${parts[1]}.${parts[2]}.1`;
      defaultRange = `${parts[0]}.${parts[1]}.${parts[2]}.1-254`;
    } else {
      // 3. Fallback to client-info endpoint (Vercel public IP fallback)
      try {
        const response = await fetch('/api/client-info');
        if (response.ok) {
          const data = await response.json();
          if (data.ip) {
            detectedIp = data.ip;
            const parts = detectedIp.split('.');
            gatewayIp = `${parts[0]}.${parts[1]}.${parts[2]}.1`;
            defaultRange = `${parts[0]}.${parts[1]}.${parts[2]}.1-254`;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch client info from server:", err);
      }
    }

    if (!detectedIp) {
      detectedIp = '192.168.0.100';
      gatewayIp = '192.168.0.1';
      defaultRange = '192.168.0.1-254';
    }

    setLocalInfo({
      success: true,
      local_ip: detectedIp,
      gateway_ip: gatewayIp,
      default_range: defaultRange,
      isPlaceholder: true
    });
    setIpRange(defaultRange);
    setBackendError("로컬 에이전트(netbox.exe)가 실행되지 않았습니다.");
  };


  useEffect(() => {
    detectLocalRange();

    // Clean up timers on unmount
    return () => {
      stopAllTimers();
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 'monitor' || isScanning) {
      return;
    }

    const fetchMonitorData = async () => {
      if (isSimulation) {
        // Generate mock monitor data in simulation mode!
        const localIp = localInfo?.local_ip || '192.168.0.100';
        const gatewayIp = localInfo?.gateway_ip || '192.168.0.1';
        
        let gatewayRtt = Math.floor(Math.random() * 5) + 2; // 2-7ms
        let speedRx = Math.random() * 145 + 5;
        let speedTx = Math.random() * 29 + 1;
        let ppsRx = Math.floor(Math.random() * 180) + 20;
        let ppsTx = Math.floor(Math.random() * 90) + 10;
        let ppsBroadcast = Math.random() * 11.5 + 0.5;
        let loopingDetected = false;
        let loopingReason = "네트워크 루핑 징후가 없습니다.";
        let loopTypeResp = 'none';
        
        if (loopSimType !== 'off') {
          gatewayRtt = 142;
          speedRx = 12450.0;
          speedTx = 6520.0;
          ppsRx = 3450;
          ppsTx = 2100;
          ppsBroadcast = 2650;
          loopingDetected = true;
          loopTypeResp = loopSimType;
          if (loopSimType === 'terminal') {
            loopingReason = `단말 장애 루프 감지: ${gatewayIp.replace(/\.1$/, '.125')} 단말에서 초당 2650 pps의 비정상 브로드캐스트가 유출되고 있습니다.`;
          } else {
            loopingReason = "물리적 루프 발생: 네트워크 장비 간 이중 연결로 인한 초당 2650 pps의 패킷 순환 장애가 감지되었습니다.";
          }
        }
        
        const mockData = {
          success: true,
          local_ip: localIp,
          gateway_ip: gatewayIp,
          gateway_rtt: gatewayRtt,
          arp_spoofing: {
            detected: loopSimType === 'terminal',
            details: loopSimType === 'terminal' ? [{
              mac: '78:f2:38:80:6a:fe',
              ips: [gatewayIp, gatewayIp.replace(/\.1$/, '.125')],
              gateway_involved: true,
              manufacturer: 'Samsung Electronics Co.,Ltd'
            }] : [],
            status: loopSimType === 'terminal' ? 'critical' : 'healthy'
          },
          looping: {
            detected: loopingDetected,
            loop_type: loopTypeResp,
            culprit_ip: loopSimType === 'terminal' ? gatewayIp.replace(/\.1$/, '.125') : null,
            culprit_mac: loopSimType === 'terminal' ? '78:f2:38:80:6a:fe' : null,
            culprit_manufacturer: loopSimType === 'terminal' ? 'Samsung Electronics Co.,Ltd' : null,
            reason: loopingReason,
            status: loopingDetected ? 'warning' : 'healthy',
            pps_broadcast: Math.floor(ppsBroadcast)
          },
          traffic: {
            speed_rx_kbps: speedRx,
            speed_tx_kbps: speedTx,
            pps_rx: ppsRx,
            pps_tx: ppsTx,
            pps_broadcast: Math.floor(ppsBroadcast),
            abnormal: loopSimType !== 'off',
            culprit_ip: loopSimType === 'terminal' ? gatewayIp.replace(/\.1$/, '.125') : null,
            culprit_mac: loopSimType === 'terminal' ? '78:f2:38:80:6a:fe' : null,
            culprit_manufacturer: loopSimType === 'terminal' ? 'Samsung Electronics Co.,Ltd' : null,
            reason: loopSimType !== 'off' ? '이상 과다 트래픽 감지' : '정상 수준의 대역폭 사용 중',
            status: loopSimType !== 'off' ? 'warning' : 'healthy'
          }
        };
        
        setMonitorData(mockData);
        if (activeTab === 'monitor') {
          setTrafficHistory(prev => {
            const next = [...prev, {
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
              rx: speedRx,
              tx: speedTx
            }];
            if (next.length > 30) {
              return next.slice(next.length - 30);
            }
            return next;
          });
        }
        return;
      }
      
      try {
        let path = '/api/network_monitor';
        if (loopSimType !== 'off') {
          path = `/api/network_monitor?simulate_loop=true&loop_type=${loopSimType}`;
        }
        const response = await fetch(`${apiBase}${path}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setMonitorData(data);
            
            // Add to traffic history for SVG graph (keep last 30 points) only if monitor tab is active
            if (activeTab === 'monitor') {
              setTrafficHistory(prev => {
                const next = [...prev, {
                  time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                  rx: data.traffic.speed_rx_kbps,
                  tx: data.traffic.speed_tx_kbps
                }];
                if (next.length > 30) {
                  return next.slice(next.length - 30);
                }
                return next;
              });
            }
          }
        }
      } catch (err) {
        console.error("Failed to fetch monitor data:", err);
      }
    };

    fetchMonitorData();
    const interval = setInterval(fetchMonitorData, 3000);
    return () => clearInterval(interval);
  }, [activeTab, loopSimType, isScanning, isSimulation, localInfo]);

  const stopAllTimers = () => {
    if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
    if (fakeProgressTimerRef.current) clearInterval(fakeProgressTimerRef.current);
  };

  // Run the scanning logic
  const handleStartScan = async () => {
    if (isScanningRef.current && !isPausedRef.current) return;

    if (isPausedRef.current) {
      setIsPaused(false);
      return;
    }

    // Initialize scan state
    setIsScanning(true);
    setIsPaused(false);
    setProgress(0);
    setDevices([]);
    setExpandedDevices({});

    const isLocalBackendAvailable = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || apiBase !== '');

    if (isSimulation) {
      runSimulationScan();
    } else if (!isLocalBackendAvailable) {
      // Remote Vercel scan without local agent: run the direct browser scan!
      runBrowserDirectScan();
    } else {
      // Running locally or connected to local agent: run the real ARP scan!
      runRealScan();
    }
  };

  // Simulate scanning offline/demo mode
  const runSimulationScan = () => {
    const rangeParts = parseIpRangeHelper(ipRange);
    const totalIps = rangeParts.length;
    let index = 0;
    const tempDevices = rangeParts.map(ip => ({
      ip,
      mac: '-',
      hostname: 'N/A',
      manufacturer: '-',
      status: 'pending',
      ports: []
    }));

    setDevices(tempDevices);

    const step = 4; // scan 4 IPs per tick
    scanIntervalRef.current = setInterval(() => {
      index += step;
      const pct = Math.min(Math.round((index / totalIps) * 100), 100);
      setProgress(pct);

      setDevices(prev => {
        const updated = [...prev];
        for (let i = index - step; i < index && i < totalIps; i++) {
          const targetIp = updated[i].ip;
          const targetParts = targetIp.split('.');
          const targetHostSuffix = targetParts[3];
          
          const mockMatch = MOCK_DEVICES.find(d => {
            const mockParts = d.ip.split('.');
            return mockParts[3] === targetHostSuffix;
          });
          
          if (mockMatch) {
            updated[i] = { ...mockMatch, ip: targetIp };
          } else {
            updated[i] = { ...updated[i], status: 'dead' };
          }
        }
        return updated;
      });

      if (index >= totalIps) {
        stopAllTimers();
        setIsScanning(false);
        setProgress(100);
      }
    }, 45); // ~3 seconds total for 254 IPs
  };

  // Helper to parse IP ranges (Frontend fallback parser)
  const parseIpRangeHelper = (rangeStr) => {
    try {
      if (rangeStr.includes('-')) {
        const parts = rangeStr.split('-');
        if (parts.length === 2) {
          const startIp = parts[0].trim();
          const endPart = parts[1].trim();
          const baseParts = startIp.split('.');
          
          if (baseParts.length === 4) {
            const startNum = parseInt(baseParts[3]);
            let endNum = parseInt(endPart);
            if (isNaN(endNum)) {
              const endIpParts = endPart.split('.');
              if (endIpParts.length === 4) {
                endNum = parseInt(endIpParts[3]);
              }
            }
            if (!isNaN(startNum) && !isNaN(endNum)) {
              const ips = [];
              const min = Math.min(startNum, endNum);
              const max = Math.max(startNum, endNum);
              // limit to 256 for safety
              const rangeLimit = Math.min(max - min, 255);
              for (let i = 0; i <= rangeLimit; i++) {
                ips.push(`${baseParts[0]}.${baseParts[1]}.${baseParts[2]}.${min + i}`);
              }
              return ips;
            }
          }
        }
      }
      return [rangeStr];
    } catch {
      return [rangeStr];
    }
  };

  // Pure browser-side Direct LAN scanning (No-installation fallback for mobile/web)
  const runBrowserDirectScan = async () => {
    const rangeParts = parseIpRangeHelper(ipRange);
    const totalIps = rangeParts.length;
    let completedCount = 0;
    
    // Set all to pending
    const initialDevices = rangeParts.map(ip => ({
      ip,
      mac: '-',
      hostname: 'N/A',
      manufacturer: '-',
      status: 'pending',
      ports: []
    }));
    setDevices(initialDevices);
    setProgress(0);

    // Scan in batches to avoid overwhelming browser socket pools
    const batchSize = 15;
    
    const probeIp = async (ip) => {
      // Common web ports to check for TCP handshake response
      const portsToTry = [80, 443, 8080];
      let isAlive = false;
      let openPorts = [];

      for (const port of portsToTry) {
        if (!isScanningRef.current || isPausedRef.current) break;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 800); // 800ms threshold for speed

        const startTime = performance.now();
        try {
          // Send request with no-cors to avoid CORS preflight block
          await fetch(`http://${ip}:${port}`, { 
            mode: 'no-cors', 
            signal: controller.signal,
            credentials: 'omit'
          });
          isAlive = true;
          openPorts.push({ port, service: port === 443 ? 'HTTPS' : port === 80 ? 'HTTP' : 'HTTP-Alt' });
          clearTimeout(timeoutId);
          break; 
        } catch (err) {
          clearTimeout(timeoutId);
          const duration = performance.now() - startTime;
          // Key detection logic:
          // If the host is dead, it will TIME OUT (takes >= 750ms).
          // If the host is alive, the TCP connection is refused or returns CORS error IMMEDIATELY (typically < 300ms).
          if (err.name !== 'AbortError' && duration < 500) {
            isAlive = true;
            openPorts.push({ port, service: port === 443 ? 'HTTPS' : port === 80 ? 'HTTP' : 'HTTP-Alt' });
            break;
          }
        }
      }

      completedCount++;
      const progressPct = Math.min(Math.round((completedCount / totalIps) * 100), 100);
      setProgress(progressPct);

      const deviceResult = isAlive ? {
        ip,
        mac: '-', 
        hostname: ip === localInfo?.local_ip ? '내 스마트폰/PC' : '네트워크 장치',
        manufacturer: '-',
        status: 'alive',
        ports: openPorts
      } : {
        ip,
        mac: '-',
        hostname: 'N/A',
        manufacturer: '-',
        status: 'dead',
        ports: []
      };

      setDevices(prev => {
        const idx = prev.findIndex(d => d.ip === ip);
        if (idx !== -1) {
          const updated = [...prev];
          updated[idx] = deviceResult;
          return updated;
        }
        return prev;
      });
    };

    // Run batch execution sequentially
    for (let i = 0; i < totalIps; i += batchSize) {
      if (!isScanningRef.current) break;
      const batch = rangeParts.slice(i, i + batchSize);
      await Promise.all(batch.map(ip => probeIp(ip)));
    }

    setIsScanning(false);
    setProgress(100);
  };

  // Real backend scan execution
  const runRealScan = async () => {
    // Populate with pending state first so the grid displays immediately!
    const rangeParts = parseIpRangeHelper(ipRange);
    const initialDevices = rangeParts.map(ip => ({
      ip,
      mac: '-',
      hostname: 'N/A',
      manufacturer: '-',
      status: 'pending',
      ports: []
    }));
    setDevices(initialDevices);
    setProgress(0);

    try {
      const response = await fetch(`${apiBase}/api/scan_lan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip_range: ipRange })
      });
      
      if (!response.ok) {
        throw new Error("HTTP error " + response.status);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last partial line in buffer

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const data = JSON.parse(line);
            if (data.type === 'progress') {
              setProgress(data.progress);
              if (data.device) {
                // Update the scanned device's details immediately to light up green or orange!
                setDevices(prev => {
                  const idx = prev.findIndex(d => d.ip === data.device.ip);
                  if (idx !== -1) {
                    const updated = [...prev];
                    updated[idx] = data.device;
                    return updated;
                  }
                  return prev;
                });
              }
            } else if (data.type === 'complete') {
              setDevices(data.devices);
              setProgress(100);
            }
          } catch (e) {
            console.error("Error parsing NDJSON line:", e, line);
          }
        }
      }
      
      // Process remaining buffer
      if (buffer.trim()) {
        try {
          const data = JSON.parse(buffer);
          if (data.type === 'complete') {
            setDevices(data.devices);
          }
        } catch {}
      }
      setProgress(100);
    } catch (err) {
      console.error("Backend scan failed:", err);
      alert("백엔드와 통신에 실패했습니다. 시뮬레이션 모드로 스캔해보세요.");
      setIsSimulation(true);
      setBackendError("로컬 백엔드 서버와 통신할 수 없습니다.");
    } finally {
      setIsScanning(false);
    }
  };

  const handlePauseScan = () => {
    if (!isScanning) return;
    if (isPaused) {
      setIsPaused(false);
      if (isSimulation) {
        // Resume simulation
        runSimulationScan();
      } else {
        // Real scan can't be paused easily, but UI shows active
      }
    } else {
      setIsPaused(true);
      if (isSimulation) {
        if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      }
    }
  };

  const handleStopScan = () => {
    stopAllTimers();
    if (loopTimeoutRef.current) clearTimeout(loopTimeoutRef.current);
    setIsScanning(false);
    setIsPaused(false);
    setProgress(0);
    setDevices([]);
  };

  // Expand / Collapse service tree
  const toggleDeviceExpanded = (ip) => {
    setExpandedDevices(prev => ({
      ...prev,
      [ip]: !prev[ip]
    }));
  };

  const handleToggleFavorite = (device, e) => {
    e.stopPropagation();
    const isFav = favorites.some(f => f.ip === device.ip);
    if (isFav) {
      setFavorites(prev => prev.filter(f => f.ip !== device.ip));
    } else {
      setFavorites(prev => [...prev, device]);
    }
  };

  // Filter lists based on search bar
  const getFilteredDevices = (list) => {
    if (!searchQuery) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(d => 
      d.ip.includes(query) ||
      (d.hostname && d.hostname.toLowerCase().includes(query)) ||
      (d.manufacturer && d.manufacturer.toLowerCase().includes(query)) ||
      (d.mac && d.mac.toLowerCase().includes(query))
    );
  };

  const activeDevices = devices.filter(d => d.status === 'alive');
  const filteredResults = getFilteredDevices(devices);
  const filteredActive = getFilteredDevices(activeDevices);
  const filteredFavorites = getFilteredDevices(favorites);

  const aliveCount = activeDevices.length;
  const deadCount = devices.filter(d => d.status === 'dead').length;

  // Find duplicated MAC addresses in scanned devices to detect ARP spoofing endpoints
  const getSpoofedIps = () => {
    const spoofed = new Set();
    const macMap = {};
    
    // 1. Check current scan results
    devices.forEach(d => {
      if (d.status === 'alive' && d.mac && d.mac !== '-' && d.mac !== '00:00:00:00:00:00') {
        const macClean = d.mac.toLowerCase().trim();
        if (!macMap[macClean]) {
          macMap[macClean] = [];
        }
        macMap[macClean].push(d.ip);
      }
    });
    
    // 2. Merge with real-time monitor data if available
    if (monitorData && monitorData.arp_spoofing && monitorData.arp_spoofing.details) {
      monitorData.arp_spoofing.details.forEach(detail => {
        const macClean = detail.mac.toLowerCase().trim();
        if (!macMap[macClean]) {
          macMap[macClean] = [];
        }
        detail.ips.forEach(ip => {
          if (!macMap[macClean].includes(ip)) {
            macMap[macClean].push(ip);
          }
        });
      });
    }

    for (const mac in macMap) {
      if (macMap[mac].length >= 2) {
        macMap[mac].forEach(ip => spoofed.add(ip));
      }
    }
    return spoofed;
  };

  const spoofedIps = getSpoofedIps();

  const isMatched = (device) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      device.ip.includes(query) ||
      (device.hostname && device.hostname.toLowerCase().includes(query)) ||
      (device.manufacturer && device.manufacturer.toLowerCase().includes(query)) ||
      (device.mac && device.mac.toLowerCase().includes(query))
    );
  };

  const getIpDisplayLabel = (ip) => {
    const parts = ip.split('.');
    if (parts.length === 4) {
      return parts[3];
    }
    return ip;
  };

  const isLocal = isBackendConnected || showDemo;

  if (!isLocal) {
    const hasValidLocalIp = localInfo && localInfo.local_ip && isPrivateOrLocalIp(localInfo.local_ip);
    const localUrl = hasValidLocalIp
      ? `http://${localInfo.local_ip}:5000`
      : null;
    const qrCodeUrl = localUrl
      ? `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(localUrl)}`
      : null;

    return (
      <div className="ipscanner-container animate-fade-in" style={{ padding: '1.5rem', maxWidth: '1000px', margin: '0 auto' }}>
        <div className="trendy-glass-card" style={{ padding: '2.5rem 2rem' }}>
          {/* Header Status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
            <span style={{ fontWeight: '800', color: 'var(--text-primary)', fontSize: '1.1rem', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              📡 NetBox <span style={{ color: 'var(--accent)', fontWeight: '400', fontSize: '0.85rem' }}>| Network Scanner</span>
            </span>
            <div className="pulse-badge-offline">
              <span></span> 로컬 에이전트 연결 대기 중
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '2.5rem' }}>
            
            {/* Left Column: Connection & Installation Center */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: 'var(--text-primary)', margin: '0 0 0.5rem 0', letterSpacing: '-0.5px' }}>
                  로컬 네트워크 진단 & 스캐너
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', lineHeight: '1.5', margin: 0 }}>
                  브라우저의 보안 통제(Private Network Access 제한)로 인해 외부 서버에서는 사설망 스캔이 제한됩니다. 로컬 에이전트를 연동해 기기와 제조사를 완벽하게 식별해 보세요.
                </p>
              </div>

              {/* Action 1: PC Download */}
              <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>💻</span>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>1. PC 에이전트 기동</h3>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                  아래의 단일 실행 파일을 다운로드하여 실행하면, 자동으로 브라우저와 연동되어 사설 IP 대역 스캔이 활성화됩니다.
                </p>
                <a href="/netbox.exe" download className="trendy-btn" style={{ width: '100%', boxSizing: 'border-box', marginTop: '0.25rem' }}>
                  📥 PC용 포터블 파일 다운로드 (.exe)
                </a>
              </div>

              {/* Action 2: Mobile Install (PWA) */}
              {/* Action 2: Mobile Install (PWA & APK) */}
              <div style={{ padding: '1.25rem', background: 'rgba(255,255,255,0.015)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1.1rem' }}>📱</span>
                  <h3 style={{ margin: 0, fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-primary)' }}>2. 모바일 설치 앱 (Android / iOS)</h3>
                </div>
                
                {/* APK Download for Android */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a href="/netbox.apk" download className="trendy-btn-secondary" style={{ flex: 1, textAlign: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--accent)', borderColor: 'rgba(0, 191, 255, 0.25)' }}>
                    🤖 Android용 앱(.apk) 다운로드
                  </a>
                </div>

                {localUrl ? (
                  <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                    <div style={{ padding: '6px', background: '#fff', borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img src={qrCodeUrl} alt="Mobile connection QR" style={{ width: '90px', height: '90px', display: 'block' }} />
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      <div style={{ color: 'var(--accent)', fontWeight: '700', marginBottom: '2px' }}>✓ 모바일 와이파이 연결용 QR</div>
                      카메라로 스캔해 접속한 뒤 <strong>'홈 화면에 추가(앱 설치)'</strong>를 누르면 안드로이드 및 아이폰 바탕화면에 즉시 설치되어 스캔이 정상 작동합니다.
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem', borderTop: '1px solid rgba(255,255,255,0.04)', paddingTop: '0.75rem' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      <strong>아이폰(iOS) 및 PWA 설치:</strong> PC 에이전트를 먼저 기동하거나 수동 IP를 연결하면 이곳에 Wi-Fi 연동용 QR 코드가 활성화됩니다.
                    </p>
                  </div>
                )}
              </div>

              {/* Action 3: Remote IP manual connection */}
              <form onSubmit={handleConnectAgent} style={{ padding: '1rem 1.25rem', background: 'rgba(0,191,255,0.02)', border: '1px dashed rgba(0, 191, 255, 0.15)', borderRadius: '10px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '1rem' }}>🔗</span>
                  <h3 style={{ margin: 0, fontSize: '0.85rem', fontWeight: '700', color: 'var(--text-primary)' }}>수동 에이전트 IP 연결 (모바일 / 타기기 전용)</h3>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    placeholder="예: 192.168.0.5"
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    style={{
                      flex: 1,
                      background: 'rgba(0,0,0,0.3)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '4px',
                      padding: '0.4rem 0.6rem',
                      color: 'var(--text-primary)',
                      fontSize: '0.8rem',
                      fontFamily: 'monospace'
                    }}
                  />
                  <button type="submit" className="trendy-btn-secondary" style={{ padding: '0.4rem 1rem', fontSize: '0.8rem' }}>
                    연결 설정
                  </button>
                </div>
                {customAgentIp && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--accent)' }}>
                    현재 설정된 수동 IP: <strong>{customAgentIp}</strong>
                  </div>
                )}
              </form>
            </div>

            {/* Right Column: High-fidelity Live Dashboard Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div className="mock-radar-container">
                <div className="radar-sweep-line" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', position: 'relative', zIndex: 3 }}>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: '600' }}>스캐너 미리보기 (GUI)</span>
                  <span className="pulse-badge-live" style={{ fontSize: '0.65rem' }}><span />실시간 탐색 중</span>
                </div>
                <div className="mock-radar-grid">
                  {Array.from({ length: 36 }).map((_, i) => {
                    let cellClass = "mock-cell";
                    if (i === 4 || i === 12 || i === 29) cellClass += " active-green";
                    if (i === 18 || i === 23) cellClass += " active-orange";
                    return <div key={i} className={cellClass} />;
                  })}
                </div>
              </div>

              {/* Discovered devices mini list */}
              <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  감지된 단말 리스트 예시
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>192.168.0.1</span>
                  <span style={{ color: 'var(--text-secondary)' }}>iptime.router</span>
                  <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>EFM Networks</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', borderBottom: '1px solid rgba(255,255,255,0.04)', paddingBottom: '0.25rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>192.168.0.22</span>
                  <span style={{ color: 'var(--text-secondary)' }}>Galaxy-S22</span>
                  <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>Samsung</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                  <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>192.168.0.5</span>
                  <span style={{ color: 'var(--text-secondary)' }}>iPad-Air</span>
                  <span style={{ color: 'var(--accent)', fontSize: '0.7rem' }}>Apple, Inc.</span>
                </div>
              </div>

              {/* Demo button inside preview */}
              <div style={{ textAlign: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <button
                  onClick={() => {
                    setShowDemo(true);
                    setIsSimulation(true);
                    setBackendError("체험용 시뮬레이션 데모 모드입니다. 실제 네트워크 검사를 하려면 netbox.exe를 실행하십시오.");
                  }}
                  className="trendy-btn-secondary"
                  style={{ width: '100%', justifyContent: 'center', padding: '0.6rem' }}
                >
                  ⚡ 가상 체험용 데모 시뮬레이션 실행
                </button>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.5rem', lineHeight: '1.3' }}>
                  에이전트 구동 없이 인터페이스 및 ARP 스푸핑 진단 작동 방식을 즉시 테스트해볼 수 있습니다.
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ipscanner-container">
      {/* Banner indicating simulation mode fallback */}
      {(isSimulation || backendError) && (
        <div className="simulation-banner">
          <div className="simulation-banner-title">
            ⚠️ <span>{backendError || "시뮬레이션 데모 모드가 켜져 있습니다 (로컬 백엔드 미동작)"}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && (
              <a 
                href="/netbox.exe" 
                download 
                className="btn-simulation-toggle"
                style={{ 
                  textDecoration: 'none', 
                  backgroundColor: 'var(--accent)', 
                  color: '#000', 
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                📥 PC용 포터블 에이전트 다운로드
              </a>
            )}
            <button 
              className="btn-simulation-toggle"
              onClick={() => {
                if (isSimulation || backendError) {
                  detectLocalRange();
                } else {
                  setIsSimulation(true);
                  setBackendError("시뮬레이션 데모 모드가 활성화되었습니다.");
                }
              }}
            >
              {(isSimulation || backendError) ? "로컬 백엔드 연결 시도" : "시뮬레이션 모드 전환"}
            </button>
          </div>
        </div>
      )}

      {/* Main Window Frame Emulation */}
      <div className="window-frame">
        {/* Windows style Toolbar */}
        <div className="window-toolbar">
          {/* Action buttons group */}
          <div className="toolbar-actions">
            {isScanning ? (
              <button 
                className="btn-scan scanning"
                onClick={handleStopScan}
              >
                <span className="scan-icon-stop" />
                스캔 중지
              </button>
            ) : (
              <button 
                className="btn-scan"
                onClick={handleStartScan}
              >
                <span className="scan-icon-play" />
                스캔
              </button>
            )}
          </div>

          {/* IP range settings */}
          <div className="range-input-container">
            <span className="input-label" style={{ whiteSpace: 'nowrap', fontSize: '0.85rem' }}>IP 범위:</span>
            <input 
              type="text" 
              className="ip-range-field"
              value={ipRange} 
              onChange={(e) => setIpRange(e.target.value)} 
              placeholder="예: 192.168.0.1-254"
              disabled={isScanning}
            />
          </div>
          <span className="range-tooltip">
            {localInfo ? `(내 IP: ${localInfo.local_ip}${localInfo.isPlaceholder ? ' (가상)' : ''})` : "IP를 입력해주세요"}
          </span>
        </div>

        {/* Tabs for Results vs Active Devices vs Favorites */}
        <div className="window-tabs-container">
          <div className="window-tabs">
            <button 
              className={`win-tab-btn ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              결과 {devices.length > 0 ? `(${aliveCount}/${devices.length})` : ''}
            </button>
            <button 
              className={`win-tab-btn ${activeTab === 'active' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('active');
                setSelectedIp(null);
              }}
            >
              활성장치 ({aliveCount})
            </button>
            <button 
              className={`win-tab-btn ${activeTab === 'favorites' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('favorites');
                setSelectedIp(null);
              }}
            >
              즐겨찾기 ({favorites.length})
            </button>
          </div>
          
          <div className="view-toggle-group">
            <button 
              className={`view-toggle-btn ${(viewMode === 'gui' && activeTab !== 'monitor') ? 'active' : ''}`}
              onClick={() => {
                setViewMode('gui');
                if (activeTab === 'monitor') {
                  setActiveTab('results');
                }
              }}
              title="GUI 바둑판 형태의 요약 보기"
            >
              GUI 뷰
            </button>
            <button 
              className={`view-toggle-btn ${(viewMode === 'detail' && activeTab !== 'monitor') ? 'active' : ''}`}
              onClick={() => {
                setViewMode('detail');
                if (activeTab === 'monitor') {
                  setActiveTab('results');
                }
              }}
              title="자세한 정보 목록 보기"
            >
              자세히 스캔
            </button>
            <button 
              className={`view-toggle-btn ${activeTab === 'monitor' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('monitor');
                setSelectedIp(null);
              }}
              title="네트워크 모니터링"
            >
              네트워크 모니터링
            </button>
          </div>
        </div>

        {/* Main Grid or Table Container */}
        <div className="results-table-container">
          {activeTab !== 'monitor' && monitorData?.looping?.detected && (
            <div className="network-loop-alert-banner">
              <div className="alert-banner-header">
                <span className="loop-alert-badge">🚨 내부 네트워크 루핑(Looping) 감지 경보</span>
                <span className="loop-alert-pps">임계치 초과: {monitorData.traffic.pps_broadcast} pps</span>
              </div>
              <div className="alert-banner-body">
                <p className="loop-alert-reason"><strong>[장애 상황]</strong> {monitorData.looping.reason} (게이트웨이 RTT 지연: {monitorData.gateway_rtt !== null ? `${monitorData.gateway_rtt}ms` : '응답 대기'})</p>
                <div className="loop-alert-action">
                  <strong>⚠️ 즉시 조치 요망:</strong> 초당 브로드캐스트 패킷 임계치 초과 및 게이트웨이 Ping Latency 응답 지연(80ms 초과) 대조를 통해 프레임 루프 순환 장애가 발생한 것으로 판단됩니다. 이중 연결된 LAN 케이블을 즉시 분리하거나 허브 포트를 격리하십시오.
                </div>
              </div>
            </div>
          )}

          {activeTab === 'results' && devices.length > 0 && (
            <div className="tab-summary-bar">
              <span className="summary-item">
                <span className="summary-dot orange"></span>
                활성 장치: <strong className="alive-text">{aliveCount} 개</strong>
              </span>
              <span className="summary-item">
                <span className="summary-dot green"></span>
                비활성 (사용 가능): <strong className="dead-text">{deadCount} 개</strong>
              </span>
              <span className="summary-item">
                <span className="summary-dot gray"></span>
                전체 스캔 대상: <strong>{devices.length} 개</strong>
              </span>
              {searchQuery && (
                <span className="summary-item">
                  검색 필터링: <strong>{filteredResults.length} 개</strong>
                </span>
              )}
              {!(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || apiBase !== '') && (
                <span className="summary-item" style={{ marginLeft: 'auto', color: '#ffbd2e', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  ℹ️ 브라우저 직접 스캔 중 (보안 정책상 MAC 주소 조회 불가)
                </span>
              )}
            </div>
          )}

          {isScanning && (
            <div className="scan-progress-container-inline">
              <span className="scan-progress-label">스캔 중...</span>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
              </div>
              <span className="progress-text">{progress}%</span>
            </div>
          )}

          {activeTab === 'monitor' ? (
            /* NETWORK MONITOR TAB PANEL */
            <div className="monitor-tab-container animate-fade-in">
              <div className="monitor-health-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <h2>🌐 실시간 네트워크 진단 & 모니터링</h2>
                  <p>로컬 네트워크 어댑터의 트래픽을 관측하고 ARP 스푸핑, 브로드캐스트 루핑 등 주요 네트워크 위협을 실시간 검출합니다.</p>
                </div>
                <button 
                  className={`view-toggle-btn ${loopSimType !== 'off' ? 'active' : ''}`}
                  onClick={() => {
                    if (loopSimType === 'off') {
                      setLoopSimType('physical');
                    } else if (loopSimType === 'physical') {
                      setLoopSimType('terminal');
                    } else {
                      setLoopSimType('off');
                    }
                  }}
                  title="강제로 네트워크 루프(Looping) 상황을 시뮬레이션하여 경고 시스템을 테스트합니다."
                  style={loopSimType === 'physical' ? { borderColor: '#ef4444', color: '#f87171' } : loopSimType === 'terminal' ? { borderColor: '#ff453a', color: '#ffbd2e' } : {}}
                >
                  {loopSimType === 'off' && "⚡ 루프 장애 감지 테스트"}
                  {loopSimType === 'physical' && "🚨 물리 루프 시뮬레이션 중"}
                  {loopSimType === 'terminal' && "⚠️ 단말 루프 시뮬레이션 중"}
                </button>
              </div>

              {monitorData ? (
                <>
                  {/* Metric Cards Row */}
                  <div className="monitor-cards-grid">
                    {/* CARD 1: ARP Spoofing */}
                    <div className={`monitor-card ${monitorData.arp_spoofing.detected ? 'alert-critical' : 'status-healthy'}`}>
                      <div className="monitor-card-header">
                        <span className="card-icon">🛡️</span>
                        <h3>ARP 스푸핑 바이러스 진단</h3>
                        <span className={`status-badge ${monitorData.arp_spoofing.status}`}>
                          {monitorData.arp_spoofing.detected ? '위험 감지' : '정상'}
                        </span>
                      </div>
                      <div className="monitor-card-body">
                        {monitorData.arp_spoofing.detected ? (
                          <div className="alert-details">
                            <p className="alert-title">⚠️ ARP Spoofing 변조 위협 감지됨!</p>
                            <p className="alert-desc">동일한 MAC 주소에 복수의 IP가 매핑되어 있습니다. 해킹 혹은 바이러스가 의심됩니다.</p>
                            <div className="duplicated-macs-list">
                              {monitorData.arp_spoofing.details.map((detail, idx) => (
                                <div key={idx} className="duplicated-mac-item">
                                  <div className="mac-val monospace">MAC: {detail.mac} ({detail.manufacturer})</div>
                                  <div className="ips-val monospace">IP: {detail.ips.join(', ')} {detail.gateway_involved && <strong className="gw-warning">(게이트웨이 포함!)</strong>}</div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="normal-details">
                            <p className="normal-title">✅ 변조 위협 없음</p>
                            <p className="normal-desc">중복 매핑된 MAC 주소가 감지되지 않았습니다. Gateway 보호 상태 양호.</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* CARD 2: Looping Detection */}
                    <div className={`monitor-card ${monitorData.looping.detected ? 'alert-warning' : 'status-healthy'}`}>
                      <div className="monitor-card-header">
                        <span className="card-icon">🔄</span>
                        <h3>네트워크 루핑 (Looping) 감지</h3>
                        <span className={`status-badge ${monitorData.looping.status}`}>
                          {monitorData.looping.detected ? '의심/지연' : '정상'}
                        </span>
                      </div>
                      <div className="monitor-card-body">
                        <div className="monitor-metric-row">
                          <span className="metric-label">게이트웨이 Ping Latency:</span>
                          <span className={`metric-val monospace ${monitorData.gateway_rtt && monitorData.gateway_rtt > 80 ? 'text-red' : ''}`}>
                            {monitorData.gateway_rtt !== null ? `${monitorData.gateway_rtt} ms` : '측정 불가'}
                          </span>
                        </div>
                        <div className="monitor-metric-row">
                          <span className="metric-label">초당 브로드캐스트 패킷:</span>
                          <span className="metric-val monospace">{monitorData.looping.pps_broadcast} pps</span>
                        </div>
                        <div className="monitor-status-desc">
                          {monitorData.looping.detected ? (
                            <div>
                              <p className="alert-desc-text">⚠️ {monitorData.looping.reason}</p>
                              {monitorData.looping.loop_type === 'terminal' && monitorData.looping.culprit_ip && (
                                <div className="culprit-card-info" style={{ marginTop: '0.6rem', padding: '0.5rem', backgroundColor: 'rgba(255, 69, 58, 0.05)', borderRadius: '4px', border: '1px solid rgba(255, 189, 46, 0.2)' }}>
                                  <p style={{ margin: '0 0 0.3rem 0', fontWeight: 'bold', color: '#ffbd2e', fontSize: '0.75rem' }}>🚨 원인 단말 정보</p>
                                  <div className="monospace" style={{ fontSize: '0.7rem' }}>IP: <strong>{monitorData.looping.culprit_ip}</strong></div>
                                  <div className="monospace" style={{ fontSize: '0.7rem' }}>MAC: <strong>{monitorData.looping.culprit_mac}</strong> ({monitorData.looping.culprit_manufacturer || 'N/A'})</div>
                                </div>
                              )}
                              {monitorData.looping.loop_type === 'physical' && (
                                <div className="culprit-card-info" style={{ marginTop: '0.6rem', padding: '0.5rem', backgroundColor: 'rgba(239, 68, 68, 0.05)', borderRadius: '4px', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                                  <p style={{ margin: '0 0 0.3rem 0', fontWeight: 'bold', color: '#ef4444', fontSize: '0.75rem' }}>🚨 물리 루프 발생 상태</p>
                                  <p style={{ margin: 0, fontSize: '0.7rem', color: 'var(--text-secondary)' }}>이 장애는 단말의 과부하가 아닌 스위칭 허브 간 루프 연결이 원인입니다. 이중 연결된 LAN 케이블을 확인하십시오.</p>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="normal-desc-text">✅ 루핑이나 프레임 순환 정체 현상이 감지되지 않았습니다.</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CARD 3: Abnormal Traffic */}
                    <div className={`monitor-card ${monitorData.traffic.abnormal ? 'alert-warning' : 'status-healthy'}`}>
                      <div className="monitor-card-header">
                        <span className="card-icon">📈</span>
                        <h3>이상 과다 트래픽 감지</h3>
                        <span className={`status-badge ${monitorData.traffic.status}`}>
                          {monitorData.traffic.abnormal ? '과부하 경고' : '정상'}
                        </span>
                      </div>
                      <div className="monitor-card-body">
                        <div className="monitor-metric-row">
                          <span className="metric-label">다운로드 속도:</span>
                          <span className="metric-val monospace text-blue">{formatSpeed(monitorData.traffic.speed_rx_kbps)}</span>
                        </div>
                        <div className="monitor-metric-row">
                          <span className="metric-label">업로드 속도:</span>
                          <span className="metric-val monospace text-green">{formatSpeed(monitorData.traffic.speed_tx_kbps)}</span>
                        </div>
                        <div className="monitor-metric-row">
                          <span className="metric-label">초당 송수신 패킷:</span>
                          <span className="metric-val monospace">{monitorData.traffic.pps_rx + monitorData.traffic.pps_tx} pps</span>
                        </div>
                        <div className="monitor-status-desc">
                          {monitorData.traffic.abnormal ? (
                            <div>
                              <p className="alert-desc-text">⚠️ {monitorData.traffic.reason}</p>
                              {monitorData.traffic.culprit_ip && (
                                <div className="culprit-card-info" style={{ marginTop: '0.6rem', padding: '0.5rem', backgroundColor: 'rgba(255, 189, 46, 0.05)', borderRadius: '4px', border: '1px solid rgba(255, 189, 46, 0.2)' }}>
                                  <p style={{ margin: '0 0 0.3rem 0', fontWeight: 'bold', color: '#ffbd2e', fontSize: '0.75rem' }}>🚨 원인 단말 정보</p>
                                  <div className="monospace" style={{ fontSize: '0.7rem' }}>IP: <strong>{monitorData.traffic.culprit_ip}</strong></div>
                                  <div className="monospace" style={{ fontSize: '0.7rem' }}>MAC: <strong>{monitorData.traffic.culprit_mac}</strong> ({monitorData.traffic.culprit_manufacturer || 'N/A'})</div>
                                </div>
                              )}
                            </div>
                          ) : (
                            <p className="normal-desc-text">✅ 트래픽 흐름이 정상 범주 내에 있습니다.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Traffic Graph Section */}
                  <div className="monitor-graph-section">
                    <div className="graph-header">
                      <h3>📊 실시간 대역폭 점유율</h3>
                      <div className="graph-legend">
                        <span className="legend-item blue"><span className="legend-dot" />다운로드 (Rx)</span>
                        <span className="legend-item green"><span className="legend-dot" />업로드 (Tx)</span>
                      </div>
                    </div>
                    
                    <div className="svg-graph-container">
                      {trafficHistory.length > 1 ? (
                        (() => {
                          const maxVal = Math.max(...trafficHistory.map(h => Math.max(h.rx, h.tx, 50)));
                          const height = 150;
                          const width = 800;
                          const padding = 25;
                          const graphHeight = height - padding * 2;
                          const graphWidth = width - padding * 2;
                          
                          const getCoordinates = (type) => {
                            return trafficHistory.map((pt, idx) => {
                              const x = padding + (idx / (trafficHistory.length - 1)) * graphWidth;
                              const val = type === 'rx' ? pt.rx : pt.tx;
                              const y = padding + graphHeight - (val / maxVal) * graphHeight;
                              return `${x},${y}`;
                            }).join(' ');
                          };
                          
                          const rxCoords = getCoordinates('rx');
                          const txCoords = getCoordinates('tx');
                          
                          return (
                            <svg viewBox={`0 0 ${width} ${height}`} className="traffic-svg">
                              <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#444" strokeDasharray="3,3" />
                              <line x1={padding} y1={padding + graphHeight/2} x2={width - padding} y2={padding + graphHeight/2} stroke="#444" strokeDasharray="3,3" />
                              <line x1={padding} y1={padding + graphHeight} x2={width - padding} y2={padding + graphHeight} stroke="#555" />
                              
                              <text x={padding - 5} y={padding + 4} fill="#888" fontSize="9" textAnchor="end">{formatSpeed(maxVal)}</text>
                              <text x={padding - 5} y={padding + graphHeight/2 + 4} fill="#888" fontSize="9" textAnchor="end">{formatSpeed(maxVal/2)}</text>
                              <text x={padding - 5} y={padding + graphHeight + 4} fill="#888" fontSize="9" textAnchor="end">0 KB/s</text>
                              
                              <polyline
                                fill="none"
                                stroke="var(--accent)"
                                strokeWidth="2.5"
                                points={rxCoords}
                              />
                              <polyline
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="2.5"
                                points={txCoords}
                              />
                            </svg>
                          );
                        })()
                      ) : (
                        <div className="graph-loading">트래픽 분석 중...</div>
                      )}
                    </div>
                  </div>

                  {/* System Interface Diagnostics */}
                  <div className="monitor-details-panel">
                    <h3>🔍 어댑터 및 시스템 환경 정보</h3>
                    <div className="monitor-info-table-grid">
                      <div className="m-info-item">
                        <span className="m-label">로컬 IP 주소</span>
                        <span className="m-val monospace">{monitorData.local_ip}</span>
                      </div>
                      <div className="m-info-item">
                        <span className="m-label">기본 게이트웨이 (GW)</span>
                        <span className="m-val monospace">{monitorData.gateway_ip}</span>
                      </div>
                      <div className="m-info-item">
                        <span className="m-label">GW 레이턴시 (RTT)</span>
                        <span className="m-val monospace">{monitorData.gateway_rtt !== null ? `${monitorData.gateway_rtt} ms` : '응답 대기'}</span>
                      </div>
                      <div className="m-info-item">
                        <span className="m-label">초당 총 트래픽 속도</span>
                        <span className="m-val monospace">{(monitorData.traffic.speed_rx_kbps + monitorData.traffic.speed_tx_kbps).toFixed(1)} KB/s</span>
                      </div>
                    </div>
                  </div>

                  {/* Real-time Threat Detection Endpoint List */}
                  <div className="monitor-threat-panel">
                    <h3>🚨 실시간 위협 및 이상 단말 검출 현황</h3>
                    {spoofedIps.size > 0 ? (
                      <div className="threat-list-container">
                        <p className="threat-summary-desc">
                          네트워크 분석 검사 결과, 현재 아래 단말들이 보안 위협에 노출되었거나 비정상적인 상태로 검출되었습니다.
                        </p>
                        <div className="threat-endpoints-table-wrapper">
                          <table className="threat-table">
                            <thead>
                              <tr>
                                <th>대상 IP</th>
                                <th>MAC 주소</th>
                                <th>제조업체 / 호스트</th>
                                <th>검출 위협 유형</th>
                                <th>위험도</th>
                                <th>권고 조치</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from(spoofedIps).map((ip, idx) => {
                                const dev = devices.find(d => d.ip === ip) || {};
                                return (
                                  <tr key={idx} className="threat-row">
                                    <td className="monospace-cell text-red font-bold">{ip}</td>
                                    <td className="monospace-cell">{dev.mac || '알 수 없음'}</td>
                                    <td>{dev.hostname && dev.hostname !== 'N/A' ? `${dev.hostname} (${dev.manufacturer || '알 수 없음'})` : (dev.manufacturer || '알 수 없음')}</td>
                                    <td><span className="threat-label">ARP 스푸핑 의심 (MAC 중복 매핑)</span></td>
                                    <td><span className="danger-badge-critical">위험 (High)</span></td>
                                    <td className="action-cell">네트워크 즉시 격리 및 백신 정밀 검사</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="threat-healthy-state">
                        <span className="healthy-icon">🛡️</span>
                        <div className="healthy-text-block">
                          <strong className="healthy-title">현재 감지된 위협 또는 이상 동작 단말이 없습니다.</strong>
                          <p className="healthy-desc">중복 MAC 매핑(ARP Spoofing) 및 실시간 트래픽을 검사한 결과, 전체 네트워크 보호 상태가 안전합니다.</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Diagnosis Guide / Explanation Section */}
                  <div className="monitor-guide-panel">
                    <h3>💡 네트워크 진단 가이드 및 모니터링 안내</h3>
                    <div className="monitor-guide-grid">
                      <div className="m-guide-item">
                        <div className="guide-header">
                          <span className="guide-icon">📊</span>
                          <strong className="guide-title">실시간 성능 측정</strong>
                        </div>
                        <p className="guide-desc">윈도우 내장 `netstat -e` 명령어 분석으로 <strong>실시간 대역폭 속도(Rx/Tx)</strong>와 <strong>패킷 전송 속도(pps)</strong>를 집계하며, 게이트웨이 Ping RTT(레이턴시)를 2초 주기로 실시간 관측합니다.</p>
                      </div>
                      <div className="m-guide-item">
                        <div className="guide-header">
                          <span className="guide-icon">🛡️</span>
                          <strong className="guide-title">ARP 스푸핑 바이러스 진단</strong>
                        </div>
                        <p className="guide-desc">ARP 테이블을 감시해 하나의 MAC 주소에 다수 사설 IP가 중복 매핑되는 위협(특히 기본 게이트웨이 MAC 변조)을 탐지하여 해킹 위험성을 판별합니다.</p>
                      </div>
                      <div className="m-guide-item">
                        <div className="guide-header">
                          <span className="guide-icon">🔄</span>
                          <strong className="guide-title">네트워크 루핑 (Looping) 감지</strong>
                        </div>
                        <p className="guide-desc">초당 발생하는 브로드캐스트 패킷 유입량과 게이트웨이 Ping 응답 지연(RTT 80ms 초과) 여부를 교차 검사하여 루핑 장애 현상을 검출합니다.</p>
                      </div>
                      <div className="m-guide-item">
                        <div className="guide-header">
                          <span className="guide-icon">📈</span>
                          <strong className="guide-title">이상 과다 트래픽 감지</strong>
                        </div>
                        <p className="guide-desc">인터페이스 대역폭이 비정상적으로 급증하거나 의심스러운 다량의 패킷 수신이 지속적으로 일어날 경우 경고 카드와 세부 트래픽 분석 요인을 표시합니다.</p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="monitor-loading-state">
                  <div className="spinner"></div>
                  <p>실시간 패킷 모니터링 정보를 수집하는 중입니다...</p>
                </div>
              )}
            </div>
          ) : (
            viewMode === 'gui' ? (
            /* GUI VIEW MODE */
            activeTab === 'results' ? (
              /* GUI Mode for Results Tab (254-cell grid) */
              filteredResults.length === 0 ? (
                <div className="table-empty-state">
                  <span className="table-empty-icon">🌐</span>
                  <div>
                    <div className="table-empty-title">스캔 결과가 없습니다.</div>
                    <p style={{ fontSize: '0.8rem' }}>상단 스캔 버튼을 누르면 이 대역의 모든 활성 네트워크 장치 탐지가 시작됩니다.</p>
                  </div>
                </div>
              ) : (
                <div className="gui-view-container">
                  
                  {/* 15-column IPv4 visual grid */}
                  <div className="ip-gui-grid">
                    {filteredResults.map((device, index) => {
                      const isAlive = device.status === 'alive';
                      const isPending = device.status === 'pending';
                      const matched = isMatched(device);
                      const octetLabel = getIpDisplayLabel(device.ip);
                      const isSelected = selectedIp === device.ip;
                      const isGateway = localInfo && localInfo.gateway_ip && device.ip === localInfo.gateway_ip;

                      const isSpoofed = spoofedIps.has(device.ip);
                      
                      const isTopRow = index < 30;
                      const tooltipClass = `cell-tooltip${isTopRow ? ' tooltip-bottom' : ''}`;

                      return (
                        <div 
                          key={device.ip + '-grid-' + index}
                          className={`ip-grid-cell ${device.status} ${isSelected ? 'selected' : ''} ${!matched ? 'unmatched' : ''} ${isGateway ? 'gateway' : ''} ${isSpoofed ? 'spoofed-warning' : ''}`}
                          onClick={() => {
                            if (isAlive) {
                              setSelectedIp(device.ip);
                            } else {
                              setSelectedIp(null);
                            }
                          }}
                        >
                          <span className="octet-num">
                            {octetLabel}
                            {isGateway && <span className="gw-badge-indicator" title="Gateway IP">GW</span>}
                            {isSpoofed && <span className="spoof-warning-indicator" title="ARP 변조 의심 단말">⚠️</span>}
                          </span>
                          
                          {/* CSS hover tooltip */}
                          <div className={tooltipClass}>
                            <div className="tooltip-ip">
                              {device.ip} {isGateway && '(게이트웨이)'}
                              {isSpoofed && <span className="tooltip-spoof-alert" style={{ color: '#ef4444', fontWeight: 'bold' }}> [⚠️ ARP 변조 의심]</span>}
                            </div>
                            <div className="tooltip-divider"></div>
                            <div className="tooltip-row">
                              상태: {isPending ? '⏳ 대기 중' : isAlive ? '🟢 활성 (사용 중)' : '🔴 비활성 (비어있음)'}
                            </div>
                            {isAlive && (
                              <>
                                <div className="tooltip-row">이름: {device.hostname}</div>
                                <div className="tooltip-row">제조사: {device.manufacturer}</div>
                                <div className="tooltip-row">MAC: {device.mac}</div>
                                {device.ports && device.ports.length > 0 && (
                                  <div className="tooltip-row highlight">
                                    포트: {device.ports.map(p => p.port).join(', ')}
                                  </div>
                                )}
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Device Info Panel below the grid */}
                  {selectedIp && (() => {
                    const selectedDevice = devices.find(d => d.ip === selectedIp);
                    if (!selectedDevice || selectedDevice.status !== 'alive') return null;
                    const isFav = favorites.some(f => f.ip === selectedDevice.ip);
                    return (
                      <div className="gui-detail-panel animate-fade-in">
                        <div className="gui-detail-header">
                          <div className="gui-detail-title">
                            <ComputerIcon alive={true} />
                            <span>
                              {selectedDevice.hostname} 
                              {localInfo && localInfo.gateway_ip && selectedDevice.ip === localInfo.gateway_ip && (
                                <span className="gw-badge-indicator inline-gw" style={{ marginLeft: '0.4rem' }}>게이트웨이</span>
                              )}
                            </span>
                            <span className="gui-detail-ip-badge">{selectedDevice.ip}</span>
                          </div>
                          <button 
                            className={`btn-fav-toggle ${isFav ? 'fav-active' : ''}`}
                            onClick={(e) => handleToggleFavorite(selectedDevice, e)}
                          >
                            {isFav ? '★ 즐겨찾기 해제' : '☆ 즐겨찾기 추가'}
                          </button>
                        </div>
                        <div className="gui-detail-body">
                          {spoofedIps.has(selectedDevice.ip) && (
                            <div className="detail-warning-banner">
                              🚨 <strong>보안 위협 감지:</strong> 이 단말은 네트워크 상에서 다른 단말과 동일한 MAC 주소를 사용하는 것(중복 MAC)이 검출되어 <strong>ARP 스푸핑 변조 의심 대상</strong>으로 분류되었습니다. 해킹/스니핑 공격의 주체 혹은 대상일 수 있으므로 즉시 장비 정밀 검사 및 네트워크 격리를 권고합니다.
                            </div>
                          )}
                          <div className="gui-detail-info-grid">
                            <div className="info-item">
                              <span className="info-label">IP 주소</span>
                              <span className="info-value monospace">{selectedDevice.ip}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">MAC 주소</span>
                              <span className="info-value monospace">{selectedDevice.mac}</span>
                            </div>
                            <div className="info-item">
                              <span className="info-label">제조업체</span>
                              <span className="info-value">{selectedDevice.manufacturer}</span>
                            </div>
                          </div>
                          
                          {selectedDevice.ports && selectedDevice.ports.length > 0 && (
                            <div className="gui-detail-ports-section">
                              <div className="ports-title">열린 포트 / 서비스 (접속 가능):</div>
                              <div className="ports-list-row">
                                {selectedDevice.ports.map((p, idx) => {
                                  const protocol = p.port === 443 ? 'https://' : 'http://';
                                  const isWeb = p.port === 80 || p.port === 443;
                                  const isFtp = p.port === 21;
                                  const isSmb = p.port === 445;

                                  return (
                                    <div key={idx} className="gui-port-badge-item">
                                      {isWeb ? (
                                        <a href={`${protocol}${selectedDevice.ip}`} target="_blank" rel="noopener noreferrer" className="port-badge-link">
                                          {p.service} (TCP {p.port})
                                        </a>
                                      ) : isFtp ? (
                                        <a href={`ftp://${selectedDevice.ip}`} target="_blank" rel="noopener noreferrer" className="port-badge-link">
                                          {p.service} (TCP {p.port})
                                        </a>
                                      ) : isSmb ? (
                                        <a href={`\\\\${selectedDevice.ip}`} className="port-badge-link" onClick={(e) => {
                                          e.preventDefault();
                                          alert(`탐색기 주소창에 \\\\${selectedDevice.ip} 를 입력하여 접속하세요.`);
                                        }}>
                                          {p.service} (TCP {p.port})
                                        </a>
                                      ) : (
                                        <span className="port-badge-span">{p.service} (TCP {p.port})</span>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )
            ) : (
              /* GUI Mode for Active / Favorites tabs (Card Grid) */
              (() => {
                const targetList = activeTab === 'active' ? filteredActive : filteredFavorites;
                if (targetList.length === 0) {
                  return (
                    <div className="table-empty-state">
                      <span className="table-empty-icon">{activeTab === 'active' ? '🟢' : '⭐'}</span>
                      <div>
                        <div className="table-empty-title">
                          {activeTab === 'active' ? '활성 상태의 장치가 없습니다.' : '즐겨찾기된 장치가 없습니다.'}
                        </div>
                        <p style={{ fontSize: '0.8rem' }}>
                          {activeTab === 'active' 
                            ? '스캔을 진행하여 네트워크 상의 활성 장비를 탐지해보세요.' 
                            : '장비 목록에서 별표(☆) 아이콘을 클릭해 자주 모니터링하는 기기를 등록할 수 있습니다.'}
                        </p>
                      </div>
                    </div>
                  );
                }

                return (
                  <div className="device-cards-grid">
                    {targetList.map((device, index) => {
                      const isFav = favorites.some(f => f.ip === device.ip);
                        const isCardSpoofed = spoofedIps.has(device.ip);
                        return (
                          <div key={device.ip + '-' + index} className={`device-card animate-fade-in ${isCardSpoofed ? 'spoofed-warning' : ''}`}>
                            <div className="device-card-header">
                              <div className="device-card-title">
                                <ComputerIcon alive={true} />
                                <span className="device-card-hostname">
                                  {device.hostname}
                                  {isCardSpoofed && <span className="spoof-badge-indicator inline-spoof" style={{ marginLeft: '0.4rem' }}>🚨 변조 위협</span>}
                                </span>
                              </div>
                            <span 
                              className="device-card-fav-star" 
                              onClick={(e) => handleToggleFavorite(device, e)}
                              title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                            >
                              {isFav ? '⭐' : '☆'}
                            </span>
                          </div>
                          <div className="device-card-body">
                            <div className="device-card-row">
                              <span className="device-card-label">IP 주소:</span>
                              <span className="device-card-val monospace">{device.ip}</span>
                            </div>
                            <div className="device-card-row">
                              <span className="device-card-label">MAC 주소:</span>
                              <span className="device-card-val monospace">{device.mac}</span>
                            </div>
                            <div className="device-card-row">
                              <span className="device-card-label">제조사:</span>
                              <span className="device-card-val truncate" title={device.manufacturer}>{device.manufacturer}</span>
                            </div>
                            
                            {device.ports && device.ports.length > 0 && (
                              <div className="device-card-ports">
                                <span className="device-card-label">서비스:</span>
                                <div className="device-card-port-badges">
                                  {device.ports.map((p, idx) => (
                                    <span key={idx} className="device-card-port-badge" title={p.service}>
                                      TCP {p.port}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()
            )
          ) : (
            /* DETAILED SCAN VIEW MODE (Classic Table) */
            (() => {
              const targetList = activeTab === 'results' ? filteredResults : activeTab === 'active' ? filteredActive : filteredFavorites;
              
              if (targetList.length === 0) {
                return (
                  <div className="table-empty-state">
                    <span className="table-empty-icon">🌐</span>
                    <div>
                      <div className="table-empty-title">표시할 항목이 없습니다.</div>
                      <p style={{ fontSize: '0.8rem' }}>검색 조건에 일치하거나 선택한 탭에 등록된 장비가 없습니다.</p>
                    </div>
                  </div>
                );
              }

              return (
                <table className="win-table">
                  <thead>
                    <tr>
                      <th className="col-expand"></th>
                      <th className="col-status-icon">상태</th>
                      <th>이름</th>
                      <th>IP</th>
                      <th>제조업체</th>
                      <th>MAC 주소</th>
                    </tr>
                  </thead>
                  <tbody>
                    {targetList.map((device, index) => {
                      const isAlive = device.status === 'alive';
                      const hasPorts = device.ports && device.ports.length > 0;
                      const isExpanded = !!expandedDevices[device.ip];
                      const isFav = favorites.some(f => f.ip === device.ip);
                      const isSelected = selectedIp === device.ip;
                      const isGateway = localInfo && localInfo.gateway_ip && device.ip === localInfo.gateway_ip;

                      return (
                        <React.Fragment key={device.ip + '-' + index}>
                          <tr 
                            className={`device-row ${isAlive ? 'alive' : 'dead'} ${isSelected ? 'selected' : ''} ${isGateway ? 'gateway-row' : ''} ${spoofedIps.has(device.ip) ? 'spoofed-row' : ''}`}
                            onClick={() => setSelectedIp(device.ip)}
                            onDoubleClick={() => isAlive && toggleDeviceExpanded(device.ip)}
                          >
                            <td className="col-expand" onClick={(e) => {
                              e.stopPropagation();
                              if (isAlive) toggleDeviceExpanded(device.ip);
                            }}>
                              {isAlive && <ChevronIcon expanded={isExpanded} />}
                            </td>
                            <td className="col-status-icon">
                              <ComputerIcon alive={isAlive} />
                            </td>
                            <td>
                              <div className="device-name-cell">
                                <span 
                                  style={{ cursor: 'pointer', userSelect: 'none' }}
                                  onClick={(e) => handleToggleFavorite(device, e)}
                                  title={isFav ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                                >
                                  {isFav ? '⭐' : '☆'}
                                </span>
                                <span className="device-name-text">
                                  {device.hostname}
                                  {isGateway && <span className="gw-badge-indicator inline-gw" style={{ marginLeft: '0.4rem' }}>게이트웨이</span>}
                                  {spoofedIps.has(device.ip) && <span className="spoof-badge-indicator inline-spoof" style={{ marginLeft: '0.4rem' }}>🚨 변조 위협 감지</span>}
                                </span>
                              </div>
                            </td>
                            <td className="monospace-cell">{device.ip}</td>
                            <td>{device.manufacturer}</td>
                            <td className="monospace-cell">{device.mac}</td>
                          </tr>

                          {isAlive && isExpanded && hasPorts && (
                            <tr className="services-row">
                              <td></td>
                              <td colSpan={5} className="services-cell">
                                <div className="services-list">
                                  {device.ports.map((p, idx) => {
                                    const protocol = p.port === 443 ? 'https://' : 'http://';
                                    const isWeb = p.port === 80 || p.port === 443;
                                    const isFtp = p.port === 21;
                                    const isSmb = p.port === 445;

                                    return (
                                      <div key={idx} className="service-item">
                                        <ServiceIcon type={p.service} />
                                        {isWeb ? (
                                          <a href={`${protocol}${device.ip}`} className="service-link" target="_blank" rel="noopener noreferrer">
                                            {p.service}
                                          </a>
                                        ) : isFtp ? (
                                          <a href={`ftp://${device.ip}`} className="service-link" target="_blank" rel="noopener noreferrer">
                                            {p.service}
                                          </a>
                                        ) : isSmb ? (
                                          <a href={`\\\\${device.ip}`} className="service-link" onClick={(e) => {
                                            e.preventDefault();
                                            alert(`탐색기(Windows Explorer) 주소창에 \\\\${device.ip} 를 입력하여 접속하세요.`);
                                          }}>
                                            {p.service}
                                          </a>
                                        ) : (
                                          <span>{p.service}</span>
                                        )}
                                        <span className="service-port-badge">TCP:{p.port}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              );
            })()
          ))}
        </div>

        {/* Status bar */}
        <div className="window-statusbar">
          <div className="status-counts">
            <span>
              활성 장치: <span className="count-badge alive">{aliveCount} 개</span>
            </span>
            <span>
              비활성: <span className="count-badge">{deadCount} 개</span>
            </span>
            <span>
              필터링됨: <span className="count-badge">
                {activeTab === 'results' ? filteredResults.length : activeTab === 'active' ? filteredActive.length : filteredFavorites.length} 개
              </span>
            </span>
          </div>
          
          <div style={{ fontSize: '0.75rem' }}>
            {isSimulation ? "시뮬레이션 모드" : "백엔드 연결됨"}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IpScanner;
