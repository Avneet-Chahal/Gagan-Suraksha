// ==========================================================================
// GAGAN SURAKSHA - WEBGL ENVIRONMENT & RESOURCE MANAGEMENT UTILITIES
// ==========================================================================

import * as THREE from 'three';

/**
 * Checks whether WebGL rendering context is supported and available in the current browser.
 */
export const isWebGLAvailable = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    );
  } catch {
    return false;
  }
};

/**
 * Recursively disposes all geometries, materials, and textures within a Three.js scene/group
 * to eliminate GPU memory leaks when components unmount.
 */
export const disposeSceneHierarchy = (root: THREE.Object3D): void => {
  root.traverse((obj) => {
    if (obj instanceof THREE.Mesh || obj instanceof THREE.Line || obj instanceof THREE.Points) {
      if (obj.geometry) {
        obj.geometry.dispose();
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach((mat) => {
            disposeMaterial(mat);
          });
        } else {
          disposeMaterial(obj.material);
        }
      }
    }
  });
};

const disposeMaterial = (material: THREE.Material): void => {
  // Dispose any mapped textures
  const matAny = material as unknown as Record<string, unknown>;
  ['map', 'specularMap', 'normalMap', 'bumpMap', 'roughnessMap', 'metalnessMap', 'alphaMap'].forEach(
    (texKey) => {
      const tex = matAny[texKey];
      if (tex && typeof tex === 'object' && 'dispose' in tex && typeof tex.dispose === 'function') {
        tex.dispose();
      }
    }
  );
  material.dispose();
};
