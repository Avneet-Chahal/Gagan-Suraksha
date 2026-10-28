import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Plus, Minus, Orbit as OrbitIcon, Globe } from 'lucide-react';
import { Satellite } from '../../types';
import { isWebGLAvailable, disposeSceneHierarchy } from '../../services/webglHelper';

interface EarthVisualizationProps {
  satellite: Satellite;
  onSelectSatellite?: (satellite: Satellite) => void;
}

export const EarthVisualization: React.FC<EarthVisualizationProps> = ({
  satellite,
  onSelectSatellite,
}) => {

  const containerRef = useRef<HTMLDivElement>(null);
  const tagRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [hasWebGL] = useState<boolean>(() => isWebGLAvailable());
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
      if (zoomVec.length() > 2.6) {
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
    const height = container.clientHeight || 450;

    // 1. Scene, Camera, Renderer
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
    controls.minDistance = 2.6;
    controls.maxDistance = 8.5;
    controls.rotateSpeed = 0.6;
    controls.zoomSpeed = 0.8;
    controlsRef.current = controls;

    // 3. Lighting
    const ambientLight = new THREE.AmbientLight(0x1a2942, 1.2);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xffffff, 2.2);
    sunLight.position.set(8, 4, 6);
    scene.add(sunLight);

    const cyanRimLight = new THREE.DirectionalLight(0x00e5ff, 0.8);
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
    const earthTexture = textureLoader.load('/earth_texture.jpg');
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

    // 7. Orbital Curves (Primary Sun-Synchronous Orbit 98.7 deg inclination)
    const orbitRadius = earthRadius + 0.45; // ~542 km scale
    const orbitPointsCount = 200;
    const orbitPoints: THREE.Vector3[] = [];
    const incRad = (98.7 * Math.PI) / 180;

    for (let i = 0; i <= orbitPointsCount; i++) {
      const theta = (i / orbitPointsCount) * Math.PI * 2;
      // Parametric orbit with inclination
      const x = orbitRadius * Math.cos(theta);
      const y = orbitRadius * Math.sin(theta) * Math.sin(incRad);
      const z = orbitRadius * Math.sin(theta) * Math.cos(incRad);
      orbitPoints.push(new THREE.Vector3(x, y, z));
    }

    const orbitCurve = new THREE.CatmullRomCurve3(orbitPoints, true);
    const orbitGeo = new THREE.BufferGeometry().setFromPoints(orbitCurve.getPoints(200));
    const orbitMat = new THREE.LineBasicMaterial({
      color: 0x00e5ff,
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
    const orbitLine = new THREE.Line(orbitGeo, orbitMat);
    scene.add(orbitLine);

    // Secondary Debris / Conjunction Trajectory (SL-16 Debris intersecting orbit)
    const debrisPoints: THREE.Vector3[] = [];
    for (let i = 0; i <= 150; i++) {
      const theta = (i / 150) * Math.PI * 2;
      const x = (orbitRadius + 0.05) * Math.cos(theta + 0.4);
      const y = (orbitRadius + 0.05) * Math.sin(theta + 0.4) * Math.sin((74.0 * Math.PI) / 180);
      const z = (orbitRadius + 0.05) * Math.sin(theta + 0.4) * Math.cos((74.0 * Math.PI) / 180);
      debrisPoints.push(new THREE.Vector3(x, y, z));
    }
    const debrisGeo = new THREE.BufferGeometry().setFromPoints(debrisPoints);
    const debrisMat = new THREE.LineDashedMaterial({
      color: 0xef4444,
      dashSize: 0.1,
      gapSize: 0.05,
      transparent: true,
      opacity: 0.45,
    });
    const debrisLine = new THREE.Line(debrisGeo, debrisMat);
    debrisLine.computeLineDistances();
    scene.add(debrisLine);

    // 8. 3D Satellite Mesh Model (ORBIT-02)
    const satGroup = new THREE.Group();

    // Central bus
    const busGeo = new THREE.BoxGeometry(0.1, 0.1, 0.14);
    const busMat = new THREE.MeshStandardMaterial({
      color: 0xeab308, // Golden MLI thermal blanket
      metalness: 0.8,
      roughness: 0.25,
    });
    const busMesh = new THREE.Mesh(busGeo, busMat);
    satGroup.add(busMesh);

    // Dual solar panels
    const panelGeo = new THREE.BoxGeometry(0.24, 0.01, 0.08);
    const panelMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7, // Blue photovoltaic cells
      metalness: 0.4,
      roughness: 0.3,
    });

    const leftPanel = new THREE.Mesh(panelGeo, panelMat);
    leftPanel.position.set(-0.18, 0, 0);
    satGroup.add(leftPanel);

    const rightPanel = new THREE.Mesh(panelGeo, panelMat);
    rightPanel.position.set(0.18, 0, 0);
    satGroup.add(rightPanel);

    // Glow Halo
    const haloGeo = new THREE.RingGeometry(0.12, 0.16, 24);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x00e5ff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.7,
    });
    const haloMesh = new THREE.Mesh(haloGeo, haloMat);
    satGroup.add(haloMesh);

    scene.add(satGroup);

    // 9. Secondary Debris Marker (SL-16 Debris)
    const debrisMarkerGeo = new THREE.DodecahedronGeometry(0.04);
    const debrisMarkerMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const debrisMarker = new THREE.Mesh(debrisMarkerGeo, debrisMarkerMat);
    scene.add(debrisMarker);

    // 10. Animation Loop
    let animationFrameId: number;
    let t = 0.35; // Orbital progress parameter [0, 1]

    const tempVec = new THREE.Vector3();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Rotate Earth slowly
      earthMesh.rotation.y += 0.0005;

      // Orbit satellite
      t += 0.0008;
      if (t > 1) t = 0;

      const satPos = orbitCurve.getPointAt(t);
      satGroup.position.copy(satPos);

      // Align satellite velocity vector tangent to orbit
      const tangent = orbitCurve.getTangentAt(t);
      satGroup.lookAt(satPos.clone().add(tangent));
      haloMesh.lookAt(camera.position);

      // Debris orbit position
      const dt = (t * 1.2 + 0.1) % 1;
      const debrisX = (orbitRadius + 0.05) * Math.cos(dt * Math.PI * 2 + 0.4);
      const debrisY = (orbitRadius + 0.05) * Math.sin(dt * Math.PI * 2 + 0.4) * Math.sin((74.0 * Math.PI) / 180);
      const debrisZ = (orbitRadius + 0.05) * Math.sin(dt * Math.PI * 2 + 0.4) * Math.cos((74.0 * Math.PI) / 180);
      debrisMarker.position.set(debrisX, debrisY, debrisZ);

      // Project Satellite Screen Coordinates for Floating Overlay Tag
      satGroup.getWorldPosition(tempVec);
      tempVec.project(camera);

      // Check if satellite is on the front hemisphere of the camera
      const isBehind = tempVec.z > 1.0;
      const screenX = (tempVec.x * 0.5 + 0.5) * container.clientWidth;
      const screenY = (-(tempVec.y * 0.5) + 0.5) * container.clientHeight;

      setTagPosition({
        x: screenX,
        y: screenY,
        visible: !isBehind,
      });

      // Toggle visibility of orbits based on user control
      orbitLine.visible = showOrbitPathsRef.current;
      debrisLine.visible = showOrbitPathsRef.current;

      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    // 11. Responsive Resize
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
      controls.dispose();
      disposeSceneHierarchy(scene);
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [hasWebGL]);

  if (!hasWebGL) {
    return (
      <div className="earth-3d-card mission-card">
        <div className="earth-canvas-wrapper" ref={containerRef}>
          <div className="webgl-fallback-container">
            <div className="webgl-fallback-content">
              <Globe size={40} className="webgl-fallback-icon" />
              <div className="webgl-fallback-title">3D Hardware Acceleration Unavailable</div>
              <div className="webgl-fallback-desc">
                WebGL is disabled or unsupported in this environment. Spacecraft telemetry, position vectors, and orbit status remain active in 2D mode.
              </div>
              <div className="webgl-fallback-telemetry">
                <div><strong>Spacecraft:</strong> {satellite.name} ({satellite.noradId})</div>
                <div><strong>Altitude:</strong> {satellite.altitudeKm} km | <strong>Velocity:</strong> {satellite.velocityKmS} km/s</div>
                <div><strong>Status:</strong> {satellite.status} | <strong>Inclination:</strong> {satellite.inclination}°</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="earth-3d-card mission-card">
      <div className="earth-canvas-wrapper" ref={containerRef}>
        {/* Floating Satellite Telemetry Tag matching reference */}
        {tagPosition.visible && (
          <div
            ref={tagRef}
            className="earth-overlay-tag"
            onClick={() => onSelectSatellite?.(satellite)}
            style={{
              left: `${tagPosition.x}px`,
              top: `${tagPosition.y}px`,
              pointerEvents: 'auto',
              cursor: 'pointer',
            }}
            title="Click to select satellite"
          >
            <div className="earth-overlay-tag-title">{satellite.name}</div>
            <div className="earth-overlay-tag-detail">Alt {satellite.altitudeKm} km</div>
            <div className="earth-overlay-tag-detail">Vel {satellite.velocityKmS} km/s</div>
            <div className="earth-overlay-tag-detail">Incl {satellite.inclination}°</div>
          </div>
        )}

        {/* Floating Right Control Toolbar matching reference */}
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
            title="Toggle Orbital Path"
            style={{ color: showOrbitPaths ? 'var(--accent-cyan)' : 'var(--text-muted)' }}
            aria-label="Toggle orbital paths"
          >
            <OrbitIcon size={14} />
          </button>
          <button
            className="view-ctrl-btn"
            onClick={resetView}
            title="Reset to Default 3D View"
            aria-label="Reset 3D view"
            style={{ fontWeight: 700, fontSize: '0.68rem', color: 'var(--accent-cyan)' }}
          >
            3D
          </button>
        </div>
      </div>
    </div>
  );
};
