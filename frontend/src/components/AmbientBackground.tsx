import { useTheme } from '../contexts/ThemeContext';

export default function AmbientBackground() {
  const { performance } = useTheme();

  return (
    <div className={`ambient${performance ? ' ambient-static' : ''}`} aria-hidden>
      {!performance && <>
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
      </>}
      <div className="ambient-vignette" />
    </div>
  );
}
