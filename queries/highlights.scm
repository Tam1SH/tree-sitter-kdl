; --- Nodes ---
(node name: (identifier) @tag)
(type name: (_) @type)
(annotation_type) @type.builtin

; --- Properties & Arguments ---
(prop key: (identifier) @property)
(value value: (_) @variable.parameter)

; --- Literals ---
(string) @string
(string_fragment) @string
(escape) @string.escape
(number) @number
(boolean) @boolean
(keyword) @constant.builtin

; --- Punctuation ---
["{" "}"] @punctuation.bracket
["(" ")"] @punctuation.bracket
"=" @operator
";" @punctuation.delimiter

; --- Comments & Slashdash ---
(single_line_comment) @comment
(multi_line_comment) @comment

((node slashdash: (_)) @comment (#set! "priority" 105))
((node_field slashdash: (_)) @comment (#set! "priority" 105))

(slashdash) @comment.special