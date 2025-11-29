#!/bin/bash
# ============================================================================
# Raspberry Pi WiFi Hotspot Setup Script
# 
# Converts Raspberry Pi into a portable field server with WiFi hotspot.
# Phones can connect to the Pi's WiFi and use the BirdSound API locally.
#
# Features:
# - Creates WiFi Access Point (AP mode)
# - DHCP server for connected clients
# - Captive portal redirect
# - Auto-start on boot
# - Switch between AP and client mode
#
# Usage:
#   sudo ./raspberry_hotspot_setup.sh [install|ap|client|status]
#
# Requirements:
# - Raspberry Pi 3B+, 4, or 5 with built-in WiFi
# - Raspberry Pi OS (Bookworm recommended)
# - Root privileges
# ============================================================================

set -e

# ============================================================================
# Configuration
# ============================================================================

# WiFi settings
WIFI_SSID="BirdSound-Pi"
WIFI_PASSWORD="vogelmusik"  # Min 8 characters
WIFI_CHANNEL="7"
WIFI_COUNTRY="DE"

# Network settings
AP_IP="192.168.42.1"
AP_NETMASK="255.255.255.0"
DHCP_RANGE_START="192.168.42.10"
DHCP_RANGE_END="192.168.42.50"
DHCP_LEASE_TIME="12h"

# Service port
API_PORT="8003"

# ============================================================================
# Colors
# ============================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ============================================================================
# Check Prerequisites
# ============================================================================

check_root() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Dieses Skript muss als root ausgeführt werden"
        echo "  sudo $0 $*"
        exit 1
    fi
}

check_raspberry_pi() {
    if ! grep -q "Raspberry Pi" /proc/device-tree/model 2>/dev/null; then
        log_warn "Dies scheint kein Raspberry Pi zu sein"
        log_warn "Das Skript könnte trotzdem funktionieren..."
    fi
}

check_wifi_interface() {
    if ! ip link show wlan0 &>/dev/null; then
        log_error "Keine WLAN-Schnittstelle (wlan0) gefunden"
        exit 1
    fi
    log_success "WLAN-Schnittstelle gefunden: wlan0"
}

# ============================================================================
# Installation
# ============================================================================

install_packages() {
    log_info "Installiere erforderliche Pakete..."
    
    apt-get update
    apt-get install -y \
        hostapd \
        dnsmasq \
        iptables \
        netfilter-persistent \
        iptables-persistent
    
    log_success "Pakete installiert"
}

configure_dhcpcd() {
    log_info "Konfiguriere dhcpcd..."
    
    # Backup original
    cp /etc/dhcpcd.conf /etc/dhcpcd.conf.backup 2>/dev/null || true
    
    # Check if AP config already exists
    if grep -q "interface wlan0" /etc/dhcpcd.conf && grep -q "static ip_address=${AP_IP}" /etc/dhcpcd.conf; then
        log_info "dhcpcd bereits konfiguriert"
        return
    fi
    
    # Add AP configuration (commented out by default)
    cat >> /etc/dhcpcd.conf << EOF

# BirdSound Hotspot Configuration
# Uncomment the following lines to enable AP mode
#interface wlan0
#    static ip_address=${AP_IP}/24
#    nohook wpa_supplicant
EOF
    
    log_success "dhcpcd konfiguriert"
}

configure_hostapd() {
    log_info "Konfiguriere hostapd..."
    
    cat > /etc/hostapd/hostapd.conf << EOF
# BirdSound WiFi Hotspot Configuration
# Generated: $(date)

# Interface and driver
interface=wlan0
driver=nl80211

# WiFi settings
ssid=${WIFI_SSID}
hw_mode=g
channel=${WIFI_CHANNEL}
country_code=${WIFI_COUNTRY}

# Security
wpa=2
wpa_passphrase=${WIFI_PASSWORD}
wpa_key_mgmt=WPA-PSK
wpa_pairwise=TKIP
rsn_pairwise=CCMP

# Performance
wmm_enabled=0
macaddr_acl=0
auth_algs=1
ignore_broadcast_ssid=0

# Optional: IEEE 802.11n support (for better performance)
ieee80211n=1
ht_capab=[HT40][SHORT-GI-20][DSSS_CCK-40]
EOF
    
    # Set hostapd config file location
    sed -i 's|#DAEMON_CONF=""|DAEMON_CONF="/etc/hostapd/hostapd.conf"|' /etc/default/hostapd
    
    log_success "hostapd konfiguriert"
}

