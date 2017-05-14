
"use strict";

/*
 * A basic example to show how to add the menu to a file.
 */

const util = require("util");

module.exports = function(files, metalsmith, done) {
  Object.keys(files).forEach(function(current, index, array) {
    let file = files[current];

    if(!file.hasOwnProperty("doctoc")) {
      //- ignore
      return;
    }

    let contents = file.contents.toString('utf8');
    let root = file["doctoc"];
    let comment = [];

    comment.push("<!--");

    root.childrenAll.forEach(function(node, index, array) {
      const heading = node.heading;
      comment.push(util.format("%s%s - %s",
        ".".repeat(node.level),
        heading.tag, heading.title
      ));
    });

    comment.push("-->");
    comment = comment.join("\n");

    contents = [comment, contents];
    contents = contents.join("\n");

    file.contents = new Buffer(contents);
  });
  
  done();
};
