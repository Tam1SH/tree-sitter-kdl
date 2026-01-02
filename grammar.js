/**
 * @file KDL grammar for tree-sitter
 * @author Amaan Qureshi <amaanq12@gmail.com> (Original)
 * @license MIT
 * @see {@link https://kdl.dev|official website}
 * @see {@link https://github.com/kdl-org/kdl/blob/main/SPEC.md|official syntax spec}
 */

// deno-lint-ignore-file no-control-regex
/* eslint-disable arrow-parens */
/* eslint-disable camelcase */
/* eslint-disable-next-line spaced-comment */
/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

const ANNOTATION_BUILTINS = [
  'i8', 'i16', 'i32', 'i64', 'u8', 'u16', 'u32', 'u64',
  'isize', 'usize', 'f32', 'f64', 'decimal64', 'decimal128',
  'date-time', 'time', 'date', 'duration', 'decimal', 'currency',
  'country-2', 'country-3', 'country-subdivision', 'email',
  'idn-email', 'hostname', 'idn-hostname', 'ipv4', 'ipv6',
  'url', 'url-reference', 'irl', 'iri-reference', 'url-template',
  'uuid', 'regex', 'base64',
];

const UNICODE_SPACES_RANGE = '\u0009\u0020\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000';

const NEWLINE_RANGE = '\r\n\u0085\u000C\u2028\u2029';
const DISALLOWED_CHARS = '\\\\/(){};\\[\\]"=#';

// Base for all identifier characters (Unicode - Space - Newline - Disallowed)
const ID_CHAR = `[^${UNICODE_SPACES_RANGE}${NEWLINE_RANGE}${DISALLOWED_CHARS}]`;
// Start of unambiguous-ident (ID_CHAR minus digit, sign, and dot)
const UNAMBIG_START = `[^${UNICODE_SPACES_RANGE}${NEWLINE_RANGE}${DISALLOWED_CHARS}0-9.+\\-]`;
// Start after a sign (ID_CHAR minus digit and dot)
const SIGNED_START = `[^${UNICODE_SPACES_RANGE}${NEWLINE_RANGE}${DISALLOWED_CHARS}0-9.]`;
// Start after a dot (ID_CHAR minus digit)
const DOTTED_START = `[^${UNICODE_SPACES_RANGE}${NEWLINE_RANGE}${DISALLOWED_CHARS}0-9]`;


