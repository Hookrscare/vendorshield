import * as THREE from "three";

type RendererFactory = (
  options: THREE.WebGLRendererParameters
) => THREE.WebGLRenderer;

type CanvasFactory = () => HTMLCanvasElement;

export function hasWebGLSupport(
  canvasFactory: CanvasFactory = () => document.createElement("canvas")
): boolean {
  try {
    const canvas = canvasFactory();
    return Boolean(
      canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl")
    );
  } catch {
    return false;
  }
}

export function createWebGLRendererOrNull(
  options: THREE.WebGLRendererParameters,
  factory: RendererFactory = (rendererOptions) =>
    new THREE.WebGLRenderer(rendererOptions)
): THREE.WebGLRenderer | null {
  try {
    return factory(options);
  } catch (error) {
    console.warn("WebGL is unavailable; using the static visual fallback.", error);
    return null;
  }
}
