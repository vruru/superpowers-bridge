/**
 * Superpowers Bridge Plugin for OpenClaw
 * 
 * Automatically fetches and manages Superpowers skills from GitHub.
 * Based on https://github.com/obra/superpowers
 */

import type { OpenClawPluginApi, Tool } from "openclaw/plugin-sdk";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";

interface PluginConfig {
  enabled?: boolean;
  skillsRepo?: string;
  docsPath?: string;
  autoDetectCode?: boolean;
  autoUpdate?: boolean;
}

interface Skill {
  name: string;
  description: string;
  content: string;
}

const DEFAULT_SKILLS_REPO = "https://github.com/obra/superpowers.git";
const SKILLS_SUBDIR = "skills";
const CACHE_DIR_NAME = ".superpowers-cache";

// Keywords that indicate a code/development task
const CODE_KEYWORDS: Record<string, string[]> = {
  "brainstorming": ["写代码", "编写", "实现", "开发", "创建", "构建", "功能", "feature",
    "write code", "implement", "develop", "create", "build", "function", "class", "script", "program", "app"],
  "writing-plans": ["计划", "规划", "方案", "plan", "spec", "设计", "design"],
  "subagent-driven-development": ["执行", "implement", "execute", "task"],
  "test-driven-development": ["测试", "test", "TDD", "unittest", "jest", "mocha"],
  "systematic-debugging": ["调试", "debug", "修复", "fix", "bug", "错误", "error", "issue"],
  "using-git-worktrees": ["分支", "branch", "worktree", "git"],
  "finishing-a-development-branch": ["完成", "结束", "合并", "merge", "PR", "pull request"],
};

const ALWAYS_LOAD_SKILLS = ["using-superpowers"];

/**
 * Get the cache directory path (inside plugin directory)
 */
