<div align="center">

# Hovia

<img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black" height="20" alt="React" />&nbsp;&nbsp;
<img src="https://img.shields.io/badge/C%2B%2B-00599C?style=flat&logo=c%2B%2B&logoColor=white" height="20" alt="C++" />&nbsp;&nbsp;
<img src="https://img.shields.io/github/issues/AlexPavlou/Hovia?style=flat&logo=github&label=Issues" height="20" alt="Issues" />&nbsp;&nbsp;
<img src="https://img.shields.io/badge/license-MIT-blue.svg?style=flat" height="20" alt="License" />&nbsp;&nbsp;
<img src="https://img.shields.io/badge/Linux-FCC624?style=flat&logo=linux&logoColor=black" height="20" alt="Linux" />&nbsp;&nbsp;
<img src="https://img.shields.io/badge/Windows-0078D6?style=flat&logo=windows&logoColor=white" height="20" alt="Windows" />&nbsp;&nbsp;
<img src="https://img.shields.io/badge/macOS-000000?style=flat&logo=apple&logoColor=white" height="20" alt="macOS" />

*Real-time IP packet sniffer with interactive route visualization.*

</div>


---

## App Summary

Hovia is a full-stack application that captures IP packets in real time and visualizes their routes — including the intermediate hops — on an interactive 3D globe.

The backend is written in C++ and uses libtins to sniff IP traffic, along with low-level libraries to perform traceroute operations. IP lookups are handled asynchronously via API calls.

The frontend, built with React, connects to the backend in two ways:

1. Through WebSocket to receive live data and render detailed routing paths on the 3D map.

2. Through a RESTful HTTP API to retrieve and modify app settings.

Visualizing how your network traffic flows globally.

---

## Key Features

