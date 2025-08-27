import { useEffect, useRef, useCallback } from 'react';

export interface TraceResult {
    hops: unknown[];
}

export default function useWebSocket(
    port: number | null | undefined,
    onData: (data: TraceResult[]) => void,
) {
    const ws = useRef<WebSocket | null>(null);
    const buffer = useRef<TraceResult[]>([]);
    const flushTimeout = useRef<number | null>(null);
    const retries = useRef(0);
    const maxRetries = 5;

    // Wrap onData in useCallback to prevent unnecessary effect restarts
    const handleData = useCallback(
        (data: TraceResult[]) => onData(data),
        [onData],
    );

    useEffect(() => {
        if (!port) return;

        const flushBuffer = () => {
            if (buffer.current.length) {
                handleData(buffer.current.splice(0));
            }
        };

        const connect = () => {
            ws.current = new WebSocket(`ws://localhost:${port}`);

            ws.current.onopen = () => {
                retries.current = 0;
            };

            ws.current.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data);
                    if (data?.hops?.length) {
                        buffer.current.push(data);
                        if (!flushTimeout.current) {
                            flushTimeout.current = window.setTimeout(() => {
                                flushBuffer();
                                flushTimeout.current = null;
                            }, 200); // batching interval
                        }
                    }
                } catch {
                    console.warn('Invalid WS JSON', e.data);
                }
            };

            ws.current.onerror = (e) => console.error('WebSocket error:', e);

            ws.current.onclose = () => {
                if (retries.current < maxRetries) {
                    retries.current++;
                    const delay = 3000 * Math.pow(2, retries.current - 1); // exponential backoff
                    setTimeout(connect, delay);
                }
            };
        };

        connect();

        return () => {
            if (flushTimeout.current) clearTimeout(flushTimeout.current);
            if (buffer.current.length) handleData(buffer.current.splice(0)); // flush remaining
            ws.current?.close();
        };
    }, [port, handleData]);
}
