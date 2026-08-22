"use client";

import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export function ThreeTrustGraph() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // 1. Scene & Camera Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 24;

    // 2. WebGL Renderer with High-Performance Alpha Canvas
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // 3. Procedural Cryptographic Nodes (Sub-Processor Security Network)
    const particleCount = 120;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const baseColorA = new THREE.Color("#3b82f6"); // Blue
    const baseColorB = new THREE.Color("#06b6d4"); // Cyan
    const baseColorC = new THREE.Color("#10b981"); // Emerald

    for (let i = 0; i < particleCount; i++) {
      const radius = 7 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const mixed = baseColorA
        .clone()
        .lerp(i % 2 === 0 ? baseColorB : baseColorC, Math.random());
      colors[i * 3] = mixed.r;
      colors[i * 3 + 1] = mixed.g;
      colors[i * 3 + 2] = mixed.b;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Custom Particle Material with circular points
    const particleMaterial = new THREE.PointsMaterial({
      size: 0.28,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, particleMaterial);
    scene.add(particles);

    // 4. Dynamic Cryptographic Trust Connections (Lines)
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });

    const lineGeometry = new THREE.BufferGeometry();
    const maxLineSegments = particleCount * 4;
    const linePositions = new Float32Array(maxLineSegments * 6);
    lineGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(linePositions, 3)
    );

    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // 5. Central Glowing Holographic Security Core (Icosahedron Wireframe)
    const coreGeometry = new THREE.IcosahedronGeometry(3.5, 2);
    const coreMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.25,
    });
    const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
    scene.add(coreMesh);

    // 6. Interactive Mouse Field Physics
    let targetRotationX = 0;
    let targetRotationY = 0;
    let currentRotationX = 0;
    let currentRotationY = 0;

    const handlePointerMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      targetRotationY = x * 0.4;
      targetRotationX = -y * 0.4;
    };

    window.addEventListener("pointermove", handlePointerMove);

    // 7. Render Loop Culling via IntersectionObserver (Zero GPU waste offscreen)
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

    // 8. Animation & Render Loop
    let clock = new THREE.Clock();

    function render() {
      if (!isVisible) {
        animationFrameId = 0;
        return;
      }

      const elapsedTime = clock.getElapsedTime();

      if (!prefersReducedMotion) {
        currentRotationX += (targetRotationX - currentRotationX) * 0.05;
        currentRotationY += (targetRotationY - currentRotationY) * 0.05;

        particles.rotation.y = elapsedTime * 0.08 + currentRotationY;
        particles.rotation.x = currentRotationX;

        coreMesh.rotation.y = -elapsedTime * 0.12 + currentRotationY;
        coreMesh.rotation.x = elapsedTime * 0.06 + currentRotationX;

        // Dynamic Line Connection updates
        let lineIdx = 0;
        const pos = geometry.attributes.position.array as Float32Array;
        const linePos = lineGeometry.attributes.position.array as Float32Array;

        for (let i = 0; i < particleCount; i++) {
          for (let j = i + 1; j < particleCount; j++) {
            const dx = pos[i * 3] - pos[j * 3];
            const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
            const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
            const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

            if (dist < 3.2 && lineIdx < maxLineSegments * 6 - 6) {
              linePos[lineIdx++] = pos[i * 3];
              linePos[lineIdx++] = pos[i * 3 + 1];
              linePos[lineIdx++] = pos[i * 3 + 2];

              linePos[lineIdx++] = pos[j * 3];
              linePos[lineIdx++] = pos[j * 3 + 1];
              linePos[lineIdx++] = pos[j * 3 + 2];
            }
          }
        }
        lineGeometry.setDrawRange(0, lineIdx / 3);
        lineGeometry.attributes.position.needsUpdate = true;
      }

      renderer.render(scene, camera);
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

    // 10. Cleanup & Resource Detachment
    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("resize", handleResize);

      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      particleMaterial.dispose();
      coreGeometry.dispose();
      coreMaterial.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full min-h-[420px] lg:min-h-[580px] relative pointer-events-auto"
      aria-hidden="true"
    />
  );
}