- Packet sniffing powered by *libtins* (and *libpcap*/WinPcap), all in a performant C++ environment  
- Thread-safe queues enable smooth data flow between sniffing, lookup, and API threads  
- Asynchronous retrieval of IP info and geolocation via **ip-api.com**  
- Interactive React frontend showing IP hops and metadata on an SVG map  
- Cross-platform support: Windows, Linux, macOS, BSD  
- Light and dark theme support with responsive design  
- Packet history log with upcoming filtering and tooltip features  
- Extensive configuration via the frontend (all settings are stored in settings.js). See [#Configuration](#Configuration) for further information
- RESTful API implementation for retrieving and updating app settings from the frontend
- Live visualization of IP packet routes on an interactive map  
- Real-time updates over a WebSocket connection  
- Customizable Websocket port


---

## Technologies & Architecture

<div align="center">

| Component     | Technology                      |
| ------------- | ------------------------------- |
| Backend       | C++ with libtins, libpcap/WinPcap|
| Frontend      | React, JSX, JavaScript, CSS     |
| Communication | WebSocket, HTTP                 |
| Build System  | CMake (backend), npm (frontend) |

</div>


---

## Getting Started

### Prerequisites

- Node.js and npm
- libpcap (Linux/macOS) or WinPcap (Windows)  
- libtins

### Installation & Build

#### 1. Clone Repository

- Clone the repository:  
  ```bash
  git clone https://github.com/AlexPavlou/Hovia.git
  ```  
- Navigate into the project folder:  
  ```bash
  cd Hovia
  ```

#### 2. Build Backend

- **Linux / macOS:**  
  ```bash
  cd backend
  mkdir build && cd build
  cmake .. && make  
  ```

- **Windows:**  
  *(Under construction)*  

#### 3. Install Frontend Dependencies and Build

  ```bash
  cd frontend
  npm install
  npm run build
  ```

### Running

- Run the backend executable (requires admin/root privileges):  
  ```bash
  doas ./hovia
  ```
  or
  ```bash
  sudo ./hovia
  ```

- Start the frontend development server:  
  ```bash
  npm start
  ```  


---

## Usage

Simply Use your computer as normal while Hovia runs.

## Configuration

The app can be customized either via the frontend UI or by editing the settings.js file. These settings control the app’s behavior, appearance, and network preferences.

<details>
  <summary><strong>Language</strong></summary>

  &nbsp;&nbsp;Controls the language used for app menus and messages.  
  **Options:** English, Greek, Spanish  
  **Default:** English  
</details>

<details>
  <summary><strong>Animation Toggle</strong></summary>

  &nbsp;&nbsp;Enable or disable UI animations.  
  **Options:** On, Off  
  **Default:** On  
</details>

<details>
  <summary><strong>Verbose Logging</strong></summary>

  &nbsp;&nbsp;Turns on extensive logging to help with debugging and monitoring.  
  **Options:** On, Off  
  **Default:** Off  
</details>

<details>
  <summary><strong>Traceroute Timeout</strong></summary>

  &nbsp;&nbsp;Timeout in seconds before a traceroute request is considered failed.  
  **Type:** Number (seconds)  
  **Default:** 1 second  
</details>

<details>
  <summary><strong>Log Path</strong></summary>

  &nbsp;&nbsp;File path where application logs are saved.  
  **Default:** ./app.log  
</details>

<details>
  <summary><strong>Interface Option</strong></summary>

  &nbsp;&nbsp;Network interface used for packet capturing. If set to Auto, the app will use the system’s default interface.  
  **Default:** Auto  
</details>

<details>
  <summary><strong>IP Filter</strong></summary>

  &nbsp;&nbsp;Filter expression for limiting captured traffic.  
  &nbsp;&nbsp;**Default:**  
  &nbsp;&nbsp;&nbsp;&nbsp;(ip and (tcp or udp or icmp)) and not dst net 10.0.0.0/8 and not dst net 172.16.0.0/12 and not dst net 192.168.0.0/16 and not dst net 224.0.0.0/4 and not dst net 240.0.0.0/4  
  
  &nbsp;&nbsp;This filter tracks outgoing TCP, UDP, and ICMP IP packets, excluding private, multicast, and reserved IP ranges.  
</details>

<details>
  <summary><strong>Lookup Mode</strong></summary>

  &nbsp;&nbsp;Determines how IP lookups are performed.  
  &nbsp;&nbsp;**Options:**  
  &nbsp;&nbsp;- Auto — tries the database first, then fallbacks to the API  
  &nbsp;&nbsp;- DB — uses only the local database  
  &nbsp;&nbsp;- API — uses only the external API  
  
  &nbsp;&nbsp;**Default:** Auto  
</details>

<details>
  <summary><strong>Active Theme</strong></summary>

  &nbsp;&nbsp;User interface theme. When set to Auto, the app follows system preferences.  
  &nbsp;&nbsp;**Options:** Auto, Light, Dark  
  &nbsp;&nbsp;**Default:** Auto  
</details>

<details>
  <summary><strong>Max Hops</strong></summary>

  &nbsp;&nbsp;Maximum number of hops that traceroute will follow before stopping.  
  &nbsp;&nbsp;**Type:** Number  
  &nbsp;&nbsp;**Default:** 15  
</details>

<details>
  <summary><strong>WebSocket Port</strong></summary>

  &nbsp;&nbsp;Port number the WebSocket server listens on.  
  &nbsp;&nbsp;**Default:** 9002  
</details>

---

## Acknowledgments

- High-performance packet sniffing with [libpcap](https://github.com/the-tcpdump-group/libpcap), [WinPcap](https://www.winpcap.org/), and [libtins](https://libtins.github.io)  
- Utilised a Unix traceroute implementation, [traceroute](https://github.com/imdibr/traceroute) by [imdibr](https://github.com/imdibr), applying debugging and modifications
- IP geolocation data provided by [ip-api.com](http://ip-api.com)  
- Inspired by network tools like Wireshark


---
