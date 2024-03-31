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
    job: "computer science student",
    started: "2021-09-05",
    stack: "Astro, Tailwind, DaisyUI and TypeScript",
    hobby: "obsess over my personal privacy",
    projectLink: "https://github.com/the-square-pixel?tab=repositories",
  },
  socials: {
    X: "https://x.com/georgebaskervil",
    LinkedIn: "https://linkedin.com",
    GitHub: "https://github.com/the-square-pixel",
  },
  projects: {
    "DNS Filterlists": {
      url: "https://github.com/the-square-pixel/dnsfilterlists",
      tags: ["DNS", "DNS-Filtering", "Privacy", "AdGuard-Home", "Network"],
    },
    "Personal Website": {
      url: "https://github.com/the-square-pixel/Personal-Website",
      tags: ["Personal-Website", "Astro", "Tailwind-CSS", "DaisyUI","TypeScript"],
    },
  },
  og: {
    image: icon.src,
  },
};
