#builder.js

Magical versioning, minifiying, remote-pushing build tool.\*

##About

This is a script I wrote to quickly deploy some of our internal prototype projects at [Eleven](https://github.com/eleven).

##Usage

Only requirement is that `node` must be installed.

From the base directory of your project (the dir that contains the makefile):

`make` - write js/css tags to the html include files (for local dev)  
`make test` - compress js/css and modify html includes to simulate production  
`make push` - compress js/css and push all files to production (using rsync)  

The [config](https://github.com/danro/builder-js/blob/master/build/config.js) should be pretty self-explanatory.

##Thanks

* Jacob Thornton - http://github.com/fat ([smoosh](https://github.com/fat/smoosh), [hogan.js](http://twitter.github.com/hogan.js))
* Robert Sayre - http://github.com/sayrer ([hogan.js](http://twitter.github.com/hogan.js))

##License

Written by Dan Rogers - https://github.com/danro  
This code may be freely distributed under the [MIT license](http://danro.mit-license.org/).

All included node modules retain their respective licenses.

\* not actually magical