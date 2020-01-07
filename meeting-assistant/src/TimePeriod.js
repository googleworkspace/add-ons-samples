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

/**
 * Prototype object for TimePeriod instances.
 */
var TimePeriodPrototype = {
  /**
   * Start time
   * @type {number}
   */
  start: null,
  /**
   * End time
   * @type {number}
   */
  end: null,

  /**
  * Check if this period overlaps another.
  * @param {TimePeriod} period
  * @return {boolean}
  */
  overlaps: function(period) {
    return (
      Math.max(this.start, period.start) - Math.min(this.end, period.end) <= 0
    );
  },

  /**
  * Check if this period ends before another starts.
  * @param {TimePeriod} period
  * @return {boolean}
  */
  endsBefore: function(period) {
    return this.end <= period.start;
  },

  /**
  * Create a new period representing the full span of the combines periods.
  * @param {TimePeriod} period
  * @return {TimePeriod}
  */
  merge: function(period) {
    return timePeriod(
        Math.min(this.start, period.start),
        Math.max(this.end, period.end)
    );
  },

  /**
  * Gets the duration, in minutes, represented by this period.
  * @return {integer}
  */
  duration: function() {
    var diffInMillis = this.end - this.start;
    return Math.ceil(diffInMillis / (1000 * 60));
  },

  /**
  * Creates a copy of the object.
  * @return {TimePeriod}
  */
  clone: function() {
    return timePeriod(this.start, this.end);
  },

  toJSON: function() {
    return {
      start: moment(this.start).toISOString(),
      end: moment(this.end).toISOString(),
    };
  },
};

/**
 * Creates a new time period for the given range.
 *
 * @param {long} start - Start date/time, inclusive
 * @param {long} end - End date/time, inclusive
 * @constructor
 */
function timePeriod(start, end) {
  if (end <= start) {
    throw new Error('Start must be before end');
  }
  return _.assign(Object.create(TimePeriodPrototype), {
    start: start,
    end: end,
  });
}
