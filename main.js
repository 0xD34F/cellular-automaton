function random(max, min) {
    min = min || 0;
    return Math.floor(Math.random() * (max - min)) + min;
}

// fillingMap - объект вида { <номер битовой плоскости>: <плотность заполнения>, ... }
function fillCellsField(field, fillingMap) {
    field.fill(function(x, y, value) {
        for (var i in fillingMap) {
            var mask = (1 << i);

            if (random(1000) < fillingMap[i]) {
                value |= mask;
            } else {
                value &= ~mask;
            }
        }

        return value;
    })
    field.draw();
}

$.extend($.ui.dialog.prototype.options, {
    modal: true,
    autoOpen: false,
    resizable: false
});

var predefinedRules = [ {
    name: 'Conway\'s Life',
    code: 'function main(n) {\n\
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;\n\
    return s === 3 ? 1 : (s === 2 ? n.center : 0);\n\
}'
}, {
    name: 'Brian\'s brain',
    code: 'function ready(n) {\n\
    return n.center === 0 ? 1 : 0;\n\
}\n\
\n\
function stimulus(n) {\n\
    var s = n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;\n\
    return s === 2 ? 1 : 0;\n\
}\n\
\n\
function main(n) {\n\
    var p0 = stimulus(n) & ready(n),\n\
        p1 = n.center & 1;\n\
\n\
    return (p1 << 1) | p0;\n\
}'
}, {
    name: 'Wireworld',
    code: 'setNeighborhoods({\n\
    main: \'Moore-thick\'\n\
});\n\
\n\
function main(n) {\n\
    var s = (n.north === 1) + (n.south === 1) + (n.west === 1) + (n.east === 1) + (n.n_west === 1) + (n.s_west === 1) + (n.n_east === 1) + (n.s_east === 1);\n\
\n\
    return ({\n\
        0: 0,\n\
        1: 2,\n\
        2: 3,\n\
        3: s === 1 || s === 2 ? 1 : 3\n\
    })[n.center];\n\
}'
}, {
    name: 'Parity',
    code: 'function main(n) {\n\
    return n.north ^ n.south ^ n.west ^ n.east ^ (n.center & 1);\n\
}'
}, {
    name: 'Anneal',
    code: 'function main(n) {\n\
    var s = (n.center & 1) + n.north + n.south + n.west + n.east + n.n_west + n.s_west + n.n_east + n.s_east;\n\
    return s > 5 || s === 4 ? 1 : 0;\n\
}'
}, {
    name: 'Time tunnel',
    code: 'function main(n) {\n\
    var s = (n.center & 1) + n.north + n.south + n.west + n.east,\n\
        p0 = (s === 0 || s === 5 ? 0 : 1) ^ ((n.center & 2) >> 1),\n\
        p1 = n.center & 1;\n\
\n\
    return p0 | (p1 << 1);\n\
}'
}, {
    name: 'Border / hollow',
    code: 'setNeighborhoods({\n\
    extra: [\'phase\']\n\
});\n\
\n\
function border(n) {\n\
    return 1 & (n.center | n.north | n.south | n.west | n.east | n.n_west | n.n_east | n.s_west | n.s_east);\n\
}\n\
\n\
function hollow(n) {\n\
    var t = 1 & n.north & n.south & n.west & n.east & n.n_west & n.n_east & n.s_west & n.s_east;\n\
    return t ? 0 : n.center;\n\
}\n\
\n\
function main(n) {\n\
    return (n.phase & 1) ? hollow(n) : border(n);\n\
}'
}, {
    name: '30',
    code: 'function main(n) {\n\
    var s = (n.n_west << 2) + (n.north << 1) + n.n_east;\n\
    var newState = s > 4 || s === 0 ? 0 : 1;\n\
    return newState | n.center;\n\
}'
}, {
    name: '110',
    code: 'function main(n) {\n\
    var s = (n.n_west << 2) + (n.north << 1) + n.n_east;\n\
    var newState = s === 7 || s === 4 || s === 0 ? 0 : 1;\n\
    return newState | n.center;\n\
}'
} ];

