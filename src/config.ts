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
      tags: string[];
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
      tags: ['DNS', 'DNS-Filtering', 'Privacy'],
    },
    'Personal Website': {
      url: 'https://github.com/georgebaskervil/Personal-Website',
      tags: ['Personal-Website', 'Astro', 'Tailwind-CSS'],
    },
  },
  og: {
    image: icon.src,
  },
};
