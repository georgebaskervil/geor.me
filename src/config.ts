import icon from '../public/brand-assets/icon.webp';

interface IConfig {
  me: {
    name: string;
    job: string;
    started: string;
    projectLink: string;
  };
  socials: {
    [name: string]: string;
  };
  projects: {
    [name: string]: {
      url: string;
      description: string;
    };
  };
  og: {
    image: string;
  };
}

export const Config: IConfig = {
  me: {
    name: 'George Baskerville',
    job: 'student',
    started: '2019-05-05',
    projectLink: 'https://github.com/georgebaskervil?tab=repositories',
  },
  socials: {
    X: 'https://x.com/georgebaskervil',
    GitHub: 'https://github.com/georgebaskervil',
  },
  projects: {
    'DNS Filterlists': {
      url: 'https://github.com/georgebaskervil/dnsfilterlists',
      description: 'A collection of DNS filterlists intended for use with AdGuard Home.',
    },
    'Personal Website': {
      url: 'https://github.com/georgebaskervil/Personal-Website',
      description: 'My personal website built with Astro, TypeScript, and Tailwind CSS.',
    },
  },
  og: {
    image: icon.src,
  },
};
