'use client';

import { useState, useEffect, useRef } from 'react';

// Animation variants and styles
const glassStyle = "bg-white/10 backdrop-blur-2xl border border-white/20 shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]";

export default function SmartGlovePage() {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [receivedText, setReceivedText] = useState<string>('รอการเชื่อมต่อ...');
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const lastSpokenRef = useRef<string>('');
  const pulseRef = useRef<HTMLDivElement>(null);

  const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

  // Mapping raw signals from glove to Thai sentences
  const labelMap: Record<string, string> = {
    "HELLO": "สวัสดีครับ ",
    "HUNGRY": "ตอนนี้ผมเริ่มหิวข้าวแล้วครับ",
    "THANKS": "ขอบคุณมากครับ",
    "TOILET": "ขออนุญาตไปห้องน้ำหน่อยครับ"
  };

  const speak = (text: string) => {
    if (!text || text === lastSpokenRef.current) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    
    utterance.onend = () => {
      lastSpokenRef.current = text;
    };

    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = text;
  };

  const handleCharacteristicValueChanged = (event: Event) => {
    const characteristic = event.target as BluetoothRemoteGATTCharacteristic;
    const value = characteristic.value;
    if (!value) return;

    const decoder = new TextDecoder('utf-8');
    const rawText = decoder.decode(value).trim().toUpperCase(); // Normalize to uppercase for mapping
    
    // Translate using map or fallback to raw text
    const displayMessage = labelMap[rawText] || rawText;
    
    if (rawText) {
      setReceivedText(displayMessage);
      speak(displayMessage);
      
      // Visual feedback pulse
      if (pulseRef.current) {
        pulseRef.current.classList.remove('animate-ping');
        // Trigger reflow to restart animation
        void pulseRef.current.offsetWidth;
        pulseRef.current.classList.add('animate-ping');
      }
    }
  };

  const onDisconnected = () => {
    console.log('Device disconnected');
    setIsConnected(false);
    setDevice(null);
    setReceivedText('การเชื่อมต่อหลุด กรุณาเชื่อมต่อใหม่');
  };

  const connectBluetooth = async () => {
    if (isConnecting) return;
    setIsConnecting(true);
    setReceivedText('กำลังค้นหาอุปกรณ์...');

    try {
      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters: [
          { name: 'SmartGlove' } // Must match Arduino name exactly
        ],
        optionalServices: [SERVICE_UUID],
      });

      setDevice(bluetoothDevice);
      bluetoothDevice.addEventListener('gattserverdisconnected', onDisconnected);

      const server = await bluetoothDevice.gatt?.connect();
      if (!server) throw new Error('GATT Server not found');

      const service = await server.getPrimaryService(SERVICE_UUID);
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID);

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleCharacteristicValueChanged);

      setIsConnected(true);
      setReceivedText('เชื่อมต่อแล้ว พร้อมใช้งาน');
    } catch (error) {
      console.error('Bluetooth connection failed', error);
      setReceivedText('ไม่พบอุปกรณ์ หรือยกเลิกการเชื่อมต่อ');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <main className="relative min-h-screen bg-[#020617] overflow-hidden flex flex-col items-center justify-between py-12 px-6">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/20 rounded-full blur-[120px]" />
      <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-cyan-500/10 rounded-full blur-[100px]" />

      {/* Header Section */}
      <header className="relative z-10 text-center">
        <div className="mb-4 inline-block px-4 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
          <span className="text-xs font-bold tracking-[0.2em] text-blue-400 uppercase">
            Assistive Technology v2.0
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-white via-blue-100 to-blue-300">
          Smart Glove
        </h1>
        <p className="mt-2 text-slate-400 font-medium tracking-wide">เเปลภาษามือเป็นเสียงพูดอัจฉริยะ</p>
      </header>

      {/* Hero Display Card */}
      <div className="relative z-10 w-full max-w-5xl group">
        <div className={`absolute -inset-1 bg-gradient-to-r ${isConnected ? 'from-cyan-500 to-blue-600' : 'from-slate-700 to-slate-800'} rounded-[2.5rem] blur opacity-25 group-hover:opacity-50 transition duration-1000`}></div>
        <div className={`relative ${glassStyle} rounded-[2.5rem] p-10 md:p-20 flex flex-col items-center justify-center min-h-[400px] transition-all duration-500`}>
          
          <div className="absolute top-8 left-8 flex items-center space-x-2">
            <div ref={pulseRef} className={`w-3 h-3 rounded-full ${isConnected ? 'bg-cyan-500' : 'bg-slate-500 opacity-50'}`}></div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Live Status</span>
          </div>

          <div className="text-center space-y-8">
            <span className="text-sm font-semibold text-blue-400/60 uppercase tracking-widest">คำพูดที่ได้รับ</span>
            <div className="min-h-[120px] flex items-center justify-center">
              <h2 className={`text-6xl md:text-8xl lg:text-9xl font-bold tracking-tight transition-all duration-500 ${isConnected ? 'text-white' : 'text-white/20'}`}>
                {receivedText}
              </h2>
            </div>
            {isConnected && (
              <div className="flex justify-center">
                <div className="h-1 w-32 bg-gradient-to-r from-transparent via-cyan-500 to-transparent rounded-full shadow-[0_0_15px_rgba(6,182,212,0.5)] animate-pulse"></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Control Section */}
      <footer className="relative z-10 w-full flex flex-col items-center space-y-8">
        <button
          onClick={connectBluetooth}
          disabled={isConnected || isConnecting}
          className={`
            group relative px-10 py-5 rounded-2xl text-xl font-bold transition-all duration-500
            ${isConnected 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 cursor-default ring-4 ring-emerald-500/5' 
              : 'bg-white text-black hover:bg-blue-50 active:scale-95 shadow-[0_20px_50px_rgba(255,255,255,0.1)]'
            }
          `}
        >
          {isConnected ? (
            <span className="flex items-center gap-4">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20 ml-[-4px]">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              เชื่อมต่อสำเร็จ
            </span>
          ) : isConnecting ? (
            <span className="flex items-center gap-4">
              <svg className="animate-spin h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              กำลังเชื่อมต่อ...
            </span>
          ) : (
            <span className="flex items-center gap-4">
              <svg className="w-6 h-6 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a9.05 9.05 0 0112.728 0m-16.97-5.657a13.57 13.57 0 0119.142 0"></path>
              </svg>
              เริ่มเชื่อมต่อถุงมือ
            </span>
          )}
        </button>

        <div className="flex items-center space-x-6 text-slate-500 font-medium">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span className="text-xs uppercase tracking-widest">Bluetooth LE</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span className="text-xs uppercase tracking-widest">Thai Voice Engine</span>
          </div>
        </div>
      </footer>

      {/* Noise background overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay"></div>
    </main>
  );
}

