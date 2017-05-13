
metalsmith-doctoc
===============

Please be aware that, as long as this plugin's version begins with '0.',
**I consider this to be a 'Beta' version.** This means that it should basically
work, but still needs some editing/review/testing. So essential parts may change
without further notice. Please open an issue on github if you have any suggestions.

If you know 'metalsmith-autotoc'
([npmjs](https://www.npmjs.com/package/metalsmith-autotoc),
[github](https://github.com/anatoo/metalsmith-autotoc)),
then you already know what this plugin will do. The only (big) difference is
that 'metalsmith-doctoc' **(MDT)** will allow you to use lightweight plugins
**(LPs)** to configure how your TOCs will be generated from your source files.

So the main purpose of this Metalsmith
([npmjs](https://www.npmjs.com/package/metalsmith),
[github](https://github.com/segmentio/metalsmith))
plugin is to provide a framework for LPs. MDT will invoke these LPs for each
file they are configured for, which they analyze in order to generate a
table-of-contents **(TOC)** menu tree. These TOC menu trees can then be used in
combination with a template engine to render menus into your files.

## TODO

- test require() with Options.resolveFunc()
- validation of menu trees returned by plugins

## Installation

```js
npm install metalsmith-doctoc
```

## Overview

In general you will use YAML frontmatter to define properties that mark your
files as "to be processed":

```
---
doctoc-flag: default
---
file content
```

When such a file is encountered, MDT will use the property's value to determine
which LP configuration to use in order to process that file. In the above case,
"default" refers to a named configuration that MDT needs to look up inside it's
options object:

```js
const doctoc = require('metalsmith-doctoc');

.use(doctoc({
  filter: "**",
  docotocFlag: "doctoc-flag",
  ignoreFlag: false,
  plugins: {
    "default": { plugin: "doctoc-default", options: "h1-6" }
  },
  default: "default",
  enableRequire: false,
  doctocTree: "doctoc-tree"
})
```

This essentially tells MDT to initialize the integrated LP "doctoc-default" and
make it use-able via the name "default". This will also initialize the
integrated LP with the default options "h1-6".

When metalsmith's pipeline is run, MDT will then execute the integrated LP when
it encounters that file. 'doctoc-default' will then extract the file's TOC
and generate a menu tree. Once it receives that tree, MDT will then assign it
to the file's 'doctoc-tree' property.

## Options

The options object that MDT will accept is as follows:

```js
Options {
  //- a multimatch pattern to select which files to process.
  //- a string, or an array of multimatch strings.
  //- files that don't match (any pattern) will be ignored.
  filter: "**",

  //- if a file has a doctocFlag property, the file
  //  is marked as "to be processed".
  //- any file that does not define this property
  //  will be ignored.
  doctocFlag: "doctoc",

  //- assign the boolean value 'true' to ignore any doctocFlag
  //  frontmatter property and to use the default configuration
  //- this is equivalent to assigning a doctocFlag frontmatter
  //  property to all files and setting their value to true.
  ignoreFlag: false,

  //- plugins := { ($configName: $config)* }
  //  i.e. the plugins property holds named configurations.
  //- $configName := a name associated with this $config
  //- $config := ($name | $class | $definition)
  //  i.e. either a $name, a $class, or a $definition
  //- $name := the name of an integrated plugin.
  //  see section "Integrated Plugins" for a list of which
  //  names are supported. Options.resolveFunc($name) will
  //  be executed if a name is not supported.
  //- $class := a class type function, that must support
  //  '$instance = new $class()' expressions.
  //- $definition := { plugin: $plugin (, options: $options)? }
  //  i.e. there must be a plugin property,
  //  but the option property is optional.
  //  any other additional property will be ignored.
  //- $plugin := ($name | $class | $instance)
  //  i.e. either a $name, a $class function, or an $instance
  //- $instance := objects returned by 'new $class(...)'
  //- $options := anything that is allowed by the plugin's
  //  $class.applyDefaultOptions() method.
  plugins: {
    "default": { plugin: "doctoc-default", options: "h1-6" }
  },

  //- this marks the configuration to use by default.
  //  e.g. if (file[doctocFlag] == true)
  //- obviously, options.plugins must have an entry with
  //  ($configName == options.default),
  default: "default",

  //- when metalsmith-doctoc concludes that $name is
  //  not the name of an integrated plugin, it will
  //  try to execute options.resolveFunc($name).
  //- set this property to boolean true to allow
  //  metalsmith-doctoc to try executing require($name)
  //  before executing options.resolveFunc($name).
  enableRequire: false,

  //- ($class | $instance) function(string $name)
  //- assign a function that will resolve the given $name
  //  to a $class function, or a plugin $instance
  //- if you don't return a $class or an $instance, it
  //  will be assumed that the function failed to resolve
  //  $name as a reference to a plugin
  resolveFunc: undefined,

  //- to which file property to attach the resulting tree.
  //- this will replace the value of file[doctocFlag],
  //  if (options.doctocFlag == options.doctocTree)!
  doctocTree: "doctoc"
}
```

## File metadata

### file[options.doctocFlag]

```js
file[options.doctocFlag] = $value
//- $value := (false | true | $configName | $config)
//- false := ignore this file
//- true := use the default options.plugins configuration
//- $configName := one of the names used in options.plugins
//- $config := { config: $configName (, options: $options )? }
//  i.e. there must be a config property,
//  but there may be an optional options property.
//  any other additional property will be ignored.
//- $options := anything that is allowed by the plugin's
//  $class.applyFileOptions($options) method.
```

### file[options.doctocTree]

```js
file[options.doctocTree] = $root
//- $root := the topmost node of the menu tree
```

This file property will hold an instance of a node object:

```js
Node {
  //- a Heading object
  //- (root.heading == undefined)
  heading: $heading

  //- a number from [+0,+Infinity)
  //- (node.level == node.parent.level+X)
  //  must be true for some X in [+1,+Infinity)
  //  i.e. X does not have to be +1!
  //- (root.level == 0) and (node.level >= 1)
  //  for any other node object
  level: $level,

  //- the topmost node of the current node tree.
  //- (root.root == root); i.e. circular!
  root: Node?

  //- set to point to the node's parent node
  //- (node.parent.children[i] == node)
  //- (root.parent == undefined)
  parent: Node?,

  //- the next sibling such that
  //- if (node == node.parent.children[i]), then
  //  (node.next == node.parent.children[i+1]),
  //- this property will be undefined
  //  if there is no such node
  //- (root.next == undefined)
  next: Node?,

  //- the previous sibling such that
  //- if (node == node.parent.children[i]), then
  //  (node.previous == node.parent.children[i-1])
  //- this property will be undefined
  //  if there is no such node
  //- (root.previous == undefined)
  previous: Node?,

  //- all direct child nodes of this node
  //  i.e. (node.children[i].parent == node)
  children: [ Node* ],

  //- all direct and indirect child nodes of the
  //  sub-tree defined by the current node
  childrenAll: [ Node* ]
}
```

Note that the actual properties of the node.heading object is not relevant to
MDT and must be defined/documented by the LP that created these. A Heading
object could have the following properties:

```js
Heading {
  //- e.g. 'h1' in case of '<h1>'
  tag: $tag,

  //- e.g. '$id' in case of '<h1 id="$id">'
  id: $id,

  //- e.g. '$title' in case of '<h1>$title</h1>'
  title: $title,

  //- e.g. 2 in case of '<h2>'
  level: $level
}
```

## Integrated plugins

MDT comes with the following LPs that can be used by specifying their name
inside options.plugins. Their main purpose though is to showcase how to
implement and use lightweight plugins.

* [doctoc-default](https://github.com/rehierl/metalsmith-doctoc/tree/master/src/doctoc-default)
  is intended to be run after Markdown files have been converted into HTML files.
  It will use reqgular expressions to analyze these files and add id attributes
  to heading tags if needed. When done it will return a list of Heading objects
  to MDT for further processing.

## List of LPs

* What is it's name?
  What will it do?

If you have implemented a plugin to be used with MDT, please name it using
'metalsmith-doctoc-' as prefix. This will allow your plugin to be easily found
by searching on [npmjs](https://www.npmjs.com/search?q=metalsmith-doctoc-).

## Error handling

```js
try {
  //- try something that might fail
} catch(error) {
  let newError = new Error("some message");
  newError.innerError = error;
  throw newError;
}
```

In some cases, MDT to create it's own error in order to point out, with which
options.plugins configuration or file it had a problem. As this this will
discard the error that triggered a problem, this initial error will be attached
to the new Error object via a 'innerError' property. Check these properties if
MDT's error messages lack the information you need to solve an issue.

## Plugins API

If you intend to write a plugin for MDT, you essentially agree to generate a
menu tree that any user can use as if MDT created this structure itself.
The main advantage for you is that you can concentrate on what your plugin is
actually supposed to do, which is to read TOC menus from file contents.

Take a look at the
[./src/doctoc-default](https://github.com/rehierl/metalsmith-doctoc/tree/master/src/doctoc-default)
 subfolder for an example of how to implement a basic LP for MDT.

```js
Plugin interface {
  //- no properties are required or accessed.
  //- interaction with plugins is done using methods.
  //any_property: any_value,

  //- optional
  //- void function(anything)
  //- if options.plugins[$name].options does exist,
  //  it's value will be passed on to this function
  function applyDefaultOptions(options);
  
  //- optional
  //- void function(anything)
  //- if file[options.doctocFlag].options does exist,
  //  it's value will be passed on to this function
  function applyFileOptions(filename, options);

  //- required
  //- RunResponse function(string, object)
  function run(filename, file);
}
```

Note that MDT does implements a proxy to wrap up any LP. This proxy object will
handle all cases in which any of the above optional functions are missing.

If an options value is encountered and if the corresponding applyXXXOptions()
method is missing, a warning will be issued using Node's debug module; enable
the 'metalsmith-doctoc' flag to see these warnings.

The 'Plugin.run()' function must return an object which holds run's result and
contains meta-information about the plugin's result:

```js
RunResponse {
  //- required
  //- $result = ($headings | $root)
  //- $headings = [ Heading* ]
  //  an array of Heading objects
  //- $root = the topmost node of a TOC menu
  result: $result,

  //- optional
  //- set true if response.result is a $headings array
  isHeadingsList: false,
  
  //- optional
  //- set true to prevent the proxy from overwriting
  //  the following node properties:
  //  node.next, node.previous, node.childrenAll
  dontFinalizeNodes, false

  //- optional
  //- set true to not normalize all node level values
  //- 'normalized' means that for all nodes,
  //  the following is true: (child.level = parent.level+1),
  //  if (and only if) (child.parent = parent)
  dontNormalizeLevelValues: false,
}
```

The proxy uses this meta-information object to determine if the plugin's actual
result (i.e. RunResponse.result) needs further processing.

### isHeadingsList

If RunResponse.isHeadingsList is set, RunResponse.result is expected to be
an array/list of Heading objects. In that case, Heading.level is a
needed/required property!

If (list[i].level < list[i+n].level), then proxy will assume that list[i+n] is
supposed to be a child heading of list[i]. Hence it is important that list
contains the heading entries in order of appearance.

If RunResponse.isHeadingsList is not set, RunResponse.result is
expected to be a root Node object; i.e. the topmost node of a menu tree.

### dontFinalizeNodes

If you return a menu tree yourself, you may omit node.root, node.next,
node.previous and node.childrenAll as long as you don't set
RunResponse.dontFinalizeNodes to true.

Proxy will create/overwrite all these properties if this setting remains false.

### dontNormalizeLevelValues

A random HTML document may contain h1 and h3, but no h2 heading tags. The TOC
menu nodes of such a document will then assign number values 1 and 3 to the
node.level properties. This will cause problems if these values are then taken
to generate an indentation prefix, because the menu entries will jump from a
1-wide indent to a 3-wide indent.

```
//- before normalization, the following
//  is true for some X and Y in [+1,+Infinity)
(node.level = node.parent.level+X) and
(node2.level = node2.parent.level+Y) and
not necessarily (X == Y)
```

To avoid this issue, node.level values can be normalized to only differ by 1:

```
//- after normalization, the following
//  will be true for all node objects
node.level = node.parent.level+1
```

## License

MIT
