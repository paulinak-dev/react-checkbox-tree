const gulp = require('gulp');
const eslint = require('gulp-eslint');
const mocha = require('gulp-mocha');
const header = require('gulp-header');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const scsslint = require('gulp-scss-lint');
const sass = require('gulp-sass');
const less = require('gulp-less');
const minify = require('gulp-clean-css');
const run = require('gulp-run');
const autoprefixer = require('gulp-autoprefixer');
const browserSync = require('browser-sync').create();
const pkg = require('./package.json');
const webpackConfig = require('./webpack.config');
const testWebpackConfig = require('./webpack.test.config');

const banner = '/*! <%= pkg.name %> - v<%= pkg.version %> | <%= new Date().getFullYear() %> */\n';

gulp.task('test-script-format', () => (
    gulp.src([
        './examples/src/**/*.js',
        './src/**/*.js',
        './test/**/*.js',
        './*.js',
    ])
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failOnError())
));

gulp.task('test-script-mocha', () => (
    gulp.src(['./test/**/*.js'])
        .pipe(mocha({
            require: [
                '@babel/register',
                './test/setup.js',
            ],
        }))
));

gulp.task('test-script', gulp.series('test-script-format', 'test-script-mocha'));

gulp.task('build-script', gulp.series('test-script', () => (
    gulp.src(['./src/index.js'])
        .pipe(webpackStream(webpackConfig('node'), webpack))
        .pipe(header(banner, { pkg }))
        .pipe(gulp.dest('./lib/'))
)));

gulp.task('build-script-web', gulp.series('build-script', () => (
    gulp.src(['./src/index.js'])
        .pipe(webpackStream(webpackConfig('web'), webpack))
        .pipe(header(banner, { pkg }))
        .pipe(gulp.dest('./lib/'))
)));

gulp.task('build-style', () => (
    gulp.src('./src/scss/**/*.scss')
        .pipe(scsslint())
        .pipe(scsslint.failReporter())
        .pipe(sass({
            outputStyle: 'expanded',
        }).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
        }))
        .pipe(gulp.dest('./lib'))
        .pipe(minify())
        .pipe(gulp.dest('./.css-compare/scss'))
));

gulp.task('build-style-less', () => (
    gulp.src('./src/less/**/*.less')
        .pipe(less())
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
        }))
        .pipe(minify())
        .pipe(gulp.dest('./.css-compare/less'))
));

gulp.task('compare-css-output', gulp.series(gulp.parallel('build-style', 'build-style-less', () => (
    run('cmp .css-compare/less/react-checkbox-tree.css .css-compare/scss/react-checkbox-tree.css').exec()
))));

gulp.task('build', gulp.series('build-script-web', 'compare-css-output'));

gulp.task('build-no-css-compare', gulp.series('build-script-web'));

gulp.task('build-examples-style', () => (
    gulp.src('./examples/src/scss/**/*.scss')
        .pipe(scsslint())
        .pipe(scsslint.failReporter())
        .pipe(sass({
            outputStyle: 'expanded',
        }).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
        }))
        .pipe(gulp.dest('./examples/dist'))
        .pipe(browserSync.stream())
));

gulp.task('build-examples-script', () => (
    gulp.src(['./examples/src/index.js'])
        .pipe(webpackStream(testWebpackConfig, webpack))
        .pipe(gulp.dest('./examples/dist/'))
        .pipe(browserSync.stream())
));

gulp.task('build-examples-html', () => (
    gulp.src('./examples/src/index.html')
        .pipe(gulp.dest('./examples/dist/'))
        .pipe(browserSync.stream())
));

gulp.task('examples', gulp.series(gulp.parallel('build-examples-style', 'build-examples-script', 'build-examples-html'), () => {
    browserSync.init({ server: './examples/dist' });

    gulp.watch(['./src/js/**/*.js', './examples/src/**/*.js']).on('change', gulp.series('build-examples-script'));
    gulp.watch(['./src/scss/**/*.scss', './examples/src/**/*.scss']).on('change', gulp.series('build-examples-style'));
    gulp.watch(['./examples/src/**/*.html']).on('change', gulp.series('build-examples-html', browserSync.reload));
}));

gulp.task('default', gulp.series('build'));
