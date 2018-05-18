// Copyright 2017 Google Inc. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const gulp = require('gulp');
const concat = require('gulp-concat');

const third_party_source = [
	'../third_party/heap-js/heap.js',
	'../third_party/moment/moment.js',
	'../third_party/moment-timezone/moment-timezone.js',
	'../third_party/lodash/lodash.js'
];

gulp.task('concat-third-party', function() {
	return gulp.src(third_party_source)
	    .pipe(concat('3p-bundle.js'))
	    .pipe(gulp.dest('./dist/'));
});

gulp.task('default', ['concat-third-party']);
