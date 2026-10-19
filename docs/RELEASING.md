# Releasing

hudline ships two things from one repo: the npm package (root `package.json`)
and the pixel-hud mod (`plugins/pixel-hud/.claude-plugin/plugin.json`). Tags
and GitHub Releases follow the npm version only; pixel-hud has no tag of its
own.

## Versions

- A change to `plugins/pixel-hud/` bumps `plugin.json` in the same PR, as its
  own commit `chore(pixel-hud): release A.B.C`. That bump is the whole
  pixel-hud release: users get it through `claude plugin update` once it is on
  `main`. It needs no tag or npm release (0.5.1 and 0.6.1 shipped that way).
- An npm release bumps root `package.json` and gets a `vX.Y.Z` tag and GitHub
  Release. Cut one when the status line or the README changes (npm shows the
  README), or to announce pixel-hud versions; its notes cover every pixel-hud
  version since the last tag.

## Steps

1. On an up-to-date `main`, run `npm run check`, the release gate.
2. Bump `package.json` and commit straight to `main` as
   `chore: release X.Y.Z, pixel-hud A.B.C` (drop the pixel-hud part when
   `plugin.json` did not change since the last tag). `main` has no branch
   protection; push the commit.
3. Tag that commit with an annotated tag and push it:
   `git tag -a vX.Y.Z -m "Release X.Y.Z" && git push origin vX.Y.Z`.
   v0.8.4 is a lightweight tag on a merge commit; follow v0.8.5 instead.
4. Create the GitHub Release on the tag:
   `gh release create vX.Y.Z --title "..." --notes-file notes.md`.
   Title: `X.Y.Z: <one-line headline>`.
   Body, following v0.8.5 (`gh release view v0.8.5`):
   - `## pixel-hud A.B.C: <headline>` when the mod changed, with the demo GIF
     linked at the tag (`raw.githubusercontent.com/huijoson/hudline/vX.Y.Z/...`,
     so the image stays true to that release), then one bold-led bullet per
     user-visible change, then the update line:
     `claude plugin update pixel-hud@hudline`, then `/reload-plugins`.
   - A line on the status line itself: its changes, or
     "The hudline status line (npm X.Y.Z) has no code changes."
   - Optional `## Docs` bullets for README or showcase changes (v0.8.4).
   - The `🤖 Generated with [Claude Code](https://claude.com/claude-code)` line last.
5. Hand `npm publish` to the user: it needs their npm login. Confirm with
   `npm view hudline version` afterwards.
