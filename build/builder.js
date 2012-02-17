/*! =======================================================
 * builder.js v1.5.0
 * Magical versioning, minifiying, remote-pushing build tool.
 * ========================================================
 * Written by Dan Rogers - https://github.com/danro
 * This code may be freely distributed under the MIT license.
 * http://danro.mit-license.org/
 * ========================================================*/

// modules
var fs = require("fs")
  , smoosh = require("smoosh")
  , hogan = require("hogan.js")
  , rimraf = require('rimraf')
  , mkdirp = require('mkdirp')
  , async = require('async')
  , exec = require("child_process").exec
  , spawn = require("child_process").spawn
  , rl = require("readline")
  , path = require("path")
  , config = require("./config.js");
  
// properties
var pushing = process.argv[2] === "push"
  , testing = process.argv[2] === "test"
  , msgPrefix = "[builder] ".green
  , basePath = "../"
  , distDir = config.DIST_DIR || "dist"
  , distPath = basePath + distDir
  , distFiles = {}
  , latestPath = "latest/"
  , templatesName = null
  , scriptInclude = basePath + "build-js.html"
  , styleInclude = basePath + "build-css.html"
  , includeTags = initIncludeTags()
  , tagIndent = config.TAG_INDENT || "  "
  , smooshConfig = {}
  , typeMinJS = ".min.js"
  , typeMinCSS = ".min.css"
  , srcPrefix = config.ABSOLUTE_URLS ? "/" : ""
  , versionStart = 3000
  , versionFile = "version.json"
  , versionData = {};

// start builder
showBanner();
initVersions();
// run async series for pushing
if (pushing) {
  async.series([
    initDistPaths,
    buildTemplates,
    smooshFiles,
    compareFiles,
    makeIncludesLive,
    pushToRemote,
    makeIncludesDev,
    logNewLine
  ]);
// run async series for testing
} else if (testing) {
  async.series([
    initDistPaths,
    buildTemplates,
    smooshFiles,
    compareFiles,
    makeIncludesLive,
    logNewLine
  ]);
// otherwise just write includes for development
} else {
  async.series([
    makeIncludesDev,
    logNewLine
  ]);
}

function showBanner () {
  console.log(" __            __  __     __                    __        ".green);
  console.log("|  |--..--.--.|__||  |.--|  |.-----..----.     |__|.-----.".green);
  console.log("|  _  ||  |  ||  ||  ||  _  ||  -__||   _| __  |  ||__ --|".green);
  console.log("|_____||_____||__||__||_____||_____||__|  |__| |  ||_____|".green);
  console.log("                                              |___|".green);
}

function initVersions () {
  var result = {};
  try {
    versionData = JSON.parse(fs.readFileSync(versionFile, "utf-8"));
  } catch (e) {
    versionData = {};
  }
  // loop thru config and add props to version data
  for (var key in config.FILES) {
    var value = config.FILES[key];
    if (typeof value.FILENAME !== "undefined") {
      addProp(value.FILENAME);
    } else {
      for (var filename in value) {
        addProp(filename);
      }
    }
  }
  versionData = result;
  saveVersionFile();
  
  function addProp (key) {
    if (typeof versionData[key] === "number") {
      result[key] = versionData[key];
    } else {
      result[key] = versionStart;
    }
  }
}

function initDistPaths (callback) {
  // remove and create "latest/" dir
  var pathExists = path.existsSync(latestPath);
  if (pathExists) {
    rimraf(latestPath, makeLatest);
  } else {
    makeLatest();
  }
  function makeLatest () {
    mkdirp(latestPath, "0775", makeDist);
  }
  // create dist if necessary
  function makeDist () {
    distDir = (distDir + "/").replace("//", "/");
    distPath = (distPath + "/").replace("//", "/");
    pathExists = path.existsSync(distPath);
    if (pathExists) {
      callback();
    } else {
      mkdirp(distPath, "0775", callback);
    }
  }
}

