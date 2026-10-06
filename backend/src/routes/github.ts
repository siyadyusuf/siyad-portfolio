import { Router } from "express";
import type { Config } from "../config.js";
import { HttpError } from "../errors.js";
import { fetchContributions, type Contributions } from "../contributions.js";

const TTL_MS = 60 * 60 * 1000;

interface GithubPayload {
  repos: { name: string; description: string | null; url: string; language: string | null; stars: number; updatedAt: string }[];
  recentActivity: { type: string; repo: string; message: string; url: string; createdAt: string }[];
  contributions: Contributions | null;
}

function describeEvent(e: any): { message: string; url: string } | null {
  const repoUrl = `https://github.com/${e.repo?.name}`;
  switch (e.type) {
    case "PushEvent": {
      const commits = e.payload?.commits ?? [];
      const n = e.payload?.size ?? commits.length;
      const first = commits[commits.length - 1]?.message?.split("\n")[0];
      return { message: first ? `Pushed ${n} commit${n === 1 ? "" : "s"}: ${first}` : `Pushed ${n} commit${n === 1 ? "" : "s"}`, url: repoUrl };
    }
    case "CreateEvent":
      return { message: e.payload?.ref_type === "repository" ? "Created repository" : `Created ${e.payload?.ref_type} ${e.payload?.ref ?? ""}`.trim(), url: repoUrl };
    case "PullRequestEvent":
      return { message: `${e.payload?.action} pull request: ${e.payload?.pull_request?.title ?? ""}`.trim(), url: e.payload?.pull_request?.html_url ?? repoUrl };
    case "IssuesEvent":
      return { message: `${e.payload?.action} issue: ${e.payload?.issue?.title ?? ""}`.trim(), url: e.payload?.issue?.html_url ?? repoUrl };
    case "ReleaseEvent":
      return { message: `Released ${e.payload?.release?.tag_name ?? ""}`.trim(), url: e.payload?.release?.html_url ?? repoUrl };
    case "WatchEvent":
      return { message: "Starred repository", url: repoUrl };
    case "ForkEvent":
      return { message: "Forked repository", url: e.payload?.forkee?.html_url ?? repoUrl };
    default:
      return null;
  }
}

export function githubRouter(cfg: Config, fetchImpl: typeof fetch = fetch, now: () => number = Date.now) {
  const r = Router();
  let cache: { at: number; data: GithubPayload } | null = null;
  let partial = false; // set when a source failed, so we retry sooner

  async function load(): Promise<GithubPayload> {
    const headers: Record<string, string> = { Accept: "application/vnd.github+json", "User-Agent": "siyad-portfolio" };
    if (cfg.githubToken) headers.Authorization = `Bearer ${cfg.githubToken}`;
    const u = encodeURIComponent(cfg.githubUser);
    const contributionsP = fetchContributions(cfg.githubUser, cfg.githubToken, fetchImpl).catch((err) => {
      console.error(err);
      return cache?.data.contributions ?? null; // keep last good calendar if this fetch fails
    });
    const getJson = async (url: string, fallback: any[] | undefined) => {
      try {
        const res = await fetchImpl(url, { headers });
        if (!res.ok) throw new Error(`GitHub API ${res.status} for ${url}`);
        return (await res.json()) as any[];
      } catch (err) {
        console.error(err);
        if (fallback) return fallback;
        throw err;
      }
    };
    const [repoResult, eventResult] = await Promise.allSettled([
      getJson(`https://api.github.com/users/${u}/repos?sort=updated&per_page=30&type=owner`, undefined),
      getJson(`https://api.github.com/users/${u}/events/public?per_page=30`, undefined),
    ]);
    const contributions = await contributionsP;
    if (repoResult.status === "rejected" && eventResult.status === "rejected" && !contributions) {
      throw new Error("All GitHub sources failed");
    }
    const repos = repoResult.status === "fulfilled" ? repoResult.value : [];
    const events = eventResult.status === "fulfilled" ? eventResult.value : [];
    const stale = cache?.data;
    const shaped: GithubPayload = {
      repos: repos
        .filter((x) => !x.fork && !x.archived)
        .map((x) => ({
          name: x.name,
          description: x.description,
          url: x.html_url,
          language: x.language,
          stars: x.stargazers_count,
          updatedAt: new Date(x.pushed_at ?? x.updated_at).toISOString(),
        })),
      recentActivity: events
        .map((e) => {
          const d = describeEvent(e);
          return d && { type: e.type, repo: e.repo?.name, ...d, createdAt: new Date(e.created_at).toISOString() };
        })
        .filter((x): x is NonNullable<typeof x> => Boolean(x))
        .slice(0, 10),
      contributions,
    };
    // If one source failed this time, keep its last good value instead of showing it empty.
    partial = repoResult.status === "rejected" || eventResult.status === "rejected" || !contributions;
    if (stale) {
      if (repoResult.status === "rejected") shaped.repos = stale.repos;
      if (eventResult.status === "rejected") shaped.recentActivity = stale.recentActivity;
    }
    return shaped;
  }

  r.get("/", async (_req, res) => {
    if (cache && now() - cache.at < TTL_MS) return res.json(cache.data);
    try {
      const data = await load();
      cache = { at: partial ? now() - TTL_MS + 5 * 60 * 1000 : now(), data };
    } catch (err) {
      console.error(err);
      if (cache) return res.json(cache.data); // serve stale rather than fail
      throw new HttpError(502, "github_unavailable", "GitHub data is unavailable right now");
    }
    res.set("Cache-Control", "public, max-age=300");
    res.json(cache.data);
  });

  return r;
}
