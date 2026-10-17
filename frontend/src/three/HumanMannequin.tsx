import React, { useRef, useEffect, useState, useMemo } from "react";
import { useFrame, useLoader } from "@react-three/fiber";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { useTwinStore } from "../store/useTwinStore";

/**
 * Bone segment mapping from the original posture_model.glb:
 * - 3 IMU zones: upper (chest), middle (torso), lower (pelvis)
 * - Bones: pelvis, lumbar_1-3, thoracic_lo_1-3, thoracic_hi_1-3, neck, head
 * - Arm bones: clavicle_L/R, upper_arm_L/R
 * Each bone is driven by an interpolation between its parent and target IMU zone.
 */

const DEG2RAD = Math.PI / 180;
const AX = new THREE.Vector3(1, 0, 0);
const AZ = new THREE.Vector3(0, 0, 1);
const IDENTITY_Q = new THREE.Quaternion();

// Segment mapping: [parentZone, targetZone, interpolationFraction]
// null = identity, 'l' = lower/pelvis, 'm' = middle/torso, 'u' = upper/chest
const SEG_MAP: Record<string, [string | null, string, number]> = {
  lumbar_1: [null, "l", 1 / 3],
  lumbar_2: [null, "l", 2 / 3],
  lumbar_3: [null, "l", 1],
  thoracic_lo_1: ["l", "m", 1 / 3],
  thoracic_lo_2: ["l", "m", 2 / 3],
  thoracic_lo_3: ["l", "m", 1],
  thoracic_hi_1: ["m", "u", 1 / 3],
  thoracic_hi_2: ["m", "u", 2 / 3],
  thoracic_hi_3: ["m", "u", 1],
};

interface MannequinProps {
  customPelvisQuat?: THREE.Quaternion;
  customTorsoQuat?: THREE.Quaternion;
  customChestQuat?: THREE.Quaternion;
}

/** Build a tilt quaternion from pitch and roll (degrees) */
function tiltFromDeg(pitch: number, roll: number): THREE.Quaternion {
  return new THREE.Quaternion()
    .setFromAxisAngle(AZ, roll * DEG2RAD)
    .multiply(new THREE.Quaternion().setFromAxisAngle(AX, pitch * DEG2RAD));
}

/** Slerp helper */
function slerpQ(
  a: THREE.Quaternion,
  b: THREE.Quaternion,
  f: number
): THREE.Quaternion {
  return new THREE.Quaternion().slerpQuaternions(a, b, f);
}

