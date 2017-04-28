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

$(document).ready(function() {
    var X_SIZE = 256,
        Y_SIZE = 256;

    var ca = window.ca = CellularAutomaton(X_SIZE, Y_SIZE, {
        wrapper: $('#cells-wrapper')[0],
        width: 800,
        height: 800,
        cellSide: 2,
        border: 1
    });

    var BRUSH_SIZE = 11;

    ca.cells.brush = CellField(BRUSH_SIZE, BRUSH_SIZE);
    ca.cells.brush.data[Math.floor(BRUSH_SIZE / 2)][Math.floor(BRUSH_SIZE / 2)] = 1;

    var brushDialog = null;

    $('#brush').click(function() {
        $('#ca-brush').dialog('open');
    });

    $('#ca-brush').dialog({
        create: function() {
            var $brushWrapper = $('<div class="cells-field-wrapper" />').appendTo(this);

            brushDialog = CellField(BRUSH_SIZE, BRUSH_SIZE, {
                wrapper: $brushWrapper[0],
                cellSide: 10,
                border: 1
            });
        },
        open: function() {
            brushDialog.copy(ca.cells.brush);
            brushDialog.refresh();
        },
        buttons: {
            'OK': function() {
                ca.cells.brush.copy(brushDialog);
                $(this).dialog('close');
            },
            'Cancel': function() {
                $(this).dialog('close');
            }
        }
    });


    $('#fill').click(function() {
        $('#ca-filling').dialog('open');
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


    $('#rule').click(function() {
        $('#ca-rule').dialog('open');
    });

    $('#ca-rule').dialog({
        width: '80%',
        create: function() {
            $(this).append('<textarea id="ca-rule-source"></textarea>');
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


    $('#colors').click(function() {
        $('#ca-colors').dialog('open');
    });

    $('#ca-colors').dialog({
        create: function() {
            var html = '';

            var colors = CellField.prototype.colors;
            for (var i in colors) {
                html += '<tr><td>' + (isNaN(i) ? i : ('state ' + i)) + '</td><td><input type="text" class="jscolor" color-name="' + i + '" readonly="readonly"></td></tr>';
            }

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


    $('#controls').find('button').button();

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
        var n = $(this).parent().find('input').val();
        if (!/^\d*\.?\d+$/.test(n)) {
            toastr.error('"' + n + '" is not a number');
        } else {
            ca.newGeneration(+n);
            ca.cells.refresh();
        }
    }).end().find('input').val('1');
});
