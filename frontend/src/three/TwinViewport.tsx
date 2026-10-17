import React, { useRef, useEffect, Suspense } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Grid } from "@react-three/drei";
import * as THREE from "three";
import { HumanMannequin } from "./HumanMannequin";
import { useTwinStore } from "../store/useTwinStore";
import {
  RotateCcw,
  Compass,
  Activity,
  Layers,
  Camera,
  Crosshair,
  Sliders,
  Loader2,
  AlertTriangle
} from "lucide-react";

interface ViewportProps {
  customPelvisQuat?: THREE.Quaternion;
  customTorsoQuat?: THREE.Quaternion;
  customChestQuat?: THREE.Quaternion;
  heightClass?: string;
}

const CameraController: React.FC = () => {
  const cameraPreset = useTwinStore((s) => s.cameraPreset);
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (!controlsRef.current) return;
    const controls = controlsRef.current;

    switch (cameraPreset) {
      case "front":
        controls.object.position.set(0, 0.8, 2.5);
        controls.target.set(0, 0.7, 0);
        break;
      case "rear":
        controls.object.position.set(0, 0.8, -2.5);
        controls.target.set(0, 0.7, 0);
        break;
      case "side":
        controls.object.position.set(2.5, 0.8, 0);
        controls.target.set(0, 0.7, 0);
        break;
      case "top":
        controls.object.position.set(0, 3.0, 0.1);
        controls.target.set(0, 0.7, 0);
        break;
    }
    controls.update();
  }, [cameraPreset]);

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={true}
      enableZoom={true}
      enableRotate={true}
      minDistance={0.6}
      maxDistance={5.0}
      target={[0, 0.7, 0]}
    />
  );
};

/** Loading fallback inside the 3D scene */
const ModelLoadingFallback: React.FC = () => {
  return (
    <mesh position={[0, 0.7, 0]}>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshStandardMaterial color="#57D6C2" wireframe transparent opacity={0.5} />
    </mesh>
  );
};

