"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { LensFilterMode } from "@/lib/dispel/types";
import { createWebGLRendererOrNull, hasWebGLSupport } from "@/lib/webgl";

interface DispelShaderCanvasProps {
  filterMode: LensFilterMode;
  syntheticProbability: number;
}

const VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = `
  uniform float u_time;
  uniform int u_filter;
  uniform float u_synthetic;
  uniform vec2 u_resolution;
  varying vec2 vUv;

  // Pseudo-random function for PRNU sensor noise
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  void main() {
    vec2 uv = vUv;
    vec3 color = vec3(0.05, 0.08, 0.15); // Deep forensic base

    if (u_filter == 0) {
      // 0 = NORMAL: Optical scan with subtle chromatic grid
      float scanline = sin(uv.y * 180.0 + u_time * 2.0) * 0.04;
      color = vec3(0.08, 0.14, 0.22) + vec3(scanline);
      float vignette = length(uv - 0.5);
      color *= (1.0 - vignette * 0.6);
    } 
    else if (u_filter == 1) {
      // 1 = X-RAY VISION: High-contrast spectral edge inversion
      float edge = abs(sin(uv.x * 40.0 + u_time) * cos(uv.y * 40.0));
      color = vec3(edge * 0.1, edge * 0.8, edge * 0.9);
      if (u_synthetic > 50.0) {
        color.r += 0.5 * sin(u_time * 5.0);
      }
    } 
    else if (u_filter == 2) {
      // 2 = SENSOR NOISE (PRNU Residual Extraction)
      float noise = hash(uv * 500.0 + fract(u_time * 0.1));
      float prnu = (noise - 0.5) * 2.0;
      if (u_synthetic > 50.0) {
        // High residual variance in synthetic deepfakes
        color = vec3(prnu * 0.8 + 0.3, 0.1, prnu * 0.3);
      } else {
        // Uniform natural sensor Poisson noise
        color = vec3(0.1, prnu * 0.6 + 0.4, prnu * 0.6 + 0.5);
      }
    } 
    else if (u_filter == 3) {
      // 3 = ECG PULSE (Biophotonic rPPG Vascular Hemodynamics)
      float pulseFreq = u_time * 4.5;
      float wave = sin(uv.x * 20.0 - pulseFreq) * exp(-abs(uv.y - 0.5) * 12.0);
      float pulseIntensity = sin(pulseFreq) * 0.5 + 0.5;
      color = vec3(wave * 0.9 + pulseIntensity * 0.2, wave * 0.1, wave * 0.4);
    } 
    else if (u_filter == 4) {
      // 4 = LATTICE (Temporal Warp Grid)
      vec2 grid = fract(uv * 24.0 + sin(u_time + uv.yx * 4.0) * (u_synthetic > 50.0 ? 0.08 : 0.01));
      float line = smoothstep(0.05, 0.0, abs(grid.x - 0.5)) + smoothstep(0.05, 0.0, abs(grid.y - 0.5));
      color = vec3(line * 0.9, line * 0.6, 0.1);
    }

    gl_FragColor = vec4(color, 0.92);
  }
`;

function getFilterInt(mode: LensFilterMode): number {
  switch (mode) {
    case "NORMAL":
      return 0;
    case "X-RAY VISION":
      return 1;
    case "SENSOR NOISE":
      return 2;
    case "ECG PULSE":
      return 3;
    case "LATTICE":
      return 4;
    default:
      return 0;
  }
}

export function DispelShaderCanvas({
  filterMode,
  syntheticProbability,
}: DispelShaderCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const [showFallback, setShowFallback] = useState(false);
  const initialFilterModeRef = useRef(filterMode);
  const initialSyntheticProbabilityRef = useRef(syntheticProbability);

  useEffect(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.u_filter.value = getFilterInt(filterMode);
      materialRef.current.uniforms.u_synthetic.value = syntheticProbability;
    }
  }, [filterMode, syntheticProbability]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    if (!hasWebGLSupport()) {
      setShowFallback(true);
      return;
    }

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // 1. Scene & Orthographic Camera for Fullscreen GLSL Shader Pass
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

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

    // 3. Custom GLSL Shader Material
    const uniforms = {
      u_time: { value: 0.0 },
      u_filter: { value: getFilterInt(initialFilterModeRef.current) },
      u_synthetic: { value: initialSyntheticProbabilityRef.current },
      u_resolution: {
        value: new THREE.Vector2(container.clientWidth, container.clientHeight),
      },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
    });
    materialRef.current = material;

    const geometry = new THREE.PlaneGeometry(2, 2);
    const quad = new THREE.Mesh(geometry, material);
    scene.add(quad);

    // 4. IntersectionObserver RAF Culling
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

    // 5. Render Loop
    const clock = new THREE.Clock();

    function render() {
      if (!isVisible) {
        animationFrameId = 0;
        return;
      }

      if (!prefersReducedMotion) {
        material.uniforms.u_time.value = clock.getElapsedTime();
      }

      renderer.render(scene, camera);
      if (prefersReducedMotion) {
        animationFrameId = 0;
        return;
      }
      animationFrameId = requestAnimationFrame(render);
    }

    render();

    // 6. Resize
    const handleResize = () => {
      if (!container) return;
      renderer.setSize(container.clientWidth, container.clientHeight);
      material.uniforms.u_resolution.value.set(
        container.clientWidth,
        container.clientHeight
      );
    };

    window.addEventListener("resize", handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      observer.disconnect();
      window.removeEventListener("resize", handleResize);
      if (container && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="w-full h-full absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {showFallback && (
        <div
          data-testid="dispel-shader-fallback"
          className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(6,182,212,0.18),transparent_52%),linear-gradient(135deg,rgba(8,47,73,0.35),rgba(2,6,23,0.9))]"
        />
      )}
    </div>
  );
}
