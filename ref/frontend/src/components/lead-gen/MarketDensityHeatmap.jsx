import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTheme } from '../../hooks/useTheme';
import toast from 'react-hot-toast';
import {
  Search,
  MapPin,
  BarChart3,
  TrendingUp,
  Loader2,
  RefreshCw,
  Info,
  Star,
  Building,
  Users,
  AlertCircle,
  Globe
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/primitives/card';
import { Button } from '../ui/primitives/button';
// All utility functions now loaded from example.geo.json

const MarketDensityHeatmap = () => {
  const { getChartColorPalette, theme } = useTheme();
  const [industry, setIndustry] = useState('');
  const [heatmapData, setHeatmapData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchStats, setSearchStats] = useState(null);
  const [searchProgress, setSearchProgress] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [infoWindow, setInfoWindow] = useState(null);
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [provinceNameMap, setProvinceNameMap] = useState({});
  const [getColorForRank, setGetColorForRank] = useState(() => () => '#e5e7eb');
  // Removed heatmap toggle state
  
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const overlaysRef = useRef([]);

  // Load GeoJSON data from example.geo.json
  useEffect(() => {
    const loadGeoJsonData = async () => {
      try {
        const response = await fetch('/data/georef-canada-province@public.geojson');
        if (response.ok) {
          const data = await response.json();
          setGeoJsonData(data);
          
          // Create province name mapping from the GeoJSON data
          const nameMapping = {};
          data.features.forEach(feature => {
            const provinceName = feature.properties.prov_name_en[0]; // Array, take first element
            const abbreviation = feature.properties.prov_code[0]; // Array, take first element
            nameMapping[provinceName] = abbreviation;
          });
          setProvinceNameMap(nameMapping);
          
          // Create default color function
          const colorFunction = (rank, totalProvinces) => {
            const percentage = (rank - 1) / (totalProvinces - 1);
            
            if (percentage <= 0.25) return '#ef4444'; // Red - best 25%
            if (percentage <= 0.50) return '#f97316'; // Orange - 50-75%
            if (percentage <= 0.75) return '#eab308'; // Yellow - 25-50%
            return '#22c55e'; // Green - worst 25%
          };
          setGetColorForRank(() => colorFunction);
          
          console.log('✅ Loaded GeoJSON data from georef-canada-province@public.geojson:', data);
        } else {
          console.warn('⚠️ Failed to load georef-canada-province@public.geojson, using fallback');
          createFallbackData();
        }
      } catch (error) {
        console.error('❌ Error loading GeoJSON data:', error);
        createFallbackData();
      }
    };

    const createFallbackData = () => {
      console.log('📦 Creating fallback province data...');
      
      // Fallback province name mapping
      const fallbackProvinceNameMap = {
        "British Columbia": "BC",
        "Alberta": "AB", 
        "Saskatchewan": "SK",
        "Manitoba": "MB",
        "Ontario": "ON",
        "Quebec": "QC",
        "New Brunswick": "NB",
        "Nova Scotia": "NS",
        "Prince Edward Island": "PE",
        "Newfoundland and Labrador": "NL",
        "Yukon": "YT",
        "Northwest Territories": "NT",
        "Nunavut": "NU"
      };
      
      // Fallback color function
      const fallbackColorFunction = (rank, totalProvinces) => {
        const percentage = (rank - 1) / (totalProvinces - 1);
        
        if (percentage <= 0.25) return '#ef4444'; // Red - best 25%
        if (percentage <= 0.50) return '#f97316'; // Orange - 50-75%
        if (percentage <= 0.75) return '#eab308'; // Yellow - 25-50%
        return '#22c55e'; // Green - worst 25%
      };
      
      setProvinceNameMap(fallbackProvinceNameMap);
      setGetColorForRank(() => fallbackColorFunction);
      
      // Minimal GeoJSON structure for basic functionality
      const fallbackGeoJson = {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { prov_name_en: ["Ontario"], prov_code: ["ON"] },
            geometry: {
              type: "Polygon",
              coordinates: [[[-95.15, 56.85], [-95.15, 41.68], [-74.34, 41.68], [-74.34, 56.85], [-95.15, 56.85]]]
            }
          }
        ]
      };
      
      setGeoJsonData(fallbackGeoJson);
    };

    loadGeoJsonData();
  }, []);

  // Load Google Maps API dynamically with environment variables
  useEffect(() => {
    const loadGoogleMapsAPI = () => {
      // Check if Google Maps is already loaded
      if (window.google && window.google.maps) {
        console.log('✅ Google Maps API already loaded');
        setMapLoaded(true);
        return;
      }

      // Check if script is already loading
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        console.log('⏳ Google Maps API script already loading...');
        const handleGoogleMapsLoad = () => setMapLoaded(true);
        window.addEventListener('google-maps-loaded', handleGoogleMapsLoad);
        return () => window.removeEventListener('google-maps-loaded', handleGoogleMapsLoad);
      }

      // Get API key from environment variables
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || import.meta.env.VITE_GOOGLE_API_KEY;
      
      if (!apiKey) {
        console.error('❌ Google Maps API key not found in environment variables');
        console.error('Please add VITE_GOOGLE_MAPS_API_KEY to your .env file');
        return;
      }

      console.log('📡 Loading Google Maps API with key:', apiKey.substring(0, 20) + '...');

      // Create callback function
      window.initGoogleMaps = function() {
        console.log('✅ Google Maps API loaded successfully');
        window.googleMapsLoaded = true;
        window.dispatchEvent(new Event('google-maps-loaded'));
        setMapLoaded(true);
      };

      // Create and load script
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=geometry&callback=initGoogleMaps`;
      script.async = true;
      script.defer = true;
      script.onerror = () => {
        console.error('❌ Failed to load Google Maps API');
        console.error('Check your API key and network connection');
      };
      
      document.head.appendChild(script);
    };

    loadGoogleMapsAPI();
  }, []);

  // Initialize Google Map with React-proof container
  useEffect(() => {
    if (!mapLoaded || !geoJsonData || !mapRef.current || mapInstanceRef.current) {
      return;
    }

    try {
      console.log('🚀 Initializing Google Maps with React-safe container...');
      
      // Create a React-proof container (simplified approach)
      const mapContainer = document.createElement('div');
      mapContainer.style.width = '100%';
      mapContainer.style.height = '600px';
      mapContainer.style.position = 'relative';
      mapContainer.setAttribute('data-google-maps-container', 'true');
      
      // Clear and append the container
      mapRef.current.innerHTML = '';
      mapRef.current.appendChild(mapContainer);
      
      // Create map in the protected container
      const map = new window.google.maps.Map(mapContainer, {
        center: { lat: 56.1304, lng: -106.3468 },
        zoom: 4,
        mapTypeId: 'roadmap',
        disableDefaultUI: true,
        backgroundColor: theme.background.secondary,
        clickableIcons: false,
        keyboardShortcuts: false,
        scrollwheel: true,
        draggable: true,
        zoomControl: true
      });

      console.log('✅ Map initialized successfully');
      mapInstanceRef.current = map;

      // Initialize info window
      const infoWindowInstance = new window.google.maps.InfoWindow();
      setInfoWindow(infoWindowInstance);

      // Add error handling
      map.addListener('error', (error) => {
        console.error('🔥 Google Maps Error:', error);
      });

      // Wait for map to be ready, then add overlays
      const handleMapIdle = () => {
        if (overlaysRef.current.length === 0) {
          console.log('✅ Map is ready, adding province overlays...');
          addProvinceOverlays(map, infoWindowInstance);
        }
      };
      
      map.addListener('idle', handleMapIdle);

    } catch (error) {
      console.error('❌ Error initializing map:', error);
      toast.error('Failed to initialize Google Maps. Please refresh the page.');
    }
  }, [mapLoaded, geoJsonData]);

  // Simple content checking instead of complex MutationObserver
  useEffect(() => {
    if (!mapInstanceRef.current || !mapRef.current) {
      return;
    }

    const checkMapContent = () => {
      const hasMapContent = mapRef.current.querySelector('.gm-style');
      const hasContainer = mapRef.current.querySelector('[data-google-maps-container]');
      
      if (!hasMapContent && !hasContainer) {
        console.log('🚨 Map content lost - attempting restoration...');
        
        // Re-create the container
        const mapContainer = document.createElement('div');
        mapContainer.style.width = '100%';
        mapContainer.style.height = '600px';
        mapContainer.style.position = 'relative';
        mapContainer.setAttribute('data-google-maps-container', 'true');
        
        mapRef.current.innerHTML = '';
        mapRef.current.appendChild(mapContainer);
        
        // Try to move the existing map
        try {
          const mapDiv = mapInstanceRef.current.getDiv();
          if (mapDiv && mapDiv.parentNode) {
            mapContainer.appendChild(mapDiv);
            console.log('✅ Map content restored');
          }
        } catch (error) {
          console.error('❌ Error restoring map:', error);
        }
      }
    };

    // Check periodically (simplified approach)
    const intervalId = setInterval(checkMapContent, 1000);

    return () => clearInterval(intervalId);
  }, [mapInstanceRef.current, mapRef.current]);

  // Update map when data changes - use useCallback to prevent unnecessary re-renders
  const updateMapDataCallback = useCallback(() => {
    if (mapInstanceRef.current && heatmapData.length > 0) {
      console.log('🔄 Updating map data callback triggered');
      updateMapData();
    }
  }, [heatmapData]);

  useEffect(() => {
    updateMapDataCallback();
  }, [updateMapDataCallback]);

  const addProvinceOverlays = (map, infoWindowInstance) => {
    try {
      console.log('🗺️ Adding province overlays using Google Maps Data Layer...');
      
      if (!geoJsonData) {
        console.warn('⚠️ No GeoJSON data available yet');
        return;
      }
      
      // Clear existing overlays
      overlaysRef.current.forEach(overlay => {
        if (overlay.setMap) overlay.setMap(null);
      });
      overlaysRef.current = [];

      // Use Google Maps Data Layer for better boundary rendering
      const dataLayer = new window.google.maps.Data();
      dataLayer.setMap(map);

      // Set default styling for provinces
      dataLayer.setStyle({
        fillColor: '#e5e7eb',
        fillOpacity: 0.5,
        strokeColor: '#ffffff',
        strokeOpacity: 0.8,
        strokeWeight: 1,
        clickable: true
      });

      // Add our GeoJSON data to the Data Layer
      dataLayer.addGeoJson(geoJsonData);

      // Add hover effects
      dataLayer.addListener('mouseover', (event) => {
        dataLayer.overrideStyle(event.feature, {
          strokeColor: '#3b82f6',
          strokeWeight: 2,
          fillOpacity: 0.7
        });
      });

      dataLayer.addListener('mouseout', (event) => {
        dataLayer.revertStyle(event.feature);
      });

      // Add click events
      dataLayer.addListener('click', (event) => {
        // Get province name from the new GeoJSON structure
        const provinceName = event.feature.getProperty('prov_name_en')?.[0] || event.feature.getProperty('name');
        const provinceData = getProvinceData(provinceName);
        const ranking = getProvinceRanking(provinceName, heatmapData);
        
        let content = `
          <div style="padding: 12px; min-width: 200px;">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; font-weight: bold; color: ${theme.text.primary};">${provinceName}</h3>
            <p style="margin: 0 0 8px 0; color: ${theme.text.secondary}; font-size: 14px;">${provinceData.tooltip_text}</p>
        `;

        if (provinceData.density_score > 0 && ranking.rank > 0) {
          content += `
            <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0 0 4px 0; font-size: 14px; color: ${theme.text.primary};">
                <strong>Density Score:</strong> ${provinceData.density_score}/10
              </p>
              <p style="margin: 0; font-size: 14px; color: ${theme.status.warning[500]};">
                <strong>Rank:</strong> #${ranking.rank} of ${ranking.total}
              </p>
            </div>
          `;
        }

        content += '</div>';

        infoWindowInstance.setContent(content);
        infoWindowInstance.setPosition(event.latLng);
        infoWindowInstance.open(map);
      });

      // Store the data layer for later updates
      overlaysRef.current.push(dataLayer);
      
      console.log(`✅ Added Data Layer with ${geoJsonData.features?.length || 0} province boundaries`);
    } catch (error) {
      console.error('❌ Error adding province overlays:', error);
    }
  };

  const updateMapData = useCallback(() => {
    if (!mapInstanceRef.current || overlaysRef.current.length === 0 || !heatmapData.length) {
      return;
    }

    try {
      console.log('🔄 Updating map data with Data Layer...');
      console.log('📊 Heatmap data:', heatmapData.map(p => ({ name: p.display_name, score: p.density_score })));
      
      const validProvinces = heatmapData.filter(p => p.density_score > 0);
      const sortedProvinces = [...validProvinces].sort((a, b) => b.density_score - a.density_score);

      // Get the Data Layer (first element in overlaysRef)
      const dataLayer = overlaysRef.current[0];
      
      if (dataLayer && dataLayer.forEach) {
        let featureCount = 0;
        let matchedCount = 0;
        
        dataLayer.forEach((feature) => {
          featureCount++;
          
          // Get province name from the new GeoJSON structure
          const provinceName = feature.getProperty('prov_name_en')?.[0] || feature.getProperty('name');
          const provinceData = heatmapData.find(p => p.display_name === provinceName);
          
          let fillColor = '#e5e7eb'; // Default color

          if (provinceData && provinceData.density_score > 0) {
            matchedCount++;
            const provinceIndex = sortedProvinces.findIndex(p => p.display_name === provinceName);
            if (provinceIndex !== -1) {
              const rank = provinceIndex + 1;
              fillColor = getColorForRank(rank, sortedProvinces.length);
              console.log(`✅ ${provinceName}: score=${provinceData.density_score}, rank=${rank}, color=${fillColor}`);
            }
          } else {
            console.log(`❌ ${provinceName}: No data found or score is 0`);
          }

          // Override style for this feature
          dataLayer.overrideStyle(feature, {
            fillColor: fillColor,
            fillOpacity: 0.7,
            strokeColor: '#ffffff',
            strokeOpacity: 0.8,
            strokeWeight: 1
          });
        });
        
        console.log(`🎯 Summary: ${matchedCount}/${featureCount} provinces matched and colored`);
      }

      console.log('✅ Map data updated successfully with Data Layer');
      
    } catch (error) {
      console.error('❌ Error updating map data:', error);
    }
  }, [heatmapData, getColorForRank]);

  // Update map when data changes
  useEffect(() => {
    updateMapData();
  }, [heatmapData, updateMapData]);

  // Get province data for heatmap
  const getProvinceData = (provinceName) => {
    return heatmapData.find(p => p.display_name === provinceName) || {
      density_score: 0,
      display_name: provinceName,
      tooltip_text: `${provinceName}: No data available`
    };
  };

  // Get province ranking information  
  const getProvinceRanking = (provinceName, allData) => {
    if (!allData || allData.length === 0) return { rank: 0, total: 0 };
    
    const validProvinces = allData.filter(p => p.density_score > 0);
    if (validProvinces.length === 0) return { rank: 0, total: 0 };
    
    const sortedProvinces = [...validProvinces].sort((a, b) => b.density_score - a.density_score);
    const rank = sortedProvinces.findIndex(p => p.display_name === provinceName) + 1;
    
    return { rank: rank || 0, total: validProvinces.length };
  };

  // Poll for search progress
  const pollProgress = async (sessionId) => {
    try {
      const response = await fetch(`http://localhost:9000/api/market-density/progress/${sessionId}`);
      if (response.ok) {
        const progress = await response.json();
        setSearchProgress(progress);
        
        // Log progress to console for terminal visibility
        console.log(`🎯 MARKET DENSITY PROGRESS:
   Stage: ${progress.stage}
   Province: ${progress.current_province || 'N/A'}
   City: ${progress.current_city || 'N/A'}
   Progress: ${progress.provinces_completed}/${progress.provinces_total} provinces
   Businesses Found: ${progress.businesses_found} total, ${progress.current_province_businesses} current province
   API Calls: ${progress.api_calls_made}
   Status: ${progress.message}
   ${progress.estimated_time_remaining ? `ETA: ${progress.estimated_time_remaining}s` : ''}`);
        
        return progress.stage === 'completed' || progress.stage === 'error';
      }
    } catch (error) {
      console.error('Progress polling error:', error);
      return true;
    }
    return false;
  };

  // Search for market density data
  const searchMarketDensity = async () => {
    if (!industry.trim()) {
      toast.error('Please enter an industry to search');
      return;
    }

    setLoading(true);
    setSearchProgress(null);
    setHasSearched(false);
    setHeatmapData([]);
    setSearchStats(null);

    try {
      const response = await fetch('http://localhost:9000/api/market-density/heatmap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ industry: industry.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      const data = result.heatmap_data || result;
      const currentSessionId = result.session_id;
      
      if (currentSessionId) {
        setSessionId(currentSessionId);
        
        const pollInterval = setInterval(async () => {
          const isComplete = await pollProgress(currentSessionId);
          if (isComplete) {
            clearInterval(pollInterval);
          }
        }, 1000);
        
        setTimeout(() => clearInterval(pollInterval), 300000);
      }
      
      // Update state and let the effect handle map updates
      setHeatmapData(data);
      setHasSearched(true);
      
      // Calculate search statistics
      const totalBusinesses = result.total_businesses || data.reduce((sum, province) => sum + (province.businesses_count || 0), 0);
      const avgScore = data.length > 0 
        ? (data.reduce((sum, province) => sum + province.density_score, 0) / data.length).toFixed(1)
        : 0;
      const topProvince = data.reduce((top, current) => 
        current.density_score > top.density_score ? current : top, 
        { density_score: 0, display_name: 'None' }
      );

      setSearchStats({
        totalBusinesses,
        avgScore,
        topProvince: topProvince.display_name,
        topScore: topProvince.density_score,
        apiCalls: result.api_calls_made || 0
      });

      toast.success(`Market analysis complete for "${industry}"!`);
      
    } catch (error) {
      console.error('Error fetching market density data:', error);
      toast.error('Failed to fetch market density data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      searchMarketDensity();
    }
  };

  // Removed heatmap toggle function

  return (
    <div className="space-y-6">
      {/* CSS to ensure Google Maps canvas is visible */}
      <style>
        {`
          #market-density-map {
            background-color: #f3f4f6 !important;
            border: 2px solid #e5e7eb !important;
          }
          #market-density-map canvas {
            opacity: 1 !important;
            visibility: visible !important;
            display: block !important;
            position: relative !important;
            z-index: 1 !important;
          }
          #market-density-map .gm-style {
            opacity: 1 !important;
            visibility: visible !important;
            position: relative !important;
            z-index: 1 !important;
          }
          #market-density-map .gm-style > div {
            opacity: 1 !important;
            visibility: visible !important;
          }
          #market-density-map .gm-style img {
            opacity: 1 !important;
            visibility: visible !important;
          }
        `}
      </style>
      
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-6 h-6 text-blue-600" />
            Market Density Heatmap - Canada
          </CardTitle>
          <p className="text-gray-600">
            Analyze industry density and market quality across Canadian provinces using Google Maps data
          </p>
        </CardHeader>
        <CardContent>
          {/* Search Controls */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 max-w-md">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Enter industry (e.g., 'pet', 'technology', 'restaurant')"
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <Button
              onClick={searchMarketDensity}
              disabled={loading || !industry.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
              Analyze Market
            </Button>
          </div>

          {/* Heatmap legend removed */}

          {/* Progress Tracking */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center max-w-md">
                <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
                
                {searchProgress ? (
                  <div className="space-y-3">
                    <h3 className="text-lg font-medium text-gray-900">
                      {searchProgress.stage === 'initializing' && '🔄 Initializing search...'}
                      {searchProgress.stage === 'searching_province' && `🔍 Searching ${searchProgress.current_province}`}
                      {searchProgress.stage === 'processing_results' && '📊 Processing results...'}
                      {searchProgress.stage === 'completed' && '✅ Search completed!'}
                      {searchProgress.stage === 'error' && '❌ Search failed!'}
                    </h3>
                    
                    {searchProgress.current_city && (
                      <p className="text-blue-600 font-medium">
                        📍 {searchProgress.current_city}, {searchProgress.current_province}
                      </p>
                    )}
                    
                    <div className="bg-gray-200 rounded-full h-2 mb-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${(searchProgress.provinces_completed / searchProgress.provinces_total) * 100}%` 
                        }}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="bg-blue-50 p-2 rounded">
                        <p className="text-blue-600 font-medium">Progress</p>
                        <p className="text-blue-900">{searchProgress.provinces_completed}/{searchProgress.provinces_total} provinces</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded">
                        <p className="text-green-600 font-medium">Businesses Found</p>
                        <p className="text-green-900">{searchProgress.businesses_found} total</p>
                      </div>
                      <div className="bg-purple-50 p-2 rounded">
                        <p className="text-purple-600 font-medium">API Calls</p>
                        <p className="text-purple-900">{searchProgress.api_calls_made}</p>
                      </div>
                      <div className="bg-orange-50 p-2 rounded">
                        <p className="text-orange-600 font-medium">ETA</p>
                        <p className="text-orange-900">
                          {searchProgress.estimated_time_remaining ? `${searchProgress.estimated_time_remaining}s` : 'Calculating...'}
                        </p>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mt-3">
                      {searchProgress.message || 'Processing...'}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600 mb-2">Searching Canadian provinces...</p>
                    <p className="text-sm text-gray-500">This may take 1-2 minutes for comprehensive results</p>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Search Statistics */}
              {searchStats && (
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                  <div className="bg-blue-50 p-3 rounded-lg text-center">
                    <Building className="w-5 h-5 text-blue-600 mx-auto mb-1" />
                    <p className="text-sm text-blue-600 font-medium">Total Businesses</p>
                    <p className="text-lg font-bold text-blue-900">{searchStats.totalBusinesses}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg text-center">
                    <BarChart3 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                    <p className="text-sm text-green-600 font-medium">Avg Score</p>
                    <p className="text-lg font-bold text-green-900">{searchStats.avgScore}/10</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg text-center">
                    <TrendingUp className="w-5 h-5 text-purple-600 mx-auto mb-1" />
                    <p className="text-sm text-purple-600 font-medium">Top Province</p>
                    <p className="text-lg font-bold text-purple-900">{searchStats.topProvince}</p>
                  </div>
                  <div className="bg-red-50 p-3 rounded-lg text-center">
                    <Star className="w-5 h-5 text-red-600 mx-auto mb-1" />
                    <p className="text-sm text-red-600 font-medium">Top Score</p>
                    <p className="text-lg font-bold text-red-900">{searchStats.topScore}/10</p>
                  </div>
                  <div className="bg-orange-50 p-3 rounded-lg text-center">
                    <Globe className="w-5 h-5 text-orange-600 mx-auto mb-1" />
                    <p className="text-sm text-orange-600 font-medium">API Calls</p>
                    <p className="text-lg font-bold text-orange-900">{searchStats.apiCalls}</p>
                  </div>
                </div>
              )}

              {/* Google Maps Visualization */}
              <div className="bg-gray-50 rounded-lg border p-6">
                <div className="text-center mb-4">
                  <h3 className="text-xl font-semibold text-gray-900">
                    {hasSearched ? `Market Density Ranking: ${industry}` : 'Canadian Market Density Map'}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {hasSearched ? 'Colors show relative ranking: Green = lowest, Red = highest density' : 'Search for an industry to see ranking-based density data'}
                  </p>
                </div>

                {/* Google Map Container */}
                <div className="bg-white rounded-lg overflow-hidden border">
                  <div 
                    ref={mapRef}
                    id="market-density-map"
                    key="google-maps-container"
                    style={{ 
                      width: '100%', 
                      height: '600px',
                      minHeight: '500px',
                      position: 'relative',
                      zIndex: 1,
                      backgroundColor: theme.background.tertiary
                    }}
                    className="rounded-lg"
                    data-google-maps-container="true"
                    suppressHydrationWarning={true}
                  />
                  {!mapLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-2" />
                        <p className="text-gray-600">Loading Google Maps...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Ranking Legend */}
                {hasSearched && (
                  <div className="mt-6 flex justify-center">
                    <div className="bg-white rounded-lg p-4 border">
                      <h4 className="text-sm font-semibold text-gray-800 mb-3 text-center">Market Density Ranking</h4>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-600 font-medium">Worst</span>
                        <div className="flex">
                          {getChartColorPalette(5).map((color, index) => (
                            <div key={index} className="w-8 h-5 border border-gray-300" style={{ backgroundColor: color }}></div>
                          ))}
                        </div>
                        <span className="text-gray-600 font-medium">Best</span>
                        <div className="ml-3 text-xs text-gray-500">
                          Based on relative ranking
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Usage Instructions */}
              {!hasSearched && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-blue-900">How to Use</h4>
                      <ul className="text-sm text-blue-700 mt-1 space-y-1">
                        <li>• Enter an industry keyword (e.g., "pet", "restaurant", "technology")</li>
                        <li>• Click "Analyze Market" to search all Canadian provinces</li>
                        <li>• View results on the interactive Google Maps with ranking-based colors</li>
                        <li>• Green = lowest ranked provinces, Red = highest ranked provinces</li>
                        <li>• Click on provinces to see detailed ranking and score information</li>
                        <li>• Zoom and pan the map for detailed geographic exploration</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MarketDensityHeatmap; 