function buildTemplates (callback) {
  var options = config.FILES.JST;
  
  // skip straight to callback if no jst config
  if (typeof options === "undefined") return callback();
  
  // expose templatesName for other methods
  templatesName = options.FILENAME;
  
  var dir = options.TEMPLATE_DIR
    , ext = options.TEMPLATE_EXT || "."
    , jstNS = options.NAMESPACE || "JST"
    , jstOut = jstNS + "=" + jstNS + "||{};\n"
    , jstFile = latestPath + options.FILENAME + ".js"
    , templates = extractFiles();
  jstOut += templates.join("\n");
  console.log(msgPrefix + "compiling js templates using " + "Hogan".yellow.bold);
  fs.writeFileSync(jstFile, jstOut);
  return callback();
  
  function extractFiles () {
    var files;
    try {
      files = fs.readdirSync(basePath + dir);
    } catch (e) {
      console.log("\n" + msgPrefix + "invalid JST template dir: ".yellow + dir);
      return;
    }
    return files.filter(function (file) {
      return path.extname(file).indexOf(ext) !== -1;
    })
    .map(function (file) {
      var relPath = dir + file,
          tmplPath = srcPrefix + relPath,
          filePath = basePath + relPath,
          openedFile;
      try {
        openedFile = fs.readFileSync(filePath, "utf-8");
      } catch (e) {
        console.log("\n" + msgPrefix + "unable to read template file: ".yellow + filePath);
        return;
      }
      openedFile = removeByteOrderMark(openedFile.trim());
      return jstNS + '["' + tmplPath + '"] = ' + hogan.compile(openedFile, { asString: 1 });
    });
  }
  function removeByteOrderMark(text) {
    if (text.charCodeAt(0) === 0xfeff) {
      return text.substring(1);
    }
    return text;
  }
}

function smooshFiles (callback) {
  console.log(msgPrefix + "compressing js & css using " + "SMOOSH\n".rainbow.bold);

  // pass config along to smooshConfig
  smooshConfig.JAVASCRIPT = config.FILES.JAVASCRIPT;
  smooshConfig.CSS = config.FILES.CSS;
  smooshConfig = JSON.parse(JSON.stringify(smooshConfig, prefix));
  if (smooshConfig.JAVASCRIPT) smooshConfig.JAVASCRIPT.DIST_DIR = latestPath;
  if (smooshConfig.CSS) smooshConfig.CSS.DIST_DIR = latestPath;
  
  // run smoosh
  smoosh.config(smooshConfig).build("compressed").done(callback);

  function prefix (key, value) {
    // prefix paths for smoosh
    if (typeof(value) == "string") {
      return basePath + value;
    }
    return value;
  }
}

function compareFiles (callback) {
  console.log("\n" + msgPrefix + "copying new or changed files to: " + distPath.yellow);
  
  var files
    , message = ""
    , openedLatest
    , openedDist
    , fileInfo
    , filePath;

  // loop thru each file in latest directory
  files = fs.readdirSync(latestPath);
  files.forEach(function (file) {
    filePath = latestPath + file;
    try {
      openedLatest = fs.readFileSync(filePath, "utf-8");
    } catch (e) {
      console.log("\n" + msgPrefix + "unable to read file: ".yellow + filePath);
      return;
    }
    // try to open the dist file for comparisson
    fileInfo = getFileInfo(file);
    filePath = distPath + fileInfo.base + "-" + versionData[fileInfo.base] + fileInfo.ext;
    try {
      openedDist = fs.readFileSync(filePath, "utf-8");
    } catch (e) {
      openedDist = null;
    }
    // if dist file does not exist, create it
    if (!openedDist) {
      fs.writeFileSync(filePath, openedLatest);
      message += "+ " + ("[new file] " + filePath + "\n").yellow;
      exportDistName(fileInfo, filePath);
    // otherwise compare them to see if we need to increase the version
    } else {
      if (openedLatest === openedDist) {
        message += "- " + ("[no change] " + filePath + "\n").grey;
        exportDistName(fileInfo, filePath);
      } else {
        // increment version
        versionData[fileInfo.base]++;
        filePath = distPath + fileInfo.base + "-" + versionData[fileInfo.base] + fileInfo.ext;
        fs.writeFileSync(filePath, openedLatest);
        message += "+ " + ("[new version] " + filePath + "\n").cyan;
        exportDistName(fileInfo, filePath);
      }
    }
  });
  
  // save versionData in case it was modified
  saveVersionFile();
  
  // log results and fire callback
  console.log(message);
  callback();
  
  function exportDistName (fileInfo, filePath) {
    // export distFiles name for other methods
    distFiles[fileInfo.base] = path.basename(filePath);
  }
  
  function getFileInfo (file) {
    var info = { base: "", ext: "" };
    if (file.indexOf(typeMinJS) !== -1) {
      info.base = path.basename(file, typeMinJS);
      info.ext = typeMinJS;
    } else if (file.indexOf(typeMinCSS) !== -1) {
      info.base = path.basename(file, typeMinCSS);
      info.ext = typeMinCSS;
    } else if (file.indexOf(templatesName) !== -1) {
      info.base = templatesName;
      info.ext = ".js";
    }
    return info;
  }
}

