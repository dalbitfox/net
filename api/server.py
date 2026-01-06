#!/usr/bin/env python3
"""
Port Scanner Web Application Backend (Vercel Compatible)
Stateless Flask backend for TCP/UDP port scanning.
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import socket
import ipaddress
from concurrent.futures import ThreadPoolExecutor, as_completed
import os

app = Flask(__name__)
CORS(app)

# 일반적인 포트와 서비스 매핑
COMMON_PORTS = {
    # TCP 포트
    'tcp': {
        20: 'FTP-DATA', 21: 'FTP', 22: 'SSH', 23: 'Telnet', 25: 'SMTP',
        53: 'DNS', 80: 'HTTP', 110: 'POP3', 143: 'IMAP', 443: 'HTTPS',
        445: 'SMB', 993: 'IMAPS', 995: 'POP3S', 3306: 'MySQL',
        3389: 'RDP', 5432: 'PostgreSQL', 8080: 'HTTP-Proxy', 8443: 'HTTPS-Alt',
    },
    # UDP 포트
    'udp': {
        53: 'DNS', 67: 'DHCP-Server', 68: 'DHCP-Client', 69: 'TFTP',
        123: 'NTP', 161: 'SNMP', 162: 'SNMP-Trap', 500: 'IKE',
        514: 'Syslog', 1194: 'OpenVPN', 5060: 'SIP', 5061: 'SIP-TLS',
    }
}


def scan_tcp_port(ip: str, port: int, timeout: float = 1.0) -> dict:
    """TCP 포트 스캔 (Short timeout for Vercel)"""
    result = {
        'ip': ip,
        'port': port,
        'protocol': 'tcp',
        'state': 'closed',
        'service': COMMON_PORTS['tcp'].get(port, 'Unknown'),
        'banner': None
    }
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        
        conn_result = sock.connect_ex((ip, port))
        
        if conn_result == 0:
            result['state'] = 'open'
            # 배너 그래빙 시도 (아주 짧게)
            try:
                sock.settimeout(0.5)
                sock.send(b'\r\n')
                banner = sock.recv(1024)
                if banner:
                    result['banner'] = banner.decode('utf-8', errors='ignore').strip()[:50]
            except:
                pass
        
        sock.close()
    except socket.timeout:
        result['state'] = 'filtered'
    except Exception as e:
        result['state'] = 'error'
        result['error'] = str(e)
    
    return result


def scan_udp_port(ip: str, port: int, timeout: float = 1.5) -> dict:
    """UDP 포트 스캔 (ICMP 응답 기반 - Vercel에서는 제한적일 수 있음)"""
    result = {
        'ip': ip,
        'port': port,
        'protocol': 'udp',
        'state': 'open|filtered',  # Default for UDP
        'service': COMMON_PORTS['udp'].get(port, 'Unknown'),
        'banner': None
    }
    
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        sock.settimeout(timeout)
        
        # 서비스별 프로브 데이터
        probe_data = b''
        if port == 53: probe_data = b'\x00\x00\x10\x00\x00\x00\x00\x00\x00\x00\x00\x00'
        elif port == 123: probe_data = b'\xe3\x00\x04\xfa\x00\x01\x00\x00\x00\x01\x00\x00'
        elif port == 161: probe_data = b'\x30\x26\x02\x01\x01\x04\x06\x70\x75\x62\x6c\x69\x63'
        
        sock.sendto(probe_data if probe_data else b'\x00', (ip, port))
        
        try:
            data, addr = sock.recvfrom(1024)
            if data:
                result['state'] = 'open'
                result['banner'] = data.hex()[:20] if data else None
        except socket.timeout:
            # 응답 없음 = open|filtered
            pass
        except ConnectionResetError:
            # ICMP Unreachable received (only works if OS passes it up)
            result['state'] = 'closed'
        
        sock.close()
    except Exception as e:
        result['state'] = 'error'
        result['error'] = str(e)
    
    return result


def parse_ip_range(ip_range: str) -> list:
    """IP 범위 파싱"""
    ips = []
    try:
        if '/' in ip_range:
            network = ipaddress.ip_network(ip_range, strict=False)
            # Vercel 타임아웃 방지를 위해 제한
            if network.num_addresses > 256:
                raise ValueError("IP 범위가 너무 큽니다. (최대 256개)")
            ips = [str(ip) for ip in network.hosts()]
        elif '-' in ip_range:
            parts = ip_range.split('-')
            if len(parts) == 2:
                start_ip = ipaddress.ip_address(parts[0].strip())
                end_ip = ipaddress.ip_address(parts[1].strip())
                if int(end_ip) - int(start_ip) > 255:
                    raise ValueError("IP 범위가 너무 큽니다. (최대 256개)")
                current = start_ip
                while current <= end_ip:
                    ips.append(str(current))
                    current = ipaddress.ip_address(int(current) + 1)
        else:
            ips = [str(ipaddress.ip_address(ip_range.strip()))]
    except Exception as e:
        raise ValueError(f"잘못된 IP 형식: {str(e)}")
    return ips


def parse_port_range(port_range: str) -> list:
    """포트 범위 파싱"""
    ports = []
    for part in port_range.split(','):
        part = part.strip()
        if '-' in part:
            start, end = map(int, part.split('-'))
            if end - start > 100: # Vercel 타임아웃 고려하여 배치 사이즈 조절 권장
                # 여기서는 단순히 파싱만 하고, 클라이언트에서 배치 처리를 유도
                pass
            ports.extend(range(start, end + 1))
        else:
            ports.append(int(part))
    
    ports = [p for p in ports if 1 <= p <= 65535]
    if len(ports) > 1000:
        raise ValueError("포트 수가 너무 많습니다. (최대 1000개)")
    return sorted(set(ports))


# Index route removed as this is now an API-only backend


@app.route('/api/expand_targets', methods=['POST'])
def expand_targets():
    """1단계: 스캔 대상을 전개하여 클라이언트 반환"""
    try:
        data = request.json
        ip_range = data.get('ip_range', '')
        port_range = data.get('port_range', '')
        protocol = data.get('protocol', 'tcp').lower()
        
        if not ip_range or not port_range:
            return jsonify({'error': 'IP 및 포트 범위를 입력하세요.'}), 400
            
        ips = parse_ip_range(ip_range)
        ports = parse_port_range(port_range)
        
        # 모든 조합 생성
        targets = []
        for ip in ips:
            for port in ports:
                targets.append({'ip': ip, 'port': port, 'protocol': protocol})
                
        return jsonify({
            'total': len(targets),
            'targets': targets
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/scan_batch', methods=['POST'])
def scan_batch():
    """2단계: 클라이언트가 보낸 타겟 리스트(배치)를 즉시 스캔"""
    try:
        data = request.json
        targets = data.get('targets', [])
        
        if not targets:
            return jsonify({'results': []})
            
        results = []
        # Vercel Function Timeout 내에 처리하기 위해 ThreadPool 사용
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = []
            for target in targets:
                ip = target['ip']
                port = int(target['port'])
                protocol = target.get('protocol', 'tcp')
                
                if protocol == 'tcp':
                    futures.append(executor.submit(scan_tcp_port, ip, port))
                else:
                    futures.append(executor.submit(scan_udp_port, ip, port))
            
            for future in as_completed(futures):
                results.append(future.result())
                
        return jsonify({'results': results})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/common-ports', methods=['GET'])
def get_common_ports():
    return jsonify(COMMON_PORTS)


# Vercel이 이 app 객체를 사용함
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
