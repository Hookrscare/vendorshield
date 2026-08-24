import * as THREE from "three";

type RendererFactory = (
  options: THREE.WebGLRendererParameters
) => THREE.WebGLRenderer;

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
