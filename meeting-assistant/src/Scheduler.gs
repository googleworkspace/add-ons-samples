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
 * Prototype object for scheduler instances.
 */
var SchedulerPrototype = {
  emailAddresses: [],
  durationMinutes: DEFAULT_DURATION_MINUTES,
  searchRangeDays: DEFAULT_SEARCH_RANGE_DAYS,
  maxFreeTimes: DEFAULT_MAX_FREE_TIMES,
  allowWeekends: DEFAULT_ALLOW_WEEKENDS,
  startHour: DEFAULT_START_HOUR,
  endHour: DEFAULT_END_HOUR,
  meetingIntervalMinutes: DEFAULT_MEETING_INTERVAL_MINUTES,
  timezone: Session.getScriptTimeZone(),

  /**
  * Finds the next N available times among a set of participants, where N
  * is set via the builder's `maxFreeTimes` property.
  *
  * @return {Object}
  */
  findAvailableTimes: function() {
    if (DEBUG) {
      console.time("findAvailableTimes");
    }

    if (DEBUG) {
      console.log(JSON.parse(JSON.stringify(this))); // Workaround console.log bug
    }

    try {
      this.timeMin_ = this.currentTime || Date.now();
      this.timeMax_ = moment(this.timeMin_)
        .add(this.searchRangeDays, "days")
        .valueOf();
      var freeBusyResponse = this.queryFreeBusy_();
      var errors = collectErrors_(freeBusyResponse);
      var mergedCalendars = mergeCalendars_(
        _.map(freeBusyResponse.calendars, "busy")
      );
      var freeTimes = this.matchFreeTimes_(mergedCalendars);

      var response = {
        freeTimes: freeTimes,
        isPartialResponse: !_.isEmpty(errors)
      };

      if (DEBUG) {
        console.log(JSON.parse(JSON.stringify(response))); // Workaround console.log bug
      }

      return response;
    } finally {
      if (DEBUG) {
        console.timeEnd("findAvailableTimes");
      }
    }
  },

  /**
  * Queries the Calendar API for busy times.
  *
  * @return {Object} free/busy calendars
  * @private
  */
  queryFreeBusy_: function() {
    if (DEBUG) {
      console.time("queryFreeBusy");
    }
    try {
      var request = {
        timeMin: moment(this.timeMin_).toISOString(),
        timeMax: moment(this.timeMax_).toISOString(),
        items: _.map(this.emailAddresses, function(item) {
          return { id: item };
        })
      };
      var result = Calendar.Freebusy.query(request);

      if (DEBUG) {
        console.log(result);
      }
      return result;
    } finally {
      if (DEBUG) {
        console.timeEnd("queryFreeBusy");
      }
    }
  },

  /**
  * Finds candidate time periods that are not marked as busy by
  * any of the participants.
  *
  * @param {LazyMergedCalendarsIterator} iterator - consolidated busy times
  * @return {TimePeriod[]}
  * @private
  */
  matchFreeTimes_: function(iterator) {
    if (DEBUG) {
      console.time("matchFreeTimes");
    }
    try {
      var nextPeriod = this.createAdjustedPeriod_(this.timeMin_);
      var freeTimes = [];
      var nextBusyPeriod = iterator.next();

      while (
        nextPeriod.end <= this.timeMax_ &&
        freeTimes.length < this.maxFreeTimes
      ) {
        if (this.deadlineMonitor) {
          this.deadlineMonitor.checkTimeout();
        }

        if (nextBusyPeriod && !nextPeriod.endsBefore(nextBusyPeriod)) {
          nextPeriod = this.createAdjustedPeriod_(nextBusyPeriod.end);
          nextBusyPeriod = iterator.next();
          continue;
        }
        if (this.isValidTimePeriod_(nextPeriod)) {
          freeTimes.push(nextPeriod);
        }
        var nextStart = moment(nextPeriod.start)
          .add(this.meetingIntervalMinutes, "minutes")
          .valueOf();
        nextPeriod = this.createAdjustedPeriod_(nextStart);
      }
      return freeTimes;
    } finally {
      if (DEBUG) {
        console.timeEnd("matchFreeTimes");
      }
    }
  },

  /**
  * Creates a candidate time period to evaluate. It attempts to create
  * a period that is in the future, of sufficient duration,
  * and within the start/end times defined
  * by the user. The start and end times may be adjusted to a future
  * day depending on the constraints of the scheduler.
  *
  * @param {moment} startTime - start date/time.
  * @return {TimePeriod}
  * @private
  */
  createAdjustedPeriod_: function(startTime) {
    var start = moment(startTime).tz(this.timezone);

    // Round up and make the time clean
    start
      .minutes(roundUpToNearest_(start.minutes(), this.meetingIntervalMinutes))
      .seconds(0)
      .milliseconds(0);

    // Adjust start time if needed
    if (start.hour() < this.startHour) {
      start.hour(this.startHour);
    } else if (
      start.hour() + Math.round(this.durationMinutes / 60) >=
      this.endHour
    ) {
      // Would end after our end time, try next day
      start
        .add(1, "days")
        .hour(this.startHour)
        .minute(0);
    }

    if (!(this.allowWeekends || _.includes(WEEKDAYS, start.day()))) {
      // Move to next weekday
      start
        .add(start.day() == 0 ? 1 : 2, "day")
        .hour(this.startHour)
        .minutes(0);
    }

    // Adjust end if needed. This may create an invalid period that is too short, but
    // that is checked later on
    var end = start.clone().add(this.durationMinutes, "minutes");
    if (end.hour() >= this.endHour) {
      end.hour(this.endHour).minutes(0);
    }

    return timePeriod(start.valueOf(), end.valueOf());
  },

  /**
  * Checks if a time period satisifies our meeting constraints.
  *
  * @param {TimePeriod}
  * @return {boolean}
  * @private
  */
  isValidTimePeriod_: function(timePeriod) {
    var validDay =
      this.allowWeekends_ ||
      _.includes(
        WEEKDAYS,
        moment(timePeriod.start)
          .tz(this.timezone)
          .day()
      );
    var validDuration = timePeriod.duration() >= this.durationMinutes;
    return validDuration && validDay;
  },

  toJSON: function() {
    return _.pick(this, [
      "emailAddresses",
      "durationMinutes",
      "searchRangeDays",
      "maxFreeTimes",
      "allowWeekends",
      "startHour",
      "endHour",
      "meetingIntervalMinutes",
      "timezone",
      "timeMin_",
      "timeMax_"
    ]);
  }
};

