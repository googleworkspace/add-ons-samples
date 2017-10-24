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

var CREDENTIALS_KEY = "githubCredentials";

/**
 * Get the effective settings for the current user.
 *
 * @return {Object}
 */
function getGithubCredentials() {
  return cachedPropertiesForScript_().get(CREDENTIALS_KEY, null);
}

/**
 * Prototype object for cached access to script/user properties.
 */
var cachedPropertiesPrototype = {
  /**
  * Retrieve a saved property.
  *
  * @param {string} key - Key to lookup
  * @param {Object} defaultValue - Value to return if no value found in storage
  * @return {Object} retrieved value
  */
  get: function(key, defaultValue) {
    var value = this.cache.get(key);
    if (!value) {
      value = this.properties.getProperty(key);
      if (value) {
        this.cache.put(key, value);
      }
    }
    if (value) {
      return JSON.parse(value);
    }
    return defaultValue;
  },

  /**
  * Saves a value to storage
  *
  * @param {string} key - Key to identify value
  * @param {Object} value - Value to save, will be serialized to JSON.
  */
  put: function(key, value) {
    var serializedValue = JSON.stringify(value);
    this.cache.remove(key);
    this.properties.setProperty(key, serializedValue);
  },

  /**
  * Deletes any saved settings
  *
  * @param {string} key - Key to identify value
  */
  clear: function(key) {
    this.cache.remove(key);
    this.properties.deleteProperty(key);
  }
};

/**
 * Gets a cached property instance for the script
 * @return {CachedProperties}
 */
function cachedPropertiesForScript_() {
  return _.assign(Object.create(cachedPropertiesPrototype), {
    properties: PropertiesService.getScriptProperties(),
    cache: CacheService.getScriptCache()
  });
}
