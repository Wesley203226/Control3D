import { Box } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AppFooter() {
  return (
    <footer className="app-footer">
      <span className="footer-brand"><Box size={15} aria-hidden /> CONTROL 3D</span>
      <span>Gerenciamento local de impressões 3D</span>
      <Link to="/sobre">Sobre o projeto</Link>
    </footer>
  );
}
