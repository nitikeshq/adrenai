import { writeFileSync } from "node:fs";

const groups = {
  "technical-seo": [
    ["crawl-budget", "Crawl Budget Review"], ["robots-policy", "Robots Policy"], ["xml-sitemaps", "XML Sitemaps"],
    ["canonical-urls", "Canonical URLs"], ["redirect-hygiene", "Redirect Hygiene"], ["status-code-review", "Status Code Review"],
    ["structured-data", "Structured Data"], ["indexation-review", "Indexation Review"], ["internal-link-graph", "Internal Link Graph"],
    ["core-web-vitals", "Core Web Vitals"], ["mobile-rendering", "Mobile Rendering"], ["javascript-rendering", "JavaScript Rendering"],
    ["international-targeting", "International Targeting"], ["pagination-discovery", "Pagination Discovery"], ["duplicate-control", "Duplicate Control"],
    ["url-taxonomy", "URL Taxonomy"], ["log-file-analysis", "Log File Analysis"], ["site-migration-plan", "Site Migration Plan"],
    ["technical-seo-monitoring", "Technical SEO Monitoring"], ["technical-seo-acceptance", "Technical SEO Acceptance"],
  ],
  "content-seo": [
    ["search-intent", "Search Intent"], ["topic-clusters", "Topic Clusters"], ["keyword-mapping", "Keyword Mapping"],
    ["content-gap-review", "Content Gap Review"], ["serp-evidence", "SERP Evidence"], ["audience-problems", "Audience Problems"],
    ["editorial-brief", "Editorial Brief"], ["answer-first-structure", "Answer-First Structure"], ["heading-hierarchy", "Heading Hierarchy"],
    ["descriptive-metadata", "Descriptive Metadata"], ["internal-link-plan", "Internal Link Plan"], ["source-citations", "Source Citations"],
    ["claim-verification", "Claim Verification"], ["original-contribution", "Original Contribution"], ["content-accessibility", "Content Accessibility"],
    ["content-refresh", "Content Refresh"], ["content-consolidation", "Content Consolidation"], ["content-pruning", "Content Pruning"],
    ["search-performance-measurement", "Search Performance Measurement"], ["content-seo-review", "Content SEO Review"],
  ],
  "long-form-writing": [
    ["reader-promise", "Reader Promise"], ["research-question", "Research Question"], ["source-ledger", "Source Ledger"],
    ["audience-definition", "Audience Definition"], ["argument-map", "Argument Map"], ["chapter-outline", "Chapter Outline"],
    ["narrative-arc", "Narrative Arc"], ["example-plan", "Example Plan"], ["drafting-sprints", "Drafting Sprints"],
    ["voice-guide", "Voice Guide"], ["terminology-guide", "Terminology Guide"], ["developmental-edit", "Developmental Edit"],
    ["structural-edit", "Structural Edit"], ["line-edit", "Line Edit"], ["copy-edit", "Copy Edit"],
    ["fact-check", "Fact Check"], ["citation-audit", "Citation Audit"], ["originality-review", "Originality Review"],
    ["accessible-language", "Accessible Language"], ["publication-readiness", "Publication Readiness"],
  ],
  "email-marketing": [
    ["permission-first-list", "Permission-First List"], ["audience-segmentation", "Audience Segmentation"], ["campaign-objective", "Campaign Objective"],
    ["value-proposition", "Value Proposition"], ["subject-line-review", "Subject Line Review"], ["preview-text", "Preview Text"],
    ["single-primary-action", "Single Primary Action"], ["responsive-email", "Responsive Email"], ["plain-text-alternative", "Plain-Text Alternative"],
    ["email-accessibility", "Email Accessibility"], ["personalization-boundaries", "Personalization Boundaries"], ["privacy-minimization", "Privacy Minimization"],
    ["unsubscribe-path", "Unsubscribe Path"], ["sender-identity", "Sender Identity"], ["claims-and-offers", "Claims and Offers"],
    ["deliverability-review", "Deliverability Review"], ["frequency-governance", "Frequency Governance"], ["experiment-design", "Experiment Design"],
    ["campaign-measurement", "Campaign Measurement"], ["campaign-retrospective", "Campaign Retrospective"],
  ],
};

const categoryDescriptions = {
  "technical-seo": "Strategies for discoverability, rendering, indexation, performance, and technical search quality.",
  "content-seo": "Strategies for useful, original, accessible, evidence-backed content aligned with search intent.",
  "long-form-writing": "Strategies for researching, drafting, editing, and publishing books and other long-form work.",
  "email-marketing": "Strategies for permission-based, accessible, privacy-conscious, measurable email campaigns.",
};

const strategies = Object.entries(groups).flatMap(([category, entries]) =>
  entries.map(([id, title]) => ({
    id: `content/${id}`,
    version: "1.0.0",
    title,
    description: `Apply ${title.toLowerCase()} as an explicit, reviewable part of the ${category.replaceAll("-", " ")} process.`,
    categoryId: `content/${category}`,
    capabilityIds: [`content/${category}-delivery`],
    constraintIds: ["content/original-evidence-backed-work"],
    deliverableIds: [`content/${category}-deliverable`],
    audienceIds: [],
    prerequisites: [],
    conflicts: [],
    compatibleWith: [],
    evidence: [{ source: "adrenai-reviewed-content-rationale", summary: `Use ${title.toLowerCase()} when its documented purpose and review gate apply.` }],
    maturity: "stable",
    license: "Apache-2.0",
    risk: ["claims-and-offers", "personalization-boundaries", "site-migration-plan"].includes(id) ? "high" : "low",
  })),
);

const catalog = {
  schemaVersion: 1,
  namespace: "content",
  categories: Object.entries(categoryDescriptions).map(([id, description]) => ({
    id: `content/${id}`, version: "1.0.0", title: id.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" "), description,
  })),
  capabilities: Object.keys(groups).map((id) => ({
    id: `content/${id}-delivery`, version: "1.0.0", title: `${id.replaceAll("-", " ")} delivery`, description: `Plan and deliver reviewable ${id.replaceAll("-", " ")} work.`,
  })),
  constraints: [{
    id: "content/original-evidence-backed-work", version: "1.0.0", title: "Original Evidence-Backed Work",
    description: "Require original work, attributable sources, verified claims, accessibility, privacy, and applicable compliance.",
  }],
  deliverables: Object.keys(groups).map((id) => ({
    id: `content/${id}-deliverable`, version: "1.0.0", title: `${id.replaceAll("-", " ")} deliverable`, description: `A reviewed ${id.replaceAll("-", " ")} deliverable with recorded evidence.`,
  })),
  audiences: [],
  strategies,
};

writeFileSync(new URL("../catalog/taxonomies/content-marketing.json", import.meta.url), `${JSON.stringify(catalog, null, 2)}\n`);
