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

import type { JsonPrimitive, JsonValue } from 'type-fest';

/**
 * Flattens a JSON object into a 2D array for a sheet.
 *
 * Rules:
 * 
 * - Arrays entries map to rows
 * - Leaf-node properties (strings/numbers/booleans) map to columns
 * - Leaf-nodes on parent objects are replicated on child rows if
 *   an array is also a descendant.
 * 
 * Example:
 * 
 * ```
 *     {
 *        organization: 'googleworkspace',
 *        repositories: [
 *            {
 *                name: 'java-samples',
 *                issueCount: 20,
 *            },
 *            {
 *                name: 'python-samples',
 *                issueCount: 10,
 *            }
 *        ]
 *    }
 * ```
 * 
 * Maps to:
 * 
 * ```
 * googleworkspace, java-samples, 20
 * googleworkspace, python-samples, 10
 * ```
 * 
 * @param value - Object to map
 * @param includeHeaders - True if a header row should be included
 * @param data - Array to write values to
 * @param row - Current row offset (default 0)
 * @param column - Current column offset (default 0)
 * @returns Array of values
 */
export function objectToCellData(value: JsonValue, includeHeaders = true, data: JsonPrimitive[][] = [], row = 0, column = 0, key?: string) {
    if (includeHeaders && data[0] === undefined) {
        data[0] = [];
        row++;
    }
    if (Array.isArray(value)) {
        for (const item of value) {
            objectToCellData(item, includeHeaders, data, row, column, key);
            row = data.length;
        }
    } else if (isObject(value)) {
        for (const k of Object.getOwnPropertyNames(value)) {
            objectToCellData(value[k], includeHeaders, data, row, column, k);
            column++;
        }
    } else {
        if (key && includeHeaders && data[0][column] === undefined) {
            data[0][column] = key;
        }    
        if (data[row] === undefined) {
            if (row > 1 && column > 0) {
                // Copy previous row to inherent any
                // parent object columns
                data[row] = [...data[row - 1]];
            } else {
                data[row] = [];
            }
        }
        data[row][column] = value;
    }
    return data;
}

/**
 * Strict(er) type guard for objects
 * @param val Object to check
 * @returns true if is an object and not an array
 */
function isObject(val: unknown): val is object {
    return typeof val === 'object'
        && val !== null
        && val !== undefined
        && !Array.isArray(val);
}
