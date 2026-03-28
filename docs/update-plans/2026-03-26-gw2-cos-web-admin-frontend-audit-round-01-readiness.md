# GW2 COS Web Admin Frontend Audit - Round 01

Date: 2026-03-26
Scope: `Readiness / Optimization Entry`
Status: Completed

## Goal

Determine whether `gw2_cos_web_admin` is ready to enter frontend optimization work, and identify the first blocking issue if it is not.

## Current State

`gw2_cos_web` has already reached a stable current-phase baseline:

1. `lint`
2. `typecheck`
3. `test`
4. `build`

all pass under the current `pnpm` workflow.

`gw2_cos_web_admin` is not yet at that stage. The first blocker is not UI quality or architecture drift. It is a broken local dependency tree.

## Inspection Evidence

### Package Scripts

`gw2_cos_web_admin/package.json` currently exposes:

1. `pnpm lint`
2. `pnpm build`

This is sufficient to start optimization only if the local install is healthy.

### Validation Result

`pnpm.cmd lint` fails with:

1. missing `node_modules/eslint/bin/eslint.js`

`pnpm.cmd build` fails with:

1. missing `node_modules/typescript/bin/tsc`

### Root Cause

The package's `node_modules` entries are Windows junctions pointing at an old external path:

1. `D:\project\AI\react\gw2_cos_web_admin\...`

Representative broken entries include:

1. `node_modules/eslint`
2. `node_modules/typescript`
3. `node_modules/antd`
4. `node_modules/react`
5. `node_modules/vite`

That means the current admin workspace is not using a self-consistent local dependency graph.

## Decision

Do not start substantive `gw2_cos_web_admin` UI optimization yet.

The correct next step is to repair the package install first, then re-run baseline validation. Until that is clean, any frontend optimization work would be operating without a trustworthy lint/build loop.

## Recommended Next Step

### Batch A0: Admin Tooling Repair

1. remove the broken `node_modules`
2. reinstall dependencies with `pnpm`
3. re-run `pnpm lint`
4. re-run `pnpm build`
5. record the clean baseline before starting UI or interaction improvements

## What This Batch Changed

1. No runtime code changed.
2. No dependencies changed.
3. No admin UI optimization started yet.
4. The project entry condition is now documented.

## Outcome

`gw2_cos_web` is already in a stable enough state to pause and switch focus. `gw2_cos_web_admin` can be optimized next, but only after one tooling-repair batch restores a valid local `pnpm` install.
