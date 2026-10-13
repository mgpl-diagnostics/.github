# Contributing to MGPL Diagnostics

Thanks for helping. These rules apply to every repository in
[mgpl-diagnostics](https://github.com/mgpl-diagnostics) unless a repo says otherwise.

## The one rule: fork → branch → pull request

Nobody pushes to `main`, maintainers included. Every change, however small, arrives as a pull request
from a fork and is merged only after review and green CI.

```bash
# 1. Fork and clone (GitHub CLI)
gh repo fork mgpl-diagnostics/report-kit --clone
cd report-kit

# 2. Branch
git switch -c fix/lft-unit-wrap

# 3. Change, then run the checks the repo's AGENTS.md lists
npm install
npm run typecheck
npm run smoke            # report-kit / invoice-kit

# 4. Push to YOUR fork and open the PR against mgpl-diagnostics/<repo>:main
git push -u origin fix/lft-unit-wrap
gh pr create --fill
```

Keep your fork current with `gh repo sync` (or `git fetch upstream && git rebase upstream/main`).

## What `main` enforces

| Rule | Why |
| --- | --- |
| Pull request required | No direct pushes, no force-pushes, no branch deletion |
| 1 approving review from a code owner | Someone who knows the renderer signs off |
| New commits dismiss earlier approvals | What gets merged is what was reviewed |
| CI must pass (`ci`) | Typecheck, build and smoke tests on every PR |
| All conversations resolved | Nothing slips through |
| Squash merge only, linear history | One clean commit per PR |
| Release tags `v*` are maintainer-only | Tags publish packages |

Workflows from first-time and outside contributors wait for a maintainer's approval before they run.

## Before you open a PR

- **Open an issue first** for anything larger than a small fix, so we can agree on the approach.
- **PR title = commit message.** Use `type(scope): summary`, e.g. `feat(invoice-kit): add UPI reference field`.
  Types: `feat`, `fix`, `data`, `docs`, `refactor`, `test`, `chore`.
- **Visual changes need before/after screenshots** of the PDF or HTML.
- **HTTP contract changes** touch two repos: the kit and `client` (its `src/types.ts` mirrors the kits).
  Open both PRs and link them.
- **Test data** (reference ranges, units, prices) must cite a source in the PR.

## Privacy — non-negotiable

These repos are public. A PR is rejected, and its history may be rewritten, if it contains:

- real patient names, phone numbers, ages, IDs, or report/invoice PDFs from real patients;
- real signatures or stamps;
- secrets, tokens, or `.env` files.

Use the built-in samples or made-up data. Real signatures load at runtime from env vars
(`MGPL_SIGNATURE_*`) and never live in git.

## Licence of contributions

The code is **source-available, all rights reserved** (see each repo's `LICENSE`). You may fork on GitHub to
propose changes; that does not grant a licence to use the code elsewhere.

By opening a pull request you confirm the work is your own (or you have the right to submit it), and you
agree that MGPL Diagnostics may use, modify and distribute it under the repository's licence terms.

## Getting help

- Bugs and features: open an issue using the templates.
- Security problems: **don't** open an issue. See [SECURITY.md](SECURITY.md).
- Be kind: [Code of Conduct](CODE_OF_CONDUCT.md).