function getCacheDir(): string {
  // Plugin directory is where this file is located
  const pluginDir = path.dirname(new URL(import.meta.url).pathname);
  
  // On Windows, pathname from URL starts with /C:/ or similar
  // We need to remove the leading slash for proper path joining
  const normalizedPluginDir = process.platform === 'win32' && pluginDir.startsWith('/')
    ? pluginDir.substring(1).replace(/\//g, '\\')
    : pluginDir;
    
  return path.join(normalizedPluginDir, CACHE_DIR_NAME);
}

/**
 * Get the skills directory path inside cache
 */
function getSkillsDir(cacheDir: string): string {
  return path.join(cacheDir, SKILLS_SUBDIR);
}

/**
 * Ensure skills are available (clone if needed)
 */
function ensureSkills(repoUrl: string, logger: any): { success: boolean; skillsDir: string; message: string } {
  const cacheDir = getCacheDir();
  const skillsDir = getSkillsDir(cacheDir);

  // Check if already cloned
  if (fs.existsSync(path.join(cacheDir, ".git"))) {
    return { success: true, skillsDir, message: "Skills already cached" };
  }

  // Need to clone
  logger.info(`[Superpowers Bridge] First run - cloning skills from ${repoUrl}...`);
  
  try {
    // Create cache directory parent if needed
    const parentDir = path.dirname(cacheDir);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    // Clone the repo
    execSync(`git clone --depth 1 "${repoUrl}" "${cacheDir}"`, {
      stdio: "pipe",
      timeout: 60000,
    });

    logger.info(`[Superpowers Bridge] Successfully cloned skills to ${cacheDir}`);
    return { success: true, skillsDir, message: "Skills cloned successfully" };
  } catch (err: any) {
    const message = err.message || String(err);
    logger.error(`[Superpowers Bridge] Failed to clone skills: ${message}`);
    return { success: false, skillsDir, message: `Clone failed: ${message}` };
  }
}

/**
 * Update skills (git pull)
 */
function updateSkills(logger: any): { success: boolean; message: string } {
  const cacheDir = getCacheDir();

  if (!fs.existsSync(path.join(cacheDir, ".git"))) {
    return { success: false, message: "Skills not yet cloned. Plugin will auto-clone on next start." };
  }

  try {
    logger.info("[Superpowers Bridge] Updating skills...");
    const output = execSync("git pull", {
      cwd: cacheDir,
      stdio: "pipe",
      encoding: "utf-8",
      timeout: 30000,
    });
    
    logger.info(`[Superpowers Bridge] Skills updated: ${output.trim()}`);
    return { success: true, message: output.trim() || "Already up to date" };
  } catch (err: any) {
    const message = err.message || String(err);
    logger.error(`[Superpowers Bridge] Failed to update skills: ${message}`);
    return { success: false, message: `Update failed: ${message}` };
  }
}

/**
 * Get current skills version info
 */
function getSkillsVersion(logger: any): { success: boolean; version: string; message: string } {
  const cacheDir = getCacheDir();

  if (!fs.existsSync(path.join(cacheDir, ".git"))) {
    return { success: false, version: "", message: "Skills not yet cloned" };
  }

  try {
    const commit = execSync("git rev-parse --short HEAD", {
      cwd: cacheDir,
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();
    
    const date = execSync("git log -1 --format=%cd", {
      cwd: cacheDir,
      stdio: "pipe",
      encoding: "utf-8",
    }).trim();

    return { 
      success: true, 
      version: commit, 
      message: `Skills version: ${commit} (${date})` 
    };
  } catch (err: any) {
    return { success: false, version: "", message: `Failed to get version: ${err.message}` };
  }
}

/**
 * Parse frontmatter from skill markdown content
 */
function parseSkill(content: string, filename: string): Skill | null {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) {
    console.warn(`[Superpowers Bridge] No frontmatter found in ${filename}`);
    return null;
  }

  const frontmatterStr = match[1];
  const body = match[2].trim();

  const nameMatch = frontmatterStr.match(/name:\s*(.+)/);
  const descMatch = frontmatterStr.match(/description:\s*(.+)/);

  if (!nameMatch) {
    console.warn(`[Superpowers Bridge] No name in frontmatter of ${filename}`);
    return null;
  }

  return {
    name: nameMatch[1].trim().replace(/^["']|["']$/g, ""),
    description: descMatch ? descMatch[1].trim().replace(/^["']|["']$/g, "") : "",
    content: body,
  };
}

/**
 * Load all skills from the skills directory
 */
function loadSkills(skillsDir: string, logger: any): Map<string, Skill> {
  const skills = new Map<string, Skill>();

  if (!fs.existsSync(skillsDir)) {
    logger.warn(`[Superpowers Bridge] Skills directory not found: ${skillsDir}`);
    return skills;
  }

  const entries = fs.readdirSync(skillsDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillPath = path.join(skillsDir, entry.name, "SKILL.md");
    if (!fs.existsSync(skillPath)) continue;

    try {
      const content = fs.readFileSync(skillPath, "utf-8");
      const skill = parseSkill(content, entry.name);
      if (skill) {
        skills.set(skill.name, skill);
        logger.debug(`[Superpowers Bridge] Loaded skill: ${skill.name}`);
      }
    } catch (err) {
      logger.error(`[Superpowers Bridge] Failed to load ${skillPath}:`, err);
    }
  }

  return skills;
}

/**
 * Detect which skills are relevant to the user's prompt
 */
function detectRelevantSkills(prompt: string, skills: Map<string, Skill>): string[] {
  const promptLower = prompt.toLowerCase();
  const relevant = new Set<string>();

  // Always include using-superpowers
  for (const skillName of ALWAYS_LOAD_SKILLS) {
    if (skills.has(skillName)) {
      relevant.add(skillName);
    }
  }

  // Detect by keywords
  for (const [skillName, keywords] of Object.entries(CODE_KEYWORDS)) {
    if (keywords.some(kw => promptLower.includes(kw.toLowerCase()))) {
      if (skills.has(skillName)) {
        relevant.add(skillName);
      }
    }
  }

  return Array.from(relevant);
}

/**
 * Build system context from skills
 */
function buildSkillsContext(skills: Map<string, Skill>, skillNames: string[]): string {
  const sections: string[] = [];

  sections.push(`# 🦸 Superpowers Workflow`);
  sections.push(``);
  sections.push(`You have access to the following Superpowers skills:`);
  sections.push(``);

  for (const name of skillNames) {
    const skill = skills.get(name);
    if (!skill) continue;

    sections.push(`## ${skill.name}`);
    if (skill.description) {
      sections.push(`*${skill.description}*`);
    }
    sections.push(``);
    sections.push(skill.content);
    sections.push(``);
    sections.push(`---`);
    sections.push(``);
  }

  // Add OpenClaw-specific tool mapping
  sections.push(`## Tool Mapping (Superpowers → OpenClaw)`);
  sections.push(``);
  sections.push(`| Superpowers | OpenClaw |`);
  sections.push(`|-------------|----------|`);
  sections.push(`| TodoWrite | Task tracking via notes |`);
  sections.push(`| Task / subagent dispatch | \`sessions_spawn\` with \`runtime: "subagent"\` |`);
  sections.push(`| Bash | \`exec\` tool |`);
  sections.push(`| Read | \`read\` tool |`);
  sections.push(`| Edit | \`edit\` tool |`);
  sections.push(`| Write | \`write\` tool |`);
  sections.push(`| Skill | Use \`skill\` tool (this plugin provides it) |`);
  sections.push(``);
  sections.push(`---`);
  sections.push(``);
  sections.push(`**Remember**: Follow the skills exactly. They are mandatory workflows, not suggestions.`);

  return sections.join("\n");
}

const superpowersBridgePlugin = {
  id: "superpowers-bridge",
  name: "Superpowers Bridge",
  description: "Bridge to Superpowers workflow skills - auto-fetches from GitHub",
  kind: "extension" as const,

  register(api: OpenClawPluginApi) {
    const config = (api.pluginConfig || {}) as PluginConfig;

    if (config.enabled === false) {
      api.logger.info("[Superpowers Bridge] Plugin disabled");
      return;
    }

    const repoUrl = config.skillsRepo || DEFAULT_SKILLS_REPO;
    const autoDetect = config.autoDetectCode !== false;

    // Ensure skills are available
    const { success, skillsDir, message } = ensureSkills(repoUrl, api.logger);
    
    if (!success) {
      api.logger.error(`[Superpowers Bridge] Failed to initialize: ${message}`);
      // Continue anyway - might work on next start or user can fix network
    }

    // Load all skills
    const skills = loadSkills(skillsDir, api.logger);
    api.logger.info(`[Superpowers Bridge] Loaded ${skills.size} skills`);

    if (skills.size === 0 && success) {
      api.logger.warn(`[Superpowers Bridge] No skills found in ${skillsDir}`);
    }

    // Inject relevant skills on agent start
    api.on("before_agent_start", (event, ctx) => {
      if (skills.size === 0) {
        return {};
      }

      const prompt = event.prompt || "";

      // Detect relevant skills
      const relevantSkills = autoDetect
        ? detectRelevantSkills(prompt, skills)
        : ALWAYS_LOAD_SKILLS.filter(name => skills.has(name));

      if (relevantSkills.length === 0) {
        return {};
      }

      const guidance = buildSkillsContext(skills, relevantSkills);

      return {
        appendSystemContext: guidance,
      };
    });

    // Register skill tool
    const skillTool: Tool = {
      name: "skill",
      description: "Load and apply a Superpowers skill by name. Use this when a specific skill applies to your task.",
      parameters: {
        type: "object",
        properties: {
          name: {
            type: "string",
            description: "Name of the skill to load",
          },
        },
        required: ["name"],
      },
      async execute(args: { name: string }) {
        const skill = skills.get(args.name);
        if (!skill) {
          const available = Array.from(skills.keys()).join(", ");
          return {
            error: `Skill '${args.name}' not found. Available: ${available}`,
          };
        }

        return {
          content: skill.content,
          name: skill.name,
          description: skill.description,
        };
      },
    };

    api.registerTool(skillTool);

    // Register update_skills tool
    const updateSkillsTool: Tool = {
      name: "update_superpowers_skills",
      description: "Update Superpowers skills to the latest version from GitHub (git pull)",
      parameters: {
        type: "object",
        properties: {},
      },
      async execute() {
        const result = updateSkills(api.logger);
        if (result.success) {
          // Reload skills after update
          const newSkills = loadSkills(skillsDir, api.logger);
          skills.clear();
          for (const [name, skill] of newSkills) {
            skills.set(name, skill);
          }
          api.logger.info(`[Superpowers Bridge] Reloaded ${skills.size} skills after update`);
        }
        return result;
      },
    };

    api.registerTool(updateSkillsTool);

    // Register version check tool
    const versionTool: Tool = {
      name: "superpowers_version",
      description: "Check the current version of Superpowers skills",
      parameters: {
        type: "object",
        properties: {},
      },
      async execute() {
        return getSkillsVersion(api.logger);
      },
    };

    api.registerTool(versionTool);

    api.logger.info("[Superpowers Bridge] Plugin registered with tools: skill, update_superpowers_skills, superpowers_version");
  },
};

export default superpowersBridgePlugin;
