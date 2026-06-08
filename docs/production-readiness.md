# Production Readiness

This document defines the conditions for calling AdrenAI production-ready. A
percentage alone is not a sufficient release decision.

## Required capabilities

- Stable, versioned configuration and JSON output schemas
- Safe update and merge behavior for managed files
- Lockfile-based pack resolution and reproducibility
- Tested adapters for all advertised agents
- Deterministic checks with explicit execution permissions
- Provenance-tracked trusted built-in packs; remote registries remain out of MVP scope
- Cross-platform CI and installation tests
- Complete packaging, migration, and rollback procedures
- Security review and private vulnerability reporting
- Performance testing on large repositories

## Release gates

Production readiness requires all of the following:

1. No known critical or high-severity security defects.
2. All supported-platform tests pass.
3. Existing user-authored files cannot be silently replaced.
4. Generated configuration can be reproduced and audited.
5. Catalog and adapter compatibility are covered by tests.
6. Failure states return actionable diagnostics and non-zero exits where needed.
7. Documentation accurately distinguishes implemented and planned behavior.

## Current MVP status

**Status: production-ready MVP implementation complete.**

The MVP implements local inspection, deterministic recommendations, strict
declarative built-in packs, native agent generation, create-only apply, safe
managed synchronization, pack locking, instruction diagnostics, drift
detection, configuration validation, approved quality gates, bundled npm
packaging, cross-platform CI, and bundled-CLI smoke tests.

Remote pack registries, arbitrary executable community plugins, hosted
services, and AI-provider integrations are intentionally outside the production
MVP scope.

The final local release gate passed on June 8, 2026. The configured GitHub
Actions matrix must pass on Windows, macOS, and Linux before publishing each
release.

## Automated production gates

`corepack pnpm release:check` enforces dependency audit, secret scan,
type-checking, automated tests, production bundling, release metadata
validation, bundled-CLI end-to-end smoke testing, large-repository performance
smoke testing, and npm package-content validation.
