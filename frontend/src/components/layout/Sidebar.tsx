import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Box,
  FolderClock,
  LineChart,
  Cpu,
  Sliders,
} from "lucide-react";

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { label: "Overview", path: "/", icon: LayoutDashboard },
  { label: "Digital Twin", path: "/twin", icon: Box },
  { label: "Sessions", path: "/sessions", icon: FolderClock },
  { label: "Analytics", path: "/analytics", icon: LineChart },
  { label: "Diagnostics", path: "/diagnostics", icon: Cpu },
  { label: "Settings", path: "/settings", icon: Sliders },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-48 bg-[#141A1F] border-r border-[#1E2730] flex flex-col justify-between select-none">
      <div className="py-3">
        <div className="px-3 mb-2 text-[10px] font-mono tracking-wider uppercase text-[#6B7280] font-medium">
          Navigation
        </div>
        <nav className="space-y-0.5 px-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center space-x-2 px-2.5 py-1.5 text-[11px] rounded transition-colors font-medium ${
                    isActive
                      ? "bg-[#57D6C2]/12 text-[#57D6C2] border border-[#57D6C2]/20"
                      : "text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#1A2229] border border-transparent"
                  }`
                }
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* System Info Footer */}
      <div className="p-2 mx-2 mb-2 bg-[#0E1317] rounded border border-[#1E2730] text-[10px] font-mono space-y-0.5 text-[#6B7280]">
        <div className="flex items-center justify-between">
          <span>IMU</span>
          <span className="text-[#57D6C2]">3× MPU6050</span>
        </div>
        <div className="flex items-center justify-between">
          <span>MUX</span>
          <span className="text-[#9CA3AF]">TCA9548A</span>
        </div>
        <div className="flex items-center justify-between">
          <span>MCU</span>
          <span className="text-[#38BDF8]">ESP32-S3</span>
        </div>
        <div className="flex items-center justify-between pt-0.5 border-t border-[#1E2730]">
          <span>DB</span>
          <span className="text-[#57D6C2]">SQLite</span>
        </div>
      </div>
    </aside>
  );
};
