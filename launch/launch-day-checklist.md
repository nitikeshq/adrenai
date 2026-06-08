# Product Hunt Launch-Day Checklist

## Before launch

- [ ] Confirm the repository is public and has the intended license.
- [ ] Verify installation and quick-start commands from a clean environment.
- [ ] Run the complete test, type-check, catalog-validation, and security suite.
- [ ] Verify the current supported-agent list and generated paths.
- [ ] Ensure documentation distinguishes shipped and planned capabilities.
- [ ] Confirm no screenshots or examples expose secrets or private repositories.
- [ ] Prepare a short demo using a disposable repository.
- [ ] Prepare one screenshot showing inspection and one showing recommendations.
- [ ] Prepare one screenshot showing native multi-agent output preview.
- [ ] Review Product Hunt copy for unsupported claims.
- [ ] Assign one person to technical issues and one to launch replies.
- [ ] Define the primary feedback question and tracking location.

## Product Hunt submission

- [ ] Use the approved tagline and short description.
- [ ] Select accurate topics.
- [ ] Add the maker comment immediately after launch.
- [ ] Link directly to the repository and current documentation.
- [ ] State clearly that the release is an open-source public beta.
- [ ] Avoid feature-roadmap promises with dates.

## Launch-day operations

- [ ] Verify the live listing, links, images, and formatting.
- [ ] Respond to questions with specific, honest answers.
- [ ] Record bugs separately from feature requests.
- [ ] Ask users which repository and agent combination they tested.
- [ ] Ask whether they kept any generated guidance.
- [ ] Ask what prevented them from using `apply --write`.
- [ ] Publish known limitations when recurring confusion appears.
- [ ] Monitor dependency, security, and installation reports.
- [ ] Avoid pressuring communities or individuals for votes.

## Technical smoke checks

- [ ] Clean installation succeeds.
- [ ] Help output works.
- [ ] Inspection works on a repository with existing agent files.
- [ ] Recommendation works on a repository without agent files.
- [ ] Multi-agent preview works.
- [ ] Existing files are skipped during write.
- [ ] Drift detection reports a deliberately modified managed fixture.

## End of day

- [ ] Summarize usage, retained configurations, issues, and repeated requests.
- [ ] Prioritize bugs that block initial trust.
- [ ] Thank contributors and testers without overstating traction.
- [ ] Publish a transparent status update.
- [ ] Decide the next milestone from evidence, not vote count alone.

## Success signals

- Developers run AdrenAI on real repositories.
- Users keep at least part of the recommended configuration.
- Feedback identifies repeated, solvable configuration problems.
- Contributors can understand and improve packs or adapters.
- No user-authored files are accidentally overwritten.
