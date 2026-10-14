// Applies the org's repository rules to every repo (or the ones named), idempotently.
//
//   node scripts/protect-repos.mjs              # all repos in the org
//   node scripts/protect-repos.mjs report-kit   # just these
//   node scripts/protect-repos.mjs --dry-run    # print what would be sent
//
// Needs the GitHub CLI logged in as an org owner (scopes: repo). On the Free plan GitHub enforces
// rulesets only on PUBLIC repos, so private repos are skipped with a warning.
//
// What it sets (see .github/CONTRIBUTING.md for the contributor-facing version):
//   • ruleset "main": PR required (1 code-owner approval, stale approvals dismissed, last push approved,
//     threads resolved, squash only), CI check "ci" required where the repo has CI, linear history,
//     no force-push, no deletion. Org admins may only bypass THROUGH a pull request, so nobody can
//     push to main directly.
//   • ruleset "release tags": only org admins create, move or delete v* tags (tags publish packages).
//   • repo settings: squash merge only, PR title as commit, delete branches on merge, no wiki.
//   • private vulnerability reporting on; workflows default to read-only tokens; workflows from
//     every outside contributor wait for approval.
// Contributors without write access must fork; the org's base permission is "read", so that
// includes org members.
import { execFileSync } from "node:child_process";

const ORG = "mgpl-diagnostics";
const DRY = process.argv.includes("--dry-run");
const only = process.argv.slice(2).filter((a) => !a.startsWith("--"));

// Required status checks per repo (job ids in .github/workflows/ci.yml). Repos without CI get none.
const CHECKS = {
  "report-kit": ["ci"], "invoice-kit": ["ci"], client: ["ci"], "report-studio": ["ci"],
  "catalog-kit": ["ci"], "db-kit": ["ci"], "auth-kit": ["ci"], "finance-kit": ["ci"], "tally-kit": ["ci"],
};
const GITHUB_ACTIONS_APP_ID = 15368;

function gh(args, body) {
  if (DRY && body !== undefined) {
    console.log(`  [dry-run] gh ${args.join(" ")}\n${JSON.stringify(body, null, 2).replace(/^/gm, "    ")}`);
    return null;
  }
  const out = execFileSync("gh", ["api", ...args, ...(body !== undefined ? ["--input", "-"] : [])], {
    input: body !== undefined ? JSON.stringify(body) : undefined,
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
  });
  return out.trim() ? JSON.parse(out) : null;
}
function step(label, fn) {
  try {
    fn();
    console.log(`  ✓ ${label}`);
  } catch (e) {
    console.log(`  ✗ ${label}: ${(e.stderr || e.message).toString().trim().split("\n")[0]}`);
    process.exitCode = 1;
  }
}

function mainRuleset(repo) {
  const checks = CHECKS[repo] ?? [];
  return {
    name: "main",
    target: "branch",
    enforcement: "active",
    conditions: { ref_name: { include: ["~DEFAULT_BRANCH"], exclude: [] } },
    bypass_actors: [{ actor_type: "OrganizationAdmin", actor_id: 1, bypass_mode: "pull_request" }],
    rules: [
      { type: "deletion" },
      { type: "non_fast_forward" },
      { type: "required_linear_history" },
      {
        type: "pull_request",
        parameters: {
          required_approving_review_count: 1,
          dismiss_stale_reviews_on_push: true,
          require_code_owner_review: true,
          require_last_push_approval: true,
          required_review_thread_resolution: true,
          allowed_merge_methods: ["squash"],
        },
      },
      ...(checks.length
        ? [{
            type: "required_status_checks",
            parameters: {
              strict_required_status_checks_policy: true,
              required_status_checks: checks.map((context) => ({ context, integration_id: GITHUB_ACTIONS_APP_ID })),
            },
          }]
        : []),
    ],
  };
}
const tagRuleset = {
  name: "release tags",
  target: "tag",
  enforcement: "active",
  conditions: { ref_name: { include: ["refs/tags/v*"], exclude: [] } },
  bypass_actors: [{ actor_type: "OrganizationAdmin", actor_id: 1, bypass_mode: "always" }],
  rules: [{ type: "creation" }, { type: "update" }, { type: "deletion" }, { type: "non_fast_forward" }],
};

function upsertRuleset(repo, rs) {
  const existing = DRY ? [] : gh([`repos/${ORG}/${repo}/rulesets`]) ?? [];
  const found = existing.find((r) => r.name === rs.name && r.source_type === "Repository");
  if (found) gh(["-X", "PUT", `repos/${ORG}/${repo}/rulesets/${found.id}`], rs);
  else gh(["-X", "POST", `repos/${ORG}/${repo}/rulesets`], rs);
}

const repos = gh(["--paginate", `orgs/${ORG}/repos?per_page=100`]).filter((r) => !r.archived);
for (const r of repos) {
  if (only.length && !only.includes(r.name)) continue;
  console.log(`\n${r.name} (${r.visibility}, ${r.default_branch})`);
  if (r.visibility !== "public") {
    console.log("  – skipped: rulesets on private repos need a paid plan. Make it public, then re-run.");
    continue;
  }
  step("merge settings", () =>
    gh(["-X", "PATCH", `repos/${ORG}/${r.name}`], {
      allow_squash_merge: true,
      allow_merge_commit: false,
      allow_rebase_merge: false,
      squash_merge_commit_title: "PR_TITLE",
      squash_merge_commit_message: "PR_BODY",
      delete_branch_on_merge: true,
      allow_update_branch: true,
      has_wiki: false,
    }));
  step(`ruleset "main"${CHECKS[r.name] ? ` (checks: ${CHECKS[r.name].join(", ")})` : ""}`, () => upsertRuleset(r.name, mainRuleset(r.name)));
  step('ruleset "release tags"', () => upsertRuleset(r.name, tagRuleset));
  step("private vulnerability reporting", () => gh(["-X", "PUT", `repos/${ORG}/${r.name}/private-vulnerability-reporting`], {}));
  step("workflow token read-only", () =>
    gh(["-X", "PUT", `repos/${ORG}/${r.name}/actions/permissions/workflow`], {
      default_workflow_permissions: "read",
      can_approve_pull_request_reviews: false,
    }));
  step("approve workflows from all outside contributors", () =>
    gh(["-X", "PUT", `repos/${ORG}/${r.name}/actions/permissions/fork-pr-contributor-approval`], {
      approval_policy: "all_external_contributors",
    }));
}
