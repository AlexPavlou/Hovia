import React, {
    useState,
    useEffect,
    useRef
} from "react";
import Sidebar from "./Sidebar";
import Logging from "./Logging";
import Map from "./Map";

function App() {
    const [settings, setSettings] = useState(null);
    const [traceResults, setTraceResults] = useState([]);
    const [darkMode, setDarkMode] = useState(false);
    const [selectedPage, setSelectedPage] = useState("map");
    const ws = useRef(null);

    useEffect(() => {
        fetch("http://localhost:8080/api/settings")
            .then((res) => res.json())
            .then((data) => {
                setSettings(data);
                if (data.darkMode !== undefined) setDarkMode(data.darkMode);
            })
            .catch((err) => console.error("Failed to load settings", err));
    }, []);

    useEffect(() => {
        if (!settings) return;

        let retries = 0;
        const maxRetries = 5;

        const connect = () => {
            const socket = new WebSocket("ws://localhost:9002");
            ws.current = socket;

            socket.onopen = () => {
                console.log("WebSocket connected, readyState:", socket.readyState);
                retries = 0;
            };

            socket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data?.hops?.length) setTraceResults((prev) => [...prev, data]);
                } catch {
                    console.warn("Invalid WS JSON", event.data);
                }
            };

            socket.onerror = (event) => {
                console.error("WebSocket error:", event);
            };

            socket.onclose = (event) => {
                console.log("WebSocket closed, code:", event.code, "reason:", event.reason);
                if (retries < maxRetries) {
                    retries++;
                    setTimeout(connect, 3000);
                }
            };
        };


        connect();

        return () => {
            if (ws.current) ws.current.close();
        };
    }, [settings]);

    const toggleDarkMode = () => setDarkMode((prev) => !prev);

    let content = null;
    if (selectedPage === "logging") content = < Logging traceResults = {
        traceResults
    }
    />;
    else if (selectedPage === "map")
        content = < Map traceResults = {
            traceResults
        }
    initialCenter = {
        [0, 0]
    }
    />;

    return ( <
        div style = {
            {
                display: "flex",
                height: "100vh",
                color: darkMode ? "#fafafa" : "#222",
                backgroundColor: darkMode ? "#121212" : "#fff",
            }
        } >
        <
        Sidebar isDark = {
            darkMode
        }
        toggleDarkMode = {
            toggleDarkMode
        }
        onSelect = {
            setSelectedPage
        }
        active = {
            selectedPage
        }
        /> <
        main style = {
            {
                flexGrow: 1,
                padding: 24,
                overflowY: "auto",
                backgroundColor: darkMode ? "#222" : "#f9f9f9",
            }
        } >
        {
            content
        } <
        /main> <
        /div>
    );
}

export default App;