configure_dnsmasq() {
    log_info "Konfiguriere dnsmasq..."
    
    # Backup original
    mv /etc/dnsmasq.conf /etc/dnsmasq.conf.backup 2>/dev/null || true
    
    cat > /etc/dnsmasq.conf << EOF
# BirdSound DHCP and DNS Configuration
# Generated: $(date)

# Interface
interface=wlan0

# DHCP settings
dhcp-range=${DHCP_RANGE_START},${DHCP_RANGE_END},${AP_NETMASK},${DHCP_LEASE_TIME}

# DNS settings - use Pi as DNS server
address=/#/${AP_IP}

# Don't read /etc/resolv.conf
no-resolv

# Log DHCP transactions (for debugging)
log-dhcp

# Captive portal - redirect common check URLs
address=/connectivitycheck.gstatic.com/${AP_IP}
address=/www.msftconnecttest.com/${AP_IP}
address=/captive.apple.com/${AP_IP}
address=/www.apple.com/${AP_IP}
EOF
    
    log_success "dnsmasq konfiguriert"
}

configure_ip_forwarding() {
    log_info "Aktiviere IP-Forwarding..."
    
    # Enable immediately
    echo 1 > /proc/sys/net/ipv4/ip_forward
    
    # Enable permanently
    sed -i 's/#net.ipv4.ip_forward=1/net.ipv4.ip_forward=1/' /etc/sysctl.conf
    
    log_success "IP-Forwarding aktiviert"
}

configure_iptables() {
    log_info "Konfiguriere iptables..."
    
    # Clear existing rules
    iptables -t nat -F
    iptables -F
    
    # Allow established connections
    iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT
    
    # Allow SSH
    iptables -A INPUT -p tcp --dport 22 -j ACCEPT
    
    # Allow DNS
    iptables -A INPUT -p udp --dport 53 -j ACCEPT
    iptables -A INPUT -p tcp --dport 53 -j ACCEPT
    
    # Allow DHCP
    iptables -A INPUT -p udp --dport 67:68 -j ACCEPT
    
    # Allow API port
    iptables -A INPUT -p tcp --dport ${API_PORT} -j ACCEPT
    
    # Allow HTTP/HTTPS for captive portal
    iptables -A INPUT -p tcp --dport 80 -j ACCEPT
    iptables -A INPUT -p tcp --dport 443 -j ACCEPT
    
    # Allow loopback
    iptables -A INPUT -i lo -j ACCEPT
    
    # NAT for internet sharing (if eth0 connected)
    iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
    
    # Redirect HTTP to local server (captive portal)
    iptables -t nat -A PREROUTING -i wlan0 -p tcp --dport 80 -j DNAT --to-destination ${AP_IP}:${API_PORT}
    
    # Save rules
    netfilter-persistent save
    
    log_success "iptables konfiguriert"
}

