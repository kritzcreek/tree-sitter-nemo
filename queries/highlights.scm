["import" "fn" "from" "let" "set" "struct" "while" "if" "else" "return" "variant" "match" "module" "exports" "use"] @keyword

(binary_e ["&&" "||" "==" "!=" "<" "<=" ">" ">=" "+" "-" "*" "/"] @identifier.operator)

(module_header name: (lower_ident) @identifier.module)
(export_item (lower_ident) @identifier.function)
(export_item (upper_ident) @identifier.type)
(module_use module: (lower_ident) @identifier.module)
(mod_qualifier (lower_ident) @identifier.module)

(top_func name: (lower_ident) @identifier.function)

[(int_lit) (float_lit)] @number
(bool_lit) @boolean
(bytes_lit) @string

(top_import
  internal: (lower_ident) @identifier.function
  external: (lower_ident) @identifier.function)

[(ty_i32) (ty_f32) (ty_bytes) (ty_bool) (ty_unit)] @type.builtin

(var_e) @identifier
(let_decl binder: (lower_ident) @identifier)
(set_var) @identifier

(top_struct name: (upper_ident) @identifier.type)
(top_variant name: (upper_ident) @identifier.type)
(struct_e struct: (upper_ident) @identifier.type)
(type_params (lower_ident) @identifier.type)
(ty_var) @identifier.type
(ty_cons (upper_ident) @identifier.type)
(variant_pat
  alternative: (upper_ident) @identifier.type
  binder: (lower_ident) @identifier)

(qualifier (upper_ident) @identifier.type)

(var_pat (lower_ident) @identifier)

(struct_field_top name: (lower_ident) @identifier.attribute)
(struct_field_e name: (lower_ident) @identifier.attribute)
(struct_idx_e index: (lower_ident) @identifier.attribute)
(set_struct_idx index: (lower_ident) @identifier.attribute)

(func_param name: (lower_ident) @identifier)

(comment) @comment
