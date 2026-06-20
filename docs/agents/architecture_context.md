# System Architecture Context: Archive Management Dashboard

## Core Domain Logic

This system does NOT host digital files (PDFs, images). It is a **Tracking and Workflow System** for PHYSICAL paper archives (Expedientes).
The goal is to automate the manual administrative work of an Archive Manager.

- **The Physical World:** The actual paper folder is physically handed to a colleague.
- **The Digital System:** Replaces the need to print confirmation papers. Colleagues log into this dashboard to digitally sign off, process, and confirm receipt of the physical file.

## Technical Stack

- **Framework:** Next.js (App Router)
- **Frontend:** React, Tailwind CSS, TypeScript
- **Backend:** Next.js Route Handlers (`app/api/*`)
- **Database:** MySQL (Local Dockerized instance)
- **Migrations:** Raw SQL files located in `db/migrations/`

## Project Structure Rules

- `/app`: Contains all frontend UI and server-side routing.
- `/app/api`: Contains all backend REST endpoints (e.g., `/api/auth`, `/api/expedientes`).
- `/db/migrations`: Contains sequential SQL files for schema changes.
- `/lib`: Contains shared utilities, database connections (`db.ts`), and authentication (`auth.ts`).

## Feature Roadmap & State Management

### Version 1: Workflow Automation (Current Focus)

- Eliminate printed paperwork.
- Provide a digital interface for partners/colleagues to process the _expediente_ after receiving the physical copy.

### Version 2: Chain of Custody & Status Tracking (Upcoming)

- Implement a strict State Machine for the physical location of an _expediente_.
- **Problem to solve:** The Archive Manager currently loses visibility of a file once it leaves the archive.
- **Solution:** The system must track who currently holds the physical file. Example states: `IN_ARCHIVE`, `CHECKED_OUT`, `WITH_PARTNER`, `RETURNED`.
- Database schemas must be designed with this V2 tracking in mind, likely requiring an audit log or a `file_transfers` relational table.

## Version Control & Workflow

We strictly follow **GitHub Flow**.

1. **Branching:** All new features or fixes must be developed on a dedicated feature branch, never directly on `main`.
2. **Commits:** You must use Conventional Commits format for all commit messages (e.g., `feat: add expediente state tracking`, `fix: resolve connection pool exhaustion`, `chore: update dependencies`, `refactor: extract file card component`).
3. **Atomic Changes:** Keep commits small, logical, and atomic. Do not mix unrelated refactors with feature development in the same commit.

## Engineering Philosophy

Prioritize execution, system thinking, and long-term maintainability. Solutions must be scalable, heavily typed, and strictly follow the established directory structure. Do not build features outside of the stated V1 and V2 scopes.