create_control_script() {
    log_info "Erstelle Kontroll-Skript..."
    
    cat > /usr/local/bin/birdsound-wifi << 'SCRIPT'
#!/bin/bash
# BirdSound WiFi Mode Controller

AP_IP="192.168.42.1"

case "$1" in
    ap|hotspot)
        echo "Switching to Access Point mode..."
        
        # Stop wpa_supplicant
        systemctl stop wpa_supplicant
        
        # Configure static IP
        sed -i 's/#interface wlan0/interface wlan0/' /etc/dhcpcd.conf
        sed -i "s/#    static ip_address=${AP_IP}/    static ip_address=${AP_IP}/" /etc/dhcpcd.conf
        sed -i 's/#    nohook wpa_supplicant/    nohook wpa_supplicant/' /etc/dhcpcd.conf
        
        # Restart networking
        systemctl daemon-reload
        systemctl restart dhcpcd
        
        # Start hostapd and dnsmasq
        systemctl unmask hostapd
        systemctl enable hostapd dnsmasq
        systemctl start hostapd dnsmasq
        
        echo "✓ Access Point mode activated"
        echo "  SSID: $(grep ^ssid= /etc/hostapd/hostapd.conf | cut -d= -f2)"
        echo "  IP: ${AP_IP}"
        ;;
        
    client|wifi)
        echo "Switching to Client mode..."
        
        # Stop AP services
        systemctl stop hostapd dnsmasq
        systemctl disable hostapd dnsmasq
        
        # Remove static IP
        sed -i 's/^interface wlan0/#interface wlan0/' /etc/dhcpcd.conf
        sed -i "s/^    static ip_address=${AP_IP}/#    static ip_address=${AP_IP}/" /etc/dhcpcd.conf
        sed -i 's/^    nohook wpa_supplicant/#    nohook wpa_supplicant/' /etc/dhcpcd.conf
        
        # Restart networking
        systemctl daemon-reload
        systemctl restart dhcpcd
        systemctl start wpa_supplicant
        
        echo "✓ Client mode activated"
        ;;
        
    status)
        echo "=== BirdSound WiFi Status ==="
        echo ""
        
        if systemctl is-active --quiet hostapd; then
            echo "Mode: Access Point (Hotspot)"
            echo "SSID: $(grep ^ssid= /etc/hostapd/hostapd.conf | cut -d= -f2)"
        else
            echo "Mode: Client"
        fi
        
        echo ""
        echo "IP Address:"
        ip addr show wlan0 | grep "inet " | awk '{print "  " $2}'
        
        echo ""
        echo "Connected Clients:"
        if [ -f /var/lib/misc/dnsmasq.leases ]; then
            cat /var/lib/misc/dnsmasq.leases | awk '{print "  " $3 " (" $4 ")"}'
        fi
        
        echo ""
        echo "Services:"
        echo "  hostapd:  $(systemctl is-active hostapd)"
        echo "  dnsmasq:  $(systemctl is-active dnsmasq)"
        echo "  birdsound: $(systemctl is-active birdsound || echo 'not installed')"
        ;;
        
    clients)
        echo "Connected Clients:"
        if [ -f /var/lib/misc/dnsmasq.leases ]; then
            cat /var/lib/misc/dnsmasq.leases | awk '{printf "  %-15s %s (%s)\n", $3, $4, $2}'
        else
            echo "  No clients connected"
        fi
        ;;
        
    *)
        echo "Usage: birdsound-wifi [ap|client|status|clients]"
        echo ""
        echo "Commands:"
        echo "  ap, hotspot  - Enable Access Point mode"
        echo "  client, wifi - Enable WiFi Client mode"
        echo "  status       - Show current status"
        echo "  clients      - List connected devices"
        exit 1
        ;;
esac
SCRIPT
    
    chmod +x /usr/local/bin/birdsound-wifi
    
    log_success "Kontroll-Skript erstellt: birdsound-wifi"
}

