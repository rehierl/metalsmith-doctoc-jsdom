
"use strict";

const is = require("is");
const util = require("util");
const slug = require("slug");

module.exports = Options;

//========//========//========//========//========//========//========//========

function Options() {
  if(!(this instanceof Options)) {
    return new Options();
  }
  
  //- these are options specific to jsdom
  //  https://github.com/tmpvar/jsdom
  //- this options object will be passed on to jsdom
  this.jsdomOptions = {
    //- will be returned by window.location, document.URL, ...
    url: 'about:blank',
    //- affects document.referrer
    referrer: undefined,
    //- affects document.contentType, and how a document is
    //  parsed (as HTML or XML).
    //- must be a valid XML mime type
    //  https://mimesniff.spec.whatwg.org/#xml-mime-type
    contentType: 'text/html',
    //- affects navigator.userAgent, 'User-Agent' header
    userAgent: 'jsdom/${jsdomVersion}',
    //- enable to preserve the location info produced by the
    //  HTML parser; allows to query the location of an
    //  element inside the source content
    //- negatively affects the performance
    includeNodeLocations: false
  };
  
  //- used to select which method to use in order to extract
  //  modified content from jsdom; this will only happen if
  //  id values had to be generated.
  //- must be one of: 'body', 'complete', 'auto'
  //- 'body' - use this setting if file contents aren't fully
  //  specified documents. if they are and you use this setting,
  //  parts of your contents will be lost (i.e. no title, head
  //  or html tag).
  //- 'complete' - use this setting if file contents are fully
  //  specified documents (i.e. have html, head, title tags).
  //  if file contents only hold inner tags (i.e. tag soup),
  //  then your actual content will receive additonal tags
  //  (html, head, body).
  //- 'auto' - use this setting if your files hold mixed content.
  //  when this setting is used, jsdomOptions.includeNodeLocations
  //  will always be set to true to allow searching the body tag
  //  within the source content. if that tag was found, the
  //  'complete' method will be selected; 'body' otherwise.
  this.jsdomSerialization = 'complete';
  
  //- $range = 'hN-M'
  //- with N and M in [1,6] and (N <= M)
  //- N will replace hMin and M will replace hMax
  //this.hRange = 'h1-6';
  
  //- $min = integer value in [1,6]
  //- if X=N for some <hN> tag, then ignore any heading that has
  //  a lower N than hMin; i.e. ignore a heading if (N < hMin)
  //- ignore all tags other than <hX>, if (hMin == hMax == X)
  //- ignore all tags, if (hMin > hMax)
  //this.hMin = 1;
  
  //- $max = integer value in [1,6]
  //- if X=N for some <hN> tag, then ignore any heading that has
  //  a higher N than hMax; i.e. ignore a heading if (N > hMax)
  //- ignore all tags other than <hX>, if (hMin == hMax == X)
  //- ignore all tags, if (hMin > hMax)
  //this.hMax = 6;
  
  //- $selector = /h[1-6](,\s*h[1-6])*/
  //- a heading will only be taken into account, if it's tag
  //  can be found inside hSelector
  //- if hRange is given, it will override hMin and hMax
  //- if hMin or hMax are given, they will override hSelector
  //- hSelector is what will be used to find the heading tags
  this.hSelector = 'h1, h2, h3, h4, h5, h6';
  
  //- use this value to specify a cheerio context in which to
  //  look for heading tags.
  //- e.g. use '' to search the whole document
  //- e.g. use '#id' to only search the element marked with the
  //  specified id value.
  this.hContext = '';
  
  //- string function(string)
  //- this function will be used to calculate a missing id:
  //  assuming "<h1>$title</h1>" was found, an id will be
  //  generated as follows: $id = options.slugFunc($title)
  //- the purpose of this function is to generate an id
  //  value that respects HTML's requirements for these
  //  kind of values; no (') or (") characters, etc.
  //- node's slug module isn't flawless:
  //  slug('1.') === slug('1..') === '1'
  //  i.e. a possible id value collision
  //- this option allows you to specify a function of your
  //  own in case slug() causes any issues
  this.slugFunc = slug;
  
  //- if a heading of the form <h1>$title</h1> is found, an id
  //  will be generated using '$id = slug($title)'. in order to
  //  avoid collision of id values, generated ids will be prefixed
  //  with $idPrefix; i.e. '<h1 id="$idPrefix$id">$title</h1>'.
  //- set to "" if no prefix is needed.
  this.idPrefix = "doctoc-";
  
  //- this will limit (idPrefix + slugFunc(title)) to the
  //  specified number of characters.
  //- id values might exceed that limit by some unique
  //  number suffix.
  this.idLengthLimit = 256;

  //- if set to true, this will ensure that a generated ids
  //  aren't already in use. so at least one test needs to
  //  be done for each id generated!
  //- if such a test determines that a generated value is not
  //  unique, append a number ('-1') to the id's value,
  //  i.e. '$newId=$id-$number' and redo the test with the new
  //  value. if $newId still isn't unique, increment the
  //  number and repeat the procedure.
  this.makeIdsUnique = false;
  
  //- set true to always update file.contents;
  //  even if no new id was generated
  this.alwaysUpdate = false;
}