export const HumanMannequin: React.FC<MannequinProps> = ({
  customPelvisQuat,
  customTorsoQuat,
  customChestQuat,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Store selections
  const showSkeleton = useTwinStore((s) => s.showSkeleton);
  const showSensors = useTwinStore((s) => s.showSensors);
  const showAxes = useTwinStore((s) => s.showAxes);
  const smoothingFactor = useTwinStore((s) => s.smoothingFactor);
  const useRawOrientation = useTwinStore((s) => s.useRawOrientation);
  const invertPitch = useTwinStore((s) => s.invertPitch);
  const invertRoll = useTwinStore((s) => s.invertRoll);
  const invertYaw = useTwinStore((s) => s.invertYaw);
  const calibrationOffsets = useTwinStore((s) => s.calibrationOffsets);

  // Model data refs (mutable, not state to avoid re-renders)
  const bonesRef = useRef<Record<string, THREE.Bone>>({});
  const boneOrderRef = useRef<THREE.Bone[]>([]);
  const restBwRef = useRef<Record<string, THREE.Quaternion>>({});
  const restPwRef = useRef<Record<string, THREE.Quaternion>>({});
  const bodyRef = useRef<THREE.SkinnedMesh | null>(null);
  const ledMatsRef = useRef<Record<string, THREE.MeshStandardMaterial>>({});

  // Smoothed target values
  const smoothedUpper = useRef<[number, number]>([0, 0]);
  const smoothedMiddle = useRef<[number, number]>([0, 0]);
  const smoothedLower = useRef<[number, number]>([0, 0]);

  // xray state
  const [xray, setXray] = useState(true);

  // Load the GLB model
  let gltf: any = null;
  try {
    gltf = useLoader(GLTFLoader, "/models/posture_model.glb");
  } catch (e) {
    // useLoader suspense handles this
  }

  useEffect(() => {
    if (!gltf || !groupRef.current) return;

    const root = gltf.scene.clone(true);
    // Clear previous children
    while (groupRef.current.children.length > 0) {
      groupRef.current.remove(groupRef.current.children[0]);
    }
    groupRef.current.add(root);
    root.updateMatrixWorld(true);

    const bones: Record<string, THREE.Bone> = {};
    const leds: Record<string, THREE.MeshStandardMaterial> = {};

    root.traverse((o: THREE.Object3D) => {
      if ((o as any).isBone) {
        bones[o.name] = o as THREE.Bone;
      }
      if ((o as any).isMesh) {
        const mesh = o as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        if ((mesh as any).isSkinnedMesh) {
          (mesh as THREE.SkinnedMesh).frustumCulled = false;
          bodyRef.current = mesh as THREE.SkinnedMesh;
        }
        // IMU LED meshes
        if (o.name.startsWith("IMU_") && o.name.endsWith("_LED")) {
          const mat = ((mesh.material as THREE.MeshStandardMaterial).clone());
          mesh.material = mat;
          leds[o.name] = mat;
          mesh.castShadow = false;
        }
      }
    });

    bonesRef.current = bones;
    ledMatsRef.current = leds;

    // Build rest quaternions (bone order from pelvis root)
    const order: THREE.Bone[] = [];
    const restBw: Record<string, THREE.Quaternion> = {};
    const restPw: Record<string, THREE.Quaternion> = {};

    const walkBone = (b: THREE.Bone) => {
      order.push(b);
      restBw[b.name] = b.getWorldQuaternion(new THREE.Quaternion());
      restPw[b.name] = b.parent!.getWorldQuaternion(new THREE.Quaternion());
      b.children
        .filter((c: THREE.Object3D) => (c as any).isBone)
        .forEach((c) => walkBone(c as THREE.Bone));
    };

    if (bones["pelvis"]) {
      walkBone(bones["pelvis"]);
    }

    boneOrderRef.current = order;
    restBwRef.current = restBw;
    restPwRef.current = restPw;

    // Apply initial xray look
    applyXray(true);
    setModelLoaded(true);
  }, [gltf]);

  function applyXray(isXray: boolean) {
    const bodyMat = bodyRef.current?.material as THREE.MeshStandardMaterial | undefined;
    if (!bodyMat) return;
    bodyMat.transparent = isXray;
    bodyMat.opacity = isXray ? 0.28 : 1;
    bodyMat.depthWrite = !isXray;
    bodyMat.needsUpdate = true;
    if (bodyRef.current) bodyRef.current.castShadow = !isXray;
  }

  useEffect(() => {
    applyXray(xray);
  }, [xray]);

  // Update LED colors based on sensor status
  useEffect(() => {
    const tealColor = new THREE.Color(0x57d6c2);
    Object.values(ledMatsRef.current).forEach((mat) => {
      mat.color.copy(tealColor);
      mat.emissive.copy(tealColor);
      mat.emissiveIntensity = showSensors ? 2.2 : 0;
    });
  }, [showSensors]);

  /** Extract pitch/roll from either Euler data or quaternion */
  function getAnglesFromSensor(
    sensorEuler: { roll: number; pitch: number; yaw: number } | undefined,
    sensorQuat: { w: number; x: number; y: number; z: number } | undefined,
    calib: { roll: number; pitch: number; yaw: number }
  ): [number, number] {
    if (sensorEuler) {
      const p = (sensorEuler.pitch - calib.pitch) * (invertPitch ? -1 : 1);
      const r = (sensorEuler.roll - calib.roll) * (invertRoll ? -1 : 1);
      return [p, r];
    }
    if (sensorQuat) {
      // Convert quaternion to Euler for angle extraction
      const euler = new THREE.Euler().setFromQuaternion(
        new THREE.Quaternion(sensorQuat.x, sensorQuat.y, sensorQuat.z, sensorQuat.w),
        "YXZ"
      );
      return [
        (euler.x / DEG2RAD) * (invertPitch ? -1 : 1),
        (euler.z / DEG2RAD) * (invertRoll ? -1 : 1),
      ];
    }
    return [0, 0];
  }

  useFrame((_, delta) => {
    if (!boneOrderRef.current.length) return;

    let upper: [number, number] = [0, 0]; // chest
    let middle: [number, number] = [0, 0]; // torso
    let lower: [number, number] = [0, 0]; // pelvis

    // Determine source: replay mode vs live store
    if (customPelvisQuat && customTorsoQuat && customChestQuat) {
      // Replay mode: extract Euler from quaternions
      const cE = new THREE.Euler().setFromQuaternion(customChestQuat, "YXZ");
      const tE = new THREE.Euler().setFromQuaternion(customTorsoQuat, "YXZ");
      const pE = new THREE.Euler().setFromQuaternion(customPelvisQuat, "YXZ");
      upper = [cE.x / DEG2RAD, cE.z / DEG2RAD];
      middle = [tE.x / DEG2RAD, tE.z / DEG2RAD];
      lower = [pE.x / DEG2RAD, pE.z / DEG2RAD];
    } else {
      const p = useTwinStore.getState().latestPacket;
      if (p?.sensors) {
        upper = getAnglesFromSensor(
          p.sensors.chest?.euler_deg,
          p.sensors.chest?.quaternion,
          calibrationOffsets.chest
        );
        middle = getAnglesFromSensor(
          p.sensors.torso?.euler_deg,
          p.sensors.torso?.quaternion,
          calibrationOffsets.torso
        );
        lower = getAnglesFromSensor(
          p.sensors.pelvis?.euler_deg,
          p.sensors.pelvis?.quaternion,
          calibrationOffsets.pelvis
        );
      }
    }

    // Smoothing
    const alpha = useRawOrientation
      ? 1.0
      : Math.min(1.0, (1.0 - smoothingFactor) * delta * 45);

    smoothedUpper.current[0] += (upper[0] - smoothedUpper.current[0]) * alpha;
    smoothedUpper.current[1] += (upper[1] - smoothedUpper.current[1]) * alpha;
    smoothedMiddle.current[0] += (middle[0] - smoothedMiddle.current[0]) * alpha;
    smoothedMiddle.current[1] += (middle[1] - smoothedMiddle.current[1]) * alpha;
    smoothedLower.current[0] += (lower[0] - smoothedLower.current[0]) * alpha;
    smoothedLower.current[1] += (lower[1] - smoothedLower.current[1]) * alpha;

    const u = smoothedUpper.current;
    const m = smoothedMiddle.current;
    const l = smoothedLower.current;

    // Build world-space delta quaternions per zone
    const Sq: Record<string, THREE.Quaternion> = {
      u: tiltFromDeg(u[0], u[1]),
      m: tiltFromDeg(m[0], m[1]),
      l: tiltFromDeg(l[0], l[1]),
      null: IDENTITY_Q.clone(),
    };

    // Compute delta quaternions for each bone segment
    const D: Record<string, THREE.Quaternion> = {};
    for (const [boneName, [parentZone, targetZone, fraction]] of Object.entries(SEG_MAP)) {
      const parentQ = Sq[parentZone ?? "null"];
      const targetQ = Sq[targetZone];
      D[boneName] = slerpQ(parentQ, targetQ, fraction);
    }

    // Neck and head follow upper region partially
    D["neck"] = slerpQ(IDENTITY_Q, Sq.u, 0.75);
    D["head"] = slerpQ(IDENTITY_Q, Sq.u, 0.55);

    // Shoulder protraction from spinal rounding
    const prot = Math.max(0, Math.min(25, 0.6 * (u[0] - l[0])));
    for (const [side, sg] of [["L", 1], ["R", -1]] as [string, number][]) {
      const qProt = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, -sg, 0),
        prot * DEG2RAD
      );
      const qDrop = new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 0, -sg),
        0.35 * prot * DEG2RAD
      );
      D["clavicle_" + side] = D["thoracic_hi_3"]
        .clone()
        .multiply(qProt)
        .multiply(qDrop);
      D["upper_arm_" + side] = slerpQ(IDENTITY_Q, Sq.u, 0.35);
    }

    // Apply pose to all bones in skeleton order
    const restBw = restBwRef.current;
    const restPw = restPwRef.current;

    for (const b of boneOrderRef.current) {
      const parentName =
        b.parent && (b.parent as any).isBone ? b.parent.name : null;
      const Dp = parentName ? D[parentName] || IDENTITY_Q : IDENTITY_Q;
      if (!D[b.name]) D[b.name] = Dp;

      // local = restPw_inv * Dp_inv * D[b] * restBw
      const local = restPw[b.name]
        .clone()
        .invert()
        .multiply(Dp.clone().invert())
        .multiply(D[b.name])
        .multiply(restBw[b.name]);

      b.quaternion.copy(local);
    }
  });

  return (
    <group ref={groupRef} position={[0, -0.02, 0]}>
      {/* Axes helpers on the root if enabled */}
      {showAxes && modelLoaded && <axesHelper args={[0.3]} />}
    </group>
  );
};
