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

Hovia is a full-stack application with a C++ backend and a React frontend that captures IP packets in real time and visualizes their routes—including the in-between hops—on an interactive map.

The backend makes use of libtins to sniff IP traffic and low-level libraries to perform the traceroute operation, while IP lookups are performed asynchronously via API calls. Meanwhile, the frontend connects through WebSocket to receive live data and display detailed routing paths on an SVG map, helping you understand how your network traffic flows globally.


---

## Key Features

- Packet sniffing powered by *libtins* (and *libpcap*/WinPcap), all in a C++ environment  
- Thread-safe queues enable smooth data flow between sniffing, lookup, and API threads  
- Asynchronous retrieval of IP info and geolocation via **ip-api.com**  
- Interactive React frontend showing IP hops and metadata on an SVG map  
- Cross-platform: Windows, Linux, macOS (including BSD)  
- Light and dark theme support with responsive design  
- Packet history log with upcoming filtering and tooltip features  
- Simple configuration through `settings.js` (see [#Configuration](#Configuration) for further information)
- RESTful API implementation for retrieving and updating app settings from the frontend
- Live visualization of IP packet routes on an interactive map  
- Real-time updates over WebSocket connection  


---

## Technologies & Architecture

<div align="center">

| Component     | Technology                       |
| ------------- | ------------------------------- |
| Backend       | C++ with libtins, libpcap/WinPcap |
| Frontend      | React, JSX, JavaScript, CSS     |
| Communication | WebSocket, HTTP                 |
| Build System  | CMake (backend)                 |

</div>


---

## Getting Started

### Prerequisites

> - Node.js and npm installed  
> - libpcap (Linux/macOS) or WinPcap (Windows)  
> - libtins installed  

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

The app can be customized via the `settings.js` file to specify API endpoints, themes, and other preferences.

> **TODO:** Document all setting variables.


---

## Acknowledgments

- High-performance packet sniffing with [libpcap](https://github.com/the-tcpdump-group/libpcap), [WinPcap](https://www.winpcap.org/), and [libtins](https://libtins.github.io)  
- Forked, debugged, and altered a Unix traceroute implementation [traceroute](https://github.com/imdibr/traceroute) by [imdibr](https://github.com/imdibr)  
- IP geolocation data provided by [ip-api.com](http://ip-api.com)  
- Inspired by network tools like Wireshark


---