create_captive_portal() {
    log_info "Erstelle Captive Portal Seite..."
    
    mkdir -p /var/www/captive
    
    cat > /var/www/captive/index.html << 'HTML'
<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BirdSound - Verbunden</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1E1E2E 0%, #2D2D44 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px 20px;
            max-width: 400px;
        }
        .logo {
            font-size: 80px;
            margin-bottom: 20px;
        }
        h1 {
            font-size: 28px;
            margin-bottom: 10px;
            color: #4ECDC4;
        }
        .subtitle {
            color: #888;
            margin-bottom: 30px;
        }
        .info-box {
            background: rgba(255,255,255,0.1);
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 20px;
        }
        .info-row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255,255,255,0.1);
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .label {
            color: #888;
        }
        .value {
            color: #4ECDC4;
            font-weight: 600;
        }
        .button {
            display: inline-block;
            background: #4ECDC4;
            color: #1E1E2E;
            text-decoration: none;
            padding: 15px 40px;
            border-radius: 30px;
            font-weight: 600;
            font-size: 16px;
            margin-top: 20px;
            transition: transform 0.2s;
        }
        .button:hover {
            transform: scale(1.05);
        }
        .footer {
            margin-top: 30px;
            color: #666;
            font-size: 12px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🐦</div>
        <h1>BirdSound Pi</h1>
        <p class="subtitle">Vogelstimmen-Erkennung im Feld</p>
        
        <div class="info-box">
            <div class="info-row">
                <span class="label">Status</span>
                <span class="value">✓ Verbunden</span>
            </div>
            <div class="info-row">
                <span class="label">Server</span>
                <span class="value" id="server-ip">192.168.42.1</span>
            </div>
            <div class="info-row">
                <span class="label">API Port</span>
                <span class="value">8003</span>
            </div>
        </div>
        
        <p>Öffne die BirdSound App und verbinde dich mit dem lokalen Server.</p>
        
        <a href="http://192.168.42.1:8003" class="button">
            🎵 Zur Web-App
        </a>
        
        <div class="footer">
            <p>BirdNET V2.4 • ~6500 Vogelarten</p>
            <p>Offline-Modus aktiv</p>
        </div>
    </div>
    
    <script>
        // Update server IP dynamically
        document.getElementById('server-ip').textContent = window.location.hostname;
    </script>
</body>
</html>
HTML
    
    log_success "Captive Portal erstellt"
}

# ============================================================================
# Main Functions
# ============================================================================

do_install() {
    log_info "=== BirdSound WiFi Hotspot Installation ==="
    echo ""
    
    check_root
    check_raspberry_pi
    check_wifi_interface
    
    echo ""
    log_info "WiFi-Konfiguration:"
    echo "  SSID:     ${WIFI_SSID}"
    echo "  Passwort: ${WIFI_PASSWORD}"
    echo "  IP:       ${AP_IP}"
    echo ""
    
    install_packages
    configure_dhcpcd
    configure_hostapd
    configure_dnsmasq
    configure_ip_forwarding
    configure_iptables
    create_control_script
    create_captive_portal
    
    echo ""
    log_success "=== Installation abgeschlossen ==="
    echo ""
    echo "Verwendung:"
    echo "  sudo birdsound-wifi ap      # Hotspot aktivieren"
    echo "  sudo birdsound-wifi client  # Zurück zu WiFi-Client"
    echo "  sudo birdsound-wifi status  # Status anzeigen"
    echo ""
    echo "Nach Aktivierung:"
    echo "  1. Handy mit '${WIFI_SSID}' verbinden"
    echo "  2. Passwort: ${WIFI_PASSWORD}"
    echo "  3. App-Server: http://${AP_IP}:${API_PORT}"
}

do_enable_ap() {
    check_root
    /usr/local/bin/birdsound-wifi ap
}

do_enable_client() {
    check_root
    /usr/local/bin/birdsound-wifi client
}

do_status() {
    /usr/local/bin/birdsound-wifi status 2>/dev/null || {
        log_error "Kontroll-Skript nicht gefunden"
        log_info "Führe erst die Installation aus: sudo $0 install"
    }
}

# ============================================================================
# Entry Point
# ============================================================================

case "${1:-install}" in
    install)
        do_install
        ;;
    ap|hotspot)
        do_enable_ap
        ;;
    client|wifi)
        do_enable_client
        ;;
    status)
        do_status
        ;;
    *)
        echo "BirdSound Raspberry Pi WiFi Hotspot Setup"
        echo ""
        echo "Verwendung: sudo $0 [BEFEHL]"
        echo ""
        echo "Befehle:"
        echo "  install   - Installiere und konfiguriere Hotspot"
        echo "  ap        - Aktiviere Access Point Modus"
        echo "  client    - Aktiviere WiFi Client Modus"
        echo "  status    - Zeige aktuellen Status"
        exit 1
        ;;
esac
