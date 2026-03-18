# Electron Packaging Plan

## Overview
The goal is to transition the Next.js application to Electron, package it for distribution, configure GitHub Actions to publish releases to GitHub, and implement an auto-update mechanism.

## Project Type
WEB (packaged as Desktop application)

## Success Criteria
- The Next.js application runs successfully inside an Electron window via a static export.
- The `electron-builder` is configured to build Windows (`.exe`) installers.
- GitHub Actions workflow automatically builds and creates a GitHub Release when a tag is pushed.
- The `electron-updater` package is implemented to notify users or automatically download and install updates from GitHub Releases.

## Tech Stack
- **Electron**: Core framework for generating the desktop app.
- **electron-builder**: For packaging the app into installable format (`.exe`) and integrating with GitHub Releases.
- **electron-updater**: For seamless auto-update functionality tied to GitHub Releases.
- **Next.js (Static Export)**: Building the Next.js app as a static bundle to be loaded by Electron.

## File Structure (Proposed)
```text
├── main/
│   ├── main.js         # Electron main process entry point
│   ├── preload.js      # Preload script for secure IPC communication
├── package.json        # Updated with 'main' field and 'electron-builder' config
├── electron-builder.yml # Configuration for packaging and publishing
├── .github/workflows/
│   └── electron-release.yml # GitHub Actions workflow for building and publishing
```

## Task Breakdown
1. **[X] Task 1: Analysis and Socratic Gate**
   - Agent: `project-planner`
   - INPUT: User request for Electron plan
   - OUTPUT: `electron-packaging.md` and Socratic questions
   - VERIFY: User clears the gate.

2. **[ ] Task 2: Setup Electron & Next.js Integration**
   - Agent: `frontend-specialist`
   - Skills: `clean-code`
   - Priority: P1
   - Dependencies: None
   - INPUT: Install `electron`, `electron-builder`, `electron-updater`. Create `main/main.js` and `main/preload.js`. Update `package.json` scripts.
   - OUTPUT: Functional local Electron dev environment.
   - VERIFY: Running `npm run dev:electron` opens the app in Electron.

3. **[ ] Task 3: Configure Electron Builder**
   - Agent: `devops-engineer`
   - Skills: `deployment-procedures`
   - Priority: P1
   - Dependencies: Task 2
   - INPUT: Create `electron-builder.yml` with publish configurations.
   - OUTPUT: Configuration ready for packaging.
   - VERIFY: Running `npx electron-builder --dir` works locally.

4. **[ ] Task 4: Auto Update Implementation**
   - Agent: `frontend-specialist`
   - Skills: `clean-code`
   - Priority: P1
   - Dependencies: Task 2, Task 3
   - INPUT: Add `autoUpdater.checkForUpdatesAndNotify()` in `main/main.js`.
   - OUTPUT: Auto-updater logic integrated.
   - VERIFY: Executable checks for new releases on startup.

5. **[ ] Task 5: GitHub Actions Release Workflow**
   - Agent: `devops-engineer`
   - Skills: `deployment-procedures`
   - Priority: P2
   - Dependencies: Task 3
   - INPUT: Create `.github/workflows/electron-release.yml`.
   - OUTPUT: CI/CD pipeline file.
   - VERIFY: Triggering workflow posts a Release on GitHub.

6. **[ ] Task 6: Tauri Cleanup**
   - Agent: `orchestrator`
   - Skills: `clean-code`
   - Priority: P3
   - Dependencies: Task 2
   - INPUT: Remove `src-tauri` and Tauri dependencies.
   - OUTPUT: Cleaner repository.
   - VERIFY: No Tauri references remain.

## Phase X: Verification
- [ ] Lint: Pass
- [ ] Build: Success
- [ ] Auto-update: Successfully downloads new release when version bumped.
