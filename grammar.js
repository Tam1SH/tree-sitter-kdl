/**
 * @file KDL grammar for tree-sitter
 * @author Amaan Qureshi <amaanq12@gmail.com>
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

/**
 * KDL 2.0 Reserved Type Annotations
 * @see {@link https://kdl.dev/spec/#name-type-annotation}
 */
const ANNOTATION_BUILTINS = [
  // 3.8.1. Numbers Without Decimals
  'i8', 'i16', 'i32', 'i64', 'i128',
  'u8', 'u16', 'u32', 'u64', 'u128',
  'isize', 'usize',
  // 3.8.2. Numbers With Decimals
  'f32', 'f64', 'decimal64', 'decimal128',
  // 3.8.3. Strings
  'date-time', 'time', 'date', 'duration',
  'decimal', 'currency',
  'country-2', 'country-3', 'country-subdivision',
  'email', 'idn-email',
  'hostname', 'idn-hostname',
  'ipv4', 'ipv6',
  'url', 'url-reference',
  'irl', 'irl-reference',
  'url-template',
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

  conflicts: $ => [],

  externals: $ => [
    $._eof,
    $.multi_line_comment,
    $._raw_string,
  ],

  extras: $ => [
    $._unicode_space,
    $._escline,
    $.single_line_comment,
    $.multi_line_comment,
  ],

  word: $ => $._bare_identifier,

  rules: {
    // document := bom? version? nodes
    document: $ => seq(
      optional($._bom),
      repeat(choice(
        $._newline,
        field('version', $.version),
        field('node', $.node),
      )),
    ),

    // KDL Version Marker
    // Format: /- kdl-version "2"
    version: $ => seq(
      '/-',
      'kdl-version',
      field('value', choice('1', '2')),
      $._newline,
    ),

    node_field: $ => seq(
      optional(field('slashdash', $.slashdash)),
      choice(
        field('property', $.prop),
        field('argument', $.value),
      ),
    ),

    // prop := string node-space* '=' node-space* value
    prop: $ => seq(
      field('key', $.identifier),
      '=',
      field('value', $.value),
    ),

    // value := type? (string | number | keyword)
    value: $ => seq(
      optional(field('type', $.type)),
      field('value', choice(
        $.identifier,
        $.number,
        $.keyword,
      )),
    ),

    slashdash: _ => token('/-'),

    node: $ => seq(
      $._node_internal,
      $._node_terminator,
    ),

    _node_internal: $ => seq(
      optional(field('slashdash', $.slashdash)),
      optional(field('type', $.type)),
      field('name', $.identifier),
      repeat($.node_field),
      repeat(seq(
        optional(field('slashdash', $.slashdash)),
        field('children', $.node_children),
      )),
    ),


    // node-children := slashdash? '{' nodes? '}'
    node_children: $ => seq(
      '{',
      repeat(
        choice(
          $.node,
          $._newline,
        )),
      optional($._node_internal),
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
    identifier: $ => choice($.string, $._bare_identifier),

    _bare_identifier: $ => token(choice(
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
    )),

    // keyword := boolean | '#null' | keyword-number
    keyword: $ => choice(
      $.boolean,
      token('#null'),
      token(/#(inf|-inf|nan)/),
    ),

    boolean: $ => choice('#true', '#false'),

    annotation_type: _ => choice(...ANNOTATION_BUILTINS),

    _node_field_comment: $ => alias(seq('/-', repeat($._node_space), $._node_field), $.node_field_comment),

    _node_field: $ => choice($.prop, $.value),


    // type := '(' string ')'
    type: $ => seq(
      '(',
      field('name', choice($.identifier, $.annotation_type)),
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
        field('fragment', alias(token.immediate(prec(1, /[^\\"\n]+/)), $.string_fragment)),
        field('escape', $.escape),
      )),
      '"',
    ),

    // multiline-string := '"""' newline multiline-string-body '"""'
    _multiline_string: $ => seq(
      '"""',
      optional($._newline),
      repeat(choice(
        field('fragment', alias(token.immediate(prec(1, /[^\\"]+/)), $.string_fragment)),
        field('escape', $.escape),
        field('fragment', alias(token.immediate('"'), $.string_fragment)),
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

    _decimal: $ => seq(
      /[+-]?[0-9][0-9_]*/,
      optional(seq(
        token.immediate('.'),
        alias(token.immediate(/[0-9][0-9_]*/), $.decimal),
      )),
      optional(alias(token.immediate(/[eE][+-]?[0-9][0-9_]*/), $.exponent)),
    ),

    exponent: $ => seq(
      token.immediate(/[eE]/),
      optional(token.immediate(/[+-]/)),
      token.immediate(/[0-9][0-9_]*/),
    ),


    _hex: $ => /[+-]?0x[0-9a-fA-F][0-9a-fA-F_]*/,
    _octal: $ => /[+-]?0o[0-7][0-7_]*/,
    _binary: $ => /[+-]?0b[01][01_]*/,

    // escline := '\' ws* (comment | newline | eof)
    _escline: $ => seq(
      '\\',
      repeat($._unicode_space),
      optional($.single_line_comment),
      $._newline,
    ),

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
    single_line_comment: $ => token(seq(
      '//',
      /[^\r\n\u0085\u000C\u2028\u2029]*/,
    )),
  },
});
