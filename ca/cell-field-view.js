﻿var CellFieldView = (function() {

    function self(field, options) {
        var o = Object.assign(Object.create(self.prototype), options);

        o.field = field;
        o.wrapper = o.wrapper instanceof HTMLElement ? o.wrapper : document.querySelector(o.wrapper);
        o.cellSide = o.cellSide << 0;
        o.cellBorder = o.cellBorder << 0;
        o.showBitPlanes = isNaN(o.showBitPlanes) ? bitMask(o.field.numBitPlanes) : +o.showBitPlanes;

        if (!o.width) {
            o.width = field.xSize * (o.cellSide + o.cellBorder) + o.cellBorder;
        }
        if (!o.height) {
            o.height = field.ySize * (o.cellSide + o.cellBorder) + o.cellBorder;
        }

        o.wrapper.style.width = o.width + 'px';
        o.wrapper.style.height = o.height + 'px';

        o.canvas = document.createElement('canvas');
        o.wrapper.appendChild(o.canvas);

        eventHandlers.forEach(function(eh) {
            eh.events.forEach(function(eventName) {
                var elem = eh.wrapper ? o.canvas.parentNode : o.canvas;
                elem['on' + eventName] = eh.handler.bind(o);
            });
        });

        o.setColors();
        o.resize(o.cellSide);

        o.mode = 'edit';

        return o;
    };

    Object.defineProperty(self.prototype, 'mode', {
        get: function() {
            return this._mode;
        },
        set: function(value) {
            this._mode = value;
            document.dispatchEvent(new CustomEvent('cell-field-mode', {
                detail: {
                    cellField: this.field
                }
            }));
            this.canvas.setAttribute('data-mode', value);
        }
    });

    self.prototype.renderPartial = function(coord) {
        var m = this.showBitPlanes,
            rg = getRenderGroups(this),
            cells = this.field.data,
            maxX = this.field.xSize,
            maxY = this.field.ySize;

        for (var x = coord.x, i = 0; i < coord.xSize; i++, x++) {
            if (x === maxX) {
                x = 0;
            }

            for (var y = coord.y, j = 0; j < coord.ySize; j++, y++) {
                if (y === maxY) {
                    y = 0;
                }

                rg[cells[x][y] & m].push(x, y);
            }
        }

        var border = this.cellBorder,
            side = this.cellSide,
            sideFull = side + border,
            c = this.context;

        for (var state = 0; state < rg.length; state++) {
            c.fillStyle = this.colors[state];

            for (var n = rg[state], p = 0; p < n.length; p += 2) {
                c.fillRect(n[p] * sideFull + border, n[p + 1] * sideFull + border, side, side);
            }
        }
    };

    self.prototype.render = function() {
        var coord = detectViewCoord(this),
            m = this.showBitPlanes,
            rg = getRenderGroups(this),
            cells = this.field.data,
            maxX = limitation(coord.x + coord.xSize, 0, this.field.xSize),
            maxY = limitation(coord.y + coord.ySize, 0, this.field.ySize);

        for (var i = 0, x = coord.x; x < maxX; x++, i++) {
            for (var j = 0, y = coord.y; y < maxY; y++, j++) {
                rg[cells[x][y] & m].push(i, j);
            }
        }

        var border = this.cellBorder,
            side = this.cellSide,
            sideFull = side + border,
            image = this.imageData.data,
            w = this.imageData.width;

        for (var state = 0; state < rg.length; state++) {
            var [ r, g, b ] = [...getColorComponents(this.colors[state])];

            for (var n = rg[state], p = 0; p < n.length; p += 2) {
                for (x = n[p] * sideFull + border, i = 0; i < side; i++, x++) {
                    for (y = n[p + 1] * sideFull + border, j = 0; j < side; j++, y++) {
                        var k = 4 * x + 4 * y * w;
                        image[k + 0] =   r; // red
                        image[k + 1] =   g; // green
                        image[k + 2] =   b; // blue
                        image[k + 3] = 255; // alpha
                    }
                }
            }
        }

        this.context.putImageData(this.imageData, coord.x * sideFull, coord.y * sideFull);
    };

    self.prototype.resize = function(cellSide, cellBorder = this.cellBorder || 0) {
        if (isNaN(cellSide) || cellSide < 1) {
            return;
        }

        var c = this.context = this.canvas.getContext('2d');

        var s = this.cellSide = cellSide,
            b = this.cellBorder = cellBorder,
            sb = s + b;

        this.canvas.width  = c.width  = this.field.xSize * sb + b;
        this.canvas.height = c.height = this.field.ySize * sb + b;

        var parent = this.canvas.parentNode,
            w = parseInt(parent.style.width,  10),
            h = parseInt(parent.style.height, 10);

        if (c.width > w || c.height > h) {
            parent.classList.add('scrollable');
        } else {
            parent.classList.remove('scrollable');
            parent.scrollTop = 0;
        }

        this.imageData = c.createImageData(Math.ceil(w / sb) * sb, Math.ceil(h / sb) * sb);

        var d = this.imageData.data,
            [ _r, _g, _b ] = [...getColorComponents(this.colors.background)];

        for (var i = 0; i < d.length; i += 4) {
            d[i + 0] = _r;
            d[i + 1] = _g;
            d[i + 2] = _b;
            d[i + 3] = 255;
        }

        scrollFix(this);
        this.render();
    };

    self.prototype.setColors = function(colors, render) {
        colors = colors instanceof Object ? colors : defaultColors;

        var oldColors = this.colors,
            newColors = {};

        for (var i in defaultColors) {
            var color = colors[i] || oldColors[i];
            if (color[0] !== '#') {
                color = '#' + color;
            }

            newColors[i] = color;
        }

        this.colors = newColors;
        if (render) {
            this.render();
        }
    };

    function changeScale(view, change, coord) {
        var oldCellSide = view.cellSide,
            newCellSide = limitation(oldCellSide + change, view.scaling.min, view.scaling.max);

        if (oldCellSide !== newCellSide) {
            var p = view.canvas.parentNode,
                oldScrollX = p.scrollLeft,
                oldScrollY = p.scrollTop;

            view.resize(newCellSide);

            p.scrollLeft = coord.x * (newCellSide - oldCellSide) + oldScrollX;
            p.scrollTop  = coord.y * (newCellSide - oldCellSide) + oldScrollY;
        }
    };

    function scrollFix(view) {
        var s = view.cellSide + view.cellBorder,
            p = view.canvas.parentNode;

        p.scrollLeft = Math.round(p.scrollLeft / s) * s;
        p.scrollTop  = Math.round(p.scrollTop  / s) * s;
    };


    function getRenderGroups(view) {
        var numStates = Math.pow(2, view.field.numBitPlanes);

        return [...Array(numStates)].map(() => []);
    }

    function detectEventCoord(view, e) {
        var b = view.cellBorder,
            t = Math.round(b / 2);

        return {
            x: Math.floor((e.offsetX - t) / (view.cellSide + b)),
            y: Math.floor((e.offsetY - t) / (view.cellSide + b))
        };
    };

    function detectViewCoord(view) {
        var p = view.canvas.parentNode,
            t = p.classList.contains('scrollable'),
            s = view.cellSide + view.cellBorder;

        return {
            x: t ? Math.floor(p.scrollLeft / s) : 0,
            y: t ? Math.floor(p.scrollTop  / s) : 0,
            xSize: t ? Math.ceil(p.clientWidth  / s) : view.field.xSize,
            ySize: t ? Math.ceil(p.clientHeight / s) : view.field.ySize
        };
    };

    function getMouseChange(e) {
        return (({
            1:  1,
            2: -1
        })[e.buttons] || 0);
    }

    function getColorComponents(color) {
        return [ 1, 3, 5 ].map(n => parseInt(color.slice(n, n + 2), 16));
    }

    var defaultColors = {
        background: '#505050',
         0: '#000000',
         1: '#FFFFFF',
         2: '#666666',
         3: '#A8A8A8',
         4: '#FF0000',
         5: '#00FF00',
         6: '#0000FF',
         7: '#00FFFF',
         8: '#FF00FF',
         9: '#FFFF00',
        10: '#FF8080',
        11: '#80FF80',
        12: '#8080FF',
        13: '#FFFF80',
        14: '#FF80FF',
        15: '#80FFFF'
    };

    var eventHandlers = [ {
        events: [ 'contextmenu' ],
        handler: function(e) {
            return false;
        }
    }, {
        events: [ 'mouseup', 'mouseleave' ],
        handler: function(e) {
            this.oldEventCoord = {};
        }
    }, {
        events: [ 'mousedown', 'mousemove' ],
        handler: function(e) {
            if (e.buttons !== 1 && e.buttons !== 2) {
                return;
            }

            var oldCoord = this.oldEventCoord || {},
                newCoord = detectEventCoord(this, e);

            if (newCoord.x === oldCoord.x && newCoord.y === oldCoord.y) {
                return;
            }

            var action = userActions[this.mode];
            if (action.events.indexOf(e.type) !== -1 &&
                action.handler.call(this, e, newCoord, oldCoord) !== false) {

                this.oldEventCoord = newCoord;
            }
        }
    }, {
        wrapper: true,
        events: [ 'scroll' ],
        handler: function(e) {
            scrollFix(this);
            this.render();
        }
    }, {
        wrapper: true,
        events: [ 'mousewheel' ],
        handler: function(e) {
            if (!this.scaling) {
                return;
            }

            e.preventDefault();
            e.stopPropagation();

            changeScale(this, e.deltaY > 0 ? -1 : 1, detectEventCoord(this, e));
        }
    } ];

    var userActions = {
        edit: {
            events: [ 'mousedown', 'mousemove' ],
            handler: function(e, newCoord, oldCoord) {
                var x = newCoord.x,
                    y = newCoord.y,
                    f = this.field;

                if (x >= f.xSize || y >= f.ySize || x < 0 || y < 0) {
                    return false;
                }

                if (f.brush instanceof CellField) {
                    x = (x - Math.floor(f.brush.xSize / 2) + f.xSize) % f.xSize;
                    y = (y - Math.floor(f.brush.ySize / 2) + f.ySize) % f.ySize;

                    f.copy(f.brush, {
                        x: x,
                        y: y,
                        skipZeros: true,
                        setZeros: e.buttons === 2
                    });
                    this.renderPartial({ x: x, y: y, xSize: f.brush.xSize, ySize: f.brush.ySize });
                } else {
                    f.data[x][y] = (f.data[x][y] + getMouseChange(e)) & bitMask(f.numBitPlanes);
                    this.renderPartial({ x: x, y: y, xSize: 1, ySize: 1 });
                }
            }
        },
        shift: {
            events: [ 'mousemove' ],
            handler: function(e, newCoord, oldCoord) {
                this.field.shift(newCoord.x - oldCoord.x, newCoord.y - oldCoord.y);
                this.render();
            }
        },
        scale: {
            events: [ 'mousedown' ],
            handler: function(e, newCoord, oldCoord) {
                changeScale(this, getMouseChange(e), newCoord);
            }
        }
    };

    return self;
})();
