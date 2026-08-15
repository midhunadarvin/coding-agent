export interface SkillMeta {
  name: string;
  description: string;
  filePath: string;
}

export interface Skill extends SkillMeta {
  body: string;
}
