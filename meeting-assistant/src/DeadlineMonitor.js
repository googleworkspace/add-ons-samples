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
 * Exception thrown when the deadline has been exceeded.
 *
 * @constructor
 */
function DeadlineExceededError() {}

/**
 * Prototype object for deadline monitor instances.
 */
var DeadlineMonitorPrototype = {
  /**
  * @type {number}
  */
  deadline: null,

  /**
   * Check to see if execution time was exceeded. Throws a DeadlineExceededError if so.
   *
   * @throws {DeadlineExceededError}
   */
  checkTimeout: function() {
    if (Date.now() >= this.deadline_) {
      console.warn('Stoped evaluation due to deadline exceeded.');
      throw new DeadlineExceededError();
    }
  },
};

/**
 * Creates a monitor to track total execution time. Each add-ons action has a deadline of 30s. Since
 * the search for free times can be complicated and long running, this allows it to short
 * circuit if taking too much time.
 *
 * @param {integer} timeoutSeconds
 * @return {DeadlineMonitor} Deadline monitor instance
 */
function buildDeadlineMonitor(timeoutSeconds) {
  return _.assign(Object.create(DeadlineMonitorPrototype), {
    deadline: Date.now() + timeoutSeconds * 60 * 1000,
  });
}
