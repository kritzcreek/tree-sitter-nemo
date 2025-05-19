package tree_sitter_nemo_test

import (
	"testing"

	tree_sitter "github.com/tree-sitter/go-tree-sitter"
	tree_sitter_nemo "github.com/kritzcreek/tree-sitter-nemo/bindings/go"
)

func TestCanLoadGrammar(t *testing.T) {
	language := tree_sitter.NewLanguage(tree_sitter_nemo.Language())
	if language == nil {
		t.Errorf("Error loading Nemo grammar")
	}
}
