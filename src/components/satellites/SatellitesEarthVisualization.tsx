import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Plus, Minus, Orbit as OrbitIcon, Loader2, Globe } from 'lucide-react';
import { Satellite } from '../../types';
import { isWebGLAvailable, disposeSceneHierarchy } from '../../services/webglHelper';

interface SatellitesEarthVisualizationProps {
  satellites: Satellite[];
  selectedSatellite: Satellite;
  onSelectSatellite: (satellite: Satellite) => void;
}

export const SatellitesEarthVisualization: React.FC<SatellitesEarthVisualizationProps> = ({
  satellites,
  selectedSatellite,
  onSelectSatellite,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);

  const [hasWebGL] = useState<boolean>(() => isWebGLAvailable());
  const [isLoading, setIsLoading] = useState(true);
  const [showOrbitPaths, setShowOrbitPaths] = useState(true);
  const showOrbitPathsRef = useRef<boolean>(showOrbitPaths);
  showOrbitPathsRef.current = showOrbitPaths;

  const [tagPosition, setTagPosition] = useState<{ x: number; y: number; visible: boolean }>({
    x: 0,
    y: 0,
    visible: true,
  });

  const resetView = useCallback(() => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(2.8, 1.4, 3.8);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, []);

  const handleZoomIn = () => {
    if (cameraRef.current && controlsRef.current) {
      const zoomVec = new THREE.Vector3().subVectors(cameraRef.current.position, controlsRef.current.target);
      if (zoomVec.length() > 2.5) {
        cameraRef.current.position.addScaledVector(zoomVec.normalize(), -0.6);
        controlsRef.current.update();
      }
    }
  };

  const handleZoomOut = () => {
    if (cameraRef.current && controlsRef.current) {
      const zoomVec = new THREE.Vector3().subVectors(cameraRef.current.position, controlsRef.current.target);
      if (zoomVec.length() < 9.0) {
        cameraRef.current.position.addScaledVector(zoomVec.normalize(), 0.6);
        controlsRef.current.update();
      }
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 500;

    // 1. Scene & Camera
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x030712, 0.05);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2.8, 1.4, 3.8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);

    // 2. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2.4;
    controls.maxDistance = 8.5;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controlsRef.current = controls;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2942, 1.3);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(8, 4, 6);
    scene.add(sunLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00e5ff, 0.7);
    cyanRimLight.position.set(-6, -2, -4);
    scene.add(cyanRimLight);

    // 4. Subtle Starfield
    const starCount = 1200;
    const starGeo = new THREE.BufferGeometry();
    const starCoords = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount * 3; i += 3) {
      starCoords[i] = (Math.random() - 0.5) * 80;
      starCoords[i + 1] = (Math.random() - 0.5) * 80;
      starCoords[i + 2] = (Math.random() - 0.5) * 80;
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(starCoords, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0x94a3b8,
      size: 0.12,
      transparent: true,
      opacity: 0.7,
    });
    const starField = new THREE.Points(starGeo, starMat);
    scene.add(starField);

    // 5. Earth Sphere
    const earthRadius = 1.5;
    const earthGeo = new THREE.SphereGeometry(earthRadius, 64, 64);

    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load(
      '/earth_texture.jpg',
      () => setIsLoading(false),
      undefined,
      () => setIsLoading(false)
    );
    earthTexture.colorSpace = THREE.SRGBColorSpace;

    const earthMat = new THREE.MeshPhongMaterial({
      map: earthTexture,
      specular: new THREE.Color(0x112233),
      shininess: 12,
    });
    const earthMesh = new THREE.Mesh(earthGeo, earthMat);
    scene.add(earthMesh);

    // 6. Atmospheric Glow Shell
    const atmosphereGeo = new THREE.SphereGeometry(earthRadius * 1.03, 64, 64);
    const atmosphereMat = new THREE.ShaderMaterial({
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          gl_FragColor = vec4(0.0, 0.85, 1.0, 1.0) * intensity * 0.9;
        }
      `,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(atmosphereGeo, atmosphereMat);
    scene.add(atmosphereMesh);

    // 7. Multi-Satellite Trajectories and Marker Objects
    const orbitsGroup = new THREE.Group();
    scene.add(orbitsGroup);

    interface Sat3DRef {
      satellite: Satellite;
      curve: THREE.CatmullRomCurve3;
      mesh: THREE.Group | THREE.Mesh;
      speed: number;
      offset: number;
    }

    const satellite3DRefs: Sat3DRef[] = [];
    const clickableObjects: THREE.Object3D[] = [];

    satellites.forEach((sat, idx) => {
      const isSelected = sat.id === selectedSatellite.id;
      const isDebris = sat.category === 'DEBRIS';

      // Scale altitude: 500km -> 0.45 unit radius offset, GEO -> 1.8 unit offset
      const altNorm = sat.orbitType === 'GEO' ? 1.4 : Math.min(0.65, Math.max(0.35, sat.altitudeKm / 1200));
      const r = earthRadius + altNorm;
      const inc = (sat.inclination * Math.PI) / 180;
      const nodeOffset = (idx * 0.75) % (Math.PI * 2);

      const pts: THREE.Vector3[] = [];
      const segments = 120;
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = r * Math.cos(theta);
        const y = r * Math.sin(theta) * Math.sin(inc);
        const z = r * Math.sin(theta) * Math.cos(inc);

        // Rotate by RAAN / node offset
        const rotatedX = x * Math.cos(nodeOffset) - z * Math.sin(nodeOffset);
        const rotatedZ = x * Math.sin(nodeOffset) + z * Math.cos(nodeOffset);
        pts.push(new THREE.Vector3(rotatedX, y, rotatedZ));
      }

      const curve = new THREE.CatmullRomCurve3(pts, true);

      // Orbital line
      const lineGeo = new THREE.BufferGeometry().setFromPoints(curve.getPoints(120));
      const lineMat = new THREE.LineBasicMaterial({
        color: isSelected
          ? 0x00e5ff
          : isDebris
          ? 0xef4444
          : 0x0284c7,
        linewidth: isSelected ? 2 : 1,
        transparent: true,
        opacity: isSelected ? 0.9 : isDebris ? 0.35 : 0.45,
      });
      const orbitLine = new THREE.Line(lineGeo, lineMat);
      orbitsGroup.add(orbitLine);

      // Satellite Object representation
      let satObj: THREE.Group | THREE.Mesh;

      if (isSelected) {
        // Detailed 3D Satellite Model
        const group = new THREE.Group();
        const bus = new THREE.Mesh(
          new THREE.BoxGeometry(0.09, 0.09, 0.12),
          new THREE.MeshStandardMaterial({ color: 0xeab308, metalness: 0.8, roughness: 0.2 })
        );
        group.add(bus);

        const leftWing = new THREE.Mesh(
          new THREE.BoxGeometry(0.22, 0.01, 0.07),
          new THREE.MeshStandardMaterial({ color: 0x0284c7, metalness: 0.4, roughness: 0.3 })
        );
        leftWing.position.set(-0.16, 0, 0);
        group.add(leftWing);

        const rightWing = leftWing.clone();
        rightWing.position.set(0.16, 0, 0);
        group.add(rightWing);

        const halo = new THREE.Mesh(
          new THREE.RingGeometry(0.1, 0.14, 20),
          new THREE.MeshBasicMaterial({ color: 0x00e5ff, side: THREE.DoubleSide, transparent: true, opacity: 0.85 })
        );
        group.add(halo);

        satObj = group;
      } else {
        // Dot / polyhedron marker for non-selected
        const markerGeo = isDebris ? new THREE.DodecahedronGeometry(0.035) : new THREE.SphereGeometry(0.04, 12, 12);
        const markerMat = new THREE.MeshBasicMaterial({
          color: isDebris ? 0xef4444 : 0x38bdf8,
        });
        satObj = new THREE.Mesh(markerGeo, markerMat);
      }

      // Add user data for raycasting
      satObj.userData = { satellite: sat };
      scene.add(satObj);
      clickableObjects.push(satObj);

      satellite3DRefs.push({
        satellite: sat,
        curve,
        mesh: satObj,
        speed: 0.0006 + (idx % 3) * 0.0002,
        offset: (idx * 0.18) % 1,
      });
    });

    // 8. Raycasting for Click Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerDown = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(clickableObjects, true);

      if (intersects.length > 0) {
        let hitObj: THREE.Object3D | null = intersects[0].object;
        while (hitObj && !hitObj.userData.satellite && hitObj.parent) {
          hitObj = hitObj.parent;
        }
        if (hitObj?.userData?.satellite) {
          onSelectSatellite(hitObj.userData.satellite);
        }
      }
    };

    renderer.domElement.addEventListener('pointerdown', handlePointerDown);

    // 9. Animation Loop
    let animationFrameId: number;
    const tempVec = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      earthMesh.rotation.y += 0.0004;

      // Update positions along curves
      satellite3DRefs.forEach((ref) => {
        ref.offset = (ref.offset + ref.speed) % 1;
        const pos = ref.curve.getPointAt(ref.offset);
        ref.mesh.position.copy(pos);

        if (ref.satellite.id === selectedSatellite.id) {
          const tangent = ref.curve.getTangentAt(ref.offset);
          ref.mesh.lookAt(pos.clone().add(tangent));

          // Project screen coordinates for floating tag
          ref.mesh.getWorldPosition(tempVec);
          tempVec.project(camera);

          const isBehind = tempVec.z > 1.0;
          const screenX = (tempVec.x * 0.5 + 0.5) * container.clientWidth;
          const screenY = (-(tempVec.y * 0.5) + 0.5) * container.clientHeight;

          setTagPosition({
            x: screenX,
            y: screenY,
            visible: !isBehind,
          });
        }
      });

      orbitsGroup.visible = showOrbitPathsRef.current;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 10. Resize
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      controls.dispose();
      disposeSceneHierarchy(scene);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [satellites, selectedSatellite, onSelectSatellite, hasWebGL]);

  if (!hasWebGL) {
    return (
      <div className="sat-3d-viewport-card mission-card">
        <div className="earth-canvas-wrapper" ref={containerRef}>
          <div className="webgl-fallback-container">
            <div className="webgl-fallback-content">
              <Globe size={44} className="webgl-fallback-icon" />
              <div className="webgl-fallback-title">3D Hardware Acceleration Unavailable</div>
              <div className="webgl-fallback-desc">
                WebGL context is disabled or not supported in this browser. Satellite ephemeris calculations, catalog screening, and orbital inclination data remain fully active in 2D fallback mode.
              </div>
              <div className="webgl-fallback-telemetry">
                <div><strong>Selected Satellite:</strong> {selectedSatellite.name} ({selectedSatellite.noradId})</div>
                <div><strong>Current Altitude:</strong> {selectedSatellite.altitudeKm} km | <strong>Velocity:</strong> {selectedSatellite.velocityKmS} km/s</div>
                <div><strong>Orbital Regime:</strong> {selectedSatellite.orbitType} | <strong>Inclination:</strong> {selectedSatellite.inclination}°</div>
                <div><strong>Fleet Active:</strong> {satellites.length} Satellites Tracked</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="sat-3d-viewport-card mission-card">
      <div className="earth-canvas-wrapper" ref={containerRef}>
        {/* Loading Spinner */}
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'rgba(3, 7, 18, 0.85)',
              zIndex: 20,
              gap: '10px',
            }}
          >
            <Loader2 size={28} className="animate-spin" style={{ color: 'var(--accent-cyan)' }} />
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
              Loading 3D Astrodynamic Ephemeris Scene...
            </span>
          </div>
        )}

        {/* Header Overlay */}
        <div className="sat-3d-header-overlay">
          <div className="sat-selection-pill">
            <OrbitIcon size={16} style={{ color: 'var(--accent-cyan)' }} />
            <span>Tracking: <strong>{selectedSatellite.name}</strong></span>
            <span className="badge badge-operational">{selectedSatellite.status}</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-cyan">{satellites.length} Orbit Tracks Active</span>
          </div>
        </div>

        {/* Floating Telemetry Tag */}
        {tagPosition.visible && (
          <div
            className="earth-overlay-tag"
            onClick={() => onSelectSatellite(selectedSatellite)}
            style={{
              left: `${tagPosition.x}px`,
              top: `${tagPosition.y}px`,
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
          >
            <div className="earth-overlay-tag-title">{selectedSatellite.name}</div>
            <div className="earth-overlay-tag-detail">Alt {selectedSatellite.altitudeKm} km</div>
            <div className="earth-overlay-tag-detail">Vel {selectedSatellite.velocityKmS} km/s</div>
            <div className="earth-overlay-tag-detail">Incl {selectedSatellite.inclination}°</div>
          </div>
        )}

        {/* Floating Right Control Toolbar */}
        <div className="earth-view-controls">
          <button
            className="view-ctrl-btn"
            onClick={handleZoomIn}
            title="Zoom In"
            aria-label="Zoom in"
          >
            <Plus size={15} />
          </button>
          <button
            className="view-ctrl-btn"
            onClick={handleZoomOut}
            title="Zoom Out"
            aria-label="Zoom out"
          >
            <Minus size={15} />
          </button>
          <button
            className="view-ctrl-btn"
            onClick={() => setShowOrbitPaths(!showOrbitPaths)}
            title="Toggle Orbital Paths"
            style={{ color: showOrbitPaths ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
            aria-label="Toggle orbital paths"
          >
            <OrbitIcon size={14} />
          </button>
          <button
            className="view-ctrl-btn"
            onClick={resetView}
            title="Reset View"
            aria-label="Reset view"
            style={{ fontWeight: 700, fontSize: '0.68rem', color: 'var(--accent-cyan)' }}
          >
            3D
          </button>
        </div>
      </div>
    </div>
  );
};
