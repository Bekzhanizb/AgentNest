# Changelog conventions

Use a human-readable changelog inspired by [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Record meaningful documentation changes during Planning without implying that a
product was released.

- Put unreleased work under `## [Unreleased]` in [CHANGELOG.md](../CHANGELOG.md).
- Group entries under Added, Changed, Deprecated, Removed, Fixed, or Security as
  needed; omit empty sections.
- Describe the user or contributor impact. Label architecture and roadmap work
  as proposals; distinguish documentation from implemented capabilities.
- Mention a related issue or PR when one exists; do not invent links or numbers.
- At an authorized release, move completed entries under
  `## [x.y.z] - YYYY-MM-DD` and add real tag comparison links.
- Use [Semantic Versioning](https://semver.org/spec/v2.0.0.html) once a public API
  exists. A product version or release date has not been selected yet.
- Merge related entries for clarity; do not copy every commit into the changelog.
- Security entries must respect coordinated disclosure and omit exploitable
  details until the owner and reporter agree to disclose them.
