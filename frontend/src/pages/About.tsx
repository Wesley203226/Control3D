import { ExternalLink, Github, Linkedin, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import AppFooter from '../components/AppFooter';
import Logo from '../components/Logo';
import { members, projectInfo } from '../data/members';

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

export default function About() {
  return (
    <main className="public-shell">
      <div className="public-panel glass">
        <header className="public-header">
          <Link to="/" className="brand-link" aria-label="CONTROL 3D, início"><Logo size={36} /><span>CONTROL 3D</span></Link>
          <Link to="/login" className="btn-ghost"><LogIn size={16} /> Entrar</Link>
        </header>

        <section className="about-hero">
          <p className="eyebrow">Sobre o projeto</p>
          <h1 className="page-title">Tecnologia para transformar ideias em peças.</h1>
          <p className="muted">O CONTROL 3D organiza modelos, impressões e materiais em uma central local, com uma API RESTful e uma experiência pensada para a oficina.</p>
          <div className="about-meta">
            <span>{projectInfo.course}</span>
            <span>{projectInfo.semester}</span>
            <span>{projectInfo.repository}</span>
          </div>
        </section>

        <section aria-labelledby="team-title">
          <div className="mb-4">
            <p className="eyebrow">Quem desenvolveu</p>
            <h2 id="team-title" className="text-xl font-semibold">Equipe do CONTROL 3D</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((member) => (
              <article className="card member-card" key={member.name}>
                <div className="member-avatar" aria-hidden>{initials(member.name)}</div>
                <h3 className="mt-4 font-semibold">{member.name}</h3>
                <p className="text-sm font-medium text-[var(--accent-solid)]">{member.role}</p>
                <p className="muted mt-2 text-sm">{member.bio}</p>
                {(member.github || member.linkedin) && (
                  <div className="mt-4 flex gap-2">
                    {member.github && <a className="icon-btn" href={member.github} target="_blank" rel="noreferrer" aria-label={`GitHub de ${member.name}`}><Github size={18} /></a>}
                    {member.linkedin && <a className="icon-btn" href={member.linkedin} target="_blank" rel="noreferrer" aria-label={`LinkedIn de ${member.name}`}><Linkedin size={18} /></a>}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        <section className="about-tech card">
          <div>
            <p className="eyebrow">Construído com</p>
            <p className="muted text-sm">React, TypeScript, Tailwind CSS, Node.js, Express, Prisma, SQLite, JWT e testes automatizados.</p>
          </div>
          <a href="https://github.com/wesleywes" target="_blank" rel="noreferrer" className="btn-ghost">Repositório <ExternalLink size={16} /></a>
        </section>
        <AppFooter />
      </div>
    </main>
  );
}