//========//========//========//========//========//========//========//========

Options.prototype.clone = function() {
  let thisInstance = this;
  let options = new Options();
  
  Object.getOwnPropertyNames(thisInstance)
  .forEach(function(current, index, array) {
    options[current] = thisInstance[current];
  });
  
  return options;
};

//========//========//========//========//========//========//========//========

//- merge the supplied options into the current object
Options.prototype.combine = function(options) {
  if(options === undefined) {
    return;//- ignore this call
  }
  
  if(is.string(options)) {
    let result = undefined;
    
    if((result = readRange(options)) !== false) {
      //- e.g. options = "h1-6"
      options = result;
    } else if((result = readSelector(options)) !== false) {
      //- e.g. options = "h1, h2"
      options = result;
    } else {
      throw new Error(util.format(
        "options string '%s' is invalid",
        options
      ));
    }
  }
  
  if(!is.object(options)) {
    throw new Error("invalid options argument");
  }
  
  removeRange(options);
  removeMinMax(options);
  validateOptions(options);
  
  const thisInstance = this;
  Object.getOwnPropertyNames(this)
  .forEach(function(current, index, array) {
    if(options.hasOwnProperty(current)) {
      thisInstance[current] = options[current];
    }
  });
};

//========//========//========//========//========//========//========//========

function readRange(range) {
  let match = /^h([1-6])-([1-6])$/i.exec(range);
  
  if(match === null) {
    return false;
  }
  
  let min = Number.parseInt(match[1]);
  let max = Number.parseInt(match[2]);
  return { hMin: min, hMax: max };
}

//========//========//========//========//========//========//========//========

function readSelector(selector) {
  let match = /^h[1-6](,\s*h[1-6])*$/i.test(selector);
  
  if(match !== true) {
    return false;
  }
  
  return { hSelector: selector };
}

//========//========//========//========//========//========//========//========

//- options: { hRange: "h1-6" }
//  => { hMin: 1, hMax: 6 }
function removeRange(options) {
  if(!options.hasOwnProperty("hRange")) {
    return;//- there is nothing to do
  }
  
  const range = options.hRange;
  const result = readRange(range);
  
  if(result === undefined) {
    throw new Error(util.format(
      "options.hRange: [%s] has an invalid range value",
      options
    ));
  }
  
  options.hMin = result.hMin;
  options.hMax = result.hMax;
  delete options.hRange;
}

//========//========//========//========//========//========//========//========

