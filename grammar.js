/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

function comma_sep_trailing(rule) {
  return seq(repeat(seq(rule, ",")), optional(rule));
}

function semi_sep_trailing(rule) {
  return seq(repeat(seq(rule, ";")), optional(rule));
}

const binary_ops = [
  ["&&"],
  ["||"],
  ["==", "!=", "<", "<=", ">", ">="],
  ["+", "-"],
  ["*", "/"],
];

function mk_choice(items) {
  if (items.length == 1) {
    return items[0]
  }
  return choice(...items)
}

function make_binary_rules(expr) {
  let p = 0;
  const levels = binary_ops.map((ops) =>
    prec.left(
      ++p,
      seq(
        field("left", expr),
        field("op", mk_choice(ops)),
        field("right", expr),
      ),
    ),
  );
  return choice(...levels);
}

module.exports = grammar({
  name: "nemo",
  word: ($) => $.lower_ident,
  extras: ($) => [/\s+/, $.comment],

  rules: {
    source_file: ($) => seq(
      optional($.module_header),
      repeat($.module_use),
      repeat($._toplevel)
    ),

    comment: ($) => seq("//", /[^\n]*/),

    lower_ident: ($) => /[a-z_][a-zA-Z0-9_]*/,
    upper_ident: ($) => /[A-Z][a-zA-Z0-9_]*/,
    intrinsic_ident: ($) => /@[a-z_][a-zA-Z0-9_]*/,

    qualifier: ($) => seq($.upper_ident, "::"),
    mod_qualifier: ($) => seq($.lower_ident, "::"),

    // Patterns
    _pattern: ($) => choice($.var_pat, $.variant_pat),

    var_pat: ($) => $.lower_ident,
    variant_pat: ($) =>
      seq(
        optional(field("mod_qualifier", $.mod_qualifier)),
        field("variant", $.qualifier),
        field("alternative", $.upper_ident),
        field("binder", $.lower_ident),
      ),

    // Literals
    int_lit: ($) => choice(
      "0",
      /[1-9][0-9]*/,
      seq("0b", /[01]*/),
      seq("0x", /[0-9a-fA-F]*/),
    ),
    float_lit: ($) => token(seq(choice("0", /[0-9]*/), ".", /[0-9]+/)),
    bool_lit: ($) => choice("true", "false"),
    bytes_lit: ($) => seq("\"", /[^"]*/, "\""),
    _lit: ($) => choice($.int_lit, $.float_lit, $.bool_lit, $.bytes_lit),

    // Expressions
    var_e: ($) => seq(
      field("mod_qualifier", optional($.mod_qualifier)),
      $.lower_ident,
    ),
    array_e: ($) => seq("[", comma_sep_trailing($._expr), "]"),
    array_idx_e: ($) =>
      prec(
        100,
        seq(field("array", $._expr), "[", field("index", $._expr), "]"),
      ),

    struct_field_e: ($) =>
      seq(field("name", $.lower_ident), "=", field("expr", $._expr)),
    struct_e: ($) => seq(
        optional($.mod_qualifier),
        optional($.qualifier),
        field("struct", $.upper_ident),
        optional(field("type_arguments", $.type_args_hash)),
        "{",
        comma_sep_trailing($.struct_field_e),
        "}",
      ),
    // Needs to be higher than the highest operator precedence
    struct_idx_e: ($) =>
      prec(
        100,
        seq(field("expr", $._expr), ".", field("index", $.lower_ident)),
      ),
    if_e: ($) =>
      seq(
        "if",
        field("condition", $._expr),
        field("then", $.block_e),
        "else",
        field("else", $.block_e),
      ),

    match_e: ($) =>
      seq(
        "match",
        field("scrutinee", $._expr),
        "{",
        comma_sep_trailing($.match_branch),
        "}",
      ),

    match_branch: ($) =>
      seq(field("pattern", $._pattern), "=>", field("body", $.block_e)),

    type_args_hash: ($) => seq("#[", comma_sep_trailing($._type), "]"),
    call_args: ($) => seq("(", comma_sep_trailing($._expr), ")"),
    call_e: ($) =>
      seq(
        field("function", $._callee),
        optional(field("type_arguments", $.type_args_hash)),
        field("arguments", $.call_args)),
    block_e: ($) =>
      seq("{", semi_sep_trailing(field("block_decl", $._decl)), "}"),

    intrinsic_e: ($) =>
      seq(
        field("function", $.intrinsic_ident),
        field("arguments", $.call_args),
      ),
    binary_e: ($) => make_binary_rules($._expr),

    function_e: ($) => seq(
        "fn",
        field("params", $.func_params),
        optional(seq("->", field("result", $._type))),
        field("body", $.block_e),
    ),

    return_e: ($) => seq(
      "return",
      $._expr,
    ),

    parenthesized_e: ($) => seq("(", field("expr", $._expr), ")"),

    _callee: ($) =>
      choice(
        $._lit,
        $._call_or_var,
        $.parenthesized_e,
        $.array_e,
        $.struct_e,
        $.if_e,
        $.intrinsic_e,
        $.array_idx_e,
        $.struct_idx_e,
      ),

    // Extracted this rule to make it clear that we want the parser to greedily parse:
    // my_func(args) into `(call_e ident args)` and not `(var_e ERROR)`
    _call_or_var: ($) => choice($.call_e, $.var_e),

    _expr: ($) =>
      choice(
        $._lit,
        $._call_or_var,
        $.parenthesized_e,
        $.array_e,
        $.struct_e,
        $.if_e,
        $.block_e,
        $.binary_e,
        $.intrinsic_e,
        $.array_idx_e,
        $.struct_idx_e,
        $.match_e,
        $.function_e,
        $.return_e,
      ),

    // Declarations
    set_var: ($) => field("name", $.lower_ident),
    set_array_idx: ($) =>
      seq(field("target", $._set_target), "[", field("index", $._expr), "]"),
    set_struct_idx: ($) =>
      seq(field("target", $._set_target), ".", field("index", $.lower_ident)),
    _set_target: ($) => choice($.set_var, $.set_array_idx, $.set_struct_idx),

    let_decl: ($) =>
      seq(
        "let",
        field("binder", $.lower_ident),
        optional(seq(":", field("annotation", $._type))),
        "=",
        field("expr", $._expr),
      ),
    set_decl: ($) =>
      seq("set", field("target", $._set_target), "=", field("expr", $._expr)),
    while_decl: ($) =>
      seq("while", field("condition", $._expr), field("body", $.block_e)),
    expr_decl: ($) => field("expr", $._expr),

    _decl: ($) => choice($.let_decl, $.set_decl, $.while_decl, $.expr_decl),


    // Types
    type_args: ($) => seq("[", comma_sep_trailing($._type), "]"),

    ty_i32: ($) => "i32",
    ty_f32: ($) => "f32",
    ty_bytes: ($) => "bytes",
    ty_bool: ($) => "bool",
    ty_unit: ($) => "unit",
    ty_var: ($) => $.lower_ident,
    ty_array: ($) => seq("[", field("elem_ty", $._type), "]"),
    ty_cons: ($) => seq(
      optional(field("mod_qualifier", $.mod_qualifier)),
      $.upper_ident,
      optional(field("type_params", $.type_args)),
    ),
    ty_func: ($) =>
      seq(
        "fn",
        "(",
        comma_sep_trailing(field("argument", $._type)),
        ")",
        "->",
        field("result", $._type),
      ),
    _type: ($) =>
      choice(
        $.ty_i32,
        $.ty_f32,
        $.ty_bytes,
        $.ty_bool,
        $.ty_unit,
        $.ty_var,
        $.ty_array,
        $.ty_cons,
        $.ty_func,
      ),

    // Toplevel
    top_global: ($) =>
      seq(
        "global",
        field("binder", $.lower_ident),
        optional(seq(":", field("annotation", $._type))),
        "=",
        field("expr", $._expr),
      ),

    top_import: ($) =>
      seq(
        "import",
        field("internal", $.lower_ident),
        ":",
        field("type", $.ty_func),
        "from",
        field("external", $.lower_ident),
      ),

    type_params: ($) => seq("[", comma_sep_trailing($.lower_ident), "]"),
    func_param: ($) =>
      seq(field("name", $.lower_ident), ":", field("type", $._type)),
    func_params: ($) => seq("(", comma_sep_trailing($.func_param), ")"),
    top_func: ($) =>
      seq(
        "fn",
        field("name", $.lower_ident),
        optional(field("type_params", $.type_params)),
        field("params", $.func_params),
        optional(seq("->", field("result", $._type))),
        field("body", $.block_e),
      ),

    struct_field_top: ($) =>
      seq(field("name", $.lower_ident), ":", field("type", $._type)),
    top_struct: ($) =>
      seq(
        "struct",
        field("name", $.upper_ident),
        optional(field("type_params", $.type_params)),
        "{",
        comma_sep_trailing($.struct_field_top),
        "}",
      ),

    top_variant: ($) =>
      seq(
        "variant",
        field("name", $.upper_ident),
        optional(field("type_params", $.type_params)),
        "{",
        comma_sep_trailing($.top_struct),
        "}",
      ),

    _toplevel: ($) =>
      choice(
        $.top_global,
        $.top_import,
        $.top_func,
        $.top_struct,
        $.top_variant,
      ),
    export_item: ($) => choice(
      $.lower_ident,
      $.upper_ident,
    ),
    module_header: ($) => seq(
      "module",
      field("name", $.lower_ident),
      "exports",
      "(",
      comma_sep_trailing($.export_item),
      ")",
    ),
    module_use: ($) => seq("use", field("module", $.lower_ident)),
  },
});
