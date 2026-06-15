import { useState } from 'react';
import { HardHat, Play, Layers, History, BarChart3 } from 'lucide-react';
import { Scene3D } from '@/components3d/Scene';
import { ControlPanel } from '@/components/ControlPanel';
import { DataDisplay } from '@/components/DataDisplay';
import { CurveChart } from '@/components/CurveChart';
import { SegmentAssembly } from '@/components/SegmentAssembly';
import { ConstructionLog } from '@/components/ConstructionLog';
import { WarningAlert } from '@/components/WarningAlert';
import { GeologyPanel } from '@/components/GeologyPanel';
import { PlaybackPanel } from '@/components/PlaybackPanel';
import { DailyReportView } from '@/components/DailyReportView';
import { useConstructionStore } from '@/store/useConstructionStore';

type TabType = 'control' | 'geology' | 'playback' | 'report';

const TABS: { type: TabType; label: string; icon: JSX.Element }[] = [
  { type: 'control', label: '施工控制', icon: <Play className="w-4 h-4" /> },
  { type: 'geology', label: '地质信息', icon: <Layers className="w-4 h-4" /> },
  { type: 'playback', label: '过程回放', icon: <History className="w-4 h-4" /> },
  { type: 'report', label: '施工日报', icon: <BarChart3 className="w-4 h-4" /> },
];

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabType>('control');
  const { playbackMode, ringRecords } = useConstructionStore();

  return (
    <div className="w-full h-full bg-gray-950 text-white overflow-hidden relative">
      <WarningAlert />

      <header className="absolute top-0 left-0 right-0 z-30 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <HardHat className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                盾构机隧道掘进模拟系统
              </h1>
              <p className="text-xs text-gray-500">Shield Tunneling Simulation System</p>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            {playbackMode === 'playback' && (
              <span className="px-3 py-1 bg-purple-600/30 border border-purple-500/50 rounded-full text-purple-300 text-xs font-medium flex items-center gap-1">
                <History className="w-3 h-3" />
                回放模式
              </span>
            )}
            <span className="hidden md:block text-gray-400">
              模拟长度: <span className="text-white font-mono">100m</span>
            </span>
            <span className="hidden md:block text-gray-400">
              环长: <span className="text-white font-mono">1.5m</span>
            </span>
            <span className="hidden md:block text-gray-400">
              已完成: <span className="text-white font-mono">{ringRecords.length}</span>
              <span className="text-gray-500 ml-1">环</span>
            </span>
            <div
              className={`w-2 h-2 rounded-full ${
                playbackMode === 'playback' ? 'bg-purple-500' : 'bg-green-500'
              } animate-pulse`}
            />
            <span className={playbackMode === 'playback' ? 'text-purple-400' : 'text-green-400'}>
              {playbackMode === 'playback' ? '回放中' : '系统正常'}
            </span>
          </div>
        </div>
      </header>

      <div className="w-full h-full pt-16 flex">
        <div className="flex-1 relative">
          <Scene3D />

          <div className="absolute bottom-4 left-4 z-10 bg-gray-900/80 backdrop-blur-md rounded-lg px-4 py-2 text-xs text-gray-400 border border-gray-700">
            <p>🖱️ 鼠标拖拽旋转视角 · 滚轮缩放</p>
          </div>

          {playbackMode === 'playback' && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-purple-900/80 backdrop-blur-md rounded-lg px-4 py-2 text-sm border border-purple-500/50">
              <p className="text-purple-200 flex items-center gap-2">
                <History className="w-4 h-4" />
                施工过程回放模式 — 可通过右侧"过程回放"面板控制进度
              </p>
            </div>
          )}
        </div>

        <div className="w-[420px] bg-gray-950 border-l border-gray-800 flex flex-col">
          <div className="flex border-b border-gray-800 bg-gray-900/50">
            {TABS.map((tab) => (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-xs font-medium transition-all ${
                  activeTab === tab.type
                    ? 'text-white bg-gray-900 border-b-2 border-blue-500'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-gray-900/50'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-4">
            {activeTab === 'control' && (
              <div className="space-y-4">
                <ControlPanel />
                <DataDisplay />
                <SegmentAssembly />
                <CurveChart />
                <ConstructionLog />
              </div>
            )}

            {activeTab === 'geology' && (
              <div className="space-y-4">
                <GeologyPanel />
                <DataDisplay />
              </div>
            )}

            {activeTab === 'playback' && (
              <div className="space-y-4">
                <PlaybackPanel />
                <DataDisplay />
              </div>
            )}

            {activeTab === 'report' && (
              <div className="space-y-4">
                <DailyReportView />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
