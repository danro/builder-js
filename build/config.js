/*! =======================================================
 * builder.js config
 * ========================================================*/
/*jshint node:true */
module.exports = {

  // remote ssh host, eg. "example.com" (optional)
  SSH_HOST: "",
  // destination for push (on local machine or ssh host)
  PUSH_PATH: "~/Desktop/push-test/",
  // write absolute urls for js & css tags
  ABSOLUTE_URLS: true,
  // directory for all output files
  DIST_DIR: "dist",
  // indent setting for html include tags
  TAG_INDENT: "  ",
  
  FILES: {
    // js templates (remove if not using them)
    JST: {
      FILENAME: "templates",
      NAMESPACE: "this.JST",
      TEMPLATE_DIR: "templates/",
      TEMPLATE_EXT: ".html"
    },
    // js scripts for dev-only insertion (optional)
    JS_DEV: [
      // live reload
      "js/libs/yepnope.js",
      "js/libs/livereload.js"
    ],
    // js files minified by smoosh
    JAVASCRIPT: {
      "script": [
        "js/plugins/_header.js",
        "js/plugins/jquery.easing.js",
        "js/app/index.js"
      ]
    },
    // css files minified by smoosh
    CSS: {
      "style": [
        "css/style.css"
      ]
    }
  }
};