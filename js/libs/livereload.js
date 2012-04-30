/*global yepnope */
!function () {
  var src = 'http://' + (location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1';
  yepnope.injectJs(src);
}();