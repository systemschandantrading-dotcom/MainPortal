// MasterData.tsx
import React, { useState, useEffect } from 'react';

export interface MasterData {
    partyNames: string[];
    locations: string[];
    materials: string[];
}

interface MasterDataProps {
    children: (data: {
        masterData: MasterData;
        refreshMasterData: () => Promise<void>;
        loading: boolean;
        error: string | null;
    }) => React.ReactNode;
}

const APP_SCRIPT_URL = import.meta.env.VITE_APP_SCRIPT_URL;

const MasterData: React.FC<MasterDataProps> = ({ children }) => {
    const [masterData, setMasterData] = useState<MasterData>({
        partyNames: [],
        locations: [],
        materials: []
    });
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Validate App Script URL
    const validateAppScriptUrl = (): boolean => {
        if (!APP_SCRIPT_URL) {
            console.error('❌ VITE_APP_SCRIPT_URL is not defined');
            return false;
        }

        if (!APP_SCRIPT_URL.startsWith('https://')) {
            console.error('❌ Invalid APP_SCRIPT_URL format:', APP_SCRIPT_URL);
            return false;
        }

        return true;
    };

    // Fetch master data from Google Apps Script
    const fetchMasterData = async (): Promise<MasterData> => {
        try {
            console.group('📋 Fetching Master Data from Google Sheets');

            if (!validateAppScriptUrl()) {
                throw new Error('App Script URL not configured');
            }

            // Try POST method first
            const formData = new URLSearchParams();
            formData.append('action', 'getMasterData');
            formData.append('table', 'Master');

            console.log('🔗 Fetching from:', APP_SCRIPT_URL);

            const response = await fetch(APP_SCRIPT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: formData
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.text();
            console.log('📄 Raw response:', result);

            // Try to parse the response
            let masterData;
            try {
                masterData = JSON.parse(result);
            } catch (parseError) {
                console.error('❌ Failed to parse response as JSON:', parseError);
                throw new Error('Invalid JSON response from server');
            }

            console.log('✅ Parsed master data:', masterData);
            console.groupEnd();

            return {
                partyNames: masterData.partyNames || [],
                locations: masterData.locations || [],
                materials: masterData.materials || []
            };

        } catch (error) {
            console.error('💥 Error fetching master data:', error);
            console.groupEnd();

            // Fallback to GET method
            return await fetchMasterDataGET();
        }
    };

    // Alternative GET method
    const fetchMasterDataGET = async (): Promise<MasterData> => {
        try {
            const url = `${APP_SCRIPT_URL}?action=getMasterData&table=Master&timestamp=${Date.now()}`;

            console.log('🔗 Fetching via GET:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Master data fetched via GET:', data);

            return {
                partyNames: data.partyNames || [],
                locations: data.locations || [],
                materials: data.materials || []
            };

        } catch (error) {
            console.error('💥 Error in GET master data fetch:', error);
            throw error;
        }
    };

    // Load master data from localStorage
    const loadLocalMasterData = (): MasterData => {
        try {
            const partyNames = JSON.parse(localStorage.getItem('partyNames') || '[]');
            const materials = JSON.parse(localStorage.getItem('materials') || '[]');
            const locations = JSON.parse(localStorage.getItem('locations') || '[]');

            return { partyNames, materials, locations };
        } catch (error) {
            console.error('Error loading local master data:', error);
            return { partyNames: [], materials: [], locations: [] };
        }
    };

    // Save master data to localStorage
    const saveMasterDataToLocal = (data: MasterData): void => {
        try {
            localStorage.setItem('partyNames', JSON.stringify(data.partyNames));
            localStorage.setItem('materials', JSON.stringify(data.materials));
            localStorage.setItem('locations', JSON.stringify(data.locations));
        } catch (error) {
            console.error('Error saving master data to localStorage:', error);
        }
    };

    // Main function to load master data
    const loadMasterData = async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            console.log('🔄 Loading master data...');

            let masterDataFromServer: MasterData = {
                partyNames: [],
                locations: [],
                materials: []
            };

            let serverDataSuccessful = false;

            // Try to fetch from server
            try {
                masterDataFromServer = await fetchMasterData();
                serverDataSuccessful = masterDataFromServer.partyNames.length > 0;
            } catch (serverError) {
                console.warn('⚠️ Could not fetch from server:', serverError);
            }

            // Load from localStorage
            const localData = loadLocalMasterData();

            // Merge data: prefer server data, fallback to local data
            const mergedData: MasterData = {
                partyNames: serverDataSuccessful
                    ? masterDataFromServer.partyNames
                    : localData.partyNames,
                materials: serverDataSuccessful
                    ? masterDataFromServer.materials
                    : localData.materials,
                locations: serverDataSuccessful
                    ? masterDataFromServer.locations
                    : localData.locations,
            };

            console.log('📊 Final master data:', mergedData);
            setMasterData(mergedData);

            // If we got data from server, update localStorage
            if (serverDataSuccessful) {
                saveMasterDataToLocal(masterDataFromServer);
            }

        } catch (error) {
            console.error('💥 Error in master data loading process:', error);
            setError('Failed to load master data. Using local data.');

            // Final fallback: use localStorage only
            const localData = loadLocalMasterData();
            setMasterData(localData);
        } finally {
            setLoading(false);
        }
    };

    // Refresh master data function
    const refreshMasterData = async (): Promise<void> => {
        setLoading(true);
        setError(null);

        try {
            console.log('🔄 Manually refreshing master data...');
            const newMasterData = await fetchMasterData();

            if (newMasterData.partyNames.length > 0) {
                setMasterData(newMasterData);
                saveMasterDataToLocal(newMasterData);
                console.log('✅ Master data refreshed successfully');
            } else {
                throw new Error('No data received from server');
            }
        } catch (error) {
            console.error('💥 Error refreshing master data:', error);
            setError('Failed to refresh master data. Please check your connection.');
        } finally {
            setLoading(false);
        }
    };

    // Load data on component mount
    useEffect(() => {
        loadMasterData();
    }, []);

    return (
        <>
            {children({
                masterData,
                refreshMasterData,
                loading,
                error
            })}
        </>
    );
};

export default MasterData;

// Custom hook for using master data (optional)
export const useMasterData = () => {
    // This can be implemented if you want to use context
    // For now, we're using the render props pattern
};