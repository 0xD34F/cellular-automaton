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

    $('#start').click(function() {
        if (ca.isStarted()) {
            ca.stop();
            this.innerHTML = 'Start';
        } else {
            ca.start();
            this.innerHTML = 'Stop';
        }
    });

    $('#brush').click(function() {
        $('#ca-brush').dialog('open');
    });

    $('#ca-brush').dialog({
        modal: true,
        autoOpen: false,
        create: function() {
            var $brushWrapper = $('<div class="cells-field-wrapper" />').appendTo($(this));

            brushDialog = CellField(BRUSH_SIZE, BRUSH_SIZE, {
                wrapper: $brushWrapper[0],
                cellSide: 10,
                border: 1
            });
        },
        open: function() {
            brushDialog.copy(ca.cells.brush);
            brushDialog.draw();
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
        modal: true,
        autoOpen: false,
        create: function() {
            var bitPlanes = 2;

            var html = '<tr><th>Bit plane</th><th>Density, ‰</th><th>Fill</th></tr>';
            for (var i = 0; i < bitPlanes; i++) {
                html += '<tr><td class="ca-filling-plane">' + i + '</td><td><input class="ca-filling-density"></td><td><input type="checkbox" class="ca-filling-fill" checked=checked"></td></tr>';
            }

            $(this).append('<table class="ca-filling-options">' + html + '</table>').find('.ca-filling-density').each(function() {
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
});
