import { readdir, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export interface SkillMeta {
  name: string;
  description: string;
  filePath: string;
}

export interface Skill extends SkillMeta {
  body: string;
}

export async function loadSkills(cwd: string = process.cwd()): Promise<Skill[]> {
  const directories = [
    path.join(cwd, "skills"),
    path.join(os.homedir(), ".coding-agent", "skills"),
  ];
  const byName = new Map<string, Skill>();

  for (const directory of directories) {
    for (const skill of await readSkillDirectory(directory)) {
      byName.set(skill.name, skill);
    }
  }

  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function toSkillMeta(skills: Skill[]): SkillMeta[] {
  return skills.map(({ name, description, filePath }) => ({ name, description, filePath }));
}

async function readSkillDirectory(directory: string): Promise<Skill[]> {
  let names: string[];
  try {
    names = await readdir(directory);
  } catch {
    return [];
  }

  const skills: Skill[] = [];
  for (const name of names) {
    const filePath = path.join(directory, name, "SKILL.md");
    try {
      const raw = await readFile(filePath, "utf8");
      skills.push(parseSkill(raw, filePath, name));
    } catch {
      // Skip missing or unreadable skills.
    }
  }
  return skills;
}

function parseSkill(raw: string, filePath: string, fallbackName: string): Skill {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return {
      name: fallbackName,
      description: fallbackName,
      filePath,
      body: raw.trim(),
    };
  }

  const frontmatter = match[1] ?? "";
  const body = (match[2] ?? "").trim();
  const name = readFrontmatterField(frontmatter, "name") ?? fallbackName;
  const description = readFrontmatterField(frontmatter, "description") ?? name;
  return { name, description, filePath, body };
}

function readFrontmatterField(frontmatter: string, field: string): string | undefined {
  const line = frontmatter.split(/\r?\n/).find((entry) => entry.startsWith(`${field}:`));
  if (!line) {
    return undefined;
  }
  return line.slice(field.length + 1).trim().replace(/^["']|["']$/g, "");
}
