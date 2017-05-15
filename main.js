function random(max, min) {
    min = min || 0;
    return Math.floor(Math.random() * (max - min)) + min;
}

function limitation(val, min, max) {
    val = val >> 0;

    if (val < min) {
        val = min;
    }
    if (val > max) {
        val = max;
    }

    return val;
}

$.extend($.ui.dialog.prototype.options, {
    modal: true,
    autoOpen: false,
    resizable: false
});

$.extend($.ui.autocomplete.prototype.options, {
    delay: 0,
    minLength: 0,
    create: function() {
        $(this).click(function() {
            $(this).autocomplete('search');
        });
    }
});

var templates = {
    fieldFilling:
'<table class="ca-options-table">\
    <tr><th>Bit plane</th><th>Method</th><th></th><th>Fill</th></tr>\
    {{#.}}\
    <tr>\
        <td class="ca-filling-plane">{{.}}</td>\
        <td>\
            <select class="ca-filling-method" dir="rtl">\
                <option value="random">Random</option>\
                <option value="copy">Copy</option>\
            </select>\
        </td>\
        <td class="ca-filling-options">\
            <div class="ca-filling-random"><span class="ca-filling-options-note">density, ‰</span><input type="text"></div>\
            <div class="ca-filling-copy"><span class="ca-filling-options-note">from plane</span><input type="text" readonly="readonly"></div>\
        </td>\
        <td>\
            <input type="checkbox" id="ca-filling-fill-plane-{{.}}" class="ca-filling-fill"><label for="ca-filling-fill-plane-{{.}}"></label>\
        </td>\
    </tr>\
    {{/.}}\
</table>',
    colorSetting:
'<table class="ca-options-table">\
    {{#.}}\
    <tr><td>{{username}}</td><td><input type="text" class="jscolor" color-name="{{sysname}}" readonly="readonly"></td></tr>\
    {{/.}}\
</table>',
    brushColorSelect:
'{{#.}}\
<div class="ca-state" ca-state="{{state}}"><span class="ca-state-name">state {{state}}</span><span class="ca-state-color" style="background-color: {{color}}"></span></div>\
{{/.}}'
};



