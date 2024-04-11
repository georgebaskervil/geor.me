import icon from "../src/assets/icon.png";

interface IConfig {
  me: {
    name: string;
    job: string;
    started: string;
    stack: string;
    hobby: string;
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
    name: "George Baskerville",
    job: "student",
    started: "2021-09-05",
    stack: "Astro, Tailwind, and TypeScript",
    hobby: "obsess over my personal privacy",
    projectLink: "https://github.com/georgebaskervil?tab=repositories",
  },
  socials: {
    X: "https://x.com/georgebaskervil",
    LinkedIn: "https://linkedin.com",
    GitHub: "https://github.com/georgebaskervil",
  },
  projects: {
    "DNS Filterlists": {
      url: "https://github.com/georgebaskervil/dnsfilterlists",
      tags: ["DNS", "DNS-Filtering", "Privacy"],
    },
    "Personal Website": {
      url: "https://github.com/georgebaskervil/Personal-Website",
      tags: ["Personal-Website", "Astro", "Tailwind-CSS"],
    },
  },
  og: {
    image: icon.src,
  },
};
