'use strict';

const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const gulp = require('gulp');
const webpack = require('webpack-stream');
const sass = require('gulp-sass')(require('sass'));
const browserSync = require('browser-sync');
const autoprefixer = require('gulp-autoprefixer');
const rename = require('gulp-rename');

var production = false;

const file = {
  html:   'src/**/*.html',
  scss:   'src/assets/scss/**/*.scss',
  js:     'src/assets/js/src/**/*.js',
}

const page = {
  js:     'src/assets/js/src/page.js',
  scss:   'src/assets/scss/page.scss',
}

const dir = {
  css:    'src/assets/css/',
  js:     'src/assets/js/',
  font:   'src/assets/fonts/',
}

// Resolves webpack-style `@import "~pkg/..."` against node_modules.
const tildeImporter = {
  findFileUrl(url) {
    if (!url.startsWith('~')) return null;
    return pathToFileURL(path.join(__dirname, 'node_modules', url.slice(1)));
  },
};

const sassOptions = {
  importers: [tildeImporter],
  quietDeps: true,
  // ponytail: Bootstrap 4 theme sources predate the Sass module system; silence until migrating to Bootstrap 5.
  silenceDeprecations: ['import', 'global-builtin', 'color-functions', 'slash-div', 'abs-percent', 'function-units'],
};


/*
|--------------------------------------------------------------------------
| Serve
|--------------------------------------------------------------------------
|
*/
function reload(done) {
  browserSync.reload();
  done();
};

function serve(done) {
  browserSync({
    server: 'src/'
  });

  gulp.watch( file.scss, scss );
  gulp.watch( file.js, gulp.series(js, reload));
  gulp.watch( file.html, reload );
  done();
};


/*
|--------------------------------------------------------------------------
| SASS
|--------------------------------------------------------------------------
|
*/
function scssMinified() {
  return gulp.src(page.scss, { sourcemaps: true })
    .pipe( rename( { suffix: '.min' } ) )
    .pipe( sass({ ...sassOptions, style: 'compressed' }).on('error', sass.logError) )
    .pipe( autoprefixer() )
    .pipe( gulp.dest(dir.css, { sourcemaps: '.' }) )
    .pipe( browserSync.stream() );
};

function scssExpanded() {
  return gulp.src(page.scss, { sourcemaps: true })
    .pipe( sass(sassOptions).on('error', sass.logError) )
    .pipe( autoprefixer() )
    .pipe( gulp.dest(dir.css, { sourcemaps: '.' }) );
};

function scss(done) {
  return production ? gulp.parallel(scssMinified, scssExpanded)(done) : scssMinified();
};


/*
|--------------------------------------------------------------------------
| JS
|--------------------------------------------------------------------------
|
*/
function bundle(mode, filename) {
  return gulp.src(page.js)
    .pipe(webpack({
      mode: mode,
      devtool: 'source-map',
      output: {
        filename: filename
      },
      performance: {
        hints: false
      }
    }))
    .pipe( gulp.dest(dir.js) );
};

const js = () => bundle('none', 'page.min.js');
const jsProductionMinified = () => bundle('production', 'page.min.js');
const jsProductionExpanded = () => bundle('none', 'page.js');


/*
|--------------------------------------------------------------------------
| Copy
|--------------------------------------------------------------------------
|
*/
function copyFonts() {
  return gulp.src([
    'node_modules/font-awesome/fonts/*',
    'node_modules/themify-icons/themify-icons/fonts/*',
    'node_modules/et-line/fonts/*',
  ], { encoding: false }).pipe(gulp.dest(dir.font));
};

function distCopy() {
  return gulp.src( ['src/**/*', '!src/assets/{js/src,plugin/thesaas,scss}{,/**}'], { encoding: false } ).pipe(gulp.dest('dist/'));
};


/*
|--------------------------------------------------------------------------
| Clean /dist directory
|--------------------------------------------------------------------------
|
*/
function distClean(done) {
  fs.rmSync('dist/', { recursive: true, force: true });
  done();
};


/*
|--------------------------------------------------------------------------
| Tasks
|--------------------------------------------------------------------------
|
*/
function setProductionMode(done) {
  production = true;
  done();
}

function setDevMode(done) {
  production = false;
  done();
}



exports.dev     = gulp.series(copyFonts, scss, js);
exports.dist    = gulp.series(setProductionMode, distClean, copyFonts, scss, jsProductionMinified, jsProductionExpanded, distCopy, setDevMode);
exports.watch   = serve;
exports.default = serve;
