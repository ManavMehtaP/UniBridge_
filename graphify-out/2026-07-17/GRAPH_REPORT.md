# Graph Report - UniBridge_  (2026-07-17)

## Corpus Check
- 179 files · ~263,976 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 56 nodes · 52 edges · 8 communities (7 shown, 1 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8271f33c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- UniBridge Free-Tier Deployment Plan
- Confirmed Bugs
- UniBridge Frontend & Backend Changes for Faster Response
- Observability: verify every performance change
- Backend changes
- Frontend changes
- Secure deployment plan
- README.md

## God Nodes (most connected - your core abstractions)
1. `UniBridge Free-Tier Deployment Plan` - 12 edges
2. `Confirmed Bugs` - 9 edges
3. `UniBridge Frontend & Backend Changes for Faster Response` - 9 edges
4. `Observability: verify every performance change` - 8 edges
5. `Backend changes` - 6 edges
6. `Frontend changes` - 5 edges
7. `Verification plan` - 4 edges
8. `Secure deployment plan` - 3 edges
9. `P0 — Forged Access Tokens Grant Access` - 1 edges
10. `P0 — HOD and Faculty Login Tabs Do Not Enforce Their Roles` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Communities (8 total, 1 thin omitted)

### Community 0 - "UniBridge Free-Tier Deployment Plan"
Cohesion: 0.17
Nodes (11): Chosen zero-cost architecture, Cost: INR 0, with important exclusions, Database and Redis safety, Free services to use, Free-tier limits and upgrade triggers, Performance plan for 400 active users, Recommendation, Result-day operating checklist (+3 more)

### Community 1 - "Confirmed Bugs"
Cohesion: 0.20
Nodes (9): Confirmed Bugs, P0 — Forged Access Tokens Grant Access, P0 — HOD and Faculty Login Tabs Do Not Enforce Their Roles, P1 — Any Logged-In User Can Open Any Portal Route, P1 — Faculty Password Change Always Fails, P1 — Sessions Do Not Expire or Respect Deactivation, P2 — Forgot Password Is Not Implemented, P2 — Remember Me Does Nothing (+1 more)

### Community 2 - "UniBridge Frontend & Backend Changes for Faster Response"
Cohesion: 0.20
Nodes (9): API changes to add, Load tests before result release, Order of implementation, Performance measurements, Priority 0 — fix before performance testing, Single-university decision, UniBridge Frontend & Backend Changes for Faster Response, Verification plan (+1 more)

### Community 3 - "Observability: verify every performance change"
Cohesion: 0.25
Nodes (8): Alerts, Feature-use events to add after success only, Grafana dashboards to create, How to prove an optimization worked, Logs and traces, Metrics the Express API must expose, Observability: verify every performance change, Recommendation: self-host Prometheus + Grafana

### Community 4 - "Backend changes"
Cohesion: 0.33
Nodes (6): 1. Eliminate N+1 queries first, 2. Read only what the page needs, 3. Make writes bulk and idempotent, 4. Redis cache: small and explicit, 5. API process changes, Backend changes

### Community 5 - "Frontend changes"
Cohesion: 0.40
Nodes (5): 1. Make route loading smaller, 2. Improve React Query policy, 3. Reduce unnecessary browser requests, 4. Result-day frontend flow, Frontend changes

### Community 6 - "Secure deployment plan"
Cohesion: 0.67
Nodes (3): Before launch, GitHub Actions pipeline, Secure deployment plan

## Knowledge Gaps
- **44 isolated node(s):** `P0 — Forged Access Tokens Grant Access`, `P0 — HOD and Faculty Login Tabs Do Not Enforce Their Roles`, `P1 — Any Logged-In User Can Open Any Portal Route`, `P1 — Sessions Do Not Expire or Respect Deactivation`, `P1 — Faculty Password Change Always Fails` (+39 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `UniBridge Frontend & Backend Changes for Faster Response` connect `UniBridge Frontend & Backend Changes for Faster Response` to `Observability: verify every performance change`, `Backend changes`, `Frontend changes`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **Why does `Observability: verify every performance change` connect `Observability: verify every performance change` to `UniBridge Frontend & Backend Changes for Faster Response`?**
  _High betweenness centrality (0.113) - this node is a cross-community bridge._
- **Why does `Backend changes` connect `Backend changes` to `UniBridge Frontend & Backend Changes for Faster Response`?**
  _High betweenness centrality (0.084) - this node is a cross-community bridge._
- **What connects `P0 — Forged Access Tokens Grant Access`, `P0 — HOD and Faculty Login Tabs Do Not Enforce Their Roles`, `P1 — Any Logged-In User Can Open Any Portal Route` to the rest of the system?**
  _44 weakly-connected nodes found - possible documentation gaps or missing edges._