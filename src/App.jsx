import React, { useState, useEffect } from 'react';
import { 
  Camera, MapPin, Send, CheckCircle, ShieldAlert, 
  Flame, Car, Building2, AlertCircle, ChevronRight, 
  Phone, PhoneCall, X, Sun, Moon, Upload, ChevronDown, ChevronUp, Sparkles, AlertTriangle 
} from 'lucide-react';

import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

const defaultIcon = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

function MapController({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 16, { duration: 1.5 });
  }, [center, map]);
  return null;
}

function LocationPicker({ position, setPosition, setLocationText }) {
  useMapEvents({
    async click(e) {
      const lat = e.latlng.lat;
      const lng = e.latlng.lng;
      setPosition([lat, lng]);
      setLocationText('Fetching address details...');
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
        const data = await response.json();
        setLocationText(data.display_name || `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
      } catch (error) {
        setLocationText(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
      }
    },
  });
  return position ? <Marker position={position} icon={defaultIcon} /> : null;
}

const CATEGORIES = [
  { id: 'road', name: 'Road Incident', icon: Car, desc: 'Collision, blocked road, dangerous debris' },
  { id: 'fire', name: 'Fire & Hazards', icon: Flame, desc: 'Smoke, flames, flooding, fallen cables' },
  { id: 'property', name: 'Property Damage', icon: Building2, desc: 'Broken glass, damaged infrastructure, vandalism' },
  { id: 'distress', name: 'Person in Distress', icon: AlertCircle, desc: 'Visible altercation, potential injury, medical aid' }
];

const getAuthorityDetails = (category) => {
    switch (category) {
      case 'Fire & Hazards': 
        return { name: 'Fire & Rescue (Bomba)', number: '994' };
      case 'Road Incident': 
        return { name: 'Police & Ambulance', number: '999' };
      case 'Person in Distress': 
        return { name: 'Emergency Services', number: '999' };
      case 'Property Damage': 
        return { name: 'Local Police', number: '999' };
      default: 
        return { name: 'General Emergency', number: '999' };
    }
  };

export default function App() {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false); 
  const [view, setView] = useState('report'); 
  const [step, setStep] = useState(1);
  
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [location, setLocation] = useState('');
  const [mapPosition, setMapPosition] = useState(null);
  const [isLocating, setIsLocating] = useState(false);
  const [description, setDescription] = useState('');
  const [urgencyAnswers, setUrgencyAnswers] = useState({ immediateDanger: false, blockedAccess: false });
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [suggestedPriority, setSuggestedPriority] = useState('Medium');
  const [aiSummary, setAiSummary] = useState(''); 
  const [isFalseReport, setIsFalseReport] = useState(false);
  const [isCalling, setIsCalling] = useState(false); 
  
  const [reports, setReports] = useState([]);
  const [expandedReportId, setExpandedReportId] = useState(null);

  useEffect(() => {
    setIsAndroid(/android/i.test(navigator.userAgent));
  }, []);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      const img = new Image();
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        let width = img.width;
        let height = img.height;
        
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.7);
        const base64String = compressedDataUrl.split(',')[1];
        
        setImageBase64({ inlineData: { data: base64String, mimeType: 'image/jpeg' } });
      };
    }
  };

  const handleGetLocation = () => {
    setIsLocating(true);
    setLocation('Detecting location...');
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          setMapPosition([lat, lng]);
          try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            const data = await response.json();
            setLocation(data.display_name || `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
          } catch (error) {
            setLocation(`${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`);
          }
          setIsLocating(false);
        },
        () => {
          setMapPosition([3.1390, 101.6869]); 
          setLocation('Kuala Lumpur (Simulated)');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const runAiAnalysis = async () => {
    setIsAnalyzing(true);
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

    if (!apiKey) {
      alert("Please add VITE_GEMINI_API_KEY to your .env file!");
      setIsAnalyzing(false);
      return;
    }

    try {
      const promptText = `
        Analyze the attached photo (if provided) and the user's text description.
        User Description: "${description || 'No description provided'}"
        Flags: Immediate Danger=${urgencyAnswers.immediateDanger}, Blocked Access=${urgencyAnswers.blockedAccess}

        1. Categorize the incident into EXACTLY ONE of these categories: Road Incident, Fire & Hazards, Property Damage, Person in Distress, or Uncategorized.
        2. Determine priority (Low, Medium, or High).
        3. Write a 1-2 sentence objective description of what you visually see in the image.
        4. Compare the user's text description to the visual evidence in the image. If the user is blatantly lying or exaggerating (e.g. claiming a huge fire but the image is just a cat, or claiming a crash when it's an empty street), set "is_false_report" to true. Otherwise, set it to false.

        Respond ONLY with a valid JSON object in this exact format, with no markdown formatting or extra text: 
        {"category": "Category Name", "priority": "Priority Level", "ai_description": "What you see...", "is_false_report": true}
      `;

      const contents = [{ role: "user", parts: [{ text: promptText }] }];
      if (imageBase64) contents[0].parts.push(imageBase64);

const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent`, {        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey 
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const rawText = data.candidates[0].content.parts[0].text;
      const cleanText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
      const aiResult = JSON.parse(cleanText);

      setSelectedCategory(aiResult.category);
      setSuggestedPriority(aiResult.priority);
      setAiSummary(aiResult.ai_description); 
      setIsFalseReport(aiResult.is_false_report);

      if (aiResult.priority === 'High' && !aiResult.is_false_report) {
        setIsCalling(true);
      } else {
        setIsCalling(false);
      }

    } catch (error) {
      console.error("AI API Error:", error);
      alert("AI Vision failed. Ensure your API key is correct and you have internet access.");
      setSelectedCategory('Uncategorized');
      setSuggestedPriority('Medium');
      setAiSummary('Could not generate AI description.');
      setIsFalseReport(false);
    } finally {
      setIsAnalyzing(false);
      setStep(3);
    }
  };

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    const newReport = {
      id: `REP-${Math.floor(1000 + Math.random() * 9000)}`,
      category: selectedCategory || 'Uncategorized',
      location: location || 'Location unavailable',
      description,
      aiSummary, 
      isFalseReport,
      priority: suggestedPriority,
      status: 'Submitted',
      timestamp: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      image: imagePreview
    };
    setReports([newReport, ...reports]);
    setStep(5);
  };

  const resetForm = () => {
    setImagePreview(null);
    setImageBase64(null);
    setLocation('');
    setMapPosition(null);
    setDescription('');
    setSelectedCategory(null);
    setUrgencyAnswers({ immediateDanger: false, blockedAccess: false });
    setIsCalling(false);
    setAiSummary(''); 
    setIsFalseReport(false); 
    setStep(1);
  };

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
        
        <header className="border-b border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 backdrop-blur px-6 py-4 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <img src="/logo (3).png" alt="SUSPOT Logo" className="w-10 h-10 rounded-xl object-cover shadow-sm" />
            <div>
              <h1 className="text-xl font-black tracking-wider uppercase bg-gradient-to-r from-red-500 to-amber-500 dark:from-red-400 dark:to-amber-400 bg-clip-text text-transparent">
                SUSPOT
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">Spot the danger. Send the alert. Save time.</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="hidden sm:flex bg-slate-200 dark:bg-slate-800 p-1 rounded-lg border border-slate-300 dark:border-slate-700 text-xs">
              <button onClick={() => setView('report')} className={`px-3 py-1.5 rounded-md font-medium transition ${view === 'report' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                Report Incident
              </button>
              <button onClick={() => setView('admin')} className={`px-3 py-1.5 rounded-md font-medium transition ${view === 'admin' ? 'bg-red-500 text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'}`}>
                Dashboard
              </button>
            </div>
            
            <button 
              onClick={() => setIsDarkMode(!isDarkMode)} 
              className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
              aria-label="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </header>

        <div className="sm:hidden bg-slate-50 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 p-3">
          <div className="flex bg-slate-200/60 dark:bg-slate-800/80 p-1 rounded-xl">
            <button 
              onClick={() => setView('report')} 
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${view === 'report' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Report Incident
            </button>
            <button 
              onClick={() => setView('admin')} 
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all duration-200 ${view === 'admin' ? 'bg-white dark:bg-slate-700 text-red-600 dark:text-red-400 shadow-[0_1px_3px_rgba(0,0,0,0.1)]' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Dashboard
            </button>
          </div>
        </div>

        <main className="flex-1 max-w-2xl w-full mx-auto p-4 md:p-6">
          {view === 'report' ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-lg dark:shadow-xl transition-colors duration-200">
              
              <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-200 dark:border-slate-800 text-[10px] sm:text-xs font-semibold tracking-tight w-full">
                <button 
                  onClick={() => setStep(1)} 
                  className={`py-2 hover:text-red-600 dark:hover:text-red-300 transition-colors cursor-pointer whitespace-nowrap ${step >= 1 ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-600'}`}
                >
                  1. Details
                </button>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300 dark:text-slate-700 flex-shrink-0 mx-0.5" />
                
                <button 
                  onClick={() => step >= 2 && setStep(2)} 
                  disabled={step < 2}
                  className={`py-2 hover:text-red-600 dark:hover:text-red-300 transition-colors whitespace-nowrap ${step >= 2 ? 'text-red-500 dark:text-red-400 cursor-pointer' : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
                >
                  2. Urgency
                </button>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300 dark:text-slate-700 flex-shrink-0 mx-0.5" />
                
                <button 
                  onClick={() => step >= 3 && setStep(3)} 
                  disabled={step < 3}
                  className={`py-2 hover:text-red-600 dark:hover:text-red-300 transition-colors whitespace-nowrap ${step >= 3 ? 'text-red-500 dark:text-red-400 cursor-pointer' : 'text-slate-400 dark:text-slate-600 cursor-not-allowed'}`}
                >
                  3. AI Review
                </button>
                <ChevronRight className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300 dark:text-slate-700 flex-shrink-0 mx-0.5" />
                
                <span className={`py-2 whitespace-nowrap ${step >= 5 ? 'text-red-500 dark:text-red-400' : 'text-slate-400 dark:text-slate-600'}`}>
                  4. Confirm
                </span>
              </div>

              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Upload Incident Photo</label>
                    
                    {imagePreview ? (
                      <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center p-2 cursor-pointer bg-slate-50/50 dark:bg-slate-950/40 transition relative overflow-hidden">
                        <img src={imagePreview} alt="Preview" className="h-44 object-cover rounded-lg w-full" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <span className="text-white font-medium text-sm">Click to change photo</span>
                        </div>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    ) : isAndroid ? (
                      <div className="grid grid-cols-2 gap-3">
                        <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer bg-slate-50/50 dark:bg-slate-950/40 transition">
                          <Camera className="w-8 h-8 text-slate-500 dark:text-slate-400 mb-2" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Camera</span>
                          <span className="text-xs text-slate-500 dark:text-slate-500 mt-1">Take photo</span>
                          <input type="file" accept="image/*" capture="environment" onChange={handleImageUpload} className="hidden" />
                        </label>

                        <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer bg-slate-50/50 dark:bg-slate-950/40 transition">
                          <Upload className="w-8 h-8 text-slate-500 dark:text-slate-400 mb-2" />
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-300">Gallery</span>
                          <span className="text-xs text-slate-500 dark:text-slate-500 mt-1">Upload file</span>
                          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                        </label>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-red-500/50 rounded-xl flex flex-col items-center justify-center p-6 cursor-pointer bg-slate-50/50 dark:bg-slate-950/40 transition relative overflow-hidden">
                        <Camera className="w-10 h-10 text-slate-400 dark:text-slate-500 mb-2" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">Click to capture or upload photo</span>
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Location Mapping</label>
                    <div className="flex gap-2 mb-3">
                      <textarea 
                        value={location} onChange={(e) => setLocation(e.target.value)}
                        placeholder="Click GPS to detect location..." rows="2"
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-4 py-2.5 text-xs text-slate-800 dark:text-slate-300 focus:outline-none focus:border-red-500 dark:focus:border-red-500 resize-none transition-colors"
                      />
                      <button 
                        type="button" onClick={handleGetLocation} disabled={isLocating}
                        className="bg-red-600 hover:bg-red-500 border border-red-500 px-4 rounded-lg flex flex-col justify-center items-center gap-1 text-xs font-bold text-white transition h-auto"
                      >
                        <MapPin className="w-4 h-4" /> {isLocating ? 'Locating...' : 'GPS'}
                      </button>
                    </div>
                    
                    <div className="h-64 w-full bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-300 dark:border-slate-700 overflow-hidden relative z-0">
                      {mapPosition ? (
                        <MapContainer center={mapPosition} zoom={16} scrollWheelZoom={true} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                          <LocationPicker position={mapPosition} setPosition={setMapPosition} setLocationText={setLocation} />
                          <MapController center={mapPosition} />
                        </MapContainer>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 dark:text-slate-600">
                          <MapPin className="w-8 h-8 mb-2 opacity-30" />
                          <span className="text-xs">Click GPS to load the map</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Brief Incident Description</label>
                    <textarea 
                      rows="3" value={description} onChange={(e) => setDescription(e.target.value)}
                      placeholder="Describe what you see..."
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-sm text-slate-800 dark:text-slate-300 focus:outline-none focus:border-red-500 transition-colors"
                    />
                  </div>

                  <button 
                    disabled={!description && !imagePreview}
                    onClick={() => setStep(2)} 
                    className="w-full bg-slate-200 dark:bg-slate-100 text-slate-900 hover:bg-red-600 hover:text-white dark:hover:bg-red-500 dark:hover:text-white active:bg-red-700 dark:active:bg-red-600 disabled:opacity-50 disabled:hover:bg-slate-200 disabled:dark:hover:bg-slate-100 disabled:hover:text-slate-900 font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all duration-200"
                  >
                    Continue to Urgency Check <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">Assess Urgency</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">These help our system assign an appropriate triage priority.</p>
                  </div>
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                      <input type="checkbox" checked={urgencyAnswers.immediateDanger} onChange={(e) => setUrgencyAnswers({...urgencyAnswers, immediateDanger: e.target.checked})} className="w-5 h-5 accent-red-500" />
                      <div><span className="text-sm font-medium text-slate-800 dark:text-slate-200">Immediate threat to human life or safety?</span></div>
                    </label>
                    <label className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition">
                      <input type="checkbox" checked={urgencyAnswers.blockedAccess} onChange={(e) => setUrgencyAnswers({...urgencyAnswers, blockedAccess: e.target.checked})} className="w-5 h-5 accent-red-500" />
                      <div><span className="text-sm font-medium text-slate-800 dark:text-slate-200">Blocking main emergency or transport routes?</span></div>
                    </label>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => setStep(1)} className="w-1/3 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-3 rounded-lg text-sm font-medium transition">Back</button>
                    <button onClick={runAiAnalysis} disabled={isAnalyzing} className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition">
                      {isAnalyzing ? 'Vision AI Processing...' : 'Analyze with AI'}
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6">
                  
                  {isFalseReport && (
                    <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500/50 p-4 rounded-xl flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <h4 className="text-sm font-bold text-red-800 dark:text-red-400 uppercase tracking-wide">Potential False Report Detected</h4>
                        <p className="text-xs text-red-700 dark:text-red-300 mt-1">
                          Our AI indicates your description does not match the visual evidence in the photo. Submitting a false emergency alert is a punishable offense. This flag will be sent to authorities.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">AI Suggested Category</span>
                      <span className="bg-red-100 text-red-600 border-red-200 dark:bg-red-500/20 dark:text-red-400 border dark:border-red-500/30 text-xs px-2.5 py-1 rounded-full font-bold">{selectedCategory}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-3">
                      <span className="text-xs text-slate-500 dark:text-slate-400 uppercase font-semibold">Calculated Priority</span>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${suggestedPriority === 'High' ? 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30' : suggestedPriority === 'Medium' ? 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' : 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'}`}>
                        {suggestedPriority} Priority
                      </span>
                    </div>
                    
                    {aiSummary && (
                      <div className="mt-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800/50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Sparkles className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
                          <span className="text-xs font-bold uppercase text-indigo-700 dark:text-indigo-400">AI Visual Analysis</span>
                        </div>
                        <p className="text-sm text-indigo-900 dark:text-indigo-200 leading-relaxed">
                          {aiSummary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* UNIFIED EMERGENCY ACTION BLOCK */}
                  {!isFalseReport && (
                    <div className={`border rounded-xl p-6 text-center space-y-5 transition-all duration-300 ${
                      suggestedPriority === 'High' || isCalling 
                        ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30' 
                        : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                    }`}>
                      <div className="flex justify-center">
                        <div className={`p-4 rounded-full transition-all duration-300 ${isCalling ? 'bg-rose-600 animate-pulse scale-110 shadow-[0_0_30px_rgba(225,29,72,0.6)]' : (suggestedPriority === 'High' ? 'bg-rose-200 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' : 'bg-amber-200 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400')}`}>
                           <PhoneCall className={`w-10 h-10 ${isCalling ? 'text-white' : ''}`} />
                        </div>
                      </div>
                      
                      <div>
                        <h4 className={`text-xl font-bold ${isCalling ? 'text-rose-600 dark:text-rose-500 animate-pulse' : (suggestedPriority === 'High' ? 'text-rose-700 dark:text-rose-400' : 'text-amber-700 dark:text-amber-400')}`}>
                          {isCalling 
                            ? `Calling ${getAuthorityDetails(selectedCategory).name}...` 
                            : (suggestedPriority === 'High' ? 'Emergency Action Advised' : 'Optional Action')}
                        </h4>
                        <p className={`text-sm mt-2 ${isCalling ? 'text-rose-800 dark:text-rose-300 font-bold' : 'text-slate-600 dark:text-slate-300'}`}>
                          {isCalling 
                            ? `Dialing ${getAuthorityDetails(selectedCategory).number}. You can cancel this call below.` 
                            : `You can contact ${getAuthorityDetails(selectedCategory).name} if you feel it is necessary.`}
                        </p>
                      </div>
                      
                      <div className="flex flex-col gap-3 pt-2">
                        {isCalling ? (
                          <button 
                            onClick={() => setIsCalling(false)}
                            className="w-full font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition bg-slate-800 hover:bg-slate-700 text-white"
                          >
                            <X className="w-5 h-5" /> Cancel Call
                          </button>
                        ) : (
                          <button 
                            onClick={() => setIsCalling(true)}
                            className={`w-full font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition text-white shadow-lg ${suggestedPriority === 'High' ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-600/20' : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'}`}
                          >
                            <Phone className="w-5 h-5" /> Call {getAuthorityDetails(selectedCategory).number} Now
                          </button>
                        )}
                        
                        {suggestedPriority === 'High' && (
                          <button 
                            onClick={handleSubmit} 
                            disabled={isCalling}
                            className={`w-full bg-slate-200 hover:bg-slate-300 text-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 border border-slate-300 dark:border-slate-800 dark:text-slate-300 font-medium py-3.5 rounded-lg transition ${isCalling ? 'opacity-50 cursor-not-allowed' : ''}`}
                          >
                            Just Submit Report
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Manual Category Override and Action Buttons for Low/Medium */}
                  {suggestedPriority !== 'High' && (
                    <>
                      <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-2">Change Category</label>
                        <div className="grid grid-cols-2 gap-2">
                          {CATEGORIES.map((cat) => (
                            <button
                              key={cat.id} type="button" onClick={() => setSelectedCategory(cat.name)}
                              className={`p-3 rounded-lg border text-left text-xs transition ${selectedCategory === cat.name ? 'border-red-500 bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-white shadow-sm' : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >
                              <div className="font-semibold">{cat.name}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3">
                        <button onClick={() => setStep(2)} className="sm:w-1/4 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 py-3 rounded-lg text-sm font-medium transition">Back</button>
                        
                        <button onClick={handleSubmit} disabled={isCalling} className={`flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition ${isCalling ? 'opacity-50 cursor-not-allowed' : ''}`}>
                          <Send className="w-4 h-4" /> Submit Alert
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}

              {step === 5 && (
                <div className="text-center py-8 space-y-4">
                  <CheckCircle className="w-16 h-16 text-emerald-500 dark:text-emerald-400 mx-auto" />
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white">Alert Dispatched</h3>
                  <div className="pt-4 flex gap-3 justify-center">
                    <button onClick={resetForm} className="bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-6 py-2 rounded-lg text-sm font-medium transition">New Report</button>
                    <button onClick={() => { setView('admin'); resetForm(); }} className="bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-white dark:text-slate-900 px-6 py-2 rounded-lg text-sm font-bold transition">View Dashboard</button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Review Dashboard</h2>
              <div className="space-y-3">
                {reports.map((rep) => (
                  <div 
                    key={rep.id} 
                    onClick={() => setExpandedReportId(expandedReportId === rep.id ? null : rep.id)}
                    className={`bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm cursor-pointer transition-all ${rep.isFalseReport ? 'border-red-500 bg-red-50/50 dark:bg-red-900/10' : 'border-slate-200 dark:border-slate-800 hover:border-red-500/50 dark:hover:border-red-500/50'}`}
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs text-slate-500 dark:text-slate-400 font-bold">{rep.id}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${rep.priority === 'High' ? 'bg-rose-100 text-rose-600 border-rose-200 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30' : rep.priority === 'Medium' ? 'bg-amber-100 text-amber-600 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30' : 'bg-emerald-100 text-emerald-600 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30'}`}>
                            {rep.priority}
                          </span>
                          
                          {rep.isFalseReport && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-red-600 text-white uppercase tracking-wider flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Flagged False
                            </span>
                          )}
                        </div>
                        <h4 className="text-base font-semibold text-slate-900 dark:text-white">{rep.category}</h4>
                        {rep.image && !expandedReportId && <img src={rep.image} alt="Report" className="h-16 w-16 object-cover rounded-md mt-2 border border-slate-200 dark:border-slate-700" />}
                      </div>
                      <div className="text-slate-400 dark:text-slate-500">
                        {expandedReportId === rep.id ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                      </div>
                    </div>

                    {expandedReportId === rep.id && (
                      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-3 text-sm">
                        {rep.image && <img src={rep.image} alt="Full Report" className="w-full h-48 object-cover rounded-lg border border-slate-200 dark:border-slate-700 mb-3" />}
                        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
                          <span><strong>Date:</strong> {rep.date}</span>
                          <span><strong>Time:</strong> {rep.timestamp}</span>
                        </div>
                        <p className="text-slate-800 dark:text-slate-300"><strong>Location:</strong> {rep.location}</p>
                        
                        {rep.description && (
                          <p className="text-slate-800 dark:text-slate-300"><strong>User Note:</strong> {rep.description}</p>
                        )}
                        
                        {rep.aiSummary && (
                          <div className={`border p-3 rounded-lg mt-2 ${rep.isFalseReport ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50' : 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/20 dark:border-indigo-800/50'}`}>
                            <span className={`text-xs font-bold uppercase block mb-1 ${rep.isFalseReport ? 'text-red-700 dark:text-red-400' : 'text-indigo-700 dark:text-indigo-400'}`}>
                              AI Visual Analysis {rep.isFalseReport ? '(MISMATCH DETECTED)' : ''}
                            </span>
                            <p className={`text-xs leading-relaxed ${rep.isFalseReport ? 'text-red-900 dark:text-red-200' : 'text-indigo-900 dark:text-indigo-200'}`}>
                              {rep.aiSummary}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                
                {reports.length === 0 && (
                  <div className="text-center py-12 text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl">
                    No active incidents reported.
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}