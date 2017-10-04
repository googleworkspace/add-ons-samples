//BSD 3-Clause License
//
//Copyright (c) 2017, Ignacio Lago
//All rights reserved.
//
//Redistribution and use in source and binary forms, with or without
//modification, are permitted provided that the following conditions are met:
//
//* Redistributions of source code must retain the above copyright notice, this
//  list of conditions and the following disclaimer.
//
//* Redistributions in binary form must reproduce the above copyright notice,
//  this list of conditions and the following disclaimer in the documentation
//  and/or other materials provided with the distribution.
//
//* Neither the name of the copyright holder nor the names of its
//  contributors may be used to endorse or promote products derived from
//  this software without specific prior written permission.
//
//THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
//AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
//IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
//DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
//FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
//DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
//SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
//CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
//OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
//OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

/**
 * Heap
 * @type {Class}
 */
var Heap = (function () {
    /**
     * Heap instance constructor.
     * @param  {Function} compare Optional comparison function, defaults to Heap.minComparator<number>
     */
    function Heap(compare) {
        if (compare === void 0) { compare = Heap.minComparator; }
        var _this = this;
        this.heapArray = [];
        this._limit = null;
        /**
         * Alias of add
         */
        this.offer = this.add;
        /**
         * Alias of peek
         */
        this.element = this.peek;
        /**
         * Alias of pop
         */
        this.poll = this.pop;
        /**
         * Returns the inverse to the comparison function.
         * @return {Function}
         */
        this._invertedCompare = function (a, b) {
            return -1 * _this.compare(a, b);
        };
        this.compare = compare;
    }
    /*
              Static methods
     */
    /**
     * Gets children indices for given index.
     * @param  {Number} idx     Parent index
     * @return {Array(Number)}  Array of children indices
     */
    Heap.getChildrenIndexOf = function (idx) {
        return [idx * 2 + 1, idx * 2 + 2];
    };
    /**
     * Gets parent index for given index.
     * @param  {Number} idx  Children index
     * @return {Number | undefined}      Parent index, -1 if idx is 0
     */
    Heap.getParentIndexOf = function (idx) {
        if (idx <= 0) {
            return -1;
        }
        var whichChildren = idx % 2 ? 1 : 2;
        return Math.floor((idx - whichChildren) / 2);
    };
    /**
     * Gets sibling index for given index.
     * @param  {Number} idx  Children index
     * @return {Number | undefined}      Sibling index, -1 if idx is 0
     */
    Heap.getSiblingIndexOf = function (idx) {
        if (idx <= 0) {
            return -1;
        }
        var whichChildren = idx % 2 ? 1 : -1;
        return idx + whichChildren;
    };
    /**
     * Min heap comparison function, default.
     * @param  {any} a     First element
     * @param  {any} b     Second element
     * @return {Number}    0 if they're equal, positive if `a` goes up, negative if `b` goes up
     */
    Heap.minComparator = function (a, b) {
        return a - b;
    };
    /**
     * Max heap comparison function.
     * @param  {any} a     First element
     * @param  {any} b     Second element
     * @return {Number}    0 if they're equal, positive if `a` goes up, negative if `b` goes up
     */
    Heap.maxComparator = function (a, b) {
        return b - a;
    };
    /**
     * Default equality function.
     * @param  {any} a    First element
     * @param  {any} b    Second element
     * @return {Boolean}  True if equal, false otherwise
     */
    Heap.defaultIsEqual = function (a, b) {
        return a === b;
    };
    /**
     * Prints a heap.
     * @param  {Heap} heap Heap to be printed
     * @returns {String}
     */
    Heap.print = function (heap) {
        function deep(i) {
            var pi = Heap.getParentIndexOf(i);
            return Math.floor(Math.log2(pi + 1));
        }
        function repeat(str, times) {
            var out = "";
            for (; times > 0; --times) {
                out += str;
            }
            return out;
        }
        var node = 0;
        var lines = [];
        var maxLines = deep(heap.length - 1) + 2;
        var maxLength = 0;
        while (node < heap.length) {
            var i = deep(node) + 1;
            if (node === 0) {
                i = 0;
            }
            // Text representation
            var nodeText = heap.get(node).toString();
            if (nodeText.length > maxLength) {
                maxLength = nodeText.length;
            }
            // Add to line
            lines[i] = lines[i] || [];
            lines[i].push(nodeText);
            node += 1;
        }
        return lines
            .map(function (line, i) {
            var times = Math.pow(2, maxLines - i) - 1;
            return (repeat(" ", Math.floor(times / 2) * maxLength) +
                line
                    .map(function (el) {
                    // centered
                    var half = (maxLength - el.length) / 2;
                    return (repeat(" ", Math.ceil(half)) +
                        el +
                        repeat(" ", Math.floor(half)));
                })
                    .join(repeat(" ", times * maxLength)));
        })
            .join("\n");
    };
    /*
              Python style
     */
    /**
     * Converts an array into an array-heap
     * @param  {Array}    arr      Array to be modified
     * @param  {Function} compare  Optional compare function
     * @return {Heap}              For convenience, it returns a Heap instance
     */
    Heap.heapify = function (arr, compare) {
        var heap = new Heap(compare);
        heap.heapArray = arr;
        heap.init();
        return heap;
    };
    /**
     * Extract the peek of an array-heap
     * @param  {Array}    heapArr  Array to be modified, should be a heap
     * @param  {Function} compare  Optional compare function
     * @return {any}               Returns the extracted peek
     */
    Heap.heappop = function (heapArr, compare) {
        var heap = new Heap(compare);
        heap.heapArray = heapArr;
        return heap.pop();
    };
    /**
     * Pushes a item into an array-heap
     * @param  {Array}    heapArr  Array to be modified, should be a heap
     * @param  {any}      item     Item to push
     * @param  {Function} compare  Optional compare function
     */
    Heap.heappush = function (heapArr, item, compare) {
        var heap = new Heap(compare);
        heap.heapArray = heapArr;
        heap.push(item);
    };
    /**
     * Push followed by pop, faster
     * @param  {Array}    heapArr  Array to be modified, should be a heap
     * @param  {any}      item     Item to push
     * @param  {Function} compare  Optional compare function
     * @return {any}               Returns the extracted peek
     */
    Heap.heappushpop = function (heapArr, item, compare) {
        var heap = new Heap(compare);
        heap.heapArray = heapArr;
        return heap.pushpop(item);
    };
    /**
     * Replace peek with item
     * @param  {Array}    heapArr  Array to be modified, should be a heap
     * @param  {any}      item     Item as replacement
     * @param  {Function} compare  Optional compare function
     * @return {any}               Returns the extracted peek
     */
    Heap.heapreplace = function (heapArr, item, compare) {
        var heap = new Heap(compare);
        heap.heapArray = heapArr;
        return heap.replace(item);
    };
    /**
     * Return the `n` most valuable elements
     * @param  {Array}    heapArr  Array, should be a heap
     * @param  {number}   n        Max number of elements
     * @param  {Function} compare  Optional compare function
     * @return {any}               Elements
     */
    Heap.heaptop = function (heapArr, n, compare) {
        if (n === void 0) { n = 1; }
        var heap = new Heap(compare);
        heap.heapArray = heapArr;
        return heap.top(n);
    };
    /**
     * Return the `n` least valuable elements
     * @param  {Array}    heapArr  Array, should be a heap
     * @param  {number}   n        Max number of elements
     * @param  {Function} compare  Optional compare function
     * @return {any}               Elements
     */
    Heap.heapbottom = function (heapArr, n, compare) {
        if (n === void 0) { n = 1; }
        var heap = new Heap(compare);
        heap.heapArray = heapArr;
        return heap.bottom(n);
    };
    /*
              Instance methods
     */
    /**
     * Adds an element to the heap. Aliases: `offer`.
     * Same as: push(element)
     * @param {any} element Element to be added
     * @return {Boolean} true
     */
    Heap.prototype.add = function (element) {
        this._sortNodeUp(this.heapArray.push(element) - 1);
        this._applyLimit();
        return true;
    };
    /**
     * Adds an array of elements to the heap.
     * Similar as: push(element, element, ...).
     * @param {Array} elements Elements to be added
     * @return {Boolean} true
     */
    Heap.prototype.addAll = function (elements) {
        var i = this.length;
        (_a = this.heapArray).push.apply(_a, elements);
        for (var l = this.length; i < l; ++i) {
            this._sortNodeUp(i);
        }
        this._applyLimit();
        return true;
        var _a;
    };
    /**
     * Return the bottom (lowest value) N elements of the heap.
     *
     * @param  {Number} n  Number of elements.
     * @return {Array}     Array of length <= N.
     */
    Heap.prototype.bottom = function (n) {
        if (n === void 0) { n = 1; }
        if (this.heapArray.length === 0 || n <= 0) {
            // Nothing to do
            return [];
        }
        else if (this.heapArray.length === 1) {
            // Just the peek
            return [this.heapArray[0]];
        }
        else if (n >= this.heapArray.length) {
            // The whole peek
            // Clone is needed due to the sort method (in-place) that would destroy the heap
            var cloned = this.heapArray.slice(0);
            cloned.sort(this._invertedCompare);
            return cloned;
        }
        else {
            // Some elements
            var result = this._bottomN(n);
            result.sort(this._invertedCompare);
            return result;
        }
    };
    /**
     * Check if the heap is sorted, useful for testing purposes.
     * @return {Undefined | Element}  Returns an element if something wrong is found, otherwise it's undefined
     */
    Heap.prototype.check = function () {
        var _this = this;
        return this.heapArray.find(function (el, j, arr) {
            return !!_this.getChildrenOf(j).find(function (ch) { return _this.compare(el, ch) > 0; });
        });
    };
    /**
     * Remove all of the elements from this heap.
     */
    Heap.prototype.clear = function () {
        this.heapArray = [];
    };
    /**
     * Clone this heap
     * @return {Heap}
     */
    Heap.prototype.clone = function () {
        var cloned = new Heap(this.comparator());
        cloned.heapArray = this.toArray();
        cloned._limit = this._limit;
        return cloned;
    };
    /**
     * Returns the comparison function.
     * @return {Function}
     */
    Heap.prototype.comparator = function () {
        return this.compare;
    };
    /**
     * Returns true if this queue contains the specified element.
     * @param  {any}      o   Element to be found
     * @param  {Function} fn  Optional comparison function, receives (element, needle)
     * @return {Boolean}
     */
    Heap.prototype.contains = function (o, fn) {
        if (fn === void 0) { fn = Heap.defaultIsEqual; }
        return this.heapArray.findIndex(function (el) { return fn(el, o); }) >= 0;
    };
    /**
     * Initialise a heap, sorting nodes
     * @param  {Array} array Optional initial state array
     */
    Heap.prototype.init = function (array) {
        if (array) {
            this.heapArray = array.slice(0);
        }
        for (var i = Math.floor(this.heapArray.length); i >= 0; --i) {
            this._sortNodeDown(i);
        }
        this._applyLimit();
    };
    /**
     * Test if the heap has no elements.
     * @return {Boolean} True if no elements on the heap
     */
    Heap.prototype.isEmpty = function () {
        return this.length === 0;
    };
    /**
     * Get the leafs of the tree (no children nodes)
     */
    Heap.prototype.leafs = function () {
        if (this.heapArray.length === 0) {
            return [];
        }
        var pi = Heap.getParentIndexOf(this.heapArray.length - 1);
        return this.heapArray.slice(pi + 1);
    };
    Object.defineProperty(Heap.prototype, "length", {
        /**
         * Length of the heap.
         * @return {Number}
         */
        get: function () {
            return this.heapArray.length;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Heap.prototype, "limit", {
        /**
         * Get length limit of the heap.
         * @return {Number}
         */
        get: function () {
            return this._limit;
        },
        /**
         * Set length limit of the heap.
         * @return {Number}
         */
        set: function (_l) {
            this._limit = _l;
            this._applyLimit();
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Top node. Aliases: `element`.
     * Same as: `top(1)[0]`
     * @return {any} Top node
     */
    Heap.prototype.peek = function () {
        return this.heapArray[0];
    };
    /**
     * Extract the top node (root). Aliases: `poll`.
     * @return {any} Extracted top node, undefined if empty
     */
    Heap.prototype.pop = function () {
        var pop = this.heapArray.pop();
        if (this.length > 0 && pop !== undefined) {
            return this.replace(pop);
        }
        return pop;
    };
    /**
     * Pushes element(s) to the heap.
     * @param  {...any} elements Elements to insert
     * @return {Boolean} True if elements are present
     */
    Heap.prototype.push = function () {
        var elements = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            elements[_i] = arguments[_i];
        }
        if (elements.length < 1) {
            return false;
        }
        else if (elements.length === 1) {
            return this.add(elements[0]);
        }
        else {
            return this.addAll(elements);
        }
    };
    /**
     * Same as push & pop in sequence, but faster
     * @param  {any} element Element to insert
     * @return {any}  Extracted top node
     */
    Heap.prototype.pushpop = function (element) {
        if (this.compare(this.heapArray[0], element) < 0) {
            
            _a = [this.heapArray[0], element], element = _a[0], this.heapArray[0] = _a[1];
            this._sortNodeDown(0);
        }
        return element;
        var _a;
    };
    /**
     * Remove an element from the heap.
     * @param  {any}   o      Element to be found
     * @param  {Function} fn  Optional function to compare
     * @return {Boolean}      True if the heap was modified
     */
    Heap.prototype.remove = function (o, fn) {
        if (fn === void 0) { fn = Heap.defaultIsEqual; }
        if (this.length > 0) {
            if (o === undefined) {
                this.pop();
                return true;
            }
            else {
                var idx = this.heapArray.findIndex(function (el) { return fn(el, o); });
                if (idx >= 0) {
                    if (idx === 0) {
                        this.pop();
                    }
                    else if (idx === this.length - 1) {
                        this.heapArray.pop();
                    }
                    else {
                        this.heapArray.splice(idx, 1, this.heapArray.pop());
                        this._sortNodeUp(idx);
                        this._sortNodeDown(idx);
                    }
                    return true;
                }
            }
        }
        return false;
    };
    /**
     * Pop the current peek value, and add the new item.
     * @param  {any} element  Element to replace peek
     * @return {any}         Old peek
     */
    Heap.prototype.replace = function (element) {
        var peek = this.heapArray[0];
        this.heapArray[0] = element;
        this._sortNodeDown(0);
        return peek;
    };
    /**
     * Size of the heap
     * @return {Number}
     */
    Heap.prototype.size = function () {
        return this.length;
    };
    /**
     * Return the top (highest value) N elements of the heap.
     *
     * @param  {Number} n  Number of elements.
     * @return {Array}    Array of length <= N.
     */
    Heap.prototype.top = function (n) {
        if (n === void 0) { n = 1; }
        if (this.heapArray.length === 0 || n <= 0) {
            // Nothing to do
            return [];
        }
        else if (this.heapArray.length === 1 || n === 1) {
            // Just the peek
            return [this.heapArray[0]];
        }
        else if (n >= this.heapArray.length) {
            // The whole peek
            // Clone is needed due to the sort method (in-place) that would destroy the heap
            var cloned = this.heapArray.slice(0);
            cloned.sort(this.compare);
            return cloned;
        }
        else {
            // Some elements
            var result = this._topN(n);
            result.sort(this.compare);
            return result;
        }
    };
    /**
     * Clone the heap's internal array
     * @return {Array}
     */
    Heap.prototype.toArray = function () {
        return this.heapArray.slice(0);
    };
    /**
     * String output, call to Array.prototype.toString()
     * @return {String}
     */
    Heap.prototype.toString = function () {
        return this.heapArray.toString();
    };
    /**
     * Get the element at the given index.
     * @param  {Number} i Index to get
     * @return {any}       Element at that index
     */
    Heap.prototype.get = function (i) {
        return this.heapArray[i];
    };
    /**
     * Get the elements of these node's children
     * @param  {Number} idx Node index
     * @return {Array(any)}  Children elements
     */
    Heap.prototype.getChildrenOf = function (idx) {
        var _this = this;
        return Heap.getChildrenIndexOf(idx)
            .map(function (i) { return _this.heapArray[i]; })
            .filter(function (e) { return e !== undefined; });
    };
    /**
     * Get the element of this node's parent
     * @param  {Number} idx Node index
     * @return {any}     Parent element
     */
    Heap.prototype.getParentOf = function (idx) {
        var pi = Heap.getParentIndexOf(idx);
        return this.heapArray[pi];
    };
    /**
     * Limit heap size if needed
     */
    Heap.prototype._applyLimit = function () {
        if (this._limit && this._limit < this.heapArray.length) {
            var rm = this.heapArray.length - this._limit;
            // It's much faster than splice
            while (rm) {
                this.heapArray.pop();
                --rm;
            }
        }
    };
    /**
     * Return the bottom (lowest value) N elements of the heap, without corner cases, unsorted
     *
     * @param  {Number} n  Number of elements.
     * @return {Array}     Array of length <= N.
     */
    Heap.prototype._bottomN = function (n) {
        // Use an inverted heap
        var bottomHeap = new Heap(this.compare);
        bottomHeap.limit = n;
        bottomHeap.init(this.heapArray.slice(-n));
        var startAt = this.heapArray.length - 1 - n;
        var parentStartAt = Heap.getParentIndexOf(startAt);
        var indices = [];
        for (var i = startAt; i > parentStartAt; --i) {
            indices.push(i);
        }
        var arr = this.heapArray;
        while (indices.length) {
            var i = indices.shift();
            if (this.compare(arr[i], bottomHeap.peek()) > 0) {
                bottomHeap.replace(arr[i]);
                if (i % 2) {
                    indices.push(Heap.getParentIndexOf(i));
                }
            }
        }
        return bottomHeap.toArray();
    };
    /**
     * Move a node to a new index, switching places
     * @param  {Number} j First node index
     * @param  {Number} k Another node index
     */
    Heap.prototype._moveNode = function (j, k) {
        
        _a = [
            this.heapArray[k],
            this.heapArray[j]
        ], this.heapArray[j] = _a[0], this.heapArray[k] = _a[1];
        var _a;
    };
    /**
     * Move a node down the tree (to the leaves) to find a place where the heap is sorted.
     * @param  {Number} i Index of the node
     */
    Heap.prototype._sortNodeDown = function (i) {
        var _this = this;
        var moveIt = i < this.heapArray.length - 1;
        var moved = false;
        var self = this.heapArray[i];
        var getPotentialParent = function (best, j) {
            if (_this.compare(_this.heapArray[j], _this.heapArray[best]) < 0) {
                best = j;
            }
            return best;
        };
        while (moveIt) {
            var childrenIdx = Heap.getChildrenIndexOf(i);
            var bestChildIndex = childrenIdx.reduce(getPotentialParent, childrenIdx[0]);
            var bestChild = this.heapArray[bestChildIndex];
            if (typeof bestChild !== "undefined" &&
                this.compare(self, bestChild) > 0) {
                this._moveNode(i, bestChildIndex);
                i = bestChildIndex;
                moved = true;
            }
            else {
                moveIt = false;
            }
        }
        return moved;
    };
    /**
     * Move a node up the tree (to the root) to find a place where the heap is sorted.
     * @param  {Number} i Index of the node
     */
    Heap.prototype._sortNodeUp = function (i) {
        var moveIt = i > 0;
        var moved = false;
        while (moveIt) {
            var pi = Heap.getParentIndexOf(i);
            if (pi >= 0 && this.compare(this.heapArray[pi], this.heapArray[i]) > 0) {
                this._moveNode(i, pi);
                i = pi;
                moved = true;
            }
            else {
                moveIt = false;
            }
        }
        return moved;
    };
    /**
     * Return the top (highest value) N elements of the heap, without corner cases, unsorted
     *
     * @param  {Number} n  Number of elements.
     * @return {Array}     Array of length <= N.
     */
    Heap.prototype._topN = function (n) {
        // Use an inverted heap
        var topHeap = new Heap(this._invertedCompare);
        topHeap.limit = n;
        var indices = [0];
        var arr = this.heapArray;
        while (indices.length) {
            var i = indices.shift();
            if (i < arr.length) {
                if (topHeap.length < n) {
                    topHeap.push(arr[i]);
                    indices.push.apply(indices, Heap.getChildrenIndexOf(i));
                }
                else if (this.compare(arr[i], topHeap.peek()) <= 0) {
                    topHeap.replace(arr[i]);
                    indices.push.apply(indices, Heap.getChildrenIndexOf(i));
                }
            }
        }
        return topHeap.toArray();
    };
    return Heap;
}());
