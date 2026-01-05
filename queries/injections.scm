(node
  type: (type name: (identifier) @injection.language (#match? @injection.language "sql|json|bash"))
  (node_field 
    argument: (value 
      value: (identifier (string) @injection.content))))

[
  (single_line_comment)
  (multi_line_comment)
] @comment