# Changelog

## [2.0.0] - 2026-01-05

### ⚠️ BREAKING CHANGES
* **AST Structure**: Total rewrite of the grammar. The resulting AST is now more structured and uses named fields.
* **Nodes**: Bare identifiers and strings are now wrapped in an `identifier` node for consistency.
* **Fields**: Most structural elements (name, type, property, argument, children) are now accessible via named fields.

### Added
* **KDL 2.0 Support**: Full implementation of the KDL 2.0 specification.
* **Reserved Type Annotations**: Added support for `i128`, `u128`, and updated string-based types like `irl-reference`.
* **LSP Optimizations**: Improved error recovery in node blocks, allowing the parser to "see" nodes that are still being typed.
* **Semantic Fields**: Added `field` annotations throughout the grammar to simplify building LSP servers and compilers.

## [1.1.0](https://github.com/amaanq/tree-sitter-kdl/compare/v1.0.3...v1.1.0) (2023-05-13)

### Features

* add release action ([245f6e0](https://github.com/amaanq/tree-sitter-kdl/commit/245f6e0ba4f7a5c81ca0e1075dfc875ff9f4edd0))


### Bug Fixes

* add lint script to package.json ([e36f054](https://github.com/amaanq/tree-sitter-kdl/commit/e36f054a60c4d9e5ae29567d439fdb8790b53b30))
* rename EOF to _EOF to avoid conflicts with stdio.h ([d118f93](https://github.com/amaanq/tree-sitter-kdl/commit/d118f9376ef4f0461975289302fe74a28f073876))
