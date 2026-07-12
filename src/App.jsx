import React, { useState, useEffect, useMemo } from 'react';
import { 
  Radio, 
  AlertTriangle, 
  Package, 
  Shield, 
  CheckCircle, 
  Clock, 
  Database, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Users, 
  Plus, 
  Minus, 
  ArrowRight, 
  HeartPulse, 
  Search, 
  MapPin, 
  Info,
  Layers,
  Send,
  Eye,
  Sliders,
  Bell
} from 'lucide-react';

// Formatter for timestamps
const formatTime = (date) => {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

// --- 1. DYNAMIC CONFIDENCE SCORING LOGIC ---
const getConfidenceFromSensors = (sensors) => {
  const hasBLE = sensors.includes('BLE');
  const hasThermal = sensors.includes('Thermal');
  const hasUWB = sensors.includes('UWB');
  
  if (hasBLE && hasThermal && hasUWB) {
    return { label: 'High', value: 90 };
  } else if (hasBLE && hasThermal) {
    return { label: 'Medium', value: 65 };
  } else if (hasBLE) {
    return { label: 'Low', value: 30 };
  }
  
  // Fallbacks for other telemetry combinations
  if (sensors.includes('Audio')) {
    return { label: 'Low', value: 15 };
  }
  return { label: 'Low', value: 10 };
};

export default function App() {
  // --- 2. GLOBAL NETWORK & SIMULATION STATES ---
  const [networkStatus, setNetworkStatus] = useState('connected'); // 'connected' | 'syncing' | 'offline'
  const [simulationActive, setSimulationActive] = useState(true);
  const [lastGlobalSync, setLastGlobalSync] = useState(new Date());
  
  // Offline tracking for stale data warning (wall time seconds)
  const [offlineAt, setOfflineAt] = useState(null);
  const [isStale, setIsStale] = useState(false);
  
  // Tactical logs
  const [logs, setLogs] = useState([
    { id: 1, time: new Date(Date.now() - 300000), source: 'SYSTEM', message: 'Command terminal initialized in secure mesh mode.', type: 'info' },
    { id: 2, time: new Date(Date.now() - 240000), source: 'MESH', message: 'Nodes 01 through 18 reporting 100% telemetry link.', type: 'info' },
    { id: 3, time: new Date(Date.now() - 120000), source: 'RADAR', message: 'Passive RF sensor sweep started in Grid sector C-4.', type: 'radar' },
    { id: 4, time: new Date(Date.now() - 60000), source: 'INVENTORY', message: 'Medicines stock in Shelter Alpha Clinic fell below safe threshold.', type: 'warning' },
  ]);

  // Selected view
  const [activeTab, setActiveTab] = useState('detection'); // 'detection' | 'inventory' | 'shelter'
  
  // Selected detection (for map hover/click detail sync)
  const [selectedDetectionId, setSelectedDetectionId] = useState(1);
  const [shelterRecommendation, setShelterRecommendation] = useState(null);
  
  // Interactive Walkthrough State (Operational Flow Guide: Detect -> Verify -> Equip -> Evacuate)
  const [currentScenarioStep, setCurrentScenarioStep] = useState('detect'); // 'detect' | 'verify' | 'equip' | 'evacuate' | 'completed'
  const [scenarioTargetZoneId, setScenarioTargetZoneId] = useState(1); // Zone Alpha
  const [dispatchTimers, setDispatchTimers] = useState({}); // { detectionId: secondsRemaining }

  // --- 3. DETECTIONS DATA STATE ---
  const [detections, setDetections] = useState([
    {
      id: 1,
      zone: 'Zone Alpha',
      grid: 'C-4',
      coords: { x: 38, y: 32 },
      radius: 6, // 6 meters
      confidence: 'High',
      confidenceValue: 90,
      sensors: ['BLE', 'Thermal', 'UWB'], // High Confidence: BLE + Thermal + UWB
      lastUpdated: new Date(Date.now() - 45000),
      status: 'Pending Verification', // 'Pending Verification' | 'Dispatched' | 'Verified' | 'Rejected'
      reasoning: 'High-amplitude BLE RF signal strength combined with thermal search match at 36.6°C and rhythmic UWB respiration pulse telemetry (14 bpm). Signature profile validates micro-environmental life indicators.',
      survivorsCount: 0
    },
    {
      id: 2,
      zone: 'Zone Beta',
      grid: 'E-6',
      coords: { x: 68, y: 55 },
      radius: 8, // 8 meters
      confidence: 'Medium',
      confidenceValue: 65,
      sensors: ['BLE', 'Thermal'], // Medium Confidence: BLE + Thermal
      lastUpdated: new Date(Date.now() - 180000),
      status: 'Pending Verification',
      reasoning: 'Active Bluetooth Low Energy advertisement packets received from mobile device (ID: #8B4F) coupled with localized mid-infrared thermal radiation detection.',
      survivorsCount: 0
    },
    {
      id: 3,
      zone: 'Zone Gamma',
      grid: 'B-7',
      coords: { x: 22, y: 72 },
      radius: 12, // 12 meters
      confidence: 'Low',
      confidenceValue: 30,
      sensors: ['BLE'], // Low Confidence: BLE only
      lastUpdated: new Date(Date.now() - 600000),
      status: 'Pending Verification',
      reasoning: 'Transient BLE beacon signal captured on Mesh Node 14. Received signal strength indicator (RSSI) is weak (-92dBm). Needs secondary sensor sweep verification.',
      survivorsCount: 0
    },
    {
      id: 4,
      zone: 'Zone Delta',
      grid: 'F-2',
      coords: { x: 82, y: 24 },
      radius: 5, // 5 meters
      confidence: 'Rejected',
      confidenceValue: 15,
      sensors: ['Audio'], // Rejected noise anomaly
      lastUpdated: new Date(Date.now() - 1200000),
      status: 'Rejected (Noise)',
      reasoning: 'Acoustic waveform matching drone propeller rotation frequency (420Hz). Classified as equipment artifact interference and excluded from team dispatches.',
      survivorsCount: 0
    }
  ]);

  // --- 4. RELIEF INVENTORY DATA STATE ---
  const [inventory, setInventory] = useState([
    { id: 1, category: 'Drinking water', tagType: 'RFID', quantity: 150, threshold: 50, location: 'Warehouse A', lastUpdated: new Date(Date.now() - 150000) },
    { id: 2, category: 'Food packets', tagType: 'QR', quantity: 240, threshold: 60, location: 'Warehouse A', lastUpdated: new Date(Date.now() - 200000) },
    { id: 3, category: 'Medicines', tagType: 'RFID', quantity: 38, threshold: 45, location: 'Shelter Alpha Clinic', lastUpdated: new Date(Date.now() - 90000) },
    { id: 4, category: 'Blankets', tagType: 'RFID', quantity: 28, threshold: 30, location: 'Warehouse B', lastUpdated: new Date(Date.now() - 110000) },
    { id: 5, category: 'Rescue equipment', tagType: 'QR', quantity: 14, threshold: 10, location: 'Mobile Command', lastUpdated: new Date(Date.now() - 400000) }
  ]);

  // --- 5. SHELTER DATA STATE ---
  const [shelters, setShelters] = useState([
    { 
      id: 1, 
      name: 'Shelter Alpha (Community Center)', 
      distance: 1.2, // km
      maxCapacity: 200, 
      occupancy: 198, // Available capacity: 2 spaces
      status: 'Active', 
      medicalSupport: 'Full Trauma Unit', 
      lastUpdated: new Date(Date.now() - 75000) 
    },
    { 
      id: 2, 
      name: 'Shelter Beta (High School Gym)', 
      distance: 2.8, // km
      maxCapacity: 350, 
      occupancy: 180, // Available capacity: 170 spaces
      status: 'Active', 
      medicalSupport: 'Basic First Aid', 
      lastUpdated: new Date(Date.now() - 130000) 
    },
    { 
      id: 3, 
      name: 'Shelter Gamma (Regional Sports Arena)', 
      distance: 4.5, // km
      maxCapacity: 500, 
      occupancy: 420, // Available capacity: 80 spaces
      status: 'Standby', 
      medicalSupport: 'Advanced Clinic', 
      lastUpdated: new Date(Date.now() - 300000) 
    }
  ]);

  // --- 6. OFFLINE STALENESS TRACKER EFFECT ---
  // Tracks seconds spent offline and triggers staleness warning
  useEffect(() => {
    let timer = null;
    if (networkStatus === 'offline') {
      if (!offlineAt) {
        setOfflineAt(Date.now());
      }
      timer = setInterval(() => {
        const elapsedSeconds = (Date.now() - (offlineAt || Date.now())) / 1000;
        // 10 seconds of real-world wall time equals 10 simulated minutes offline
        if (elapsedSeconds >= 10) {
          setIsStale(true);
        }
      }, 1000);
    } else {
      setOfflineAt(null);
      setIsStale(false);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [networkStatus, offlineAt]);

  // --- 7. AUTO-RECALCULATE RECOMMENDATIONS EFFECT ---
  // Instantly re-runs suitability scoring when shelter capacity/occupancy changes
  useEffect(() => {
    if (shelterRecommendation) {
      let bestScore = -Infinity;
      let selectedShelter = null;
      const details = [];

      shelters.forEach(s => {
        const availableCapacity = s.maxCapacity - s.occupancy;
        const score = (availableCapacity * 1.5) - (s.distance * 10);
        
        details.push({
          id: s.id,
          name: s.name,
          available: availableCapacity,
          distance: s.distance,
          score: score.toFixed(1)
        });

        if (score > bestScore) {
          bestScore = score;
          selectedShelter = s;
        }
      });

      setShelterRecommendation({
        shelter: selectedShelter,
        calculations: details,
        timestamp: new Date()
      });
    }
  }, [shelters]);

  // --- 8. LIVE TELEMETRY SIMULATION LOOP ---
  useEffect(() => {
    let interval = null;
    if (simulationActive) {
      interval = setInterval(() => {
        const timestamp = new Date();
        const rand = Math.random();
        
        if (rand < 0.25) {
          // 1. Simulate check in/out at random shelter (local SQLite updates)
          const shelterIdx = Math.floor(Math.random() * shelters.length);
          const checkIn = Math.random() > 0.4;
          
          setShelters(prev => prev.map((s, idx) => {
            if (idx === shelterIdx) {
              const delta = checkIn ? 1 : -1;
              const newOccupancy = Math.max(0, Math.min(s.maxCapacity, s.occupancy + delta));
              
              if (newOccupancy !== s.occupancy) {
                addLog('SHELTER', `${checkIn ? 'Check-in' : 'Check-out'} simulated at ${s.name}. Occupancy: ${newOccupancy}/${s.maxCapacity}.`, 'info');
              }
              // Updates timestamp locally. Local cache is preserved offline.
              return { ...s, occupancy: newOccupancy, lastUpdated: timestamp };
            }
            return s;
          }));
        } else if (rand < 0.5) {
          // 2. Simulate RFID gate scan in/out for inventory (local updates)
          const itemIdx = Math.floor(Math.random() * inventory.length);
          const isGateIn = Math.random() > 0.5;
          const delta = isGateIn ? Math.floor(Math.random() * 5) + 1 : -(Math.floor(Math.random() * 3) + 1);

          setInventory(prev => prev.map((item, idx) => {
            if (idx === itemIdx) {
              const newQty = Math.max(0, item.quantity + delta);
              addLog('INVENTORY', `RFID Gate Scan (${isGateIn ? 'IN' : 'OUT'}): ${Math.abs(delta)} units of ${item.category}. New Qty: ${newQty}.`, newQty < item.threshold ? 'warning' : 'info');
              return { ...item, quantity: newQty, lastUpdated: timestamp };
            }
            return item;
          }));
        } else if (rand < 0.65 && networkStatus !== 'offline') {
          // 3. Simulation telemetry updates from remote mesh (Disabled in Offline Mode to block external sync timestamps)
          const activeDetections = detections.filter(d => d.status !== 'Rejected (Noise)' && d.status !== 'Evacuated' && d.status !== 'Verified');
          if (activeDetections.length > 0) {
            const randomDet = activeDetections[Math.floor(Math.random() * activeDetections.length)];
            
            // Randomly toggle sensors which adjusts confidence
            const possibleSensors = [
              ['BLE'],
              ['BLE', 'Thermal'],
              ['BLE', 'Thermal', 'UWB']
            ];
            const newSensors = possibleSensors[Math.floor(Math.random() * possibleSensors.length)];
            const conf = getConfidenceFromSensors(newSensors);

            setDetections(prev => prev.map(d => {
              if (d.id === randomDet.id) {
                return { 
                  ...d, 
                  sensors: newSensors,
                  confidence: conf.label,
                  confidenceValue: conf.value,
                  lastUpdated: timestamp 
                };
              }
              return d;
            }));
            
            addLog('RADAR', `Mesh update for ${randomDet.zone}: Sensor array shifted to [${newSensors.join(' + ')}]. Confidence: ${conf.value}%.`, 'info');
          }
        }

        // Global Sync update (Stopped completely when Offline Mode is active)
        if (networkStatus !== 'offline') {
          setLastGlobalSync(new Date());
        }
      }, 9000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [simulationActive, shelters, inventory, detections, networkStatus]);

  // Tick down dispatch timers
  useEffect(() => {
    const timer = setInterval(() => {
      const activeTimers = { ...dispatchTimers };
      let updated = false;

      Object.keys(activeTimers).forEach(id => {
        const remaining = activeTimers[id];
        if (remaining > 1) {
          activeTimers[id] = remaining - 1;
          updated = true;
        } else if (remaining === 1) {
          delete activeTimers[id];
          updated = true;
          
          const zoneId = parseInt(id);
          const survivorsFound = Math.floor(Math.random() * 2) + 1;
          
          setDetections(prev => prev.map(d => {
            if (d.id === zoneId) {
              return { 
                ...d, 
                status: 'Verified', 
                survivorsCount: survivorsFound,
                lastUpdated: new Date()
              };
            }
            return d;
          }));

          addLog('DISPATCH', `Team confirmed: Possible survivor detected in ${detections.find(d => d.id === zoneId).zone}. Found ${survivorsFound} survivor(s). Physical verification completed.`, 'success');
          
          if (zoneId === scenarioTargetZoneId && currentScenarioStep === 'verify') {
            setCurrentScenarioStep('equip');
            addLog('OPERATIONS', `Scenario updated: Prepare rescue package for evacuation. (Need to equip team).`, 'warning');
          }
        }
      });

      if (updated) {
        setDispatchTimers(activeTimers);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [dispatchTimers, currentScenarioStep, scenarioTargetZoneId, detections]);

  // --- 9. CORE ACTION HANDLERS ---
  
  const addLog = (source, message, type = 'info') => {
    const newEntry = {
      id: Date.now() + Math.random(),
      time: new Date(),
      source,
      message,
      type
    };
    setLogs(prev => [newEntry, ...prev.slice(0, 30)]);
  };

  const getSyncStatusText = () => {
    if (networkStatus === 'connected') return { text: 'MESH SYNCED', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' };
    if (networkStatus === 'syncing') return { text: 'SYNCING...', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5 animate-pulse' };
    return { text: 'LOCAL CACHE', color: 'text-slate-400 border-slate-700 bg-slate-900/50' };
  };

  const getSyncBadge = () => {
    const status = getSyncStatusText();
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono border ${status.color}`}>
        {networkStatus === 'connected' && <Wifi className="w-2.5 h-2.5 mr-1" />}
        {networkStatus === 'syncing' && <RefreshCw className="w-2.5 h-2.5 mr-1 animate-spin" />}
        {networkStatus === 'offline' && <WifiOff className="w-2.5 h-2.5 mr-1" />}
        {status.text}
      </span>
    );
  };

  // Survivor Verification Dispatch Handler
  const handleVerifyDispatch = (id) => {
    const targetZone = detections.find(d => d.id === id);
    if (!targetZone) return;

    setDetections(prev => prev.map(d => {
      if (d.id === id) {
        return { ...d, status: 'Dispatched', lastUpdated: new Date() };
      }
      return d;
    }));
    
    setDispatchTimers(prev => ({ ...prev, [id]: 8 }));
    
    // Add specific dispatch log indicating team dispatch for verification
    addLog('DISPATCH', `Search & Rescue Unit Delta-4 dispatched to ${targetZone.zone} (Grid ${targetZone.grid}) for physical verification. ETA 8 seconds.`, 'warning');
    addLog('SYSTEM', `[DISPATCH] High-confidence anomaly verification team dispatched to ${targetZone.zone}.`, 'info');
    
    if (id === scenarioTargetZoneId && currentScenarioStep === 'detect') {
      setCurrentScenarioStep('verify');
    }
  };

  // RFID Gate Scan simulator (Manual)
  const handleRFIDScan = (id, direction) => {
    const delta = direction === 'in' ? 10 : -10;
    const timestamp = new Date();
    setInventory(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = Math.max(0, item.quantity + delta);
        addLog('INVENTORY', `Manual RFID Scan (${direction.toUpperCase()}): ${item.category} at ${item.location}. Delta: ${delta > 0 ? '+' : ''}${delta}. New Qty: ${newQty}`, newQty < item.threshold ? 'warning' : 'info');
        return { ...item, quantity: newQty, lastUpdated: timestamp };
      }
      return item;
    }));

    if (currentScenarioStep === 'equip') {
      const item = inventory.find(i => i.id === id);
      if (direction === 'out' && (item.category.toLowerCase().includes('water') || item.category.toLowerCase().includes('blanket'))) {
        setCurrentScenarioStep('evacuate');
        addLog('OPERATIONS', `Scenario updated: Survival supplies allocated. Initiate Evacuation protocol. Select Shelter.`, 'success');
      }
    }
  };

  // Shelter occupancy check-ins (+/-)
  const handleShelterOccupancy = (id, delta) => {
    const timestamp = new Date();
    setShelters(prev => prev.map(s => {
      if (s.id === id) {
        const newOccupancy = Math.max(0, Math.min(s.maxCapacity, s.occupancy + delta));
        if (newOccupancy !== s.occupancy) {
          addLog('SHELTER', `Occupancy adjusted at ${s.name}: ${newOccupancy}/${s.maxCapacity} (${delta > 0 ? '+' : ''}${delta}).`, 'info');
        }
        return { ...s, occupancy: newOccupancy, lastUpdated: timestamp };
      }
      return s;
    }));
  };

  // Multi-criteria shelter selection algorithm
  const handleFindShelter = () => {
    let bestScore = -Infinity;
    let selectedShelter = null;
    const details = [];

    shelters.forEach(s => {
      const availableCapacity = s.maxCapacity - s.occupancy;
      // Weights Available Capacity vs Distance
      const score = (availableCapacity * 1.5) - (s.distance * 10);
      
      details.push({
        id: s.id,
        name: s.name,
        available: availableCapacity,
        distance: s.distance,
        score: score.toFixed(1)
      });

      if (score > bestScore) {
        bestScore = score;
        selectedShelter = s;
      }
    });

    setShelterRecommendation({
      shelter: selectedShelter,
      calculations: details,
      timestamp: new Date()
    });

    addLog('ALGORITHM', `Shelter routing logic executed. Recommendation: ${selectedShelter.name} (Capacity-to-Distance optimized Score: ${bestScore.toFixed(1)}).`, 'success');
    setActiveTab('shelter');
  };

  const handleScenarioEvacuate = (shelterId) => {
    const verifiedDetections = detections.filter(d => d.status === 'Verified');
    const totalEvacuees = verifiedDetections.reduce((acc, curr) => acc + curr.survivorsCount, 0) || 2;
    
    setShelters(prev => prev.map(s => {
      if (s.id === shelterId) {
        const newOccupancy = Math.min(s.maxCapacity, s.occupancy + totalEvacuees);
        return { ...s, occupancy: newOccupancy, lastUpdated: new Date() };
      }
      return s;
    }));

    setDetections(prev => prev.map(d => {
      if (d.status === 'Verified') {
        return { ...d, status: 'Evacuated', lastUpdated: new Date() };
      }
      return d;
    }));

    addLog('OPERATIONS', `Successfully evacuated survivors to ${shelters.find(s => s.id === shelterId).name}. Operational cycle complete.`, 'success');
    setCurrentScenarioStep('completed');
  };

  const resetScenario = () => {
    setDetections(prev => prev.map(d => {
      if (d.id === 1) {
        return { ...d, status: 'Pending Verification', survivorsCount: 0, lastUpdated: new Date() };
      }
      return d;
    }));
    setShelters(prev => prev.map(s => {
      if (s.id === 2) {
        return { ...s, occupancy: 180, lastUpdated: new Date() };
      }
      return s;
    }));
    setCurrentScenarioStep('detect');
    setShelterRecommendation(null);
    addLog('OPERATIONS', `Scenario restarted. Awaiting signature verification in Zone Alpha.`, 'info');
  };

  // --- 10. STATS COMPUTATION ---
  const activeAlertsCount = useMemo(() => {
    return detections.filter(d => d.status === 'Pending Verification' && d.confidence !== 'Rejected').length;
  }, [detections]);

  const totalSurvivorsRescued = useMemo(() => {
    return detections
      .filter(d => d.status === 'Verified' || d.status === 'Evacuated')
      .reduce((sum, d) => sum + (d.survivorsCount || 0), 0);
  }, [detections]);

  const lowStockAlertsCount = useMemo(() => {
    return inventory.filter(item => item.quantity < item.threshold).length;
  }, [inventory]);

  const totalOccupancyStats = useMemo(() => {
    const totalMax = shelters.reduce((sum, s) => sum + s.maxCapacity, 0);
    const totalOcc = shelters.reduce((sum, s) => sum + s.occupancy, 0);
    return {
      occupancy: totalOcc,
      capacity: totalMax,
      percentage: ((totalOcc / totalMax) * 100).toFixed(1)
    };
  }, [shelters]);

  return (
    <div className="flex h-full min-h-screen bg-slate-950 text-slate-100 flex-col md:flex-row font-sans selection:bg-rose-500 selection:text-white">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 flex flex-col flex-shrink-0">
        
        {/* LOGO AREA */}
        <div className="p-5 border-b border-slate-800 flex items-center gap-3">
          <div className="bg-rose-600/10 p-2 rounded-lg border border-rose-500/30 glow-red">
            <Radio className="w-6 h-6 text-rose-500 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-black tracking-widest text-slate-200 font-mono">CON-RELIEF</h2>
            <p className="text-[10px] text-rose-500 font-bold tracking-wider uppercase">Mesh Command Terminal</p>
          </div>
        </div>

        {/* VIEW NAVIGATION */}
        <nav className="flex-1 p-4 space-y-1.5">
          <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase px-2 mb-2">Tactical Modules</p>
          
          <button
            id="nav-btn-detection"
            onClick={() => setActiveTab('detection')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
              activeTab === 'detection'
                ? 'bg-rose-600/10 text-rose-400 border border-rose-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Radio className={`w-4 h-4 ${activeTab === 'detection' ? 'text-rose-400' : 'text-slate-400'}`} />
              1. Survivor Detection
            </span>
            {activeAlertsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-mono font-bold animate-pulse">
                {activeAlertsCount}
              </span>
            )}
          </button>

          <button
            id="nav-btn-inventory"
            onClick={() => setActiveTab('inventory')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
              activeTab === 'inventory'
                ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Package className={`w-4 h-4 ${activeTab === 'inventory' ? 'text-blue-400' : 'text-slate-400'}`} />
              2. Relief Inventory
            </span>
            {lowStockAlertsCount > 0 && (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[10px] font-mono font-bold">
                {lowStockAlertsCount} LOW
              </span>
            )}
          </button>

          <button
            id="nav-btn-shelter"
            onClick={() => setActiveTab('shelter')}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium tracking-wide transition-all ${
              activeTab === 'shelter'
                ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent'
            }`}
          >
            <span className="flex items-center gap-2.5">
              <Shield className={`w-4 h-4 ${activeTab === 'shelter' ? 'text-emerald-400' : 'text-slate-400'}`} />
              3. Shelter Capacity
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              {totalOccupancyStats.percentage}%
            </span>
          </button>

          <div className="pt-6">
            <p className="text-[9px] font-bold text-slate-500 tracking-widest uppercase px-2 mb-2">Operational flow</p>
            
            {/* Visual Operational Flow Stepper */}
            <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">Active Status</span>
                <span className="inline-flex items-center px-1 rounded bg-slate-800 text-slate-300 font-mono text-[9px] border border-slate-700">
                  Step {currentScenarioStep === 'detect' ? '1/4' : currentScenarioStep === 'verify' ? '2/4' : currentScenarioStep === 'equip' ? '3/4' : currentScenarioStep === 'evacuate' ? '4/4' : 'Done'}
                </span>
              </div>

              <div className="space-y-1 text-[11px] font-mono">
                <div className={`flex items-center gap-2 p-1 rounded ${currentScenarioStep === 'detect' ? 'bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${currentScenarioStep === 'detect' ? 'bg-rose-500 animate-ping' : 'bg-slate-700'}`} />
                  1. DETECT (Radar Anomaly)
                </div>
                <div className={`flex items-center gap-2 p-1 rounded ${currentScenarioStep === 'verify' ? 'bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${currentScenarioStep === 'verify' ? 'bg-amber-500 animate-ping' : 'bg-slate-700'}`} />
                  2. VERIFY (Dispatch Unit)
                </div>
                <div className={`flex items-center gap-2 p-1 rounded ${currentScenarioStep === 'equip' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-400 font-bold' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${currentScenarioStep === 'equip' ? 'bg-blue-500 animate-ping' : 'bg-slate-700'}`} />
                  3. EQUIP (Relief Outflow)
                </div>
                <div className={`flex items-center gap-2 p-1 rounded ${currentScenarioStep === 'evacuate' ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${currentScenarioStep === 'evacuate' ? 'bg-emerald-500 animate-ping' : 'bg-slate-700'}`} />
                  4. EVACUATE (Shelter Match)
                </div>
              </div>

              {/* Scenario Interactive Guideline Box */}
              <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400 leading-relaxed font-sans">
                {currentScenarioStep === 'detect' && (
                  <p>
                    <span className="text-rose-400 font-semibold">Step 1:</span> Telemetry indicates active signatures. Go to <span className="underline cursor-pointer" onClick={() => setActiveTab('detection')}>Detection tab</span> and dispatch verification team to <span className="font-mono text-slate-200">Zone Alpha</span>.
                  </p>
                )}
                {currentScenarioStep === 'verify' && (
                  <p>
                    <span className="text-amber-400 font-semibold">Step 2:</span> Team en-route to <span className="font-mono text-slate-200">Zone Alpha</span>. Wait for physical verification (8s countdown) to confirm survivors.
                  </p>
                )}
                {currentScenarioStep === 'equip' && (
                  <p>
                    <span className="text-blue-400 font-semibold">Step 3:</span> Survivors confirmed! Go to <span className="underline cursor-pointer" onClick={() => setActiveTab('inventory')}>Inventory tab</span> and simulate an <span className="text-blue-300 font-bold">RFID Gate Scan (Out)</span> on Drinking Water or Blankets to equip the team.
                  </p>
                )}
                {currentScenarioStep === 'evacuate' && (
                  <p>
                    <span className="text-emerald-400 font-semibold">Step 4:</span> Gear allocated. Click the <span className="text-emerald-300 font-bold">Find Nearest Shelter</span> button below or on Shelter tab to find the safest match and evac check-in.
                  </p>
                )}
                {currentScenarioStep === 'completed' && (
                  <div className="space-y-1">
                    <p className="text-emerald-400 font-bold">✓ Operational Cycle Completed!</p>
                    <button 
                      onClick={resetScenario}
                      className="w-full mt-1.5 py-1 px-2 text-[9px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-mono border border-slate-700 transition"
                    >
                      Restart Operations Loop
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </nav>

        {/* PERSISTENT RUNNING LOG TRIGGER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/40">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-mono text-slate-400 font-bold">TACTICAL COMMS</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <div className="text-[9px] font-mono text-slate-500 h-16 overflow-y-auto space-y-1 scrollbar-none">
            {logs.slice(0, 3).map((log) => (
              <div key={log.id} className="truncate">
                <span className="text-slate-600 font-bold">[{formatTime(log.time)}]</span> {log.message}
              </div>
            ))}
          </div>
        </div>

      </aside>

      {/* MAIN CONTAINER */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-950">
        
        {/* PERSISTENT HEADER */}
        <header className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-30 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-rose-500 animate-pulse-ring" />
            <div>
              <h1 className="text-base lg:text-lg font-extrabold tracking-tight text-white m-0">
                MULTI-SENSOR SURVIVOR DETECTION &amp; CONNECTED RELIEF SYSTEM
              </h1>
              <p className="text-[11px] text-slate-400 mt-0.5 animate-pulse-short">
                Tactical Search &amp; Rescue Command Center | {networkStatus === 'offline' ? (
                  <span className="text-amber-500 font-bold font-mono">
                    ⚠️ SYNC FROZEN (Offline Mode) | Last Sync: {formatTime(lastGlobalSync)}
                  </span>
                ) : (
                  <>Sync Pulse: <span className="font-mono text-slate-200">{formatTime(lastGlobalSync)}</span></>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-2">
            {/* Simulation controls */}
            <div className="flex items-center bg-slate-950/60 px-2 py-1 rounded border border-slate-800 gap-1.5">
              <span className="text-[10px] font-mono text-slate-400">Simulation:</span>
              <button 
                onClick={() => setSimulationActive(!simulationActive)}
                className={`px-1.5 py-0.5 text-[10px] font-mono rounded font-bold transition-all ${
                  simulationActive 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700'
                }`}
              >
                {simulationActive ? 'ACTIVE' : 'PAUSED'}
              </button>
            </div>

            {/* Network Selector (Fully functional toggles) */}
            <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                id="btn-net-mesh"
                onClick={() => {
                  setNetworkStatus('connected');
                  setOfflineAt(null);
                  setIsStale(false);
                  addLog('SYSTEM', 'Network protocol changed to MESH CONNECTED. Full sync active.', 'info');
                }}
                className={`px-2 py-1 text-[10px] font-mono font-semibold rounded transition ${
                  networkStatus === 'connected'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Mesh Connected
              </button>
              <button
                id="btn-net-sync"
                onClick={() => {
                  setNetworkStatus('syncing');
                  setOfflineAt(null);
                  setIsStale(false);
                  addLog('SYSTEM', 'Network protocol changed to CLOUD SYNCING. Syncing telemetry buffer...', 'warning');
                }}
                className={`px-2 py-1 text-[10px] font-mono font-semibold rounded transition ${
                  networkStatus === 'syncing'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Cloud Syncing
              </button>
              <button
                id="btn-net-offline"
                onClick={() => {
                  setNetworkStatus('offline');
                  setOfflineAt(prev => prev || Date.now());
                  addLog('SYSTEM', 'Terminal switched to OFFLINE MODE. Local SQLite cache active.', 'danger');
                }}
                className={`px-2 py-1 text-[10px] font-mono font-semibold rounded transition ${
                  networkStatus === 'offline'
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Offline Mode
              </button>
            </div>
          </div>
        </header>

        {/* QUICK STATS CARDS */}
        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-4 border-b border-slate-900 bg-slate-950/40">
          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Unverified Detections</p>
              <h3 className="text-xl font-bold font-mono text-rose-500 mt-1">{activeAlertsCount}</h3>
            </div>
            <div className="bg-rose-500/10 p-2 rounded border border-rose-500/20">
              <Radio className="w-5 h-5 text-rose-500" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Evacuated Survivors</p>
              <h3 className="text-xl font-bold font-mono text-emerald-500 mt-1">{totalSurvivorsRescued}</h3>
            </div>
            <div className="bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Low Stock Inventory</p>
              <h3 className="text-xl font-bold font-mono text-amber-500 mt-1">{lowStockAlertsCount}</h3>
            </div>
            <div className="bg-amber-500/10 p-2 rounded border border-amber-500/20">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
          </div>

          <div className="bg-slate-900/60 border border-slate-800/80 p-3 rounded-lg flex items-center justify-between">
            <div>
              <p className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">Total Shelter Occupancy</p>
              <h3 className="text-xl font-bold font-mono text-blue-500 mt-1">
                {totalOccupancyStats.occupancy}<span className="text-xs text-slate-500">/{totalOccupancyStats.capacity}</span>
              </h3>
            </div>
            <div className="bg-blue-500/10 p-2 rounded border border-blue-500/20">
              <Users className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </section>

        {/* WORKSPACE AREA */}
        <div className="flex-1 p-4 overflow-y-auto space-y-6">

          {/* TAB 1: SURVIVOR DETECTION */}
          {activeTab === 'detection' && (
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
              
              {/* RADAR SWEEP MAP PANEL (LEFT - 7 COLUMNS) */}
              <div className="xl:col-span-7 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                    <h3 className="text-sm font-bold font-mono text-slate-200">RADAR &amp; PASSIVE MESH TELEMETRY</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-slate-500">Grid scale: 1 cell = 2m</span>
                    {getSyncBadge()}
                  </div>
                </div>

                {/* Tactical map canvas wrapper */}
                <div className="relative aspect-square md:aspect-[4/3] xl:aspect-square bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-slate-950 p-6 flex items-center justify-center border-b border-slate-800">
                  
                  {/* Radar grid lines */}
                  <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-[0.04] pointer-events-none">
                    {Array.from({ length: 64 }).map((_, i) => (
                      <div key={i} className="border border-emerald-400" />
                    ))}
                  </div>

                  {/* Concentric distance rings */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[85%] h-[85%] rounded-full border border-emerald-500/10 flex items-center justify-center">
                      <span className="absolute top-[8%] text-[8px] font-mono text-emerald-500/40">30m</span>
                      <div className="w-[70%] h-[70%] rounded-full border border-emerald-500/10 flex items-center justify-center">
                        <span className="absolute top-[15%] text-[8px] font-mono text-emerald-500/40">20m</span>
                        <div className="w-[50%] h-[50%] rounded-full border border-emerald-500/15 flex items-center justify-center">
                          <span className="absolute top-[25%] text-[8px] font-mono text-emerald-500/40">10m</span>
                          <div className="w-[25%] h-[25%] rounded-full border border-emerald-500/20" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Horizontal and Vertical Crosshairs */}
                  <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-emerald-500/10 pointer-events-none" />
                  <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-emerald-500/10 pointer-events-none" />

                  {/* Radar sweep animation overlay */}
                  <div className="absolute inset-0 bg-[conic-gradient(from_0deg_at_50%_50%,_rgba(16,185,129,0.08)_0deg,_transparent_90deg)] rounded-full animate-spin pointer-events-none" style={{ animationDuration: '6s' }} />

                  {/* Interactive Map Wrapper */}
                  <div className="absolute inset-0 cursor-crosshair" onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = ((e.clientX - rect.left) / rect.width) * 100;
                    const y = ((e.clientY - rect.top) / rect.height) * 100;
                    
                    // Add new random survivor detection zone
                    const letters = ['A','B','C','D','E','F','G'];
                    const randLetter = letters[Math.floor(y / 15)] || 'C';
                    const randNumber = Math.floor(x / 12) + 1;
                    const newZoneId = detections.length + 1;
                    const timestamp = new Date();
                    
                    // Compliant with specified sensor-confidence logic
                    const possibleSensors = [
                      ['BLE'],
                      ['BLE', 'Thermal'],
                      ['BLE', 'Thermal', 'UWB']
                    ];
                    const randSensors = possibleSensors[Math.floor(Math.random() * possibleSensors.length)];
                    const conf = getConfidenceFromSensors(randSensors);
                    
                    const newZone = {
                      id: newZoneId,
                      zone: `Zone ${String.fromCharCode(64 + newZoneId)}`,
                      grid: `${randLetter}-${randNumber}`,
                      coords: { x, y },
                      radius: Math.floor(Math.random() * 8) + 5,
                      confidence: conf.label,
                      confidenceValue: conf.value,
                      sensors: randSensors,
                      lastUpdated: timestamp,
                      status: 'Pending Verification',
                      reasoning: `Operator triggered RF-mesh scan grid match. Localization matches active signals: ${randSensors.join(' + ')}. Sensor compilation validates potential survival pattern.`,
                      survivorsCount: 0
                    };
                    
                    setDetections(prev => [...prev, newZone]);
                    setSelectedDetectionId(newZoneId);
                    addLog('RADAR', `Possible survivor detected in Grid ${newZone.grid} (${newZone.zone}). Confidence: ${newZone.confidenceValue}% (${newZone.confidence}).`, 'warning');
                  }}>
                    {/* Grid sectors indicator */}
                    <div className="absolute top-2 left-2 text-[9px] font-mono text-slate-500 uppercase tracking-widest bg-slate-950/80 px-1.5 py-0.5 rounded border border-slate-800">
                      Sector COMMAND-CENTER
                    </div>

                    <div className="absolute bottom-2 right-2 text-[9px] font-mono text-rose-500 uppercase bg-slate-950/80 px-1.5 py-0.5 rounded border border-rose-500/20 animate-pulse">
                      ▲ click map to flag new anomaly
                    </div>

                    {/* Detections rendering */}
                    {detections.map((det) => {
                      if (det.status === 'Rejected (Noise)' || det.status === 'Evacuated') return null;
                      
                      const isSelected = selectedDetectionId === det.id;
                      let ringColor = 'border-rose-500/60 bg-rose-500/20';
                      
                      if (det.status === 'Verified') {
                        ringColor = 'border-emerald-500/60 bg-emerald-500/20';
                      } else if (det.status === 'Dispatched') {
                        ringColor = 'border-amber-500/60 bg-amber-500/20 animate-pulse-ring';
                      } else if (det.confidence === 'Low') {
                        ringColor = 'border-blue-500/40 bg-blue-500/10';
                      }

                      return (
                        <div
                          key={det.id}
                          style={{ left: `${det.coords.x}%`, top: `${det.coords.y}%` }}
                          className={`absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer transition-all duration-300 z-20 ${
                            isSelected ? 'scale-125' : 'hover:scale-110'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDetectionId(det.id);
                          }}
                        >
                          <div 
                            style={{ width: `${det.radius * 6}px`, height: `${det.radius * 6}px` }}
                            className={`rounded-full border border-dashed flex items-center justify-center ${ringColor} ${
                              isSelected ? 'ring-2 ring-rose-400 ring-offset-2 ring-offset-slate-900 border-solid' : ''
                            }`}
                          />
                          
                          <div className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full flex items-center justify-center border border-white/50 ${
                            det.status === 'Verified' ? 'bg-emerald-500' : det.status === 'Dispatched' ? 'bg-amber-500' : 'bg-rose-500'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          </div>

                          <span className={`absolute -top-6 left-1/2 -translate-x-1/2 px-1 text-[8px] font-mono rounded border ${
                            det.status === 'Verified' 
                              ? 'bg-emerald-950 border-emerald-500 text-emerald-400' 
                              : det.status === 'Dispatched'
                                ? 'bg-amber-950 border-amber-500 text-amber-400 animate-pulse'
                                : 'bg-rose-950 border-rose-500 text-rose-400'
                          }`}>
                            {det.grid}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Map Subtext */}
                <div className="p-4 bg-slate-900/40 grid grid-cols-2 md:grid-cols-4 gap-2 text-center text-[10px] font-mono text-slate-400 border-t border-slate-800">
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded bg-rose-500/20 border border-rose-500 mr-2" />
                    Unverified Zone
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded bg-amber-500/20 border border-amber-500 mr-2 animate-pulse" />
                    Dispatched / Verifying
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 rounded bg-emerald-500/20 border border-emerald-500 mr-2" />
                    Verified Presence
                  </div>
                  <div>
                    <span className="inline-block w-2.5 h-2.5 border border-dashed border-slate-500 mr-2" />
                    Probable Radius (m)
                  </div>
                </div>
              </div>

              {/* DETECTION ALERTS PANEL (RIGHT - 5 COLUMNS) */}
              <div className="xl:col-span-5 flex flex-col gap-6">
                
                {/* HEADLINE ALERT CARD */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                    <h3 className="text-xs font-bold font-mono text-rose-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-4 h-4" />
                      LIVE DETECTIONS TELEMETRY
                    </h3>
                    <span className="text-[10px] font-mono text-slate-500">
                      Active Anomalies: {detections.filter(d => d.status !== 'Rejected (Noise)' && d.status !== 'Evacuated').length}
                    </span>
                  </div>

                  {/* List of detections */}
                  <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                    {detections.map((det) => {
                      const isSelected = selectedDetectionId === det.id;
                      const isLowConfidence = det.confidence === 'Low';
                      const isMediumConfidence = det.confidence === 'Medium';
                      const isHighConfidence = det.confidence === 'High';
                      const isRejected = det.status.includes('Rejected');

                      let statusBadge = (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/20">
                          PENDING VERIFY
                        </span>
                      );
                      if (det.status === 'Dispatched') {
                        statusBadge = (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/20 animate-pulse">
                            DISPATCHED ({dispatchTimers[det.id]}s)
                          </span>
                        );
                      } else if (det.status === 'Verified') {
                        statusBadge = (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/20">
                            VERIFIED
                          </span>
                        );
                      } else if (isRejected) {
                        statusBadge = (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-slate-800 text-slate-500 border border-slate-700">
                            REJECTED NOISE
                          </span>
                        );
                      } else if (det.status === 'Evacuated') {
                        statusBadge = (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-blue-500/20 text-blue-400 border border-blue-500/20">
                            EVACUATED
                          </span>
                        );
                      }

                      return (
                        <div
                          key={det.id}
                          onClick={() => setSelectedDetectionId(det.id)}
                          className={`p-3 rounded-lg border text-left cursor-pointer transition-all ${
                            isSelected 
                              ? 'bg-slate-800/80 border-rose-500/50 glow-red' 
                              : 'bg-slate-950/50 border-slate-800 hover:border-slate-700 hover:bg-slate-900/30'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                                {det.zone} <span className="text-[10px] text-slate-500 font-normal">({det.grid})</span>
                              </h4>
                              
                              {/* Confidence Engine displays list indicators */}
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="text-[9px] font-mono text-slate-400">Sensors:</span>
                                {det.sensors.map(s => (
                                  <span key={s} className="px-1 py-0.2 bg-slate-950 text-rose-400 border border-slate-800 rounded text-[9px] font-mono">
                                    {s}
                                  </span>
                                ))}
                              </div>

                              {/* Requirement 1: Dispatch Team button next to High-Confidence anomalies */}
                              {det.status === 'Pending Verification' && isHighConfidence && (
                                <button
                                  id={`btn-dispatch-list-${det.id}`}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleVerifyDispatch(det.id);
                                  }}
                                  className="mt-3 px-2 py-1 bg-rose-600 hover:bg-rose-500 text-[10px] text-white font-mono font-bold uppercase rounded border border-rose-500/20 transition flex items-center gap-1 shadow hover:shadow-rose-600/20"
                                >
                                  Dispatch Team for Verification
                                  <ArrowRight className="w-2.5 h-2.5" />
                                </button>
                              )}
                            </div>
                            <div className="text-right flex flex-col items-end gap-1 flex-shrink-0">
                              <span className={`text-[10px] font-mono font-bold ${
                                isHighConfidence 
                                  ? 'text-red-400 bg-red-950/40 border border-red-500/20 px-1 py-0.2 rounded' 
                                  : isMediumConfidence 
                                    ? 'text-amber-400 bg-amber-950/40 border border-amber-500/20 px-1 py-0.2 rounded' 
                                    : isRejected 
                                      ? 'text-slate-500' 
                                      : 'text-blue-400 bg-blue-950/40 border border-blue-500/20 px-1 py-0.2 rounded'
                              }`}>
                                {det.confidenceValue}% ({det.confidence})
                              </span>
                              {statusBadge}
                            </div>
                          </div>

                          <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-slate-800/60 text-[9px] font-mono text-slate-500">
                            <span>Last Sweep: {formatTime(det.lastUpdated)}</span>
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {getSyncStatusText().text}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* DETAILED EXPLAINABILITY & COMMAND MODULE */}
                {selectedDetectionId && (
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-left flex flex-col gap-4">
                    {(() => {
                      const det = detections.find(d => d.id === selectedDetectionId);
                      if (!det) return <p className="text-xs text-slate-500">Select a zone anomaly to display details.</p>;
                      
                      const isHighConf = det.confidence === 'High';
                      const isMedConf = det.confidence === 'Medium';
                      const isLowConf = det.confidence === 'Low';

                      return (
                        <>
                          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                            <div>
                              <h4 className="text-sm font-bold text-white">{det.zone} - Diagnosis telemetry</h4>
                              <p className="text-[10px] text-slate-500 font-mono">Grid Sector Location: {det.grid}</p>
                            </div>
                            <div className="text-right">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-black border ${
                                isHighConf 
                                  ? 'bg-red-500/10 border-red-500/30 text-red-400' 
                                  : isMedConf
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : isLowConf
                                      ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                      : 'bg-slate-800 border-slate-700 text-slate-500'
                              }`}>
                                {det.confidence.toUpperCase()} CONFIDENCE ENGINE
                              </span>
                            </div>
                          </div>

                          {/* Explainability Breakdown */}
                          <div className="space-y-2.5 text-xs text-slate-300">
                            
                            {/* Confidence Engine Calibration Guide */}
                            <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[10px] font-mono space-y-1 text-slate-400">
                              <span className="text-slate-200 font-bold uppercase text-[9px] tracking-wider block mb-1">Confidence Engine Calibration:</span>
                              <div className="flex justify-between items-center">
                                <span>• BLE only = Low Confidence</span>
                                <span className="text-blue-400 font-bold">30%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>• BLE + Thermal = Medium Confidence</span>
                                <span className="text-amber-400 font-bold">65%</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>• BLE + Thermal + UWB = High Confidence</span>
                                <span className="text-red-400 font-bold">90%</span>
                              </div>
                            </div>

                            <div className="bg-slate-950/80 p-3 rounded-lg border border-slate-800/80">
                              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono uppercase mb-1.5 font-bold">
                                <Info className="w-3.5 h-3.5 text-rose-500" />
                                Threat Logic Explanation
                              </div>
                              <p className="leading-relaxed font-sans text-slate-300">
                                {det.reasoning}
                              </p>
                            </div>

                            {/* Sensor contributing levels */}
                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                              <div className={`p-2 rounded border transition ${det.sensors.includes('BLE') ? 'bg-rose-500/5 border-rose-500/30 text-rose-300' : 'bg-slate-950/30 border-slate-900 text-slate-600'}`}>
                                <span className="block text-[8px] uppercase tracking-wider text-slate-500">1. BLE Sensor Node:</span>
                                <p className="mt-0.5 font-bold">
                                  {det.sensors.includes('BLE') ? '✓ CONNECTED (RSSI -74dBm)' : '✖ NO RESPONSE'}
                                </p>
                              </div>
                              <div className={`p-2 rounded border transition ${det.sensors.includes('Thermal') ? 'bg-rose-500/5 border-rose-500/30 text-rose-300' : 'bg-slate-950/30 border-slate-900 text-slate-600'}`}>
                                <span className="block text-[8px] uppercase tracking-wider text-slate-500">2. Thermal Imaging:</span>
                                <p className="mt-0.5 font-bold">
                                  {det.sensors.includes('Thermal') ? '✓ CONNECTED (36.6°C Heat Signature)' : '✖ NO RESPONSE'}
                                </p>
                              </div>
                              <div className={`p-2 rounded border transition ${det.sensors.includes('UWB') ? 'bg-rose-500/5 border-rose-500/30 text-rose-300' : 'bg-slate-950/30 border-slate-900 text-slate-600'}`}>
                                <span className="block text-[8px] uppercase tracking-wider text-slate-500">3. UWB Respiratory:</span>
                                <p className="mt-0.5 font-bold">
                                  {det.sensors.includes('UWB') ? '✓ CONNECTED (14 bpm Respiration)' : '✖ NO RESPONSE'}
                                </p>
                              </div>
                              <div className={`p-2 rounded border transition ${det.sensors.includes('Audio') ? 'bg-amber-500/5 border-amber-500/20 text-amber-300' : 'bg-slate-950/30 border-slate-900 text-slate-600'}`}>
                                <span className="block text-[8px] uppercase tracking-wider text-slate-500">Aux Acoustic Mic:</span>
                                <p className="mt-0.5 font-bold">
                                  {det.sensors.includes('Audio') ? '✓ CONNECTED (High Frequency Vibration)' : '✖ NO RESPONSE'}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* ACTION BUTTON */}
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <div className="text-[10px] text-slate-500 font-mono">
                              Data Point: {getSyncBadge()}
                            </div>
                            
                            {det.status === 'Pending Verification' && det.confidence !== 'Rejected' && (
                              <button
                                onClick={() => handleVerifyDispatch(det.id)}
                                className="px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-bold font-mono tracking-wider uppercase rounded-lg border border-rose-500/20 shadow-lg hover:shadow-rose-600/10 glow-red transition-all flex items-center gap-1.5"
                              >
                                {isHighConf ? 'Dispatch Team for Verification' : 'Require Physical Verification / Dispatch Team'}
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {det.status === 'Dispatched' && (
                              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400 bg-amber-500/5 border border-amber-500/20 px-3 py-2 rounded-lg animate-pulse">
                                <Clock className="w-3.5 h-3.5 animate-spin" />
                                Search Unit Delta-4 En Route (ETA {dispatchTimers[det.id]}s)
                              </div>
                            )}

                            {det.status === 'Verified' && (
                              <div className="flex items-center gap-2">
                                <span className="text-emerald-400 font-bold text-xs font-mono">✓ Physical Verification Confirmed</span>
                                {currentScenarioStep === 'evacuate' && (
                                  <button
                                    onClick={handleFindShelter}
                                    className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase rounded border border-emerald-500/20 shadow"
                                  >
                                    Match Shelter
                                  </button>
                                )}
                              </div>
                            )}

                            {det.status === 'Evacuated' && (
                              <span className="text-blue-400 font-bold text-xs font-mono">✓ Survivors Evacuated &amp; Housed</span>
                            )}

                            {det.confidence === 'Rejected' && (
                              <span className="text-slate-500 font-bold text-xs font-mono">Anomaly Excluded (Noise classification)</span>
                            )}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                )}

              </div>
            </div>
          )}

          {/* TAB 2: RELIEF INVENTORY */}
          {activeTab === 'inventory' && (
            <div className="space-y-6">
              
              {/* Requirement 3: Stale Data Warning Banner */}
              {isStale && (
                <div className="bg-amber-950/80 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3 text-left animate-pulse glow-amber">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">⚠️ OFFLINE LOCAL MESH WARNING — DATA STALE</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 font-sans">
                      The command terminal has been in Offline Mode for &gt;10 simulated minutes. Shown inventory and shelter capacities are cached locally and might be desynchronized from the cloud command center database.
                    </p>
                  </div>
                </div>
              )}

              {/* LOW STOCK BANNER */}
              {lowStockAlertsCount > 0 && (
                <div className="bg-red-950/60 border border-red-500/20 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-left">
                  <div className="flex items-center gap-3">
                    <div className="bg-red-500/10 p-2 rounded-lg text-red-500 border border-red-500/30">
                      <AlertTriangle className="w-5 h-5 animate-bounce" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-red-400">CRITICAL INVENTORY ALERT: LOW STOCK IN AREA</h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {lowStockAlertsCount} relief supply categories have fallen below safety operational thresholds. Replenish immediately to ensure search &amp; rescue teams are equipped.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span className="text-slate-400">Mesh Sync status:</span>
                    {getSyncBadge()}
                  </div>
                </div>
              )}

              {/* INVENTORY DATA GRID */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-left">
                <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/50">
                  <div>
                    <h3 className="text-sm font-bold font-mono text-slate-200">RELIEF LOGISTICS &amp; RFID STOCK REGISTRY</h3>
                    <p className="text-[11px] text-slate-500 font-sans">Live RFID/QR gate checkpoints tracking warehouse supplies and medical clinics.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-slate-400">Global Registry status:</span>
                    {getSyncBadge()}
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs font-mono">
                    <thead>
                      <tr className="border-b border-slate-800 bg-slate-950/30 text-slate-400 text-left">
                        <th className="p-3 font-semibold tracking-wider">Item Category</th>
                        <th className="p-3 font-semibold tracking-wider">Tag Type</th>
                        <th className="p-3 font-semibold tracking-wider">Operational Location</th>
                        <th className="p-3 font-semibold tracking-wider text-center">Safety Threshold</th>
                        <th className="p-3 font-semibold tracking-wider text-right">Current Quantity</th>
                        <th className="p-3 font-semibold tracking-wider text-center">Telemetry Update</th>
                        <th className="p-3 font-semibold tracking-wider text-right">RFID Gate Simulator</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {inventory.map((item) => {
                        const isLowStock = item.quantity < item.threshold;
                        
                        return (
                          <tr 
                            key={item.id} 
                            className={`transition-colors duration-150 ${
                              isLowStock 
                                ? 'bg-red-500/5 hover:bg-red-500/10 text-red-200 border-l-2 border-l-red-500' 
                                : 'hover:bg-slate-800/30 text-slate-300'
                            }`}
                          >
                            <td className="p-3">
                              <div className="flex items-center gap-2 font-sans font-bold text-sm">
                                <span className={`w-1.5 h-1.5 rounded-full ${isLowStock ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                                {item.category}
                              </div>
                            </td>
                            <td className="p-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                item.tagType === 'RFID' 
                                  ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' 
                                  : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                              }`}>
                                {item.tagType}
                              </span>
                            </td>
                            <td className="p-3 text-slate-400 font-sans">{item.location}</td>
                            <td className="p-3 text-center text-slate-500">{item.threshold} units</td>
                            <td className="p-3 text-right">
                              <span className={`text-sm font-extrabold ${isLowStock ? 'text-red-400 font-black' : 'text-slate-100'} ${isStale ? 'opacity-65 text-amber-500/90 font-black' : ''}`}>
                                {item.quantity}
                              </span>
                            </td>
                            <td className="p-3 text-center text-slate-500 text-[10px]">
                              {isStale ? (
                                <span className="flex items-center justify-center gap-1 text-amber-400/90 font-bold animate-pulse">
                                  <AlertTriangle className="w-3.5 h-3.5 animate-bounce-short" />
                                  STALE LOCAL CACHE
                                </span>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <span>{formatTime(item.lastUpdated)}</span>
                                  <span className="text-[8px] text-slate-600">Sync: {networkStatus}</span>
                                </div>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="inline-flex gap-1.5">
                                <button
                                  onClick={() => handleRFIDScan(item.id, 'in')}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold border border-slate-700 rounded transition flex items-center gap-1"
                                  title="Simulate scan IN (adds stock)"
                                >
                                  <Plus className="w-3 h-3 text-blue-400" />
                                  Scan In
                                </button>
                                <button
                                  onClick={() => handleRFIDScan(item.id, 'out')}
                                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold border border-slate-700 rounded transition flex items-center gap-1"
                                  title="Simulate scan OUT (depletes stock)"
                                >
                                  <Minus className="w-3 h-3 text-rose-400" />
                                  Scan Out
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Tactical narrative hint */}
                <div className="p-3 bg-slate-950/40 text-[10px] text-slate-400 leading-relaxed font-sans border-t border-slate-800 text-center flex items-center justify-center gap-2">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>
                    Simulating <strong>RFID Gate Scan (Out)</strong> triggers depletion of critical units, matching active search and rescue deployment needs.
                  </span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: SHELTER MANAGEMENT */}
          {activeTab === 'shelter' && (
            <div className="space-y-6">
              
              {/* Requirement 3: Stale Data Warning Banner */}
              {isStale && (
                <div className="bg-amber-950/80 border border-amber-500/30 rounded-xl p-4 flex items-center gap-3 text-left animate-pulse glow-amber">
                  <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">⚠️ OFFLINE LOCAL MESH WARNING — DATA STALE</h4>
                    <p className="text-[11px] text-slate-300 mt-0.5 font-sans">
                      The command terminal has been in Offline Mode for &gt;10 simulated minutes. Shown inventory and shelter capacities are cached locally and might be desynchronized from the cloud command center database.
                    </p>
                  </div>
                </div>
              )}

              {/* ROUTING CONTROLS CARD */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-left flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold font-mono text-slate-200 uppercase tracking-wide flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    Shelter Routing Decision Matrix
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed max-w-2xl font-sans">
                    Click below to calculate and highlight the safest recommended shelter. The algorithm prioritizes available capacity cushions to prevent overloading close shelters.
                  </p>
                </div>
                <button
                  onClick={handleFindShelter}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-extrabold tracking-wider uppercase rounded-lg border border-emerald-500/20 shadow-lg glow-emerald transition-all flex items-center gap-2 flex-shrink-0"
                >
                  Find Nearest Suitable Shelter
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

              {/* RECOMMENDED SHELTER OVERLAY BOX */}
              {shelterRecommendation && (
                <div className="bg-emerald-950/60 border-2 border-emerald-500/30 rounded-xl p-4 text-left glow-emerald animate-pulse-ring">
                  <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-emerald-500/20 pb-3 mb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/30">
                        <MapPin className="w-4.5 h-4.5 text-emerald-400" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-emerald-400">RECOMMENDED SHELTER: {shelterRecommendation.shelter.name}</h4>
                        <p className="text-[10px] font-mono text-slate-400">Computed algorithm match timestamp: {formatTime(shelterRecommendation.timestamp)}</p>
                      </div>
                    </div>
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded font-mono">
                      ALGORITHM RECOMMENDED
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono mb-3">
                    <div className="bg-slate-950/80 p-2.5 rounded border border-emerald-500/20">
                      <span className="text-slate-500">Calculated Safety Score:</span>
                      <p className="text-emerald-400 text-sm font-bold mt-0.5">
                        {((shelterRecommendation.shelter.maxCapacity - shelterRecommendation.shelter.occupancy) * 1.5 - shelterRecommendation.shelter.distance * 10).toFixed(1)} pts
                      </p>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded border border-emerald-500/20">
                      <span className="text-slate-500">Available Safe Capacity:</span>
                      <p className="text-slate-200 text-sm font-bold mt-0.5">
                        {shelterRecommendation.shelter.maxCapacity - shelterRecommendation.shelter.occupancy} slots
                      </p>
                    </div>
                    <div className="bg-slate-950/80 p-2.5 rounded border border-emerald-500/20">
                      <span className="text-slate-500">Medical Support:</span>
                      <p className="text-slate-200 text-sm font-bold mt-0.5">
                        {shelterRecommendation.shelter.medicalSupport}
                      </p>
                    </div>
                  </div>

                  <div className="text-[11px] leading-relaxed text-slate-300 font-sans border-t border-emerald-500/10 pt-2.5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <p>
                      <strong>Recommendation Explanation:</strong> Prioritized based on high availability cushion ({shelterRecommendation.shelter.maxCapacity - shelterRecommendation.shelter.occupancy} free slots) despite being slightly further away. Avoids bottlenecking critical close shelters that are near capacity.
                    </p>
                    
                    {currentScenarioStep === 'evacuate' && (
                      <button
                        onClick={() => handleScenarioEvacuate(shelterRecommendation.shelter.id)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-mono text-xs font-black uppercase rounded border border-emerald-500/30 transition-all flex items-center gap-1.5"
                      >
                        Evacuate Survivors Here
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* CARD CONTAINER */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {shelters.map((shelter) => {
                  const available = shelter.maxCapacity - shelter.occupancy;
                  const isFull = available <= 0;
                  const isWarning = available > 0 && available < 10;
                  const isRecommended = shelterRecommendation?.shelter.id === shelter.id;

                  return (
                    <div 
                      key={shelter.id} 
                      className={`bg-slate-900 border rounded-xl overflow-hidden text-left flex flex-col transition-all duration-300 ${
                        isRecommended 
                          ? 'border-emerald-500 ring-2 ring-emerald-500/20 glow-emerald' 
                          : isFull 
                            ? 'border-slate-800 opacity-70' 
                            : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      {/* CARD HEADER */}
                      <div className={`p-4 border-b border-slate-800/80 flex items-start justify-between ${
                        isRecommended ? 'bg-emerald-950/20' : 'bg-slate-950/20'
                      }`}>
                        <div>
                          <h4 className="text-sm font-bold text-white font-sans">{shelter.name}</h4>
                          <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-slate-500" />
                            {shelter.distance} km from command center
                          </span>
                        </div>
                        {isRecommended && (
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-mono font-black bg-emerald-500 text-slate-950">
                            RECOMMENDED
                          </span>
                        )}
                      </div>

                      {/* CARD BODY */}
                      <div className="p-4 flex-1 space-y-4">
                        
                        {/* Occupancy telemetry */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] font-mono">
                            <span className="text-slate-400">Occupancy Level:</span>
                            <span className={`${isFull ? 'text-red-400 font-bold' : isWarning ? 'text-amber-400 font-bold' : 'text-emerald-400'} ${isStale ? 'opacity-65 text-amber-500/95 font-bold animate-pulse' : ''}`}>
                              {shelter.occupancy} / {shelter.maxCapacity} ({((shelter.occupancy / shelter.maxCapacity) * 100).toFixed(0)}%)
                            </span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800/80">
                            <div 
                              style={{ width: `${(shelter.occupancy / shelter.maxCapacity) * 100}%` }}
                              className={`h-full rounded-full transition-all duration-500 ${
                                isFull ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                            />
                          </div>
                        </div>

                        {/* Critical info grid */}
                        <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                          <div className="bg-slate-950/50 p-2 rounded border border-slate-800/60">
                            <span className="text-slate-500">Available Capacity:</span>
                            <p className={`text-xs font-bold mt-0.5 ${
                              isFull ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-slate-200'
                            } ${isStale ? 'opacity-65 text-amber-500/90 font-black' : ''}`}>
                              {available} spaces
                            </p>
                          </div>
                          
                          <div className="bg-slate-950/50 p-2 rounded border border-slate-800/60">
                            <span className="text-slate-500">Medical Support:</span>
                            <p className="text-xs font-bold text-slate-200 mt-0.5 leading-snug">
                              {shelter.medicalSupport}
                            </p>
                          </div>
                        </div>

                        {/* Computed Score Display for Algorithmic Transparency */}
                        {shelterRecommendation && (
                          <div className="bg-emerald-950/20 p-2 rounded border border-emerald-500/20 text-[10px] font-mono text-left">
                            <span className="text-emerald-400/70">Calculated Suitability Score:</span>
                            <p className="text-emerald-400 font-bold text-xs mt-0.5">
                              {((available * 1.5) - (shelter.distance * 10)).toFixed(1)} pts
                            </p>
                          </div>
                        )}

                        {/* Evacuee manual check-in simulator */}
                        <div className="pt-3.5 border-t border-slate-800/80 flex items-center justify-between">
                          <span className="text-[10px] font-mono text-slate-500 uppercase font-semibold">Live Check-In Gate</span>
                          <div className="inline-flex gap-1.5">
                            <button
                              id={`btn-checkin-in-${shelter.id}`}
                              onClick={() => handleShelterOccupancy(shelter.id, 1)}
                              disabled={isFull}
                              className={`p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition disabled:opacity-30 disabled:hover:bg-slate-800 flex items-center justify-center`}
                              title="Evacuee Check In (+1)"
                            >
                              <Plus className="w-3.5 h-3.5 text-emerald-400" />
                            </button>
                            <button
                              id={`btn-checkin-out-${shelter.id}`}
                              onClick={() => handleShelterOccupancy(shelter.id, -1)}
                              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition flex items-center justify-center"
                              title="Evacuee Check Out (-1)"
                            >
                              <Minus className="w-3.5 h-3.5 text-rose-400" />
                            </button>
                          </div>
                        </div>

                      </div>

                      {/* CARD FOOTER */}
                      <div className="px-4 py-2.5 bg-slate-950/40 border-t border-slate-800/60 flex items-center justify-between text-[9px] font-mono text-slate-500">
                        {isStale ? (
                          <span className="flex items-center gap-1 text-amber-400/90 font-bold animate-pulse text-[10px] w-full justify-between">
                            <span>STALE LOCAL CACHE</span>
                            <span className="flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              {getSyncBadge()}
                            </span>
                          </span>
                        ) : (
                          <>
                            <span>Updated: {formatTime(shelter.lastUpdated)}</span>
                            <span>Sync Status: {getSyncBadge()}</span>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {/* TACTICAL REAL-TIME LOG TERMINAL PANEL */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden text-left shadow-lg">
            <div className="p-3 border-b border-slate-800 bg-slate-950/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-rose-500" />
                <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-widest">Connected Mesh Terminal Comms Logs</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
                <span className="text-[10px] font-mono text-slate-400">Live Telemetry Loop Active</span>
              </div>
            </div>
            
            <div className="p-3 bg-slate-950 font-mono text-xs text-slate-300 h-44 overflow-y-auto space-y-1.5 scrollbar-thin">
              {logs.map((log) => {
                let badgeColor = 'bg-slate-800 text-slate-400 border border-slate-700';
                let messageColor = 'text-slate-300';
                if (log.source === 'RADAR') badgeColor = 'bg-rose-950 text-rose-400 border border-rose-900';
                if (log.source === 'INVENTORY') badgeColor = 'bg-blue-950 text-blue-400 border border-blue-900';
                if (log.source === 'SHELTER') badgeColor = 'bg-emerald-950 text-emerald-400 border border-emerald-900';
                if (log.source === 'DISPATCH' || log.source === 'ALGORITHM' || log.source === 'OPERATIONS') badgeColor = 'bg-amber-950 text-amber-400 border border-amber-900';

                if (log.type === 'warning') messageColor = 'text-amber-200';
                if (log.type === 'success') messageColor = 'text-emerald-200';
                if (log.type === 'danger') messageColor = 'text-red-300 font-bold';

                return (
                  <div key={log.id} className="flex items-start gap-2.5 py-0.5 leading-relaxed">
                    <span className="text-slate-500 flex-shrink-0">[{formatTime(log.time)}]</span>
                    <span className={`px-1 text-[9px] font-black rounded tracking-wide flex-shrink-0 ${badgeColor}`}>
                      {log.source}
                    </span>
                    <span className={messageColor}>{log.message}</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* BOTTOM METADATA BAR */}
        <footer className="bg-slate-900 border-t border-slate-800 p-3 text-center text-[10px] font-mono text-slate-500 flex flex-col md:flex-row justify-between items-center gap-2">
          <div>
            System Version: <span className="text-slate-400 font-bold">CON-RELIEF v2.4.9-MESH</span> | Cisco Connected Systems Challenge
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Secure AES-256
            </span>
            <span>|</span>
            <span>Mesh Server Address: <span className="text-slate-400 font-bold">10.244.18.254</span></span>
          </div>
        </footer>

      </main>

    </div>
  );
}
