/*
 * Copyright 2022 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 * 
 *     https://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Wraps a call to an Apps Script function in a promise
 * intead of using callbacks. Also adds type constraints
 * for arguments and return values.
 * 
 * @template {any[]} T - Argument types
 * @template {any} R - Return value type
 * @param {string} fn - Apps Script function name
 * @return {(...args:A) => Promise<R>} wraped function
 */
export function asyncAppsScriptFunction<A extends google.script.Parameter[], R>(fn: string): (...args:A) => Promise<R> {
    if (google.script.run[fn] === undefined) {
        throw new Error(`Function ${fn} does not exist on google.script.run`);
    }
    return function(...args: A): Promise<R> {
        return new Promise((resolve, reject) => {
            const context = google.script.run
                .withFailureHandler(reject)
                .withSuccessHandler(resolve);
            context[fn](...args);
        });
    }
}