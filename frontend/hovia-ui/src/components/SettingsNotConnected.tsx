function SettingsNotConnected() {
    return (
        <div className="flex flex-col items-center justify-center h-screen text-gray-600 dark:text-gray-300 bg-white dark:bg-[#222] p-6">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-20 h-20 mb-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
            >
                <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
            </svg>
            <p className="text-lg font-semibold mb-4 text-center">
                Unable to retrieve the app settings. Please ensure the backend
                service is running and accessible at port 8080.
            </p>
        </div>
    );
}

export default SettingsNotConnected;
