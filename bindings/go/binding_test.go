package tree_sitter_kdl_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_kdl "github.com/tree-sitter-grammars/tree-sitter-kdl/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_kdl.Language())
	if language == nil {
		t.Errorf("Error loading KDL grammar")
	}
}
