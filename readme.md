
metalsmith-doctoc-jsdom
===============

This metalsmith-doctoc
([npmjs](https://www.npmjs.com/package/metalsmith-doctoc),
[github](https://github.com/rehierl/metalsmith-doctoc))
plugin will use jsdom
([npmjs](https://www.npmjs.com/package/jsdom),
[github](https://github.com/tmpvar/jsdom))
to read the heading tags from any HTML content. It will process fully specified
HTML documents, or a mere tag soup (e.g. no html, head or body tags).

## TODO

- add support for jsdom-specific options?

## Installation

```js
npm install metalsmith-doctoc-jsdom
```

## Options object

This plugin will accept the following option properties:

```js
Options {
  //- $range = 'h$min-$max'
  //- with $min and $max in [1,6] and ($min <= $max)
  //- $min will replace hMin and $max will replace hMax
  hRange: "h1-6",
  
  //- an integer value in [1,6]
  //- if hMin=X, then this plugin will
  //  ignore any heading tag <hN> if (N < X)
  //- if (hMin == hMax == X), then this plugin will
  //  ignore any heading tag, but not <hX>
  //- if (hMin > hMax), then all heading tags will be ignored!
  hMin: 1,

  //- an integer value in [1,6]
  //- if hMax=X, then this plugin will
  //  ignore any heading tag <hN> if (N > X)
  //- if (hMin == hMax == X), then this plugin will
  //  ignore any heading tag, but not <hX>
  //- if (hMin > hMax), then all heading tags will be ignored!
  hMax: 6,

  //- $selector = /h[1-6](,\s*h[1-6])*/
  //- a heading will only be taken into account, if it's tag
  //  can be found inside hSelector
  //- if hRange is given, it will override hMin and hMax
  //- if hMin or hMax are given, they will override hSelector
  //- hSelector is what will be used to find the heading tags
  hSelector: 'h1, h2, h3, h4, h5, h6',
  
  //- string function(string)
  //- this function will be used to calculate a missing id:
  //  assuming "<h1>$title</h1>" was found, an id will be
  //  generated as follows: $id = options.slugFunc($title)
  //- the purpose of this function is to generate an id
  //  value that respects HTML's requirements for these
  //  kind of values; e.g. no (') or (") characters, etc.
  //- node's slug module isn't flawless:
  //  slug('1.') === slug('1..') === '1'
  //  i.e. a possible id value collision
  //- this option allows you to specify a function of your
  //  own in case slug() causes any issues
  slugFunc: slug,

  //- if a heading of the form <h1>$title</h1> is found, an id
  //  will be generated using '$id = slug($title)'. in order to
  //  avoid collision of id values, generated ids will be
  //  prefixed with $idPrefix;
  //  i.e. '<h1 id="$idPrefix$id">$title</h1>'.
  //- set to "" if you don't want to use a prefix.
  idPrefix: "doctoc-",

  //- this will limit id = (idPrefix + slugFunc(title))
  //  to the specified number of characters.
  //- id values might exceed that limit by some unique
  //  number suffix.
  idLengthLimit: 256

  //- if set to true, this will do check that a generated id is
  //  not already in use. so a test will be done for each
  //  id generated!
  //- if such a test determines that a generated value is not
  //  unique, append a counter (=1) to the id's value,
  //  i.e. '$newId=$id-$counter'. redo the test with the new
  //  value. if $newId still isn't unique, increment the
  //  counter and repeat the procedure.
  makeIdsUnique: false
}
```

Note that if a hRange value is given, it will override hMin, hMax and hSelector.
And if hRange is omitted, but hMin and/or hMax are given, they will override
hSelector. So only one of those (hRange, hMin/hMax or hSelector) should be used.

### Range/Selector for options

This plugin will accept a range string instead of an options object:

```js
metalsmith-doctoc-options {
  ...
  plugins: {
    ...
    $configName: {
      ... options: 'h1-6' ...
    }
    ...
  },
  ...
}
```

It is also possible to provide a selector string:

```js
... options: 'h1, h2, h3, h4' ...
```

## Heading objects

doctoc-default's Heading objects will have the following properties:

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