//- options: { hMin: 1, hMax: 6 }
//  => { hSelector: "h1, H1, ... h6, H6" }
function removeMinMax(options) {
  const hMinExists = options.hasOwnProperty("hMin");
  const hMaxExists = options.hasOwnProperty("hMax");
  
  if(!hMinExists && !hMaxExists) {
    return;//- there is nothing to do
  } else if(!hMinExists) {
    options.hMin = 1;
  } else if(!hMaxExists) {
    options.hMax = 6;
  }
  
  const min = options.hMin;
  const max = options.hMax;
  
  if(hMinExists && (!is.integer(min) || is.infinite(min) || (min < 1))) {
    throw new Error(util.format(
      "options.hMin: [%s] is an invalid integer value", min
    ));
  }
  
  if(hMaxExists && (!is.integer(max) || is.infinite(max) || (max > 6))) {
    throw new Error(util.format(
      "options.hMax: [%s] is an invalid integer value", max
    ));
  }
  
  //- (min >= 1) && (max <= 6)
  
  if(min > max) {
    throw new Error(util.format(
      "options.hMin,hMax: (hMin[%s] <= hMax[%s]) must be true", min, max
    ));
  }
  
  const selector = [];
  
  for(let ix=min; ix<=max; ix++) {
    selector.push(util.format("h%s", ix));
    //- tag filtering is *not* case-sensitive!
    //  i.e. 'h2' will also apply to 'H2' tags
    //selector.push(util.format("H%s", ix));
  }
  
  options.hSelector = selector.join(", ");
  delete options.hMin;
  delete options.hMax;
}

//========//========//========//========//========//========//========//========

function validateOptions(options) {
  let key = undefined;
  let value = undefined;
  
  key = "jsdomOptions";
  if(options.hasOwnProperty(key)) {
    value = options[key];
    if(!is.object(value)) {
      throw new Error(util.format( 
        "options.%s: must be an options object", key
      ));
    }
  }
  
  key = "jsdomSerialization";
  if(options.hasOwnProperty(key)) {
    value = options[key];
    let allowedValues = {
      body: true, complete: true, auto: true };
    if(!is.string(value) || !allowedValues[value]) {
      throw new Error(util.format(
        "options.%s: [%s] is not a supported string value",
        key, value
      ));
    }
  }
  
  key = "hSelector";
  if(options.hasOwnProperty(key)) {
    value = options[key];
    if(!readSelector(value)) {
      throw new Error(util.format( 
        "options.%s: [%s] is not a valid selector string",
        key, value
      ));
    }
  }
  
  key = "hContext";
  if(options.hasOwnProperty(key)) {
    value = options[key];
    if(!is.string(value)) {
      throw new Error(util.format(
        "options.%s: [%s] must be a non-empty string",
        key, value
      ));
    }
  }
  
  key = "slugFunc";
  if(options.hasOwnProperty(key)) {
    value = options[key];
    if(!is.fn(value)) {
      throw new Error(util.format(
        "options.%s: is not a function", key
      ));
    }
  }

  key = "idPrefix";
  if(options.hasOwnProperty(key)) {
    value = options[key];
    if(!is.string(value)) {
      throw new Error(util.format(
        "options.%s: [%s] is not a string value",
        key, value
      ));
    }
  }
  
  key = "idLengthLimit";
  if(options.hasOwnProperty(key)) {
    value = options[key];
    if(!is.integer(value) || is.infinite(value) || (value <= 0)) {
      throw new Error(util.format(
        "options.%s: [%s] is not a valid integer value",
        key, value
      ));
    }
  }
  
  key = "makeIdsUnique";
  if(options.hasOwnProperty(key)) {
    value = options[key];
    if(!is.bool(value)) {
      throw new Error(util.format(
        "options.%s: [%s] is not a boolean value",
        key, value
      ));
    }
  }
  
  key = "alwaysUpdate";
  if(options.hasOwnProperty(key)) {
    value = options[key];
    if(!is.bool(value)) {
      throw new Error(util.format(
        "options.%s: [%s] is not a boolean value",
        key, value
      ));
    }
  }
}
