﻿function random(max, min) {
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
        width: 500,
        create: function() {
            var bitPlanes = 2;

            var html = '<tr><th>Bit plane</th><th>Method</th><th></th><th>Fill</th></tr>';
            for (var i = 0; i < bitPlanes; i++) {
                html += '<tr><td class="ca-filling-plane">' + i + '</td><td><select class="ca-filling-method" dir="rtl"><option value="random">Random</option><option value="copy">Copy</option></select></td><td class="ca-filling-options"><div class="ca-filling-random"><span class="ca-filling-options-note">density, ‰</span><input type="text"></div><div class="ca-filling-copy"><span class="ca-filling-options-note">from plane</span><input type="text"></div></td><td><input type="checkbox" class="ca-filling-fill" checked=checked"></td></tr>';
            }

            $(this).append('<table class="ca-options-table">' + html + '</table>').find('.ca-filling-random > input').each(function() {
                $(this).val(500).spinner({
                    min: 0,
                    max: 1000,
                    step: 1,
                    numberFormat: 'n'
                });
            }).end().on('change', 'select', function() {
                var $this = $(this),
                    method = $this.val();

                $this.closest('tr').find('.ca-filling-options').find('>').hide().end().find('.ca-filling-' + method).show();
            }).find('select').change().end().find('.ca-filling-copy > input').autocomplete({
                delay: 0,
                minLength: 0,
                source: function(request, response) {
                    var ownPlane = +this.element.closest('tr').find('.ca-filling-plane').text();

                    var data = [];
                    for (var i = 0; i < bitPlanes; i++) {
                        if (i !== ownPlane) {
                            data.push('' + i);
                        }
                    }

                    response(data);
                }
            }).click(function() {
                $(this).autocomplete('search');
            }).attr('readonly', 'readonly');
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
                    fillCellsField(ca.cells, fillRandom);
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


    $('#ca-rule').dialog({
        width: '80%',
        create: function() {
            $(this).find('#predefined-rules').autocomplete({
                delay: 0,
                minLength: 0,
                source: function(request, response) {
                    response(rules.predefined().concat(rules.saved()).map(function(n) {
                        return {
                            label: n.name,
                            value: n.code
                        };
                    }));
                },
                select: function(e, ui) {
                    $(this).val(ui.item.label);
                    $('#ca-rule-source').val(ui.item.value);

                    return false;
                }
            }).click(function() {
                $(this).autocomplete('search');
            }).end().find('#save-rule').button().click(function() {
                var ruleName = $('#predefined-rules').val(),
                    ruleCode = $('#ca-rule-source').val();

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
                    toastr.error('rule "' + ruleName + '" can not be rewrite');
                }
            }).end().find('#delete-rule').button().click(function() {
                var ruleName = $('#predefined-rules').val();
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