$(document).ready(function() {
    var X_SIZE = 256,
        Y_SIZE = 256;

    var ca = window.ca = CellularAutomaton(X_SIZE, Y_SIZE, {
        wrapper: $('#cells-wrapper')[0],
        cellSide: 2,
        border: 1
    });

    var BRUSH_SIZE = 11;

    ca.cells.brush = CellField(BRUSH_SIZE, BRUSH_SIZE);
    ca.cells.brush.data[Math.floor(BRUSH_SIZE / 2)][Math.floor(BRUSH_SIZE / 2)] = 1;

    var caBrush = null;

    $('#ca-brush').dialog({
        create: function() {
            var side = 12,
                border = 1;

            caBrush = CellField(BRUSH_SIZE, BRUSH_SIZE, {
                wrapper: $(this).find('.cells-field-wrapper')[0],
                cellSide: side,
                border: border
            });
            caBrush.brush = CellField(1, 1);
            caBrush.brush.data[0][0] = 1;

            $(this).find('.ca-state-select').on('click', '.ca-state', function() {
                var $this = $(this);
                $this.parent().find('.ui-state-active').removeClass('ui-state-active');
                $this.addClass('ui-state-active');
                caBrush.brush.data[0][0] = $this.attr('ca-state');
            }).height(caBrush.view.canvas.height);
        },
        open: function() {
            caBrush.copy(ca.cells.brush);
            caBrush.refresh();

            $(this).find('.ca-state-select').html($.map(CellField.prototype.colors, function(n, i) {
                if (isNaN(i)) {
                    return null;
                }

                return '<div class="ca-state" ca-state="' + i + '"><span class="ca-state-name">state ' + i + '</span><span class="ca-state-color" style="background-color: ' + n + '"></span></div>';
            }).join('')).find('[ca-state="' + caBrush.brush.data[0][0] + '"]').addClass('ui-state-active');
        },
        buttons: {
            'OK': function() {
                ca.cells.brush.copy(caBrush);
                $(this).dialog('close');
            },
            'Cancel': function() {
                $(this).dialog('close');
            }
        }
    });


    $('#ca-filling').dialog({
        create: function() {
            var bitPlanes = 2;

            var html = '<tr><th>Bit plane</th><th>Density, ‰</th><th>Fill</th></tr>';
            for (var i = 0; i < bitPlanes; i++) {
                html += '<tr><td class="ca-filling-plane">' + i + '</td><td><input type="text" class="ca-filling-density"></td><td><input type="checkbox" class="ca-filling-fill" checked=checked"></td></tr>';
            }

            $(this).append('<table class="ca-options-table">' + html + '</table>').find('.ca-filling-density').each(function() {
                $(this).val(500).spinner({
                    min: 0,
                    max: 1000,
                    step: 1,
                    numberFormat: 'n'
                });
            });
        },
        buttons: {
            'OK': function() {
                var $this = $(this);

                var t = {};
                $this.find('.ca-filling-fill').each(function(i) {
                    if (this.checked) {
                        t[i] = $(this).closest('tr').find('.ca-filling-density').val();
                    }
                });
                fillCellsField(ca.cells, t);

                $this.dialog('close');
            },
            'Cancel': function() {
                $(this).dialog('close');
            }
        }
    });


    $('#ca-rule').dialog({
        width: '80%',
        create: function() {
            var rulesHTML = predefinedRules.map(function(n, i) {
                return '<option value="' + i + '">' + n.name + '</option>';
            }).join('');

            $(this).append('<div class="controls"><select id="predefined-rules" class="ui-widget ui-state-default"></select></div><textarea id="ca-rule-source"></textarea>')
                .find('#predefined-rules').append(rulesHTML).change(function() {
                    $('#ca-rule-source').val(predefinedRules[this.value].code);
                }).val(null).end()
                .find('#ca-rule-source').on('input propertychange', function() {
                    $('#predefined-rules').val(null);
                });
        },
        open: function() {
            $('#ca-rule-source').val(ca.rule);
        },
        buttons: {
            'OK': function() {
                try {
                    ca.rule = $('#ca-rule-source').val();
                    $(this).dialog('close');
                } catch (e) {
                    toastr.error(e.message);
                }
            },
            'Cancel': function() {
                $(this).dialog('close');
            }
        }
    });


    $('#ca-colors').dialog({
        create: function() {
            var html = $.map(CellField.prototype.colors, function(n, i) {
                return '<tr><td>' + (isNaN(i) ? i : ('state ' + i)) + '</td><td><input type="text" class="jscolor" color-name="' + i + '" readonly="readonly"></td></tr>';
            }).join('');

            $(this).append('<table class="ca-options-table">' + html + '</table>').find('.jscolor').each(function() {
                this.jscolor = new jscolor(this);
            });
        },
        open: function() {
            $(this).find('.jscolor').each(function() {
                var $this = $(this);
                $this.val(CellField.prototype.colors[$this.attr('color-name')].slice(1));
                this.jscolor.importColor();
            });
        },
        buttons: {
            'OK': function() {
                $(this).find('.jscolor').each(function() {
                    var $this = $(this);
                    CellField.prototype.colors[$this.attr('color-name')] = '#' + $this.val();
                });

                ca.cells.refresh();

                $(this).dialog('close');
            },
            'Cancel': function() {
                $(this).dialog('close');
            }
        }
    });


    $('#ca-speed').dialog({
        width: 320,
        create: function() {
            $(this).find('#steps-per-stroke').spinner({
                min: 1,
                max: 100,
                step: 1
            }).end().find('#stroke-duration').spinner({
                min: 10,
                max: 5000,
                step: 10
            });
        },
        open: function() {
            $(this)
                .find('#steps-per-stroke').val(ca.stepsPerStroke).end()
                .find('#stroke-duration').val(ca.strokeDuration);
        },
        buttons: {
            'OK': function() {
                var $this = $(this);

                ca.stepsPerStroke = $this.find('#steps-per-stroke').val();
                ca.strokeDuration = $this.find('#stroke-duration').val();

                $this.dialog('close');
            },
            'Cancel': function() {
                $(this).dialog('close');
            }
        }
    });


    $('.content > .controls')
        .find('button').button().end()
        .on('click', '[data-dialog]', function() {
            $('#' + $(this).attr('data-dialog')).dialog('open');
        });

    $(document).on({
        'ca-start': function() {
            $('#start .ui-icon').removeClass('ui-icon-play').addClass('ui-icon-pause');
            $('#skip, #fill, #rule').addClass('ui-state-disabled');
        },
        'ca-stop': function() {
            $('#start .ui-icon').removeClass('ui-icon-pause').addClass('ui-icon-play');
            $('#skip, #fill, #rule').removeClass('ui-state-disabled');
        }
    })

    $('#start').click(function() {
        if (ca.isStarted()) {
            ca.stop();
        } else {
            ca.start();
        }
    });

    $('#skip').find('button').click(function() {
        var $steps = $(this).parent().find('input'),
            steps = $steps.val() >> 0;

        if (steps < 1) {
            steps = 1;
        }
        $steps.val(steps);

        ca.newGeneration(steps);
        ca.cells.refresh();
    }).end().find('input').val('1');
});
