// IP Subnet Calculator Logic

class SubnetCalculator {
    constructor() {
        this.initializeEventListeners();
        this.generateMaskBitsOptions();
        // C 클래스를 기본 선택
        document.querySelector('input[value="C"]').checked = true;
        this.updateClassInfo('C');
        // 기본값으로 계산
        this.setDefaultValuesForClass('C');
    }

    generateMaskBitsOptions(classLetter = 'C') {
        const maskBitsSelect = document.getElementById('maskBits');
        maskBitsSelect.innerHTML = '';
        
        // 클래스별 마스크 비트 범위 설정
        const maskRanges = {
            'A': { min: 8, max: 32, default: 8 },
            'B': { min: 16, max: 32, default: 16 },
            'C': { min: 24, max: 32, default: 24 },
            'D': { min: 4, max: 32, default: 4 },
            'E': { min: 4, max: 32, default: 4 }
        };
        
        const range = maskRanges[classLetter];
        
        for (let i = range.min; i <= range.max; i++) {
            const option = document.createElement('option');
            option.value = i;
            option.textContent = `/${i}`;
            if (i === range.default) option.selected = true;
            maskBitsSelect.appendChild(option);
        }
    }

    initializeEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => this.handleNavigation(e));
        });

        // IPv4 Inputs
        document.getElementById('ipAddress').addEventListener('input', () => this.calculateSubnet());
        document.getElementById('maskBits').addEventListener('change', () => this.calculateSubnet());

        // Class Radio Buttons
        document.querySelectorAll('.class-radio').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const selectedClass = e.target.value;
                this.updateClassInfo(selectedClass);
                this.generateMaskBitsOptions(selectedClass);
                this.setDefaultValuesForClass(selectedClass);
            });
        });
    }

    handleNavigation(e) {
        e.preventDefault();
        const page = e.target.dataset.page;
        
        // Remove active class from all links and pages
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        
        // Add active class to clicked link and corresponding page
        e.target.classList.add('active');
        document.getElementById(page).classList.add('active');
    }

    updateClassInfo(classLetter) {
        const classDetails = {
            'A': {
                title: 'IPv4 네트워크 클래스 - A 클래스',
                range: '1.0.0.0 ~ 126.255.255.255',
                subnet: '255.0.0.0 (/8)',
                hosts: '약 1,677만 개',
                usage: '매우 큰 조직 (대규모 통신사, 글로벌 기업)',
                feature: '첫 번째 비트가 0으로 시작, 매우 많은 호스트 수용 가능',
                // Result section
                rangeResult: '1 - 126',
                networkRange: '1.0.0.0 ~ 126.255.255.255',
                firstBit: '0',
                subnetMask: '255.0.0.0 (/8)',
                hostCount: '약 1,677만 개',
                target: '국가 기관, 대규모 통신사',
                defaultIp: '10.0.0.1',
                defaultMaskBits: 8
            },
            'B': {
                title: 'IPv4 네트워크 클래스 - B 클래스',
                range: '128.0.0.0 ~ 191.255.255.255',
                subnet: '255.255.0.0 (/16)',
                hosts: '약 65,000개',
                usage: '중간 규모 조직 (대학, 중형 기업)',
                feature: '첫 두 비트가 10으로 시작, 적절한 규모의 네트워크 구성',
                // Result section
                rangeResult: '128 - 191',
                networkRange: '128.0.0.0 ~ 191.255.255.255',
                firstBit: '10',
                subnetMask: '255.255.0.0 (/16)',
                hostCount: '약 65,534개',
                target: '대학교, 중형 기업, 정부 기관',
                defaultIp: '172.16.0.1',
                defaultMaskBits: 16
            },
            'C': {
                title: 'IPv4 네트워크 클래스 - C 클래스',
                range: '192.0.0.0 ~ 223.255.255.255',
                subnet: '255.255.255.0 (/24)',
                hosts: '약 254개',
                usage: '소규모 조직 (소기업, 소규모 부서, 가정용)',
                feature: '첫 세 비트가 110으로 시작, 가장 일반적으로 사용됨',
                // Result section
                rangeResult: '192 - 223',
                networkRange: '192.0.0.0 ~ 223.255.255.255',
                firstBit: '110',
                subnetMask: '255.255.255.0 (/24)',
                hostCount: '254개',
                target: '소기업, 소매점, 사무실, 가정',
                defaultIp: '192.168.0.1',
                defaultMaskBits: 24
            },
            'D': {
                title: 'IPv4 네트워크 클래스 - D 클래스',
                range: '224.0.0.0 ~ 239.255.255.255',
                subnet: '240.0.0.0',
                hosts: 'N/A (그룹)',
                usage: '비디오 스트리밍, 실시간 방송, 온라인 회의',
                feature: '첫 네 비트가 1110으로 시작, 일대다 통신 (멀티캐스트)',
                // Result section
                rangeResult: '224 - 239',
                networkRange: '224.0.0.0 ~ 239.255.255.255',
                firstBit: '1110',
                subnetMask: '240.0.0.0',
                hostCount: 'N/A (그룹)',
                target: '비디오 스트리밍, 온라인 회의, 라이브 방송',
                defaultIp: '224.0.0.1',
                defaultMaskBits: 4
            },
            'E': {
                title: 'IPv4 네트워크 클래스 - E 클래스',
                range: '240.0.0.0 ~ 255.255.255.255',
                subnet: 'N/A',
                hosts: 'N/A',
                usage: '현재 미사용 상태',
                feature: '첫 네 비트가 1111로 시작, 향후 사용을 위해 예약됨',
                // Result section
                rangeResult: '240 - 255',
                networkRange: '240.0.0.0 ~ 255.255.255.255',
                firstBit: '1111',
                subnetMask: 'N/A',
                hostCount: 'N/A',
                target: '예약됨 (미사용)',
                defaultIp: '240.0.0.1',
                defaultMaskBits: 4
            }
        };

        const info = classDetails[classLetter];
        
        // Update class info box
        document.getElementById('classTitle').textContent = info.title;
        document.getElementById('classInfoRange').textContent = info.range;
        document.getElementById('classInfoSubnet').textContent = info.subnet;
        document.getElementById('classInfoHosts').textContent = info.hosts;
        document.getElementById('classInfoUsage').textContent = info.usage;
        document.getElementById('classInfoFeature').textContent = info.feature;

        // Update first octet range field
        document.getElementById('firstOctetRange').value = info.range;
    }

    ipToOctets(ip) {
        return ip.split('.').map(octet => parseInt(octet, 10));
    }

    octetsToIp(octets) {
        return octets.join('.');
    }

    ipToDecimal(ip) {
        const octets = this.ipToOctets(ip);
        return (octets[0] << 24) + (octets[1] << 16) + (octets[2] << 8) + octets[3];
    }

    decimalToIp(decimal) {
        return [
            (decimal >>> 24) & 255,
            (decimal >>> 16) & 255,
            (decimal >>> 8) & 255,
            decimal & 255
        ].join('.');
    }

    ipToBinary(ip) {
        const octets = this.ipToOctets(ip);
        return octets.map(octet => {
            return ('00000000' + octet.toString(2)).slice(-8);
        }).join(' ');
    }

    ipToHex(ip) {
        const octets = this.ipToOctets(ip);
        return octets.map(octet => {
            return ('0' + octet.toString(16).toUpperCase()).slice(-2);
        }).join('.');
    }

    calculateWildcardMask(subnetMask) {
        const octets = this.ipToOctets(subnetMask);
        return octets.map(octet => 255 - octet).join('.');
    }

    getMaskBitsFromMask(mask) {
        let decimal = this.ipToDecimal(mask);
        let bits = 0;
        
        for (let i = 31; i >= 0; i--) {
            if ((decimal & (1 << i)) !== 0) {
                bits++;
            } else {
                break;
            }
        }
        
        return bits;
    }

    getSubnetMaskFromBits(bits) {
        bits = parseInt(bits);
        if (bits === 0) return '0.0.0.0';
        if (bits === 32) return '255.255.255.255';
        
        let mask = 0;
        for (let i = 0; i < bits; i++) {
            mask = (mask << 1) | 1;
        }
        mask = mask << (32 - bits);
        
        return this.decimalToIp((mask >>> 0));
    }

    calculateSubnet() {
        try {
            const ipAddress = document.getElementById('ipAddress').value;
            const maskBits = parseInt(document.getElementById('maskBits').value);

            if (!this.isValidIp(ipAddress)) {
                return;
            }

            // Get subnet mask from mask bits
            const subnetMask = this.getSubnetMaskFromBits(maskBits);

            // Calculate subnet ID (Network IP)
            const ipDecimal = this.ipToDecimal(ipAddress);
            const maskDecimal = this.ipToDecimal(subnetMask);
            const networkIdDecimal = ipDecimal & maskDecimal;
            const networkId = this.decimalToIp(networkIdDecimal);

            // Calculate Broadcast Address
            const wildcardDecimal = (~maskDecimal) >>> 0;
            const broadcastDecimal = (networkIdDecimal | wildcardDecimal) >>> 0;
            const broadcastAddress = this.decimalToIp(broadcastDecimal);

            // Calculate Host Range
            const firstHostDecimal = (networkIdDecimal + 1) >>> 0;
            const lastHostDecimal = (broadcastDecimal - 1) >>> 0;
            const firstHost = this.decimalToIp(firstHostDecimal);
            const lastHost = this.decimalToIp(lastHostDecimal);

            // Calculate Total IP Count (네트워크 IP + 호스트 IP들 + 브로드캐스트 IP)
            const totalIpCount = (broadcastDecimal - networkIdDecimal + 1) >>> 0;

            // Calculate Real Device Available IP Range
            // 게이트웨이 다음 IP부터 브로드캐스트 전 IP까지
            const realDeviceFirstDecimal = (firstHostDecimal + 1) >>> 0;
            const realDeviceLastDecimal = lastHostDecimal;
            const realDeviceFirst = this.decimalToIp(realDeviceFirstDecimal);
            const realDeviceLast = this.decimalToIp(realDeviceLastDecimal);

            // /31, /32 특별 처리
            if (maskBits === 31) {
                // /31: point-to-point 링크용
                document.getElementById('subnetMask').value = subnetMask;
                document.getElementById('networkIP').value = 'N/A';
                document.getElementById('gatewayIP').value = 'N/A';
                document.getElementById('broadcastIP').value = 'N/A';
                
                // Host Address Range: 네트워크 IP부터 브로드캐스트 IP까지 전체 범위
                document.getElementById('hostAddressRange').value = `${networkId} - ${broadcastAddress}`;
                
                // Hosts per subnet: 총 IP 개수
                document.getElementById('hostsPerSubnet').value = `${totalIpCount.toLocaleString()} 개`;
                
                // Real Device Available IP: point-to-point 링크용
                document.getElementById('realDeviceIP').value = 'point-to-point 링크용';
            } else if (maskBits === 32) {
                // /32: 루프백용
                document.getElementById('subnetMask').value = subnetMask;
                document.getElementById('networkIP').value = 'N/A';
                document.getElementById('gatewayIP').value = 'N/A';
                document.getElementById('broadcastIP').value = 'N/A';
                
                // Host Address Range: 네트워크 IP부터 브로드캐스트 IP까지 전체 범위
                document.getElementById('hostAddressRange').value = `${networkId} - ${broadcastAddress}`;
                
                // Hosts per subnet: 총 IP 개수
                document.getElementById('hostsPerSubnet').value = `${totalIpCount.toLocaleString()} 개`;
                
                // Real Device Available IP: 루프백용
                document.getElementById('realDeviceIP').value = '루프백용';
            } else {
                // 일반적인 경우
                document.getElementById('subnetMask').value = subnetMask;
                document.getElementById('networkIP').value = networkId;
                document.getElementById('gatewayIP').value = firstHost;
                document.getElementById('broadcastIP').value = broadcastAddress;
                
                // Host Address Range: 네트워크 IP부터 브로드캐스트 IP까지 전체 범위
                document.getElementById('hostAddressRange').value = `${networkId} - ${broadcastAddress}`;
                
                // Hosts per subnet: 총 IP 개수
                document.getElementById('hostsPerSubnet').value = `${totalIpCount.toLocaleString()} 개`;
                
                // Real Device Available IP 범위 표시
                if (realDeviceFirstDecimal <= realDeviceLastDecimal) {
                    document.getElementById('realDeviceIP').value = `${realDeviceFirst} - ${realDeviceLast}`;
                } else {
                    document.getElementById('realDeviceIP').value = 'N/A';
                }
            }

        } catch (error) {
            console.error('Calculation error:', error);
        }
    }

    calculateSubnetBitmap(mask, maskBits) {
        const maskBinary = this.ipToBinary(mask);
        
        // Build the bitmap with network bits and host bits
        const segments = maskBinary.split(' ');
        let networkBits = '';
        let hostBits = '';
        let bitCount = 0;
        
        for (let seg of segments) {
            for (let bit of seg) {
                if (bitCount < maskBits) {
                    networkBits += bit;
                } else {
                    hostBits += bit;
                }
                bitCount++;
            }
        }
        
        // Format output
        let result = '';
        for (let i = 0; i < networkBits.length; i++) {
            if (i > 0 && i % 8 === 0) result += ' ';
            result += networkBits[i];
        }
        
        if (hostBits.length > 0) {
            result += ' ' + 'h'.repeat(hostBits.length);
        }
        
        return result;
    }

    isValidIp(ip) {
        const parts = ip.split('.');
        if (parts.length !== 4) return false;
        
        return parts.every(part => {
            const num = parseInt(part, 10);
            return num >= 0 && num <= 255 && part === num.toString();
        });
    }

    setDefaultValuesForClass(classLetter) {
        const classDefaults = {
            'A': {
                defaultIp: '10.0.0.1',
                defaultMaskBits: 8
            },
            'B': {
                defaultIp: '172.16.0.1',
                defaultMaskBits: 16
            },
            'C': {
                defaultIp: '192.168.0.1',
                defaultMaskBits: 24
            },
            'D': {
                defaultIp: '224.0.0.1',
                defaultMaskBits: 4
            },
            'E': {
                defaultIp: '240.0.0.1',
                defaultMaskBits: 4
            }
        };

        const defaults = classDefaults[classLetter];

        // Set form values
        document.getElementById('ipAddress').value = defaults.defaultIp;
        document.getElementById('maskBits').value = defaults.defaultMaskBits;

        // Trigger calculation
        this.calculateSubnet();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SubnetCalculator();
});
