(node
  name: (identifier) @name
  (#set! "kind" "class")) @definition.class

(prop
  key: (identifier) @name
  (#set! "kind" "property")) @definition.property

(type
  name: (_) @name
  (#set! "kind" "type")) @definition.type