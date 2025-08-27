import { useState, useEffect } from 'react';

export function useUserLocation(override) {
    const [location, setLocation] = useState(null);

    useEffect(() => {
        if (override) {
            setLocation(override);
            return;
        }

        // Fetch location from free API
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
