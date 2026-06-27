interface Attribution {
  description: string;
  name: string;
  url: string;
}

const ATTRIBUTIONS = [
  {
    name: "OBS Project",
    description: "For the recording infrastructure.",
    url: "https://github.com/obsproject",
  },
  {
    name: "Warcraft Recorder",
    description: "Hinekora is inspired by this project.",
    url: "https://warcraftrecorder.com/",
  },
  {
    name: "Alex, the creator of Warcraft Recorder, and the maintainers of the noobs package",
    description: "For their work.",
    url: "https://github.com/aza547/noobs",
  },
] as const satisfies readonly Attribution[];

export type { Attribution };
export { ATTRIBUTIONS };
