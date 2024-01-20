# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/) and this
project adheres to [Semantic Versioning](http://semver.org/).

## [0.2.2] - 2024-01-20
### Fixed
- Check for the exists of globalThis.caches before using it [#2]

## [0.2.1] - 2023-09-12
### Added
- Support for Pleroma [#1].

### Changed
- Don't empty the component content if there're no comments.

## [0.2.0] - 2023-08-15
### Added
- `cache` attribute.
- Offline support.
- Mark the comments by the post author.

### Changed
- Filter out messages if the `visibility` is not `public`.
- Removed the modern-normalize import from the default styles.
- Empty the component before rendering.

## [0.1.0] - 2023-08-01
First version

[#1]: https://github.com/oom-components/mastodon-comments/issues/1
[#2]: https://github.com/oom-components/mastodon-comments/issues/2

[0.2.2]: https://github.com/oom-components/mastodon-comments/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/oom-components/mastodon-comments/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/oom-components/mastodon-comments/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/oom-components/mastodon-comments/releases/tag/v0.1.0
