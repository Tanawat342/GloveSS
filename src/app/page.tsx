'use client';

import { useState, useEffect, useRef } from 'react';

export default function SmartGlovePage() {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [receivedText, setReceivedText] = useState<string>('รอการเชื่อมต่อ...');
  const [isConnected, setIsConnected] = useState(false);
  const lastSpokenRef = useRef<string>('');

  const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  const CHARACTERISTIC_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';

  const speak = (text: string) => {
    if (!text || text === lastSpokenRef.current) return;
    
    // Stop any current speech to avoid overlapping
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'th-TH';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onend = () => {
      lastSpokenRef.current = text;
    };

    window.speechSynthesis.speak(utterance);
    lastSpokenRef.current = text;
  };

  const handleCharacteristicValueChanged = (event: Event) => {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;

    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(value).trim();
    
    if (text) {
      setReceivedText(text);
      speak(text);
    }
  };

  const onDisconnected = () => {
    console.log('Device disconnected');
    setIsConnected(false);
    setDevice(null);
    setReceivedText('การเชื่อมต่อหลุด กรุณาเชื่อมต่อใหม่');
  };

  const connectBluetooth = async () => {
    try {
      const bluetoothDevice = await navigator.bluetooth.requestDevice({
        filters: [{ name: 'SmartGlove' }],
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
      setReceivedText('เชื่อมต่อสำเร็จ พร้อมรับข้อมูล');
    } catch (error) {
      console.error('Bluetooth connection failed', error);
      setReceivedText('การเชื่อมต่อล้มเหลว');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 space-y-12">
      {/* Glossy Header BG effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20 pointer-events-none" />
      
      <div className="z-10 text-center space-y-4">
        <h1 className="text-2xl font-light tracking-widest text-blue-400 uppercase">
          SmartGlove Assistant
        </h1>
        <div className="h-1 w-24 bg-blue-500 mx-auto rounded-full shadow-[0_0_10px_rgba(59,130,246,0.6)]" />
      </div>

      {/* Hero Text display */}
      <div className="z-10 w-full max-w-4xl bg-white/5 border border-white/10 rounded-3xl p-12 backdrop-blur-xl shadow-2xl flex flex-col items-center justify-center min-h-[300px] transition-all duration-500 hover:border-blue-500/30">
        <p className={`text-6xl md:text-9xl font-bold text-center transition-all duration-300 ${isConnected ? 'text-white' : 'text-white/20'}`}>
          {receivedText}
        </p>
      </div>

      {/* Connection Button */}
      <div className="z-10">
        <button
          onClick={connectBluetooth}
          disabled={isConnected}
          className={`
            px-12 py-6 rounded-full text-2xl font-semibold tracking-tight transition-all duration-300
            ${isConnected 
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 cursor-default' 
              : 'bg-blue-600 hover:bg-blue-500 hover:scale-105 active:scale-95 shadow-[0_0_30px_rgba(37,99,235,0.4)] hover:shadow-[0_0_50px_rgba(37,99,235,0.6)]'
            }
          `}
        >
          {isConnected ? (
            <span className="flex items-center gap-3">
              <span className="relative flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500"></span>
              </span>
              เชื่อมต่อแล้ว
            </span>
          ) : (
            'เชื่อมต่อถุงมือ'
          )}
        </button>
      </div>

      {/* Footer Info */}
      <div className="z-10 text-white/40 text-sm font-light">
        Web Bluetooth API & Web Speech Synthesis
      </div>

      <style jsx global>{`
        body {
          overflow: hidden;
          background: #020617;
        }
      `}</style>
    </div>
  );
}