module.exports = grammar({
  name: 'kdl',

  conflicts: $ => [
    [$.document],
    [$.document, $._ws],
    [$.version, $._ws],
    [$._node_space],
    [$.node],
    [$._base_node],
    [$.node_children],
    [$.identifier, $.value],
    [$._node_space, $._linespace],
    [$.value],
  ],

  externals: $ => [
    $._eof,
    $.multi_line_comment,
    $._raw_string,
  ],

  extras: $ => [$.multi_line_comment],

  word: $ => $._bare_identifier,

  rules: {
    // document := bom? version? nodes
    document: $ => seq(
      optional($._bom),
      repeat($._linespace),
      optional(seq(
        $.version,
        repeat($._linespace),
      )),
      optional($._nodes),
      repeat($._linespace),
    ),
    // version := '/-' unicode-space* 'kdl-version' unicode-space+ ('1' | '2') unicode-space* newline
    version: $ => seq(
      '/-',
      repeat($._unicode_space),
      'kdl-version',
      repeat1($._unicode_space),
      choice('1', '2'),
      repeat($._unicode_space),
      $._newline,
    ),

    // base-node := slashdash? type? node-space* string (args/props)* children?
    _base_node: $ => seq(
      alias(optional(seq('/-', repeat($._node_space))), $.node_comment),
      optional($.type),
      repeat($._node_space),
      $.identifier,
      repeat(prec(1, seq(repeat1($._node_space), $.node_field))),
      optional(prec(1, seq(
        repeat1($._node_space),
        field('children', $.node_children),
      ))),
    ),

    // node := base-node node-terminator
    node: $ => seq(
      repeat($._linespace),
      $._base_node,
      optional($._node_terminator),
    ),

    // nodes := (line-space* node)* line-space*
    _nodes: $ => repeat1($.node),

    // node-children := slashdash? '{' nodes? '}'
    node_children: $ => seq(
      optional(seq(alias('/-', $.node_children_comment), repeat($._node_space))),
      '{',
      repeat($._linespace),
      optional($._nodes),
      repeat($._linespace),
      '}',
    ),

    // node-space := ws* escline ws* | ws+
    _node_space: $ => choice(
      seq(repeat($._ws), $._escline, repeat($._ws)),
      repeat1($._ws),
    ),

    // node-terminator := single-line-comment | newline | ';' | eof
    _node_terminator: $ => choice($.single_line_comment, $._newline, ';', $._eof),

    // identifier := string | bare-identifier
    identifier: $ => choice(
      $._bare_identifier,
      $.string,
    ),

    _bare_identifier: $ => token(prec(-1, choice(
      // 1. unambiguous-ident
      seq(new RegExp(UNAMBIG_START), repeat(new RegExp(ID_CHAR))),

      // 2. signed-ident: +foo, -bar, +, -
      seq(/[+\-]/, optional(seq(new RegExp(SIGNED_START), repeat(new RegExp(ID_CHAR))))),

      // 3. dotted-ident: .foo, +., -.
      seq(
        optional(/[+\-]/),
        '.',
        optional(seq(new RegExp(DOTTED_START), repeat(new RegExp(ID_CHAR)))),
      ),
    ))),

    // keyword := boolean | '#null' | keyword-number
    keyword: $ => prec(10, choice(
      $.boolean,
      token('#null'),
      token(/#(inf|-inf|nan)/),
    )),

    boolean: $ => choice('#true', '#false'),

    annotation_type: _ => choice(...ANNOTATION_BUILTINS),

    // node-prop-or-arg := slashdash? (prop | value)
    node_field: $ => choice($._node_field_comment, $._node_field),


    _node_field_comment: $ => alias(seq('/-', repeat($._node_space), $._node_field), $.node_field_comment),

    _node_field: $ => choice($.prop, $.value),

    // prop := string node-space* '=' node-space* value
    prop: $ => seq(
      $.identifier,
      repeat($._node_space), // node-space*
      '=',
      repeat($._node_space), // node-space*
      $.value,
    ),

    // value := type? (string | number | keyword)
    value: $ => seq(
      optional($.type),
      repeat($._node_space),
      choice(choice($._bare_identifier, $.string), $.number, $.keyword),
    ),

    // type := '(' string ')'
    type: $ => seq(
      '(',
      repeat($._node_space),
      choice($.identifier, $.annotation_type),
      repeat($._node_space),
      ')',
    ),

    string: $ => choice(
      $._quoted_string,
      $._raw_string,
      $._multiline_string,
    ),

    // quoted-string := '"' characters* '"'
    _quoted_string: $ => seq(
      '"',
      repeat(choice(
        alias(token.immediate(prec(1, /[^\\"\n]+/)), $.string_fragment),
        $.escape,
      )),
      '"',
    ),

    // multiline-string := '"""' newline multiline-string-body '"""'
    _multiline_string: $ => seq(
      '"""',
      optional($._newline),
      repeat(choice(
        alias(token.immediate(prec(1, /[^\\"]+/)), $.string_fragment),
        $.escape,
        alias(token.immediate('"'), $.string_fragment),
      )),
      '"""',
    ),

    // escape := '\' [\"\\/bfnrt] | '\u{' hex '}'
    escape: $ => token.immediate(seq(
      '\\',
      choice(
        /[\\/bfnrt"]/,
        /u\{[0-9a-fA-F]{1,6}\}/,
      ),
    )),

    number: $ => choice(
      $._decimal,
      $._hex,
      $._octal,
      $._binary,
    ),

    _decimal: $ => prec(10, seq(
      /[+-]?[0-9][0-9_]*/,
      optional(seq(
        token.immediate('.'),
        alias(token.immediate(/[0-9][0-9_]*/), $.decimal),
      )),
      optional(alias(token.immediate(/[eE][+-]?[0-9][0-9_]*/), $.exponent)),
    )),

    exponent: $ => seq(
      token.immediate(/[eE]/),
      optional(token.immediate(/[+-]/)),
      token.immediate(/[0-9][0-9_]*/),
    ),


    _hex: $ => prec(10, /[+-]?0x[0-9a-fA-F][0-9a-fA-F_]*/),
    _octal: $ => prec(10, /[+-]?0o[0-7][0-7_]*/),
    _binary: $ => prec(10, /[+-]?0b[01][01_]*/),

    // escline := '\' ws* (comment | newline | eof)
    _escline: $ => seq('\\', repeat($._ws), choice($.single_line_comment, $._newline)),

    // line-space := newline | ws | single-line-comment
    _linespace: $ => choice($._newline, $._ws, $.single_line_comment),

    // newline := See Table (All line-break white_space)
    // Newline
    // The following characters should be treated as new lines:
    //
    // ╭──────────────────────────────────────────────────────────╮
    // │  Acronym  Name                           Code Pt         │
    // │  CR       Carriage Return                U+000D          │
    // │  LF       Line Feed                      U+000A          │
    // │  CRLF     Carriage Return and Line Feed  U+000D + U+000A │
    // │  NEL      Next Line                      U+0085          │
    // │  FF       Form Feed                      U+000C          │
    // │  LS       Line Separator                 U+2028          │
    // │  PS       Paragraph Separator            U+2029          │
    // ╰──────────────────────────────────────────────────────────╯
    // Note that for the purpose of new lines, CRLF is considered a single newline.
    _newline: _ => choice(/\r/, /\n/, /\r\n/, /\u0085/, /\u000C/, /\u2028/, /\u2029/),

    // ws := bom | unicode-space | multi-line-comment
    _ws: $ => choice($._bom, $._unicode_space, $.multi_line_comment),

    // @ts-ignore
    _bom: _ => /\u{FEFF}/,

    // unicode-space := See Table (All White_Space unicode characters which are not `newline`)
    // Whitespace
    // The following characters should be treated as non-Newline white space:
    //
    // ╭────────────────────────────────────╮
    // │  Name                      Code Pt │
    // │  Character Tabulation      U+0009  │
    // │  Space                     U+0020  │
    // │  No-Break Space            U+00A0  │
    // │  Ogham Space Mark          U+1680  │
    // │  En Quad                   U+2000  │
    // │  Em Quad                   U+2001  │
    // │  En Space                  U+2002  │
    // │  Em Space                  U+2003  │
    // │  Three-Per-Em Space        U+2004  │
    // │  Four-Per-Em Space         U+2005  │
    // │  Six-Per-Em Space          U+2006  │
    // │  Figure Space              U+2007  │
    // │  Punctuation Space         U+2008  │
    // │  Thin Space                U+2009  │
    // │  Hair Space                U+200A  │
    // │  Narrow No-Break Space     U+202F  │
    // │  Medium Mathematical Space U+205F  │
    // │  Ideographic Space         U+3000  │
    // ╰────────────────────────────────────╯
    _unicode_space: _ =>
      /[\u0009\u0020\u00A0\u1680\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000]/,

    // single-line-comment := '//' [^newline]*
    single_line_comment: $ => seq(
      '//',
      repeat(/[^\r\n\u0085\u000C\u2028\u2029]/),
      choice($._newline, $._eof),
    ),
  },
});
