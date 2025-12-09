import { useState, useEffect } from 'react';

export function useUserLocation(override: any) {
    const [location, setLocation] = useState<{
        lat: number;
        lon: number;
    } | null>(null);

    useEffect(() => {
        if (override) {
            setLocation(override);
            return;
        }

        fetch('http://ip-api.com/json/')
            .then((response) => response.json())
            .then((data) => {
                if (data.status === 'success' && data.lat && data.lon) {
                    setLocation({
                        lat: data.lat,
                        lon: data.lon,
                    });
                } else {
                    console.warn('IP Geolocation failed or no data');
                    setLocation(null);
                }
            })
            .catch((error) => {
                console.error('Error fetching IP geolocation:', error);
                setLocation(null);
            });
    }, [override]);

    return location;
}
