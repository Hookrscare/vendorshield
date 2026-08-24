"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createWebGLRendererOrNull, hasWebGLSupport } from "@/lib/webgl";

interface DefectPin {
  id: string;
  x: number;
  y: number;
  z: number;
  severity: "URGENT" | "SAFETY" | "MODERATE" | "MINOR";
  label: string;
  trade: string;
}

const SAMPLE_PINS: DefectPin[] = [
  { id: "1", x: -4, y: 2.5, z: 2, severity: "URGENT", label: "Valley Flashing Lift", trade: "Roofing" },
  { id: "2", x: 3.5, y: -1, z: 1.5, severity: "SAFETY", label: "Subpanel Double Lug", trade: "Electrical" },
  { id: "3", x: -1.5, y: -3, z: -2, severity: "MODERATE", label: "Condensate Line Clog", trade: "HVAC" },
  { id: "4", x: 2, y: 3.5, z: -1.5, severity: "MINOR", label: "Gutter Slope Sag", trade: "Exterior" },
];

export function SpatialDefectCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showFallback, setShowFallback] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!hasWebGLSupport()) {
      setShowFallback(true);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 10, 18);
    camera.lookAt(0, 0, 0);

    // 2. High-Performance WebGL Renderer
    const webglRenderer = createWebGLRendererOrNull({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    if (!webglRenderer) {
      setShowFallback(true);
      return;
    }
    const renderer: THREE.WebGLRenderer = webglRenderer;
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Architectural CAD Grid Base (GridHelper + Custom Wireframe Plane)
    const gridHelper = new THREE.GridHelper(18, 18, 0x06b6d4, 0x1e293b);
    gridHelper.position.y = -3;
    scene.add(gridHelper);

    // 4. 3D Architectural Blueprint Volume (Procedural Wireframe Structure)
    const buildingGroup = new THREE.Group();

    const frameGeo = new THREE.BoxGeometry(10, 6, 8);
    const frameEdges = new THREE.EdgesGeometry(frameGeo);
    const frameMat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });
    const frameLine = new THREE.LineSegments(frameEdges, frameMat);
    buildingGroup.add(frameLine);

    // Roof Pitch Wireframe
    const roofGeo = new THREE.ConeGeometry(7, 3.5, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.translate(0, 4.75, 0);
    const roofEdges = new THREE.EdgesGeometry(roofGeo);
    const roofMat = new THREE.LineBasicMaterial({
      color: 0xf59e0b,
      transparent: true,
      opacity: 0.4,
    });
    const roofLine = new THREE.LineSegments(roofEdges, roofMat);
    buildingGroup.add(roofLine);

    scene.add(buildingGroup);

    // 5. Interactive Pulsing Defect Pin Coordinate Markers
    const pinGroup = new THREE.Group();
    const pinMeshes: { mesh: THREE.Mesh; pin: DefectPin; initialScale: number }[] = [];

    SAMPLE_PINS.forEach((pin) => {
      const pinColor =
        pin.severity === "URGENT"
          ? 0xf43f5e // Rose/Red
          : pin.severity === "SAFETY"
          ? 0xf97316 // Orange
          : pin.severity === "MODERATE"
          ? 0xfacc15 // Yellow
          : 0x38bdf8; // Cyan

      const sphereGeo = new THREE.SphereGeometry(0.35, 16, 16);
      const sphereMat = new THREE.MeshBasicMaterial({
        color: pinColor,
        wireframe: true,
      });
      const pinMesh = new THREE.Mesh(sphereGeo, sphereMat);
      pinMesh.position.set(pin.x, pin.y, pin.z);
      pinGroup.add(pinMesh);
      pinMeshes.push({ mesh: pinMesh, pin, initialScale: 1 });
    });

    scene.add(pinGroup);

    // 6. Mouse Physics & Interactive Rotation
    let targetRotationY = 0;
    let targetRotationX = 0;
    let currentRotationY = 0;
    let currentRotationX = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetRotationY = x * 0.6;
      targetRotationX = -y * 0.3;
    };

    window.addEventListener("pointermove", handlePointerMove);

    // 7. IntersectionObserver RAF Loop Culling
    let isVisible = true;
    let animationFrameId: number;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          isVisible = entry.isIntersecting;
          if (isVisible && !animationFrameId) {
            render();
          }
        });
      },
      { threshold: 0.05 }
    );

    observer.observe(container);

    // 8. Animation Loop
    const clock = new THREE.Clock();

    function render() {
      if (!isVisible) {
        animationFrameId = 0;
        return;
      }

      const elapsedTime = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;
        currentRotationX += (targetRotationX - currentRotationX) * 0.05;

        buildingGroup.rotation.y = elapsedTime * 0.1 + currentRotationY;
        buildingGroup.rotation.x = currentRotationX;

        pinGroup.rotation.y = elapsedTime * 0.1 + currentRotationY;
        pinGroup.rotation.x = currentRotationX;

        // Pulse pin markers
        pinMeshes.forEach((item, idx) => {
          const pulse = 1 + Math.sin(elapsedTime * 4 + idx) * 0.25;
          item.mesh.scale.set(pulse, pulse, pulse);
        });
      }

      renderer.render(scene, camera);
      if (prefersReducedMotion) {
        animationFrameId = 0;
        return;
      }
      animationFrameId = requestAnimationFrame(render);
    }

    render();

    // 9. Resize Handling
    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / container.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    // 10. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      frameGeo.dispose();
      frameEdges.dispose();
      frameMat.dispose();
      roofGeo.dispose();
      roofEdges.dispose();
      roofMat.dispose();
      pinMeshes.forEach(({ mesh }) => {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((material) => material.dispose());
        } else {
          mesh.material.dispose();
        }
      });
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[420px] lg:min-h-[540px] relative pointer-events-auto"
      aria-hidden={showFallback ? undefined : true}
      aria-label={showFallback ? "Building defect map visualization" : undefined}
    >
      {showFallback && (
        <div
          className="absolute inset-0 overflow-hidden rounded-3xl border border-cyan-500/20 bg-gray-950"
          style={{
            backgroundImage:
              "linear-gradient(rgba(34,211,238,.12) 1px, transparent 1px), linear-gradient(90deg, rgba(34,211,238,.12) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        >
          <div className="absolute inset-[16%] border border-cyan-300/40 [clip-path:polygon(50%_0,100%_28%,100%_100%,0_100%,0_28%)]" />
          {SAMPLE_PINS.map((pin) => (
            <span
              key={pin.id}
              className="absolute rounded-full border-2 border-gray-950 shadow-[0_0_24px_currentColor]"
              style={{
                left: `${50 + pin.x * 6}%`,
                top: `${50 - pin.y * 7}%`,
                width: 14,
                height: 14,
                color:
                  pin.severity === "URGENT"
                    ? "#fb7185"
                    : pin.severity === "SAFETY"
                    ? "#fb923c"
                    : pin.severity === "MODERATE"
                    ? "#fde047"
                    : "#67e8f9",
                backgroundColor: "currentColor",
              }}
              title={`${pin.severity}: ${pin.label}`}
            />
          ))}
          <div className="absolute inset-x-0 bottom-8 text-center text-[11px] font-mono uppercase tracking-[0.28em] text-cyan-200/70">
            Spatial defect map
          </div>
        </div>
      )}
    </div>
  );
}
