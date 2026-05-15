import { useState } from "react";
import { Settings, X } from "lucide-react";
import { usePetStore, type PetTheme } from "~/store/pet";
import { spritePetRegistry } from "virtual:pets";

export function PetSettings() {
  const [isOpen, setIsOpen] = useState(false);
  const theme = usePetStore((s) => s.theme);
  const voiceEnabled = usePetStore((s) => s.voiceEnabled);
  const voiceSpeed = usePetStore((s) => s.voiceSpeed);
  const wakeWordEnabled = usePetStore((s) => s.wakeWordEnabled);
  const setTheme = usePetStore((s) => s.setTheme);
  const setVoiceEnabled = usePetStore((s) => s.setVoiceEnabled);
  const setVoiceSpeed = usePetStore((s) => s.setVoiceSpeed);
  const setWakeWordEnabled = usePetStore((s) => s.setWakeWordEnabled);

  const themes = spritePetRegistry.pets.map((p) => ({
    id: p.id as PetTheme,
    label: p.displayName,
  }));

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-slate-200"
        title="宠物设置"
      >
        <Settings size={16} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-[320px] rounded-2xl border border-slate-700/50 bg-[#0f172a] p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-slate-200">宠物设置</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-2 block text-sm text-slate-400">形象主题</label>
              <div className="grid grid-cols-3 gap-2">
                {themes.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTheme(t.id)}
                    className={`rounded-lg px-2 py-2 text-xs transition-colors ${
                      theme === t.id
                        ? "bg-cyan-600 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <label className="text-sm text-slate-400">语音播报</label>
              <button
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  voiceEnabled ? "bg-cyan-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    voiceEnabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>

            <div className="mb-4">
              <label className="mb-1 block text-sm text-slate-400">
                语速: {voiceSpeed.toFixed(1)}x
              </label>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.1"
                value={voiceSpeed}
                onChange={(e) => setVoiceSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-400">唤醒词 &quot;蓝宝&quot;</label>
              <button
                onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
                className={`relative h-6 w-11 rounded-full transition-colors ${
                  wakeWordEnabled ? "bg-cyan-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`absolute top-1 h-4 w-4 rounded-full bg-white transition-transform ${
                    wakeWordEnabled ? "left-6" : "left-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
