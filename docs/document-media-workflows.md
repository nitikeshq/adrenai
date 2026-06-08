# Document and Media Workflows

AdrenAI provides format-neutral planning and review for posters, structured
documents, spreadsheets, and presentations. Each category includes at least 20
reviewed strategies and a reference workflow with branding, accessibility,
validation, review, and export gates.

Planning produces a `DeliverablePlan`. Rendering is intentionally separate:
future adapters implement `DeliverableRenderAdapter` for DOCX, XLSX, PPTX, PDF,
or image output only after a plan is approved. This keeps workflow decisions
deterministic and usable before any file-format library is installed.
