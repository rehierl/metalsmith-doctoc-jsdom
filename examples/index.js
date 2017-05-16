
/* global __dirname */

"use strict";

const metalsmith = require("metalsmith");
const util = require("util");
const slug = require("slug");

//========//========//========//========//========

//- declared by Node
const basedir = __dirname;

//- create a new instance and set the working directory
const msi = new metalsmith(basedir)

//- set the working directory
.directory(basedir)

//- scan this subdirectory for source files
.source("files-input")

//- write the output files to this subdirectory
.destination("files-output")

//- set file or files to not load into the pipeline
//.ignore(files)

//- set true to recreate .destination()
//.clean(true)

//- the max number of files to read/write at a time
//.concurrency(Infinity)

//- global metadata to pass to templates
//.metadata({})

//- set true to enable frontmatter parsing
//.frontmatter(true)

//========//========//========//========//========

//- end the current expression
;

const doctoc = require("metalsmith-doctoc");
const plugin = require("../src/index.js");
const attach = require("./ex-attach.js");

//- start a new expression
msi

.use(function(files, metalsmith, done) {
  console.log("pre-plugin");
  done();
})

//*
.use(doctoc({
  filter: "**",
  //ignoreFlag: false,
  doctocFlag: "doctoc",
  
  plugins: {
    jsdom: {
      plugin: plugin,
      options: {
        hRange: "h1-6",
        slugFunc: (title) => {
          return "slugged-" + slug(title);
        },
        idPrefix: "",
        makeIdsUnique: true
      }
    }
  },
  
  "default": "jsdom",
  //enableRequire: false,
  //resolveFunc: require,
  doctocTree: "doctoc"
}))//*/

.use(function(files, metalsmith, done) {
  console.log("pre-attach");
  done();
})

.use(attach)

.use(function(files, metalsmith, done) {
  console.log("pre-build");
  done();
})

//- run metalsmith's build process
.build(function(error, files) {
  if(!error) { return false; }
  
  //- may have error.innerError
  console.log("ERROR:", error);
  
  //throw error;
});
