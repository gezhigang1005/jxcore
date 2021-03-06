// Copyright Microsoft. All rights reserved.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files(the "Software"), to
// deal in the Software without restriction, including without limitation the
// rights to use, copy, modify, merge, publish, distribute, sublicense, and / or
// sell copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions :
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

var child_process = require('child_process');
var fs = require('fs');
var path = require('path');

var EOL_REGEX = /\r|\n|\r\n/;
var authors = [];
var authorsmap = {};
var srcroot;

function authorFile() {
  return path.join(srcroot, 'AUTHORS');
}

function addAuthor(line) {
  if (line.match(/.+ <.+>$/) && !authorsmap[line]) {
    authorsmap[line] = true;
    authors.push(line);
  }
}

// Load known authors from AUTHORS file
function loadAuthorsFile() {
  fs.readFile(authorFile(), function(err, data) {
    // ignore err, if so assume no existing AUTHORS file
    if (data) {
      data.toString().split(EOL_REGEX).forEach(addAuthor);
    }

    loadGitAuthors();
  });
}

// Load and combine authors from git log
function loadGitAuthors() {
  pipe(child_process.spawn(
    'git', ['log', '--reverse', '--pretty=%aN <%aE>', '--', srcroot]),
    addAuthor
  ).on('exit', function(code) {
    if (code != 0) {
      return console.log('git exits abnormally:', code);
    }

    saveAuthors();
  });
}

function pipe(proc, onLine) {
  var last;

  function addData(chunk) {
    var lines = ((last || '') + chunk).split(EOL_REGEX);
    last = lines[lines.length - 1];

    for (var i = 0; i < lines.length - 1; i++) {
      onLine(lines[i]);
    }
  }

  proc.stdout.on('data', function(data) {
    addData(data.toString());
  }).on('end', function() {
    if (last !== undefined) {
      onLine(last);
    }
  });

  return proc;
}

// Save updated authors
function saveAuthors() {
  fs.writeFile(authorFile(),
    '# Authors ordered by first contribution.\n\n'
      + authors.join('\n')
      + '\n\n# Generated by node tools/update-authors.js\n',
    function(err) {
      if (err) throw err;
      console.log('Updated ' + path.relative('', authorFile()));
    });
}

// Start
srcroot = process.argv.length > 2 ?
  process.argv[2] : path.join(path.dirname(process.argv[1]), '..');

loadAuthorsFile();
