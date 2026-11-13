import { AlertCircle, Box, Rotate3D, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import {
  AmbientLight,
  Color,
  DirectionalLight,
  GridHelper,
  Group,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three';
import { removeModelStl, type StoredStl } from '../lib/workspaceStorage';

interface Props {
  file: StoredStl | null;
  error?: string;
  onRemoved: () => void;
}

export default function StlPreview({ file, error: storageError = '', onRemoved }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(Boolean(file));
  const [loadError, setLoadError] = useState('');
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    if (!file || !mountRef.current) {
      setLoading(false);
      return;
    }

    let active = true;
    let renderer: WebGLRenderer | null = null;
    let controls: OrbitControls | null = null;
    let geometry: ReturnType<STLLoader['parse']> | null = null;
    const resourceCleanups: Array<() => void> = [];
    let animationFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    const mount = mountRef.current;
    setLoading(true);
    setLoadError('');

    void file.blob.arrayBuffer()
      .then((buffer) => {
        if (!active) return;
        const loader = new STLLoader();
        geometry = loader.parse(buffer);
        const positions = geometry.getAttribute('position');
        if (!positions || positions.count === 0) throw new Error('Este STL não contém triângulos para exibir.');
        if (positions.count > 1_500_000) throw new Error('Este STL é muito detalhado para visualizar com segurança no navegador (mais de 500 mil faces).');

        geometry.computeVertexNormals();
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        const bounds = geometry.boundingBox;
        if (!bounds || !geometry.boundingSphere) throw new Error('Não foi possível calcular o volume deste STL.');
        const center = bounds.getCenter(new Vector3());
        geometry.translate(-center.x, -center.y, -center.z);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        const size = bounds.getSize(new Vector3());
        const longestEdge = Math.max(size.x, size.y, size.z, 1);
        const scene = new Scene();
        const root = new Group();
        const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent-solid').trim() || '#8b73ff';
        const material = new MeshStandardMaterial({
          color: new Color(accent),
          metalness: 0.18,
          roughness: 0.3,
          flatShading: false,
        });
        resourceCleanups.push(() => material.dispose());
        root.add(new Mesh(geometry, material));
        scene.add(root);
        const camera = new PerspectiveCamera(38, 1, 0.01, longestEdge * 100);
        camera.position.set(longestEdge * 1.65, longestEdge * 1.35, longestEdge * 1.85);
        camera.lookAt(0, 0, 0);
        scene.add(new AmbientLight(0xffffff, 1.9));
        const keyLight = new DirectionalLight(0xffffff, 2.4);
        keyLight.position.set(longestEdge * 2, longestEdge * 3, longestEdge * 2);
        scene.add(keyLight);
        const fillLight = new DirectionalLight(0x9ec8ff, 1.05);
        fillLight.position.set(-longestEdge, longestEdge, -longestEdge * 1.5);
        scene.add(fillLight);
        const grid = new GridHelper(longestEdge * 2.2, 22, new Color(accent), 0x718094);
        grid.position.y = -size.y / 2 - longestEdge * 0.015;
        scene.add(grid);
        resourceCleanups.push(() => {
          grid.geometry.dispose();
          const gridMaterial = grid.material;
          if (Array.isArray(gridMaterial)) gridMaterial.forEach((item) => item.dispose());
          else gridMaterial.dispose();
        });

        try {
          renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        } catch {
          throw new Error('Seu navegador não liberou a visualização WebGL. Confira a aceleração de hardware.');
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = 'srgb';
        mount.replaceChildren(renderer.domElement);
        controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.07;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 1.1;
        const resize = () => {
          if (!renderer) return;
          const width = Math.max(1, mount.clientWidth);
          const height = Math.max(1, mount.clientHeight);
          renderer.setSize(width, height, false);
          camera.aspect = width / height;
          camera.updateProjectionMatrix();
        };
        resizeObserver = new ResizeObserver(resize);
        resizeObserver.observe(mount);
        resize();

        const render = () => {
          if (!active || !renderer || !controls) return;
          controls.update();
          renderer.render(scene, camera);
          animationFrame = window.requestAnimationFrame(render);
        };
        render();
        setLoadError('');
      })
      .catch((reason: unknown) => {
        if (geometry) geometry.dispose();
        resourceCleanups.splice(0).forEach((cleanup) => cleanup());
        if (!active) return;
        setLoadError(reason instanceof Error ? reason.message : 'Não foi possível interpretar este STL.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.cancelAnimationFrame(animationFrame);
      resizeObserver?.disconnect();
      controls?.dispose();
      if (geometry) geometry.dispose();
      resourceCleanups.splice(0).forEach((cleanup) => cleanup());
      renderer?.dispose();
      mount.replaceChildren();
    };
  }, [file]);

  async function remove() {
    if (!file || removing) return;
    setRemoving(true);
    try {
      await removeModelStl(file.modelId);
      onRemoved();
    } catch (reason) {
      setLoadError(reason instanceof Error ? reason.message : 'Não foi possível remover este STL.');
    } finally {
      setRemoving(false);
    }
  }

  if (!file) {
    return (
      <section className="card stl-preview">
        <div className="stl-preview__heading">
          <span className="settings-icon"><Box size={18} /></span>
          <div><h2 className="font-semibold">Prévia 3D</h2><p className="muted text-xs">Adicione um arquivo STL ao editar este projeto.</p></div>
        </div>
        {storageError && <p className="form-error mt-3">{storageError}</p>}
      </section>
    );
  }

  return (
    <section className="card stl-preview" aria-label="Pré-visualização do modelo 3D">
      <header className="stl-preview__heading">
        <span className="settings-icon"><Box size={18} /></span>
        <div className="stl-preview__file">
          <h2 className="font-semibold">Modelo 3D</h2>
          <p title={file.name}>{file.name} · {(file.blob.size / (1024 * 1024)).toFixed(1)} MB</p>
        </div>
        <button type="button" className="btn-ghost !px-3 !py-2" onClick={() => void remove()} disabled={removing} aria-label="Remover arquivo STL">
          <Trash2 size={15} /> {removing ? 'Removendo...' : 'Remover STL'}
        </button>
      </header>
      <div className="stl-preview__viewport" role="img" aria-label={`Visualização 3D interativa de ${file.name}`}>
        <div className="stl-preview__canvas" ref={mountRef} />
        {(loading || loadError || storageError) && (
          <div className="stl-preview__message" role={loadError || storageError ? 'alert' : 'status'}>
            {loadError || storageError ? <AlertCircle size={20} /> : <Rotate3D size={20} className="stl-preview__spin" />}
            <span>{loadError || storageError || 'Preparando seu modelo 3D...'}</span>
          </div>
        )}
      </div>
      <p className="muted mt-2 text-xs">Arraste para girar · role para aproximar · arraste com o botão direito para mover</p>
      {storageError && <p className="form-error mt-2">{storageError}</p>}
    </section>
  );
}
