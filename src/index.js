
"use strict;"

const is = require("is");
const util = require("util");

const Options = require("./Options.js");

//- note: jsdom's api has changed with v10!
const JSDOM = require("jsdom").JSDOM;

module.exports = Plugin;

//========//========//========//========//========//========//========//========

function Plugin(userOptions) {
  if(!(this instanceof Plugin)) {
    return new Plugin(userOptions);
  }
  
  //- used as default/base options when
  //  applying plugin-specific settings
  this.options = new Options();
  this.options.combine(userOptions);
  
  //- used as default/base options when
  //  applying file-specific settings
  this.optionsDefault = this.options;
  
  //- used when processing a file
  this.optionsFile = this.options;
}

//========//========//========//========//========//========//========//========

//- public, not required
//- warning if needed and missing
Plugin.prototype.applyDefaultOptions = function(options) {
  const clone = this.options.clone();
  clone.combine(options);
  this.optionsDefault = clone;
};

//========//========//========//========//========//========//========//========

//- public, not required
//- warning if needed and missing
Plugin.prototype.applyFileOptions = function(filename, options) {
  const clone = this.optionsDefault.clone();
  clone.combine(options);
  clone.filename = filename;
  this.optionsFile = clone;
};

//========//========//========//========//========//========//========//========

//- public, required
Plugin.prototype.run = function(filename, file) {
  let options = undefined;
  
  {//## choose which options to use
    options = this.optionsFile;
    
    if(!options.hasOwnProperty("filename")) {
      options = this.optionsDefault;
    } else if(options.filename !== filename) {
      options = this.optionsDefault;
    }
    
    //- file options should only be used for a single file
    //- reset file options to the default options
    this.optionsFile = this.optionsDefault;
  }
  
  let headings = undefined;
  
  {//### read and modify the file contents
    let contents = file.contents;
    let fromBuffer = undefined;

    if(is.string(contents)) {
      fromBuffer = false;
    } else {
      //- assume that contents is a Buffer
      contents = contents.toString('utf8');
      fromBuffer = true;
    }

    //- result.contents might have changed!
    const result = read(contents, options);

    if(result.newIdsCount > 0) {
      contents = result.contents;
      
      if(fromBuffer === true) {
        //- if you started with a buffer,
        //  then you should finish with one
        contents = new Buffer(result.contents);
      }
      
      file.contents = contents;
    }

    headings = result.headings;
  }
  
  return {
    result: headings,
    isHeadingsList: true
  };
};

//========//========//========//========//========//========//========//========

//- (contents, options) => { contents, newIdsCount, [headings] }
//- contents will have changed iif (newIdsCount > 0)
function read(contents, options) {
  const dom = new JSDOM(contents, {
    //- must be enabled to use dom.nodeLocation()
    includeNodeLocations: true });
  const doc = dom.window.document;
  
  //- determine if contents is a fully specified html document
  //  with <html>, <head> and <body> tags, or just some tag soup.
  const isTagSoup = (dom.nodeLocation(doc.body) === null);
  
  //- querySelectorAll() will return a NodeList
  //- in this case a list of HTMLHeadingElement's
  const list = doc.querySelectorAll(options.hSelector);
  
  const headings = [];
  let newIdsCount = 0;
  
  for(let ix=0, ic=list.length; ix<ic; ix++) {
    const header = list[ix];
    const title = header.textContent;
    let id = undefined;
    
    if(header.hasAttribute("id")) {
      id = header.getAttribute("id");
    } else {
      id = options.slugFunc(title);
      header.setAttribute("id", id);
      newIdsCount++;
    }
    
    const tag = header.tagName;
    const level = Number.parseInt(tag.substring(1));
    
    headings.push({
      tag: tag,
      level: level,
      title: title,
      id: id
    });
  }//- for
  
  if(newIdsCount > 0) {
    if(isTagSoup === true) {
      contents = doc.body.innerHTML;
    } else {
      contents = dom.serialize();
    }
  }
  
  return {
    contents: contents,
    newIdsCount: newIdsCount,
    headings: headings
  };
}
