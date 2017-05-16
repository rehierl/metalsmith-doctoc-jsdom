
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
  
  //- MDT's plugins API
  this.api = undefined;
}

//========//========//========//========//========//========//========//========

//- public, optional
Plugin.prototype.setPluginsApi = function(api) {
  this.api = api;
};

//========//========//========//========//========//========//========//========

//- public, not required
//- warning if needed and missing
Plugin.prototype.setDefaultOptions = function(options) {
  const clone = this.options.clone();
  clone.combine(options);
  this.optionsDefault = clone;
};

//========//========//========//========//========//========//========//========

//- public, not required
//- warning if needed and missing
Plugin.prototype.setFileOptions = function(filename, options) {
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
  
  return this.api.readFileContents(readContents, {
    api: this.api,
    filename: filename,
    file: file,
    options: options
  });
};

//========//========//========//========//========//========//========//========

function readContents(context) {
  const api = context.api;
  const contents = context.contents;
  const options = context.options;
  const selector = options.hSelector;
  
  const idgen = api.getIdGenerator({
    slugFunc: options.slugFunc,
    idPrefix: options.idPrefix,
    idLengthLimit: options.idLengthLimit
  });
  
  const dom = new JSDOM(contents, {
    //- must be enabled to use dom.nodeLocation()
    includeNodeLocations: true });
  const doc = dom.window.document;
  
  //- determine if contents is a fully specified html document
  //  with <html>, <head> and <body> tags, or just some tag soup.
  const isTagSoup = (dom.nodeLocation(doc.body) === null);
  
  //- querySelectorAll() will return a NodeList
  //- in this case a list of HTMLHeadingElement's
  const elements = doc.querySelectorAll(selector);
  
  const headings = [];
  let newIdsCount = 0;
  
  for(let ix=0, ic=elements.length; ix<ic; ix++) {
    const header = elements[ix];
    const title = header.textContent;
    let id = undefined;
    
    if(header.hasAttribute("id")) {
      //- assume that this id value is unique
      id = header.getAttribute("id");
    } else {
      id = idgen.nextId(title);
      
      if(options.makeIdsUnique === true) {
        while(doc.querySelector("#" + id) !== null) {
          id = idgen.nextId();
        }
      }
      
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
  
  if(newIdsCount <= 0) {
    delete context.contents;
  } else {
    if(isTagSoup === true) {
      context.contents = doc.body.innerHTML;
    } else {
      context.contents = dom.serialize();
    }
  }
  
  return api.createTreeFromHeadings(headings);
}
