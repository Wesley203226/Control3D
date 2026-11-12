export interface Member {
  name: string;
  role: string;
  bio: string;
  github?: string;
  linkedin?: string;
}

// Centralize aqui os dados finais do grupo antes da entrega.
export const members: Member[] = [
  {
    name: 'Wesley',
    role: 'Desenvolvimento full stack',
    bio: 'Estrutura da aplicação, interface e integração entre front-end e API.',
    github: 'https://github.com/wesleywes',
  },
];

export const projectInfo = {
  course: 'Projeto acadêmico de Desenvolvimento Web',
  semester: '2026',
  repository: 'CONTROL 3D',
};
