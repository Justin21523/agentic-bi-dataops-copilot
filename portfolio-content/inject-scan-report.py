#!/usr/bin/env python3
"""Add agentic-bi-dataops-copilot to the portfolio project-scan-report.json."""
import json
import sys
import os

HOME = os.path.expanduser('~')
SCAN_REPORT = next(
    path for path in (
        f'{HOME}/justin-portfolio/data/generated/project-scan-report.json',
        f'{HOME}/web-projects/justin-portfolio/data/generated/project-scan-report.json',
    )
    if os.path.exists(path)
)
MARKER = 'agentic-bi-dataops-copilot'

if not os.path.exists(SCAN_REPORT):
    print(f'ERROR: {SCAN_REPORT} not found', file=sys.stderr)
    sys.exit(1)

with open(SCAN_REPORT) as f:
    data = json.load(f)

# data may be a list or a dict with a projects key
projects = data if isinstance(data, list) else data.get('projects', data)

if any(p.get('name') == MARKER or p.get('folder') == MARKER for p in projects):
    print('Project already in scan report, skipping.')
    sys.exit(0)

entry = {
    "name": "agentic-bi-dataops-copilot",
    "folder": "agentic-bi-dataops-copilot",
    "path": next(
        path for path in (
            f"{HOME}/agentic-bi-dataops-copilot",
            f"{HOME}/web-projects/agentic-bi-dataops-copilot",
        )
        if os.path.exists(path)
    ),
    "type": "web-app",
    "hasReadme": True,
    "readmeContent": "Agentic BI / DataOps Copilot — Schema-aware Text2SQL with three-layer SQL safety validation on a DuckDB retail warehouse. FastAPI + React + TypeScript + Vite frontend with 14-page dashboard and 16-step Data Journey tour.",
    "detectedStack": ["Python", "FastAPI", "React", "TypeScript", "Vite", "DuckDB", "Playwright", "Docker"],
    "lastUpdate": "2026-06-25",
    "gitRemote": "https://github.com/Justin21523/agentic-bi-dataops-copilot.git",
    "gitBranch": "main",
    "gitLastCommitMessage": "feat: deploy as portfolio project",
    "canBuild": True,
    "canRun": True,
    "hasMedia": False,
    "needsManualReview": False,
    "suitability": "portfolio",
    "confidence": 0.95
}

if isinstance(data, list):
    data.append(entry)
else:
    projects.append(entry)

with open(SCAN_REPORT, 'w') as f:
    json.dump(data, f, indent=2, ensure_ascii=False)

print(f'Added {MARKER} to scan report ({len(projects)} total projects).')