$(document).ready(function() {
    var X_SIZE_MIN = 32,
        Y_SIZE_MIN = 32,
        X_SIZE_MAX = 256,
        Y_SIZE_MAX = 256,
        CELL_SIDE_MIN = 1,
        CELL_SIDE_MAX = 20,
        CELL_BORDER_MIN = 0,
        CELL_BORDER_MAX = 4;

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
            caBrush.copy(ca.cells.brush).refresh();

            $(this).find('.ca-state-select').html(Mustache.render(templates.brushColorSelect, $.map(CellField.prototype.colors, function(n, i) {
                return isNaN(i) ? null : {
                    state: i,
                    color: n
                };
            }))).find('[ca-state="' + caBrush.brush.data[0][0] + '"]').addClass('ui-state-active');
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
        width: 500,
        create: function() {
            var bitPlanes = 2,
                planesList = $.map(new Array(bitPlanes), function(n, i) { return '' + i; }),
                planesHTML = Mustache.render(templates.fieldFilling, planesList);

            $(this).append(planesHTML).find('.ca-filling-random > input').each(function() {
                $(this).val(500).spinner({
                    min: 0,
                    max: 1000,
                    step: 1,
                    numberFormat: 'n'
                });
            }).end().find('select').selectmenu({
                width: 100
            }).on('selectmenuchange', function(e, ui) {
                $(this).closest('tr').find('.ca-filling-options').find('>').hide().end().find('.ca-filling-' + (ui ? ui.item.value : this.value)).show();
            }).trigger('selectmenuchange').end().find('.ca-filling-copy > input').autocomplete({
                source: function(request, response) {
                    var ownPlane = this.element.closest('tr').find('.ca-filling-plane').text();

                    response(planesList.filter(function(n) {
                        return n !== ownPlane;
                    }));
                }
            }).end().find('.ca-filling-fill').checkboxradio().attr('checked', 'checked').change();
        },
        buttons: {
            'OK': function() {
                var $this = $(this),
                    $options = $this.closest('.ui-dialog').find('.ca-options-table');

                var fillRandom = {},
                    fillCopy = {};

                $options.find('.ca-filling-fill').each(function(i) {
                    if (this.checked) {
                        var $tr = $(this).closest('tr'),
                            method = $tr.find('.ca-filling-method').val();

                        if (method === 'random') {
                            fillRandom[i] = $tr.find('.ca-filling-random input').val();
                        } else if (method === 'copy') {
                            fillCopy[i] = $tr.find('.ca-filling-copy input').val();
                        }
                    }
                });

                if (Object.keys(fillRandom).length) {
                    ca.cells.fillRandom(fillRandom);
                }
                if (Object.keys(fillCopy).length) {
                    ca.cells.copyBitPlane(fillCopy);
                }

                ca.cells.draw();

                $this.dialog('close');
            },
            'Cancel': function() {
                $(this).dialog('close');
            }
        }
    });


    $('#ca-field').dialog({
        create: function() {
            [
                [ '#ca-field-x-size',      X_SIZE_MIN,      X_SIZE_MAX ],
                [ '#ca-field-y-size',      Y_SIZE_MIN,      Y_SIZE_MAX ],
                [ '#ca-field-cell-side',   CELL_SIDE_MIN,   CELL_SIDE_MAX ],
                [ '#ca-field-cell-border', CELL_BORDER_MIN, CELL_BORDER_MAX ]
            ].forEach((function(n) {
                this.find(n[0]).spinner({
                    min: n[1],
                    max: n[2],
                    step: 1
                });
            }).bind($(this)));
        },
        open: function() {
            $(this)
                .find('#ca-field-x-size').val(ca.cells.xSize).end()
                .find('#ca-field-y-size').val(ca.cells.ySize).end()
                .find('#ca-field-cell-side').val(ca.cells.view.cellSide).end()
                .find('#ca-field-cell-border').val(ca.cells.view.border);
        },
        buttons: {
            'OK': function() {
                var $this = $(this),
                    xSize = limitation($this.find('#ca-field-x-size').val(), X_SIZE_MIN, X_SIZE_MAX),
                    ySize = limitation($this.find('#ca-field-y-size').val(), Y_SIZE_MIN, Y_SIZE_MAX),
                    cellSide = limitation($this.find('#ca-field-cell-side').val(), CELL_SIDE_MIN, CELL_SIDE_MAX),
                    border = limitation($this.find('#ca-field-cell-border').val(), CELL_BORDER_MIN, CELL_BORDER_MAX);

                if (ca.cells.xSize !== xSize || ca.cells.ySize !== ySize) {
                    ca.cells.resize(xSize, ySize);
                }

                ca.cells.resizeView(cellSide, border);

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
            $(this).find('#ca-rule-name').autocomplete({
                source: function(request, response) {
                    var term = request.term.toLowerCase();

                    response(rules.predefined().concat(rules.saved()).filter(function(n) {
                        return !!n.name.toLowerCase().match(term);
                    }).map(function(n) {
                        return {
                            matched: n.name.replace(new RegExp('(' + request.term + ')', 'i'), '<span class="matched-text">$1</span>'),
                            label: n.name,
                            value: n.code,
                            predefined: n.predefined
                        };
                    }));
                },
                select: function(e, ui) {
                    $(this).val(ui.item.label);
                    $('#ca-rule-code').val(ui.item.value);

                    return false;
                }
            }).data('ui-autocomplete')._renderItem = function(ul, item) {
                var $item = $('<div></div>').html(item.matched);
                if (item.predefined) {
                    $item.addClass('predefined-rule');
                }

                return $('<li></li>').data('item.autocomplete', item).append($item).appendTo(ul);
            };

            $(this).find('#ca-rule-save').button().click(function() {
                var ruleName = $('#ca-rule-name').val(),
                    ruleCode = $('#ca-rule-code').val();

                if (!ruleName || !ruleCode) {
                    var errMess = [];
                    if (!ruleName) {
                        errMess.push('no rule name');
                    }
                    if (!ruleCode) {
                        errMess.push('no rule code');
                    }
                    toastr.error(errMess.join('<br>'));
                    return;
                }

                if (rules.add(ruleName, ruleCode)) {
                    toastr.success('rule "' + ruleName + '" saved');
                } else {
                    toastr.error('rule "' + ruleName + '" can not be rewrited');
                }
            }).end().find('#ca-rule-delete').button().click(function() {
                var ruleName = $('#ca-rule-name').val();
                if (!ruleName) {
                    toastr.error('no rule name');
                    return;
                }

                var predefined = rules.predefined();
                for (var i = 0; i < predefined.length; i++) {
                    if (predefined[i].name === ruleName) {
                        toastr.error('rule "' + ruleName + '" can not be deleted');
                        return;
                    }
                }

                if (rules.del(ruleName)) {
                    toastr.success('rule "' + ruleName + '" deleted');
                } else {
                    toastr.error('rule "' + ruleName + '" is not exists');
                }
            });

            $(this).find('#ca-rule-code').keydown(function(e) {
                if (e.keyCode === 9) {
                    var start = this.selectionStart,
                        end = this.selectionEnd,
                        $this = $(this),
                        value = $this.val(),
                        tab = '    ';

                    $this.val(value.substring(0, start) + tab + value.substring(end));

                    this.selectionStart = this.selectionEnd = start + tab.length;

                    e.preventDefault();
                }
            });
        },
        open: function() {
            $('#ca-rule-code').val(ca.rule);
        },
        buttons: {
            'OK': function() {
                try {
                    ca.rule = $('#ca-rule-code').val();
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
            $(this).append(Mustache.render(templates.colorSetting, $.map(CellField.prototype.colors, function(n, i) {
                return {
                    sysname: i,
                    username: isNaN(i) ? i : ('state ' + i)
                }
            }))).find('.jscolor').each(function() {
                this.jscolor = new jscolor(this, {
                    hash: true
                });
            });
        },
        open: function() {
            $(this).find('.jscolor').each(function() {
                var $this = $(this);
                $this.val(CellField.prototype.colors[$this.attr('color-name')]);
                this.jscolor.importColor();
            });
        },
        buttons: {
            'OK': function() {
                $(this).find('.jscolor').each(function() {
                    var $this = $(this);
                    CellField.prototype.colors[$this.attr('color-name')] = $this.val();
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


    $('#cell-field-mode').buttonset({
        items: 'input'
    }).find('.ui-checkboxradio-radio-label').removeClass('ui-checkboxradio-radio-label').end().click(function(e) {
        var mode = $(e.target).val();
        if (mode && ca.cells.mode !== mode) {
            ca.cells.mode = mode;
        }
    });


    $('.content > .controls')
        .find('button').button().end()
        .on('click', '[data-dialog]', function() {
            $('#' + $(this).attr('data-dialog')).dialog('open');
        });

    $('#cell-field-data').buttonset().find('#clear').click(function() {
        ca.cells.fill(function() {
            return 0;
        }).draw();
    });

    $(document).on({
        'ca-start': function() {
            $('.ca-start-disable').addClass('ui-state-disabled');
            $('.ca-start-hide').hide();
            $('.ca-start-show').show();
        },
        'ca-stop': function() {
            $('.ca-start-disable').removeClass('ui-state-disabled');
            $('.ca-start-hide').show();
            $('.ca-start-show').hide();
        },
        'ca-mode': function(e) {
            $('#cell-field-mode').find('[for="mode-' + e.detail.mode + '"]').click();
        }
    }).trigger('ca-stop');

    $('#start').click(function() {
        ca.start();
    });

    $('#stop').click(function() {
        ca.stop();
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

    $(ca.cells.view.canvas).parent().on('mousewheel', function(e) {
        var oldCellSide = ca.cells.view.cellSide,
            newCellSide = limitation(oldCellSide + (e.originalEvent.deltaY > 0 ? -1 : 1), CELL_SIDE_MIN, CELL_SIDE_MAX);

        if (oldCellSide !== newCellSide) {
            ca.cells.resizeView(newCellSide);
        }

        return false;
    });

    ca.cells.mode = 'edit';

    $('body').removeClass('hidden');
});
