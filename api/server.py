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
import requests
import re
import base64
import json


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


@app.route('/api/diag_session', methods=['POST'])
def diag_session():
    """EDR Bypass: 단일 라우트로 페이징 및 스캔 결과 반환 (Base64 입출력)"""
    try:
        data = request.json
        if 'q' not in data:
            return jsonify({'error': 'Invalid payload'}), 400
            
        try:
            decoded_str = base64.b64decode(data['q']).decode('utf-8')
            payload = json.loads(decoded_str)
        except Exception:
            return jsonify({'error': 'Decryption failed'}), 400
            
        ip_range = payload.get('t', '')
        port_range = payload.get('p', '')
        protocol = payload.get('pr', 'tcp').lower()
        offset = int(payload.get('idx', 0))
        limit = int(payload.get('sz', 15))
        
        if not ip_range or not port_range:
            return jsonify({'error': 'Missing input'}), 400
            
        ips = parse_ip_range(ip_range)
        ports = parse_port_range(port_range)
        
        targets = []
        for ip in ips:
            for port in ports:
                targets.append({'ip': ip, 'port': port, 'protocol': protocol})
                
        total_count = len(targets)
        batch_targets = targets[offset : offset + limit]
        
        if not batch_targets:
            resp_json = json.dumps({'total': total_count, 'results': []})
            return jsonify({'d': base64.b64encode(resp_json.encode('utf-8')).decode('utf-8')})
            
        results = []
        with ThreadPoolExecutor(max_workers=20) as executor:
            futures = []
            for target in batch_targets:
                ip = target['ip']
                port = int(target['port'])
                prot = target.get('protocol', 'tcp')
                
                if prot == 'tcp':
                    futures.append(executor.submit(scan_tcp_port, ip, port))
                else:
                    futures.append(executor.submit(scan_udp_port, ip, port))
            
            for future in as_completed(futures):
                results.append(future.result())
                
        resp_json = json.dumps({
            'total': total_count,
            'results': results
        })
        
        return jsonify({
            'd': base64.b64encode(resp_json.encode('utf-8')).decode('utf-8')
        })
        
    except ValueError as e:
        return jsonify({'error': str(e)}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/common-ports', methods=['GET'])
def get_common_ports():
    return jsonify(COMMON_PORTS)


def get_default_gateway():
    """
    현재 시스템의 기본 게이트웨이 IP를 감지합니다.
    감지할 수 없으면 None을 반환합니다.
    """
    import platform
    import subprocess
    import re
    
    system_name = platform.system().lower()
    
    try:
        if 'windows' in system_name:
            # route print 명령어를 실행하여 0.0.0.0 에 해당하는 게이트웨이 추출
            process = subprocess.run(
                ['route', 'print', '0.0.0.0'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=3,
                shell=True
            )
            stdout = process.stdout
            match = re.search(r'0\.0\.0\.0\s+0\.0\.0\.0\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', stdout)
            if match:
                return match.group(1)
            
            # fallback to ipconfig
            process = subprocess.run(
                ['ipconfig'],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=3
            )
            matches = re.findall(r'(?:기본 게이트웨이|Default Gateway)(?:\s|\.)*:\s*(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', process.stdout, re.IGNORECASE)
            if matches:
                for ip in matches:
                    if ip != '0.0.0.0':
                        return ip
                        
        else:
            # Linux/macOS
            try:
                process = subprocess.run(
                    ['ip', 'route', 'show'],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=3
                )
                match = re.search(r'default\s+via\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', process.stdout)
                if match:
                    return match.group(1)
            except Exception:
                pass
                
            try:
                process = subprocess.run(
                    ['netstat', '-rn'],
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    timeout=3
                )
                match = re.search(r'default\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})', process.stdout)
                if match:
                    return match.group(1)
            except Exception:
                pass
                
    except Exception:
        pass
        
    return None


@app.route('/api/gateway', methods=['GET'])
def get_gateway():
    gateway_ip = get_default_gateway()
    if gateway_ip:
        return jsonify({'success': True, 'gateway': gateway_ip})
    else:
        return jsonify({'success': False, 'gateway': None})


def determine_whois_query_type(query: str) -> str:
    query = query.strip()
    if re.match(r'^AS\d+$', query, re.IGNORECASE):
        return 'as_number'
    
    try:
        ipaddress.ip_address(query)
        return 'ip_address'
    except ValueError:
        pass
        
    return 'domain_name'

@app.route('/api/whois', methods=['GET'])
def whois_lookup():
    """공공데이터포털 Whois API 프록시"""
    query = request.args.get('query', '').strip()
    if not query:
        return jsonify({'error': '검색어를 입력하세요.'}), 400
        
    query_type = determine_whois_query_type(query)
    
    resolved_ip = None
    if query_type == 'domain_name':
        try:
            resolved_ip = socket.gethostbyname(query)
        except Exception:
            pass

    url = f"http://apis.data.go.kr/B551505/whois/{query_type}"
    
    API_KEY = os.environ.get("KISA_WHOIS_API_KEY")
    if not API_KEY:
        # Fallback to the hardcoded key for local dev if the user didn't set it in the environment
        API_KEY = "fa19607998cfaf40deefe038c513e9d9bbfd09dee004f2f7e3ed807cfe22cea5"
    
    params = {
        'serviceKey': API_KEY,
        'query': query,
        'answer': 'json'
    }
    
    result_data = {}
    
    try:
        response = requests.get(url, params=params, timeout=10)
        try:
            result_data = response.json()
        except ValueError:
            return jsonify({'error': 'JSON 파싱 실패', 'raw_response': response.text}), 500
            
    except requests.exceptions.RequestException as e:
        return jsonify({'error': f'API 호출 중 오류 발생: {str(e)}'}), 500

    if resolved_ip:
        result_data['resolved_ip'] = resolved_ip
        try:
            ip_url = "http://apis.data.go.kr/B551505/whois/ip_address"
            ip_res = requests.get(ip_url, params={'serviceKey': API_KEY, 'query': resolved_ip, 'answer': 'json'}, timeout=5)
            result_data['ip_whois'] = ip_res.json()
        except Exception:
            pass
            
    return jsonify(result_data)


def run_tcp_ping_fallback(host: str, count: int, timeout: int) -> dict:
    """
    시스템 ping 명령어를 사용할 수 없는 경우(예: Vercel 서버리스 환경 등)
    TCP 핸드셰이크를 이용해 지연 시간을 측정하는 Fallback 핑 함수
    """
    import time
    try:
        ip_address = socket.gethostbyname(host)
    except socket.gaierror:
        return {
            'success': False,
            'stdout': f"Ping request could not find host {host}. Please check the name and try again.",
            'stderr': "Name or service not known",
            'code': 1,
            'stats': {
                'sent': count,
                'received': 0,
                'lost': count,
                'loss_rate': 100,
                'min_time': None,
                'avg_time': None,
                'max_time': None
            }
        }

    ports = [80, 443, 22, 53, 135, 445, 8080]
    selected_port = 80
    min_probe_time = 99999.0
    
    # 각 포트를 짧게 핑하여 가장 응답이 빠른(열려있거나 즉시 RST를 보내는) 포트 탐색
    for p in ports:
        t_probe = time.perf_counter()
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(0.15)
            res = s.connect_ex((ip_address, p))
            s.close()
            elapsed = (time.perf_counter() - t_probe) * 1000
            
            if elapsed < min_probe_time:
                min_probe_time = elapsed
                selected_port = p
                if elapsed < 10.0:
                    break
        except Exception:
            continue

    rtts = []
    received = 0
    stdout_lines = [
        f"Pinging {host} [{ip_address}] with TCP Handshake on port {selected_port}:",
        f"[Fallback Mode] System 'ping' utility not found or restricted in this environment."
    ]

    for i in range(count):
        t_start = time.perf_counter()
        try:
            s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
            s.settimeout(float(timeout))
            res = s.connect_ex((ip_address, selected_port))
            s.close()
            
            rtt = (time.perf_counter() - t_start) * 1000
            
            # 0 (성공), 10061 (Windows Connection Refused), 111 (Linux Connection Refused), 61 (Mac Connection Refused)
            # 모두 대상 호스트가 살아있어서 응답한 것으로 간주
            if res in (0, 10061, 111, 61):
                rtts.append(rtt)
                received += 1
                state_str = "open" if res == 0 else "closed"
                stdout_lines.append(f"Reply from {ip_address}: port={selected_port} time={rtt:.2f}ms state={state_str}")
            else:
                stdout_lines.append(f"Request timed out for {ip_address} (port {selected_port}, error={res}).")
        except socket.timeout:
            stdout_lines.append(f"Request timed out for {ip_address} (port {selected_port}).")
        except Exception as e:
            stdout_lines.append(f"Error connecting to {ip_address}: {str(e)}")
        
        if i < count - 1:
            time.sleep(0.1)

    lost = count - received
    loss_rate = round((lost / count) * 100) if count > 0 else 100

    stats = {
        'sent': count,
        'received': received,
        'lost': lost,
        'loss_rate': loss_rate,
        'min_time': round(min(rtts), 2) if rtts else None,
        'avg_time': round(sum(rtts) / len(rtts), 2) if rtts else None,
        'max_time': round(max(rtts), 2) if rtts else None
    }

    stdout_lines.append("")
    stdout_lines.append(f"Ping statistics for {ip_address}:")
    stdout_lines.append(f"    Packets: Sent = {count}, Received = {received}, Lost = {lost} ({loss_rate}% loss)")
    if rtts:
        stdout_lines.append("Approximate round trip times in milli-seconds:")
        stdout_lines.append(f"    Minimum = {stats['min_time']:.2f}ms, Maximum = {stats['max_time']:.2f}ms, Average = {stats['avg_time']:.2f}ms")

    return {
        'success': received > 0,
        'stdout': "\n".join(stdout_lines),
        'stderr': "",
        'code': 0 if received > 0 else 1,
        'stats': stats
    }


@app.route('/api/ping', methods=['POST'])
def ping_host():
    """안전한 시스템 ping 명령을 사용한 호스트 진단"""
    import subprocess
    import platform
    import re
    
    try:
        data = request.json or {}
        host = data.get('host', '').strip()
        count = int(data.get('count', 4))
        timeout = int(data.get('timeout', 3))
        
        if not host:
            return jsonify({'error': '호스트 이름 또는 IP 주소를 입력하세요.'}), 400
            
        # 1-10회 범위 제한, 타임아웃 1-5초 범위 제한 (Vercel/서버 자원 보호)
        count = max(1, min(count, 10))
        timeout = max(1, min(timeout, 5))
        
        # 보안 필터링: Command Injection 방지 (영문자, 숫자, 마침표, 하이픈만 허용)
        if not re.match(r'^[a-zA-Z0-9.-]+$', host):
            return jsonify({'error': '올바르지 않은 호스트 이름 또는 IP 주소 형식입니다.'}), 400
            
        system_name = platform.system().lower()
        if 'windows' in system_name:
            cmd = ['ping', '-n', str(count), '-w', str(timeout * 1000), host]
        else:
            cmd = ['ping', '-c', str(count), '-W', str(timeout), host]
            
        # shell=False로 실행하여 명령어 주입 완벽히 차단
        try:
            process = subprocess.run(
                cmd,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                text=True,
                timeout=(timeout * count) + 5
            )
            stdout = process.stdout
            stderr = process.stderr
        except (FileNotFoundError, PermissionError, OSError):
            # 시스템 ping 명령어가 없거나 실행 권한이 없는 경우 TCP fallback 실행
            fallback_res = run_tcp_ping_fallback(host, count, timeout)
            return jsonify(fallback_res)
        
        # 핑 응답 통계 파싱 시도 (프리미엄 요약 카드용)
        stats = {
            'sent': count,
            'received': 0,
            'lost': count,
            'loss_rate': 100,
            'min_time': None,
            'avg_time': None,
            'max_time': None
        }
        
        # Windows 핑 결과 파싱
        if 'windows' in system_name:
            # 패킷 통계 찾기 (예: 보냄 = 4, 받음 = 4, 손실 = 0)
            packet_match = re.search(r'(=|:)\s*(\d+),\s*(받음|Received)\s*=\s*(\d+),\s*(손실|Lost)\s*=\s*(\d+)', stdout)
            if packet_match:
                stats['sent'] = int(packet_match.group(2))
                stats['received'] = int(packet_match.group(4))
                stats['lost'] = int(packet_match.group(6))
                if stats['sent'] > 0:
                    stats['loss_rate'] = round((stats['lost'] / stats['sent']) * 100)
            
            # 왕복 시간 찾기 (예: 최소 = 11ms, 최대 = 15ms, 평균 = 13ms)
            time_match = re.search(r'(최소|Minimum)\s*=\s*(\d+)ms,\s*(최대|Maximum)\s*=\s*(\d+)ms,\s*(평균|Average)\s*=\s*(\d+)ms', stdout)
            if time_match:
                stats['min_time'] = float(time_match.group(2))
                stats['max_time'] = float(time_match.group(4))
                stats['avg_time'] = float(time_match.group(6))
        # Linux / Mac 핑 결과 파싱
        else:
            # 패킷 통계 찾기 (예: 4 packets transmitted, 4 received, 0% packet loss)
            packet_match = re.search(r'(\d+)\s*packets\s*transmitted,\s*(\d+)\s*(packets\s*)?received,\s*(\d+)%\s*packet\s*loss', stdout, re.IGNORECASE)
            if packet_match:
                stats['sent'] = int(packet_match.group(1))
                stats['received'] = int(packet_match.group(2))
                stats['lost'] = stats['sent'] - stats['received']
                stats['loss_rate'] = int(packet_match.group(4))
            
            # 왕복 시간 찾기 (예: rtt min/avg/max/mdev = 11.234/13.456/15.789/1.020 ms)
            time_match = re.search(r'(rtt|round-trip)\s*min/avg/max/m?dev\s*=\s*([\d.]+)/([\d.]+)/([\d.]+)/([\d.]+)', stdout, re.IGNORECASE)
            if time_match:
                stats['min_time'] = float(time_match.group(2))
                stats['avg_time'] = float(time_match.group(3))
                stats['max_time'] = float(time_match.group(4))

        return jsonify({
            'success': process.returncode == 0 and stats['received'] > 0,
            'stdout': stdout,
            'stderr': stderr,
            'code': process.returncode,
            'stats': stats
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({'error': '핑 테스트 시간 초과(Timeout)가 발생했습니다.'}), 504
    except Exception as e:
        return jsonify({'error': f'핑 테스트 진행 중 에러가 발생했습니다: {str(e)}'}), 500


# Vercel이 이 app 객체를 사용함
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)