export const TwinViewport: React.FC<ViewportProps> = ({
  customPelvisQuat,
  customTorsoQuat,
  customChestQuat,
  heightClass = "h-[480px]",
}) => {
  const showSkeleton = useTwinStore((s) => s.showSkeleton);
  const setShowSkeleton = useTwinStore((s) => s.setShowSkeleton);
  const showSensors = useTwinStore((s) => s.showSensors);
  const setShowSensors = useTwinStore((s) => s.setShowSensors);
  const showAxes = useTwinStore((s) => s.showAxes);
  const setShowAxes = useTwinStore((s) => s.setShowAxes);
  const cameraPreset = useTwinStore((s) => s.cameraPreset);
  const setCameraPreset = useTwinStore((s) => s.setCameraPreset);
  const calibrateOrientation = useTwinStore((s) => s.calibrateOrientation);
  const resetCalibration = useTwinStore((s) => s.resetCalibration);
  const useRawOrientation = useTwinStore((s) => s.useRawOrientation);
  const setUseRawOrientation = useTwinStore((s) => s.setUseRawOrientation);

  return (
    <div className={`relative w-full ${heightClass} bg-[#0E1317] rounded border border-borderSubtle overflow-hidden select-none`}>
      {/* 3D WebGL Canvas */}
      <Canvas
        camera={{ position: [0, 0.8, 2.5], fov: 45 }}
        shadows
        gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
        className="w-full h-full"
      >
        <color attach="background" args={["#0B0F12"]} />

        {/* Lighting */}
        <ambientLight intensity={0.7} />
        <directionalLight
          position={[3, 5, 4]}
          intensity={1.4}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-3, 3, -3]} intensity={0.5} color="#9fc4ff" />
        <pointLight position={[0, 0, 2]} intensity={0.3} color="#57D6C2" />

        {/* GLB Model with Suspense */}
        <Suspense fallback={<ModelLoadingFallback />}>
          <HumanMannequin
            customPelvisQuat={customPelvisQuat}
            customTorsoQuat={customTorsoQuat}
            customChestQuat={customChestQuat}
          />
        </Suspense>

        {/* Floor */}
        <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]} receiveShadow>
          <circleGeometry args={[1.4, 64]} />
          <meshStandardMaterial color="#1a1c1f" roughness={1} />
        </mesh>
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.001, 0]}>
          <ringGeometry args={[1.395, 1.41, 96]} />
          <meshBasicMaterial color="#2a2c30" />
        </mesh>

        {/* Grid */}
        <Grid
          position={[0, 0.002, 0]}
          args={[10, 10]}
          cellSize={0.2}
          cellThickness={0.6}
          cellColor="#181c22"
          sectionSize={1.0}
          sectionThickness={1.0}
          sectionColor="#222830"
          fadeDistance={5}
          fadeStrength={1.5}
        />

        <CameraController />
      </Canvas>

      {/* Viewport Header Label */}
      <div className="absolute top-2.5 left-2.5 flex items-center space-x-2 pointer-events-none">
        <div className="flex items-center space-x-1.5 px-2 py-1 bg-[#141A1F]/90 backdrop-blur border border-[#222C35] rounded text-[11px] font-medium text-[#F3F4F6]">
          <Activity className="w-3 h-3 text-[#57D6C2]" />
          <span>Kinematic Viewport</span>
          <span className="text-[#6B7280] text-[10px]">| Rigged Model</span>
        </div>
      </div>

      {/* View Presets Bar */}
      <div className="absolute top-2.5 right-2.5 flex items-center space-x-0.5 bg-[#141A1F]/90 backdrop-blur border border-[#222C35] p-0.5 rounded">
        {(["front", "side", "rear", "top"] as const).map((preset) => (
          <button
            key={preset}
            title={`${preset.charAt(0).toUpperCase() + preset.slice(1)} View`}
            onClick={() => setCameraPreset(preset)}
            className={`px-2 py-1 text-[11px] rounded transition-colors ${
              cameraPreset === preset
                ? "bg-[#57D6C2]/20 text-[#57D6C2] font-semibold"
                : "text-[#9CA3AF] hover:text-[#F3F4F6]"
            }`}
          >
            {preset.charAt(0).toUpperCase() + preset.slice(1)}
          </button>
        ))}
        <button
          title="Reset Camera"
          onClick={() => setCameraPreset("front")}
          className="p-1 text-[#9CA3AF] hover:text-[#F3F4F6] rounded ml-0.5"
        >
          <Camera className="w-3 h-3" />
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="absolute bottom-2.5 left-2.5 right-2.5 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none">
        {/* Toggle Buttons */}
        <div className="flex items-center space-x-0.5 bg-[#141A1F]/90 backdrop-blur border border-[#222C35] p-0.5 rounded pointer-events-auto">
          <button
            onClick={() => setShowSensors(!showSensors)}
            className={`flex items-center space-x-1 px-2 py-1 text-[11px] rounded transition-colors ${
              showSensors
                ? "bg-[#57D6C2]/20 text-[#57D6C2] font-medium"
                : "text-[#9CA3AF] hover:text-[#F3F4F6]"
            }`}
            title="Toggle IMU LEDs"
          >
            <Crosshair className="w-3 h-3" />
            <span>IMU</span>
          </button>

          <button
            onClick={() => setShowAxes(!showAxes)}
            className={`flex items-center space-x-1 px-2 py-1 text-[11px] rounded transition-colors ${
              showAxes
                ? "bg-[#F59E0B]/20 text-[#F59E0B] font-medium"
                : "text-[#9CA3AF] hover:text-[#F3F4F6]"
            }`}
            title="Toggle axes"
          >
            <Compass className="w-3 h-3" />
            <span>Axes</span>
          </button>

          <button
            onClick={() => setUseRawOrientation(!useRawOrientation)}
            className={`flex items-center space-x-1 px-2 py-1 text-[11px] rounded transition-colors ${
              useRawOrientation
                ? "bg-[#F59E0B]/20 text-[#F59E0B] font-medium"
                : "text-[#9CA3AF] hover:text-[#F3F4F6]"
            }`}
            title="Toggle raw vs smoothed"
          >
            <Sliders className="w-3 h-3" />
            <span>{useRawOrientation ? "Raw" : "Smooth"}</span>
          </button>
        </div>

        {/* Calibration Controls */}
        <div className="flex items-center space-x-1 bg-[#141A1F]/90 backdrop-blur border border-[#222C35] p-0.5 rounded pointer-events-auto">
          <button
            onClick={calibrateOrientation}
            className="flex items-center space-x-1 px-2 py-1 text-[11px] font-medium bg-[#57D6C2] text-[#0B0F12] rounded hover:bg-[#68e2ce] transition-colors"
            title="Set current orientation as zero reference"
          >
            <Crosshair className="w-3 h-3" />
            <span>Calibrate</span>
          </button>
          <button
            onClick={resetCalibration}
            className="flex items-center space-x-1 px-1.5 py-1 text-[11px] text-[#9CA3AF] hover:text-[#F3F4F6] rounded transition-colors"
            title="Reset calibration offsets"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      </div>
    </div>
  );
};
