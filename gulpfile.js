const gulp = require('gulp')
const babel = require('gulp-babel')
const uglify = require('gulp-uglify')

const build = () => {
  return gulp
    .src('./src/script.js')
    .pipe(babel())
    .pipe(uglify())
    .pipe(gulp.dest('./build'))
}

const watch = () => {
  gulp.watch('./src/script.js', build)
}

exports.build = build
exports.watch = watch
