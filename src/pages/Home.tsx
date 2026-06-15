import { HardHat } from 'lucide-react';
import { Scene3D } from '@/components3d/Scene';
import { ControlPanel } from '@/components/ControlPanel';
import { DataDisplay } from '@/components/DataDisplay';
import { CurveChart } from '@/components/CurveChart';
import { SegmentAssembly } from '@/components/SegmentAssembly';
import { ConstructionLog } from '@/components/ConstructionLog';
import { WarningAlert } from '@/components/WarningAlert';

export default function Home() {
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
          <div className="flex items-center gap-4 text-sm text-gray-400">
            <span className="hidden md:block">
              模拟长度: <span className="text-white font-mono">100m</span>
            </span>
            <span className="hidden md:block">
              环长: <span className="text-white font-mono">1.5m</span>
            </span>
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-green-400">系统正常</span>
          </div>
        </div>
      </header>

      <div className="w-full h-full pt-16 flex">
        <div className="flex-1 relative">
          <Scene3D />
          
          <div className="absolute bottom-4 left-4 z-10 bg-gray-900/80 backdrop-blur-md rounded-lg px-4 py-2 text-xs text-gray-400 border border-gray-700">
            <p>🖱️ 鼠标拖拽旋转视角 · 滚轮缩放</p>
          </div>
        </div>

        <div className="w-[420px] bg-gray-950 border-l border-gray-800 p-4 overflow-y-auto custom-scrollbar">
          <div className="space-y-4">
            <ControlPanel />
            <DataDisplay />
            <SegmentAssembly />
            <CurveChart />
            <ConstructionLog />
          </div>
        </div>
      </div>
    </div>
  );
}