function pushToRemote (callback) {
  // rsync files to server
  var child = null
    , useSSH = config.SSH_HOST && config.SSH_HOST !== ""
    , remoteHost = useSSH ? config.SSH_HOST + ":" : ""
    , remotePath = config.PUSH_PATH || ""
    , q = msgPrefix + "is about to push files to " + "[".yellow + remoteHost.cyan + remotePath.yellow + "]".yellow + " proceed?\n[enter = continue, no = abort]"
    , homeRegex = /^~\//;
  
  if (remotePath === "") {
    console.log("\n" + msgPrefix + "no remote path! we're done here.\n");
    return;
  }
  // fix ~ alias in local paths, because child_process.spawn doesn't know about it
  if (remoteHost === "" && homeRegex.test(remotePath)) {
    fixHomePath(runPush);
  } else {
    runPush();
  }
  function fixHomePath (done) {
    if (process.env.HOME) {
      remotePath = remotePath.replace(homeRegex, process.env.HOME + "/");
      done();
    } else {
      child = exec("dirname ~/.", function (error, stdout, stderr) {
        if (!error) remotePath = remotePath.replace(homeRegex, stdout.replace("\n", "") + "/");
        done();
      });
    }
  }
  function runPush () {
    var i = rl.createInterface(process.stdin, process.stdout);
    i.question(q, function(answer) {
      answer = answer.toLowerCase();
      // cancel rsync if the response is 'n' or 'no'
      if (answer.indexOf("n") != -1) {
        console.log("\n" + msgPrefix + "remote push aborted.\n".yellow);
        callback();
      } else {
        // otherwise begin rsync
        var args = [
          "-avzhO",
          "--include=.htaccess",
          "--exclude-from=./push-exclude",
          basePath,
          remoteHost + remotePath
        ];
        if (useSSH) {
          args.unshift("-e ssh");
        }
        console.log("\n" + msgPrefix + "ok. lets do this:\n" + ("rsync " + args.join(" ")).cyan);
        var rsync = spawn("rsync", args, { env: null });

        rsync.stdout.on('data', function (data) {
          // print rsync message and remove trailing newlines
          console.log(String(data).replace(/(\n)+$/g, "").cyan);
        });

        rsync.stderr.on('data', function (data) {
          console.log(String(data).yellow);
        });

        rsync.on('exit', function (code) {
          // rsync success
          if (code === 0) {
            console.log("\n" + msgPrefix + "push complete!\n");
            callback();
          // rsync error
          } else {
            console.log(("rsync process exited with code " + code).red);
          }
        });
      }
      // close interface + end process
      i.close();
      process.stdin.destroy();
    });
  }
}

function makeIncludesLive (callback) {
  initIncludeTags();
  var key
    , value
    , configJS = config.FILES.JAVASCRIPT || {}
    , configCSS = config.FILES.CSS || {}
  // prepend templates if they exist
  if (templatesName) {
    includeTags.js.push(scriptTag(srcPrefix + distDir + distFiles[templatesName]));
  }
  for (key in configJS) {
    includeTags.js.push(scriptTag(srcPrefix + distDir + distFiles[key]));
  }
  for (key in configCSS) {
    includeTags.css.push(styleTag(srcPrefix + distDir + distFiles[key]));
  }
  writeTagIncludes(true);
  callback();
}

function makeIncludesDev (callback) {
  initIncludeTags();
  var key
    , value
    , configJS = config.FILES.JAVASCRIPT || {}
    , configCSS = config.FILES.CSS || {}
  // append all js & css to tags arrays
  for (key in configJS) {
    value = configJS[key];
    if (Array.isArray(value)) {
      value.forEach(function(file) {
        includeTags.js.push(scriptTag(srcPrefix + file));
      });
    }
  }
  for (key in configCSS) {
    value = configCSS[key];
    if (Array.isArray(value)) {
      value.forEach(function(file) {
        includeTags.css.push(styleTag(srcPrefix + file));
      });
    }
  }
  writeTagIncludes();
  callback();
}

function writeTagIncludes (production) {
  var state = production ? "[production]".magenta : "[development]".green;
  var message = msgPrefix + "writing includes for: " + state;
  if (!production) {
    message += "\n-- ".grey + scriptInclude.yellow + " ----------- \n".grey + includeTags.js.join("\n").grey;
    message += "\n\n-- ".grey + styleInclude.yellow + " ----------- \n".grey + includeTags.css.join("\n").grey;
  }
  console.log(message);
  fs.writeFileSync(scriptInclude, includeTags.js.join("\n"+tagIndent) + "\n");
  fs.writeFileSync(styleInclude, includeTags.css.join("\n"+tagIndent) + "\n");
}

function initIncludeTags () {
  return (includeTags = { js: [], css: [] });
}

function scriptTag (fileName) {
  return '<script src="' + fileName + '"></script>';
}

function styleTag (fileName) {
  return '<link rel="stylesheet" href="' + fileName + '">';
}

function saveVersionFile () {
  fs.writeFileSync(versionFile, JSON.stringify(versionData));
}

function logNewLine (callback) {
  console.log("");
  callback && callback();
}