/**
 * Gets a scheduler with the supplied configuration.
 * @param {Object} opts Parameters for building the card
 * @param {string[]} opts.emailAddresses - Email addresses of meeting participants
 * @param {number} opts.durationMinutes - Default meeting duration in minutes
 * @param {number} opts.startHour - Default start of workday, as hour of day (0-23)
 * @param {number} opts.endHour - Default end of workday, as hour of day (0-23)
 * @param {number} opts.meetingIntervalMinutes - Minute mark of the hour meetings can start on (15, 30, 60)
 * @param {number} opts.searchRangeDays - How many days ahead to search calendars
 * @param {boolean} opts.allowWeekends - Whether or not to schedule on weekends.
 * @param {string} opts.timezone - User's timezone.
 * @param {DeadlineMonitor} opts.deadlineMonitor - Monitors execution time limits
 * @return {Scheduler}.
 */
function buildScheduler(opts) {
  return _.assign(Object.create(SchedulerPrototype), opts);
}

/**
 * Prototype object for iterator instances.
 */
var MergedCalendarsIteratorPrototype = {
  /**
   * Free/busy calendars to merge.
   * @type {Object[]}
   */
  calendars: [],

  /**
   * Get the next busy period. Returns undefined if no more available.
   *
   * @return {TimePeriod}
   */
  next: function() {
    if (this.heap_.isEmpty()) {
      return undefined;
    }

    var timePeriod = this.popAndQueueNextTimePeriod_();
    while (!this.heap_.isEmpty()) {
      // Coalesce overlapping time periods into one slot
      var next = this.peekNextTimePeriod_();
      if (timePeriod.overlaps(next)) {
        timePeriod = timePeriod.merge(this.popAndQueueNextTimePeriod_());
      } else {
        break;
      }
    }
    return timePeriod;
  },

  /**
   * Gets the next busy period without removing it.
   * 
   * @return {TimePeriod}
   * @private
   */
  peekNextTimePeriod_: function() {
    if (this.heap_.isEmpty()) {
      return undefined;
    }
    return this.heap_.peek().timePeriod;
  },

  /**
   * Removes the next busy period and re-populates the heap.
   * 
   * @return {TimePeriod}
   * @private
   */
  popAndQueueNextTimePeriod_: function() {
    var entry = this.heap_.pop();
    this.queueNext_(entry.calendar, entry.index + 1);
    return entry.timePeriod;
  },

  /**
   * Inserts the next busy period from a calendar into the heap.
   * 
   * @param {TimePeriod[]} calendar - busy calendar to read from.
   * @param {integer} index - Index of next item to load into the heap.
   * @private
   */
  queueNext_: function(calendar, index) {
    if (index < calendar.length) {
      var period = calendar[index];
      var entry = {
        timePeriod: timePeriod(
          Date.parse(period.start),
          Date.parse(period.end)
        ),
        calendar: calendar,
        index: index
      };
      this.heap_.push(entry);
    }
  },

  /**
   * Initializes the iterator by loading the first element of each calendar
   * into the heap.
   */
  init_: function() {
    this.heap_ = new Heap(function(a, b) {
      if (!a || !b) {
        return 0;
      }
      return a.timePeriod.start - b.timePeriod.start;
    });

    // Init heap with first element from each calendar
    for (var i = 0; i < this.calendars.length; ++i) {
      this.queueNext_(this.calendars[i], 0);
    }
  }
};

/**
 * Merges a set of busy calendars into one unified view with overlapping
 * periods coalesced together.
 *
 * Calendars are lazily merged using a varient of the direct k-way merge algorithm.
 *
 * @param {Array} calendars - array of busy calendars, assumed each sorted chronologically
 */
function mergeCalendars_(calendars) {
  var iterator = _.assign(Object.create(MergedCalendarsIteratorPrototype), {
    calendars: calendars
  });
  iterator.init_();
  return iterator;
}

/**
 * Flattens all errors from the Calendar API free/busy response.
 * @params {Object} freeBusyResponse - Response from calendar API
 * @return {Object[]}
 */
function collectErrors_(freeBusyResponse) {
  return _.reject(
    _.flatten(
      _.concat(
        _.map(freeBusyResponse.calendars, "errors"),
        _.map(freeBusyResponse.groups, "errors")
      )
    ),
    _.isNil
  );
}

/**
 * Rounds a number up to the nearest multiple of another.
 * Example:
 *   roundUpToNearest_(5, 30) -> 30
 *   roundUpToNearest_(30, 30) -> 30
 *   roundUpToNearest_(35, 30) -> 60
 *
 * @param {integer} numToRound - Number to round
 * @param {integer} numToRoundTo - Multipe to round to
 * @return {integer}
 * @private
 */
function roundUpToNearest_(numToRound, numToRoundTo) {
  numToRoundTo = 1 / numToRoundTo;
  return Math.ceil(numToRound * numToRoundTo) / numToRoundTo;
}
